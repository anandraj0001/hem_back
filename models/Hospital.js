import mongoose from 'mongoose'

const hospitalSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    hospitalName: {
      type: String,
      required: [true, 'Hospital name is required'],
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: [true, 'Hospital registration number is required'],
      unique: true,
      trim: true,
    },
    address: {
      street: String,
      ward: String,
      city: String,
      state: String,
      pincode: String,
      fullAddress: String,
      location: {
        lat: { type: Number, default: 28.6139 },
        lng: { type: Number, default: 77.2090 },
      },
    },
    contactPhone: {
      type: String,
      required: true,
    },
    contactEmail: {
      type: String,
      lowercase: true,
    },
    bloodBankInCharge: {
      name: String,
      phone: String,
      licenseNo: String,
    },
    isVerifiedHospital: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
)

const Hospital = mongoose.model('Hospital', hospitalSchema)

export default Hospital
