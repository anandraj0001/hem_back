import mongoose from 'mongoose'

const donationHistorySchema = new mongoose.Schema({
  donationDate: { type: Date, default: Date.now },
  hospitalName: { type: String, required: true },
  unitsDonated: { type: Number, default: 1 },
  bloodComponent: { type: String, default: 'Whole Blood' },
  status: { type: String, enum: ['completed', 'scheduled', 'cancelled'], default: 'completed' },
  notes: String,
})

const donorSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    dob: {
      type: Date,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'Bombay Oh', 'Rh-null', 'Kell-null', 'Duffy-null', 'Other Rare'],
    },
    rarePhenotype: {
      type: String,
      default: null,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      location: {
        lat: Number,
        lng: Number,
      },
    },
    emergencyContact: {
      name: String,
      relation: String,
      phone: String,
    },
    govtId: {
      type: String,
      required: true,
    },
    medicalHistory: {
      allergies: [String],
      chronicIllnesses: [String],
      medications: [String],
      surgeriesPastYear: Boolean,
      hbLevel: Number, // Hemoglobin level (g/dL)
      lastDonationDate: Date,
    },
    medicalReport: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalReport',
      default: null,
    },
    bp: {
      systolic: Number,
      diastolic: Number,
    },
    bloodSugar: {
      fasting: Number,
      random: Number,
    },
    screeningStatus: {
      type: String,
      enum: ['pending_review', 'eligible_for_donation', 'temporarily_deferred', 'not_eligible'],
      default: 'pending_review',
    },
    isEligible: {
      type: Boolean,
      default: false, // Donor only becomes eligible after medical screening/report verification
    },
    availability: {
      type: Boolean,
      default: true,
    },
    emergencyAlertOptIn: {
      type: Boolean,
      default: true,
    },
    donationHistory: [donationHistorySchema],
  },
  {
    timestamps: true,
  }
)

const Donor = mongoose.model('Donor', donorSchema)

export default Donor
