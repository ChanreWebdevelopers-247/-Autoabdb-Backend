import mongoose from "mongoose";

const dataSchema = new mongoose.Schema(
  {
    disease: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    databaseAccessionNumbers: {
      type: String,
      required: false,
      trim: true,
    },
    autoantibody: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    synonym: {
      type: String,
      required: false,
      trim: true,
    },
    diseaseAssociation: {
      type: String,
      required: false,
      trim: true,
    },
    autoantigen: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    epitope: {
      type: String,
      required: true,
      trim: true,
    },
    epitopePrevalence: {
      type: String,
      required: false,
    },
    uniprotId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    screening: {
      type: String,
      required: false,
      trim: true,
    },
    confirmation: {
      type: String,
      required: false,
      trim: true,
    },
    monitoring: {
      type: String,
      required: false,
      trim: true,
    },
    affinity: {
      type: String,
      required: false,
      trim: true,
    },
    avidity: {
      type: String,
      required: false,
      trim: true,
    },
    mechanism: {
      type: String,
      required: false,
      trim: true,
    },
    isotypeSubclasses: {
      type: String,
      required: false,
      trim: true,
    },
    sensitivity: {
      type: String,
      required: false,
      trim: true,
    },
    diagnosticMarker: {
      type: String,
      required: false,
      trim: true,
    },
    associationWithDiseaseActivity: {
      type: String,
      required: false,
      trim: true,
    },
    positivePredictiveValues: {
      type: String,
      required: false,
      trim: true,
    },
    negativePredictiveValues: {
      type: String,
      required: false,
      trim: true,
    },
    crossReactivityPatterns: {
      type: String,
      required: false,
      trim: true,
    },
    pathogenesisInvolvement: {
      type: String,
      required: false,
      trim: true,
    },
    referenceRangesAndCutoffValues: {
      type: String,
      required: false,
      trim: true,
    },
    reference: {
      type: String,
      required: false,
      trim: true,
    },
    type: {
      type: String,
      required: false,
      trim: true,
    },
    priority: {
      type: String,
      required: false,
      trim: true,
    },
    // Keep the original additional field for any extra data
    additional: {
      type: Map,
      of: String,
      default: {}
    },
    metadata: {
      source: {
        type: String,
        default: 'Adrenalitis CF 2.xlsx'
      },
      dateAdded: {
        type: Date,
        default: Date.now,
      },
      lastUpdated: {
        type: Date,
        default: Date.now,
      },
      verified: {
        type: Boolean,
        default: false,
      },
      dataVersion: {
        type: String,
        default: '1.0'
      }
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Compound indexes for better search performance
dataSchema.index({ disease: 1, autoantibody: 1 });
dataSchema.index({ autoantigen: 1, uniprotId: 1 });
dataSchema.index({ disease: 1, diagnosticMarker: 1 });
dataSchema.index({ affinity: 1, sensitivity: 1 });
dataSchema.index({ synonym: 1, type: 1 });

// Text search index for full-text search capabilities
dataSchema.index({
  disease: "text",
  autoantibody: "text",
  synonym: "text",
  autoantigen: "text",
  epitope: "text",
  mechanism: "text",
  pathogenesisInvolvement: "text",
  screening: "text",
  confirmation: "text",
  monitoring: "text",
});

// Virtual for formatted epitope prevalence
dataSchema.virtual('formattedEpitopePrevalence').get(function() {
  if (typeof this.epitopePrevalence === 'number') {
    return `${(this.epitopePrevalence * 100).toFixed(1)}%`;
  }
  return this.epitopePrevalence;
});

// Virtual for combined diagnostic methods
dataSchema.virtual('diagnosticMethods').get(function() {
  const methods = [];
  if (this.screening) methods.push(`Screening: ${this.screening}`);
  if (this.confirmation) methods.push(`Confirmation: ${this.confirmation}`);
  if (this.monitoring) methods.push(`Monitoring: ${this.monitoring}`);
  return methods.join('; ');
});

// Virtual for predictive values summary
dataSchema.virtual('predictiveValuesSummary').get(function() {
  const values = [];
  if (this.positivePredictiveValues) values.push(`PPV: ${this.positivePredictiveValues}`);
  if (this.negativePredictiveValues) values.push(`NPV: ${this.negativePredictiveValues}`);
  return values.join('; ');
});

// Pre-save middleware to update lastUpdated
dataSchema.pre('save', function(next) {
  if (this.isModified() && !this.isNew) {
    this.metadata.lastUpdated = Date.now();
  }
  next();
});

// Static method to get diseases summary
dataSchema.statics.getDiseasesSummary = function() {
  return this.aggregate([
    {
      $group: {
        _id: '$disease',
        count: { $sum: 1 },
        autoantibodies: { $addToSet: '$autoantibody' },
        diagnosticMarkers: { $sum: { $cond: [{ $eq: ['$diagnosticMarker', 'Yes'] }, 1, 0] } },
        types: { $addToSet: '$type' }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Static method to find by disease and autoantibody
dataSchema.statics.findByDiseaseAndAutoantibody = function(disease, autoantibody) {
  return this.find({
    disease: new RegExp(disease, 'i'),
    autoantibody: new RegExp(autoantibody, 'i')
  });
};

// Static method to search by synonym or autoantibody
dataSchema.statics.findByAutoantibodyOrSynonym = function(searchTerm) {
  return this.find({
    $or: [
      { autoantibody: new RegExp(searchTerm, 'i') },
      { synonym: new RegExp(searchTerm, 'i') }
    ]
  });
};

// Static method to find by diagnostic methods
dataSchema.statics.findByDiagnosticMethod = function(method) {
  return this.find({
    $or: [
      { screening: new RegExp(method, 'i') },
      { confirmation: new RegExp(method, 'i') },
      { monitoring: new RegExp(method, 'i') }
    ]
  });
};

export default mongoose.model("diseaseData", dataSchema);