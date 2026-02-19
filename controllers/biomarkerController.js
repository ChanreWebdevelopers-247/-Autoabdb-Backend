import Biomarker from '../models/biomarkerModel.js';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Get all biomarkers with pagination (for import page)
export const getAllBiomarkers = async (req, res) => {
  try {
    const { page = 1, limit = 50, search } = req.query;
    const skip = (Math.max(1, parseInt(page, 10)) - 1) * Math.min(500, Math.max(1, parseInt(limit, 10)));

    let query = {};
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      // Search across entire collection - all main fields and raw subfields
      query = {
        $or: [
          { name: searchRegex },
          { manifestation: searchRegex },
          { prevalence: searchRegex },
          { 'raw.Disease': searchRegex },
          { 'raw.Autoantibody': searchRegex },
          { 'raw.Name': searchRegex },
          { 'raw.Manifestation': searchRegex },
          { 'raw.Clinical Manifestation': searchRegex },
          { 'raw.Disease Association': searchRegex },
          { 'raw.Disease Association (% percentage)': searchRegex },
          { 'raw.Prevalence': searchRegex },
          { 'raw.Prevalence (% percentage)': searchRegex },
          { 'raw.Prevelanse (% percentage)': searchRegex },
        ],
      };
    }

    const [data, total] = await Promise.all([
      Biomarker.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit, 10)).lean(),
      Biomarker.countDocuments(query),
    ]);

    res.json({
      success: true,
      data,
      pagination: {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10),
        total,
        totalPages: Math.ceil(total / parseInt(limit, 10)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Import biomarkers from CSV/XLSX
export const importFromFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const isCsv = req.file.originalname.toLowerCase().endsWith('.csv');
    const workbook = isCsv
      ? XLSX.read(req.file.buffer.toString('utf8'), { type: 'string' })
      : XLSX.read(req.file.buffer, { type: 'buffer' });

    let rawRows;
    if (isCsv) {
      rawRows = [];
      for (const sn of workbook.SheetNames) {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sn], { defval: '' });
        if (rows.length > 0) rawRows.push(...rows);
      }
    } else {
      rawRows = parseWorkbookToEntries(workbook);
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ success: false, message: 'Uploaded file contains no rows' });
    }

    const normalizeHeader = (h) => h.toString().trim().toLowerCase().replace(/\s+/g, '');
    const fieldMap = {
      name: ['name', 'autoantibody', 'antibody', 'auto_antibody', 'antibody_name', 'auto_ab', 'biomarker', 'biomarkers', 'ab', 'antibodies', 'autoantibodies', 'clinicalantibody', 'targetantibody'],
      manifestation: ['manifestation', 'clinicalmanifestation', 'clinical_manifestation', 'manifestations', 'clinicalmanifestations', 'manifestation_name', 'symptoms', 'clinical_features'],
      prevalence: ['prevalence', 'prevalence_rate', 'frequency', 'prevalence_percentage', 'prevalence(%percentage)', 'prevelanse(%percentage)', 'prevelanse', 'prevalencepercent'],
      disease: ['disease', 'diseasename', 'disease_name', 'condition', 'disorder', 'syndrome', 'diagnosis'],
      diseaseAssociation: ['diseaseassociation', 'disease_association', 'diseaseassociation_percentage', 'diseaseassociation(%percentage)', 'association', 'disease_assoc'],
    };

    // Fallback keys for name/antibody (original case variations from raw)
    const antibodyRawKeys = ['Autoantibody', 'Autoantibodies', 'Antibody', 'Antibodies', 'Name', 'Biomarker', 'Biomarkers', 'AB', 'Clinical Antibody', 'Target Antibody'];
    const manifestationRawKeys = ['Clinical Manifestation', 'Clinical Manifestations', 'Manifestation', 'Manifestations', 'Disease related clinical manifestation'];
    const prevalenceRawKeys = ['Prevalence', 'Prevalence (% percentage)', 'Prevelanse (% percentage)', 'Prevalence (%)', 'Prevalence rate'];

    const mapRow = (row) => {
      const lowered = {};
      const raw = {};
      Object.keys(row).forEach((k) => {
        const normalized = normalizeHeader(k);
        lowered[normalized] = row[k];
        const v = row[k];
        if (v !== undefined && v !== null && v.toString().trim() !== '') {
          raw[k] = v.toString().trim();
        }
      });

      const getFirst = (keys) => {
        for (const key of keys) {
          if (lowered[key] !== undefined && lowered[key] !== null && lowered[key].toString().trim() !== '') {
            return lowered[key].toString().trim();
          }
        }
        return '';
      };

      // Try mapped fields first, then fall back to raw by original column names
      let name = getFirst(fieldMap.name);
      if (!name) {
        for (const k of antibodyRawKeys) {
          if (raw[k]?.trim()) { name = raw[k].trim(); break; }
        }
      }
      // Fallback: any column with 'antibody' or 'biomarker' or 'name' in the key
      if (!name && Object.keys(raw).length > 0) {
        const abKey = Object.keys(raw).find((k) => /antibody|biomarker|^name$/i.test(k));
        if (abKey) name = raw[abKey];
      }

      let manifestation = getFirst(fieldMap.manifestation);
      if (!manifestation) {
        for (const k of manifestationRawKeys) {
          if (raw[k]?.trim()) { manifestation = raw[k].trim(); break; }
        }
      }
      if (!manifestation && Object.keys(raw).length > 0) {
        const maniKey = Object.keys(raw).find((k) => /manifestation|clinical.?feature|symptom/i.test(k));
        if (maniKey) manifestation = raw[maniKey];
      }

      let prevalence = getFirst(fieldMap.prevalence);
      if (!prevalence) {
        for (const k of prevalenceRawKeys) {
          if (raw[k]?.trim()) { prevalence = raw[k].trim(); break; }
        }
      }

      return {
        name: name || '',
        manifestation: manifestation || '',
        prevalence: prevalence || '',
        raw: Object.keys(raw).length ? raw : undefined,
      };
    };

    const mapped = rawRows.map((row) => mapRow(row));
    // Keep rows that have at least one non-empty cell (filter out completely blank rows only)
    const entries = mapped.filter((e) => e.raw && Object.keys(e.raw).length > 0);

    if (entries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No rows with data found in file',
      });
    }

    const result = await Biomarker.insertMany(entries);

    console.log(`Biomarker import: ${workbook.SheetNames.length} sheet(s), ${rawRows.length} rows → ${result.length} inserted`);

    res.json({
      success: true,
      message: `Successfully imported ${result.length} biomarker entries`,
      data: {
        inserted: result.length,
        total: rawRows.length,
        failed: rawRows.length - result.length,
        sheetsRead: workbook.SheetNames.length,
      },
    });
  } catch (error) {
    console.error('Biomarker import error:', error);
    res.status(500).json({ success: false, message: error.message || 'Import failed' });
  }
};

