import mongoose from 'mongoose'

const stockThresholdSchema = new mongoose.Schema(
  {
    thresholds: {
      'A+': { type: Number, default: 10 },
      'A-': { type: Number, default: 5 },
      'B+': { type: Number, default: 10 },
      'B-': { type: Number, default: 5 },
      'AB+': { type: Number, default: 5 },
      'AB-': { type: Number, default: 3 },
      'O+': { type: Number, default: 15 },
      'O-': { type: Number, default: 5 },
      'Bombay Oh': { type: Number, default: 2 },
      'Rh-null': { type: Number, default: 2 },
      'Kell-null': { type: Number, default: 2 },
      'Duffy-null': { type: Number, default: 2 },
      'Other Rare': { type: Number, default: 2 },
    },
    updatedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    updatedByName: {
      type: String,
      default: 'Administrator',
    },
  },
  {
    timestamps: true,
  }
)

// Helper to get or create single settings document
stockThresholdSchema.statics.getOrCreate = async function () {
  let doc = await this.findOne()
  if (!doc) {
    doc = await this.create({
      thresholds: {
        'A+': 10,
        'A-': 5,
        'B+': 10,
        'B-': 5,
        'AB+': 5,
        'AB-': 3,
        'O+': 15,
        'O-': 5,
        'Bombay Oh': 2,
        'Rh-null': 2,
        'Kell-null': 2,
        'Duffy-null': 2,
        'Other Rare': 2,
      },
    })
  }
  return doc
}

const StockThreshold = mongoose.model('StockThreshold', stockThresholdSchema)

export default StockThreshold
