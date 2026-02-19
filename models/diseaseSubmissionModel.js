import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    disease: { type: String, required: true, trim: true, index: true },
    autoantibody: { type: String, required: true, trim: true, index: true },
    diseaseAssociation: { type: String, required: false, trim: true },
    autoantigen: { type: String, required: true, trim: true, index: true },
    epitope: { type: String, required: true, trim: true },
    epitopePrevalence: { type: String, required: false },
    uniprotId: { type: String, required: true, trim: true, index: true },
    affinity: { type: String, required: false, trim: true },
    avidity: { type: String, required: false, trim: true },
    mechanism: { type: String, required: false, trim: true },
    isotypeSubclasses: { type: String, required: false, trim: true },
    sensitivity: { type: String, required: false, trim: true },
    diagnosticMarker: { type: String, required: false, trim: true },
    associationWithDiseaseActivity: { type: String, required: false, trim: true },
    pathogenesisInvolvement: { type: String, required: false, trim: true },
    reference: { type: String, required: true, trim: true },
    additional: { type: Map, of: String, default: {} },

    // Submission and approval workflow
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending', index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNote: { type: String },

    metadata: {
      source: { type: String, default: 'user_submission' },
      dateAdded: { type: Date, default: Date.now },
      lastUpdated: { type: Date, default: Date.now },
      verified: { type: Boolean, default: false },
      dataVersion: { type: String, default: '1.0' }
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

submissionSchema.index({ disease: 1, autoantibody: 1 });
submissionSchema.index({ autoantigen: 1, uniprotId: 1 });
submissionSchema.index({ disease: 1, diagnosticMarker: 1 });
submissionSchema.index({ status: 1, submittedBy: 1 });

submissionSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.metadata.lastUpdated = Date.now();
  }
  next();
});

export default mongoose.model('diseaseSubmission', submissionSchema);