// Import from server file: backend/data/Clinical manifestation disease related.xlsx
const SERVER_DATA_FILE = path.join(__dirname, '..', 'data', 'Clinical manifestation disease related.xlsx');

// Custom parser: read ALL cells from worksheet (bypasses sheet_to_json range limit)
function parseSheetAllCells(worksheet) {
  const rowsByIndex = {}; // rowIdx -> { colIdx -> value }
  let maxRow = -1;
  let maxCol = -1;
  for (const key of Object.keys(worksheet)) {
    if (key.startsWith('!')) continue;
    let addr;
    try {
      addr = XLSX.utils.decode_cell(key);
    } catch (_) { continue; }
    const { r, c } = addr;
    if (r > maxRow) maxRow = r;
    if (c > maxCol) maxCol = c;
    const cell = worksheet[key];
    const val = cell && (cell.w != null ? cell.w : cell.v);
    const str = val != null && val !== '' ? String(val).trim() : '';
    if (!rowsByIndex[r]) rowsByIndex[r] = {};
    rowsByIndex[r][c] = str;
  }
  if (maxRow < 1) return [];
  const headerRow = rowsByIndex[0] || {};
  const headers = [];
  for (let c = 0; c <= maxCol; c++) {
    const h = headerRow[c];
    headers.push(h != null && String(h).trim() !== '' ? String(h).trim() : `_col${c}`);
  }
  const rawRows = [];
  for (let r = 1; r <= maxRow; r++) {
    const rowObj = {};
    const row = rowsByIndex[r] || {};
    for (let c = 0; c <= maxCol; c++) {
      rowObj[headers[c]] = row[c] != null ? row[c] : '';
    }
    rawRows.push(rowObj);
  }
  return rawRows;
}

