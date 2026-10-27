import mongoose from 'mongoose'

const medicalReportSchema = new mongoose.Schema(
  {
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      required: true,
    },
    reportType: {
      type: String,
      default: 'Serology & CBC Verification',
    },
    reportFileUrl: {
      type: String,
      default: null,
    },
    originalFileName: String,
    vitals: {
      bpSystolic: Number,
      bpDiastolic: Number,
      hemoglobin: Number,
      bloodSugar: Number,
      weightKg: Number,
    },
    serologyResults: {
      hiv: { type: String, enum: ['NEGATIVE', 'POSITIVE', 'INDETERMINATE', 'PENDING'], default: 'PENDING' },
      hepatitisB: { type: String, enum: ['NEGATIVE', 'POSITIVE', 'INDETERMINATE', 'PENDING'], default: 'PENDING' },
      hepatitisC: { type: String, enum: ['NEGATIVE', 'POSITIVE', 'INDETERMINATE', 'PENDING'], default: 'PENDING' },
      syphilis: { type: String, enum: ['NEGATIVE', 'POSITIVE', 'INDETERMINATE', 'PENDING'], default: 'PENDING' },
      malaria: { type: String, enum: ['NEGATIVE', 'POSITIVE', 'INDETERMINATE', 'PENDING'], default: 'PENDING' },
    },
    verificationStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED_FIT', 'REJECTED_UNFIT'],
      default: 'PENDING',
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedAt: Date,
    clinicalNotes: String,
  },
  {
    timestamps: true,
  }
)

const MedicalReport = mongoose.model('MedicalReport', medicalReportSchema)

export default MedicalReport
