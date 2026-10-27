import mongoose from 'mongoose'

const inventoryTransactionSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      required: true,
      enum: ['ADD', 'REMOVE', 'RESERVE', 'RELEASE', 'EXPIRE', 'TRANSFUSE/ISSUE', 'ADJUSTMENT'],
    },
    bloodGroup: {
      type: String,
      required: true,
    },
    component: {
      type: String,
      default: 'Whole Blood',
    },
    quantity: {
      type: Number,
      required: true,
    },
    batchNumber: {
      type: String,
      required: true,
    },
    inventory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodInventory',
      default: null,
    },
    performedBy: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    performedByName: {
      type: String,
      default: 'System Administrator',
    },
    reason: {
      type: String,
      default: '',
    },
    relatedRequestId: {
      type: String,
      default: null,
    },
    recipientHospital: {
      type: String,
      default: null,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
)

const InventoryTransaction = mongoose.model('InventoryTransaction', inventoryTransactionSchema)

export default InventoryTransaction