function parseWorkbookToEntries(workbook) {
  const rawRows = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const sheetRows = parseSheetAllCells(worksheet);
    if (sheetRows.length > 0) rawRows.push(...sheetRows);
  }
  return rawRows;
}

function mapRowToBiomarker(row) {
  const normalizeHeader = (h) => h.toString().trim().toLowerCase().replace(/\s+/g, '');
  const lowered = {};
  const raw = {};
  Object.keys(row).forEach((k) => {
    const normalized = normalizeHeader(k);
    lowered[normalized] = row[k];
    const v = row[k];
    if (v !== undefined && v !== null && v.toString().trim() !== '') raw[k] = v.toString().trim();
  });
  const antibodyRawKeys = ['Autoantibody', 'Autoantibodies', 'Antibody', 'Antibodies', 'Name', 'Biomarker', 'Biomarkers', 'AB'];
  const manifestationRawKeys = ['Clinical Manifestation', 'Clinical Manifestations', 'Manifestation', 'Manifestations', 'Disease related clinical manifestation'];
  const prevalenceRawKeys = ['Prevalence', 'Prevalence (% percentage)', 'Prevelanse (% percentage)'];
  const fieldMap = {
    name: ['name', 'autoantibody', 'antibody', 'biomarker', 'biomarkers', 'ab'],
    manifestation: ['manifestation', 'clinicalmanifestation', 'clinical_manifestation'],
    prevalence: ['prevalence', 'prevalence_percentage', 'prevalence(%percentage)', 'prevelanse(%percentage)'],
  };
  const getFirst = (keys) => {
    for (const key of keys) {
      if (lowered[key] !== undefined && lowered[key] !== null && lowered[key].toString().trim() !== '') return lowered[key].toString().trim();
    }
    return '';
  };
  let name = getFirst(fieldMap.name);
  if (!name) for (const k of antibodyRawKeys) { if (raw[k]?.trim()) { name = raw[k].trim(); break; } }
  if (!name && Object.keys(raw).length > 0) {
    const abKey = Object.keys(raw).find((k) => /antibody|biomarker|^name$/i.test(k));
    if (abKey) name = raw[abKey];
  }
  let manifestation = getFirst(fieldMap.manifestation);
  if (!manifestation) for (const k of manifestationRawKeys) { if (raw[k]?.trim()) { manifestation = raw[k].trim(); break; } }
  if (!manifestation && Object.keys(raw).length > 0) {
    const mKey = Object.keys(raw).find((k) => /manifestation|clinical|symptom/i.test(k));
    if (mKey) manifestation = raw[mKey];
  }
  let prevalence = getFirst(fieldMap.prevalence);
  if (!prevalence) for (const k of prevalenceRawKeys) { if (raw[k]?.trim()) { prevalence = raw[k].trim(); break; } }
  return { name: name || '', manifestation: manifestation || '', prevalence: prevalence || '', raw: Object.keys(raw).length ? raw : undefined };
}

export const importFromServerFile = async (req, res) => {
  try {
    if (!fs.existsSync(SERVER_DATA_FILE)) {
      return res.status(404).json({
        success: false,
        message: `File not found. Place "Clinical manifestation disease related.xlsx" in backend/data/`,
        expectedPath: SERVER_DATA_FILE,
      });
    }
    const buffer = fs.readFileSync(SERVER_DATA_FILE);
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const rawRows = parseWorkbookToEntries(workbook);
    const mapped = rawRows.map(mapRowToBiomarker);
    // Keep only rows with at least one non-empty cell (skip completely blank rows)
    const entries = mapped.filter((e) => e.raw && Object.keys(e.raw).length > 0);
    if (entries.length === 0) {
      return res.status(400).json({ success: false, message: 'No rows with data in file' });
    }
    await Biomarker.deleteMany({});
    const result = await Biomarker.insertMany(entries);
    console.log(`Biomarker import from server file: ${rawRows.length} rows → ${result.length} inserted`);
    res.json({
      success: true,
      message: `Imported ${result.length} biomarker entries from server file`,
      data: { inserted: result.length, total: rawRows.length, failed: rawRows.length - result.length },
    });
  } catch (error) {
    console.error('Import from server file error:', error);
    res.status(500).json({ success: false, message: error.message || 'Import failed' });
  }
};

