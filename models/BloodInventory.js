import mongoose from 'mongoose'

const bloodInventorySchema = new mongoose.Schema(
  {
    bloodGroup: {
      type: String,
      required: [true, 'Blood group is required'],
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Bombay Oh', 'Rh-null', 'Kell-null', 'Duffy-null', 'Other Rare'],
      trim: true,
    },
    componentType: {
      type: String,
      required: [true, 'Component type is required'],
      enum: ['Whole Blood', 'RBC', 'Plasma', 'Platelets', 'Cryoprecipitate'],
      default: 'Whole Blood',
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      default: 1,
    },
    units: {
      type: Number,
      default: function () {
        return this.quantity
      },
    },
    collectionDate: {
      type: Date,
      default: Date.now,
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required'],
    },
    status: {
      type: String,
      enum: ['AVAILABLE', 'LOW', 'OUT_OF_STOCK', 'EXPIRED', 'RESERVED', 'ARCHIVED'],
      default: 'AVAILABLE',
    },
    bloodBank: {
      type: String,
      default: 'Central HemaTix Blood Reserve',
    },
    storageLocation: {
      type: String,
      default: 'Cold Vault Unit A-1',
      trim: true,
    },
    batchNumber: {
      type: String,
      required: [true, 'Batch number is required'],
      unique: true,
      trim: true,
      uppercase: true,
    },
    donorId: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    donorName: {
      type: String,
      default: null,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
)

// Pre-save hook: auto calculate status based on expiry and quantity
bloodInventorySchema.pre('save', function (next) {
  const now = new Date()
  if (this.expiryDate && new Date(this.expiryDate) <= now) {
    this.status = 'EXPIRED'
  } else if (this.quantity === 0 && this.status !== 'ARCHIVED') {
    this.status = 'OUT_OF_STOCK'
  } else if (this.status === 'AVAILABLE' && this.quantity <= 2) {
    this.status = 'LOW'
  }
  this.units = this.quantity
  next()
})

// Static helper to auto update expired statuses in bulk
bloodInventorySchema.statics.syncExpiredStatuses = async function () {
  const now = new Date()
  await this.updateMany(
    {
      expiryDate: { $lte: now },
      status: { $nin: ['EXPIRED', 'ARCHIVED'] },
    },
    {
      $set: { status: 'EXPIRED' },
    }
  )
}

const BloodInventory = mongoose.model('BloodInventory', bloodInventorySchema)

export default BloodInventory
