import mongoose from 'mongoose';

const biomarkerSchema = new mongoose.Schema(
  {
    name: { type: String, required: false },
    manifestation: { type: String, required: false },
    prevalence: { type: String, required: false },
    raw: { type: mongoose.Schema.Types.Mixed },
  },
  { timestamps: true }
);

export default mongoose.model('Biomarker', biomarkerSchema);
