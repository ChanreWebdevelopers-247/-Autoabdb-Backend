// seedBiomarkers.js
// Run from backend folder: node scripts/seedBiomarkers.js
// Requires: Copy "Clinical manifestation disease related .xlsx" to backend/data/
// Or ensure ../../bio-backend/data/ contains the file (sibling project)

import mongoose from 'mongoose';
import XLSX from 'xlsx';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Biomarker from '../models/biomarkerModel.js';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env') });

const EXCEL_FILENAME = 'Clinical manifestation disease related .xlsx';
const DATA_PATHS = [
  path.join(__dirname, '../data', EXCEL_FILENAME),
  path.join(__dirname, '../../../bio-backend/data', EXCEL_FILENAME),
];

const seedBiomarkers = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    let filePath = null;
    for (const p of DATA_PATHS) {
      if (fs.existsSync(p)) {
        filePath = p;
        break;
      }
    }

    if (!filePath) {
      console.error(
        `❌ Excel file not found. Place "${EXCEL_FILENAME}" in autoabdb/backend/data/ or ensure bio-backend/data/ exists.`
      );
      process.exit(1);
    }

    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Found ${data.length} records in Excel`);

    const biomarkers = data.map((row) => {
      const name =
        row['Autoantibody '] || row.Biomarker || row.Antibody || Object.values(row)[0];
      const manifestation =
        row['Clinical Manifestation'] ||
        row['Disease related clinical manifestation'] ||
        row.Symptoms;
      const prevalence =
        row['Prevelanse (% percentage)'] || row.Prevelanse || row.Prevalence;

      return {
        name: name ? String(name).trim() : 'Unknown',
        manifestation: manifestation ? String(manifestation).trim() : '',
        prevalence: prevalence ? String(prevalence).trim() : '',
        raw: row,
      };
    });

    await Biomarker.deleteMany({});
    console.log('🗑️ Cleared existing biomarkers');

    await Biomarker.insertMany(biomarkers);
    console.log(`✅ Imported ${biomarkers.length} biomarkers`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding biomarkers:', error);
    process.exit(1);
  }
};

seedBiomarkers();