// Export biomarkers (same format as import file)
export const exportBiomarkers = async (req, res) => {
  try {
    const { format = 'xlsx', search } = req.query;
    let query = {};
    if (search && search.trim()) {
      const escaped = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const searchRegex = new RegExp(escaped, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { manifestation: searchRegex },
          { prevalence: searchRegex },
          { 'raw.Disease': searchRegex },
          { 'raw.Autoantibody': searchRegex },
          { 'raw.Name': searchRegex },
          { 'raw.Clinical Manifestation': searchRegex },
          { 'raw.Disease Association': searchRegex },
          { 'raw.Disease Association (% percentage)': searchRegex },
          { 'raw.Prevalence': searchRegex },
          { 'raw.Prevalence (% percentage)': searchRegex },
          { 'raw.Prevelanse (% percentage)': searchRegex },
        ],
      };
    }

    const biomarkers = await Biomarker.find(query).sort({ createdAt: -1 }).lean();

    const headers = ['Autoantibody', 'Disease', 'Disease Association (% percentage)', 'Clinical Manifestation', 'Prevalence (% percentage)'];

    const rows = biomarkers.map((doc) => {
      const autoantibody = doc.name || doc.raw?.Autoantibody || doc.raw?.Name || '';
      const disease = doc.raw?.Disease || doc.raw?.disease || '';
      const diseaseAssociation = doc.raw?.['Disease Association (% percentage)'] || doc.raw?.['Disease Association'] || doc.raw?.DiseaseAssociation || '';
      const manifestation = doc.manifestation || doc.raw?.['Clinical Manifestation'] || doc.raw?.Manifestation || '';
      const prevalence = doc.prevalence || doc.raw?.['Prevalence (% percentage)'] || doc.raw?.['Prevelanse (% percentage)'] || doc.raw?.Prevalence || '';
      return [autoantibody, disease, diseaseAssociation, manifestation, prevalence];
    });

    const worksheetData = [headers, ...rows];
    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    if (format === 'csv') {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="biomarkers_export_${Date.now()}.csv"`);
      return res.send(csv);
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Biomarkers');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="biomarkers_export_${Date.now()}.xlsx"`);
    return res.send(buffer);
  } catch (error) {
    console.error('Biomarker export error:', error);
    res.status(500).json({ success: false, message: error.message || 'Export failed' });
  }
};

// Delete all biomarkers
export const deleteAllBiomarkers = async (req, res) => {
  try {
    const result = await Biomarker.deleteMany({});
    res.json({
      success: true,
      message: `Successfully removed ${result.deletedCount} biomarker entries`,
      data: { deleted: result.deletedCount },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message || 'Delete failed' });
  }
};

function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const searchBiomarkers = async (req, res) => {
  try {
    const { search } = req.query;
    let query = {};

    if (search) {
      const escaped = escapeRegex(search.trim());
      const searchRegex = new RegExp(escaped, 'i');
      query = {
        $or: [
          { name: searchRegex },
          { manifestation: searchRegex },
          { 'raw.Disease': searchRegex },
          { 'raw.disease': searchRegex },
          { 'raw.Autoantibody': searchRegex },
          { 'raw.Biomarker': searchRegex },
          { 'raw.Name': searchRegex },
          { 'raw.Antibody': searchRegex },
          { 'raw.Antibodies': searchRegex },
        ],
      };
    }

    // Return up to 5000 results to ensure all antibodies with diseases are fetched (no truncation at 2xxx)
    const limit = 5000;
    const biomarkers = await Biomarker.find(query).limit(limit).lean();
    res.json(biomarkers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const bulkBiomarkers = async (req, res) => {
  try {
    const { names } = req.body;
    if (!names || !Array.isArray(names)) {
      return res.status(400).json({ error: 'Names must be an array' });
    }

    const biomarkers = await Biomarker.find({
      name: { $in: names.map((n) => new RegExp(`^${n}$`, 'i')) },
    });
    res.json(biomarkers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
