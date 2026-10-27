import mongoose from 'mongoose'

const bloodRequestSchema = new mongoose.Schema(
  {
    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    },
    requestedBy: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    hospitalName: {
      type: String,
      required: true,
    },
    bloodGroup: {
      type: String,
      required: true,
      enum: ['O-', 'O+', 'A-', 'A+', 'B-', 'B+', 'AB-', 'AB+', 'Bombay Oh', 'Rh-null', 'Kell-null', 'Duffy-null', 'Other Rare'],
    },
    rarePhenotype: {
      type: Boolean,
      default: false,
    },
    rarePhenotypeType: {
      type: String,
      default: null,
    },
    component: {
      type: String,
      required: true,
      default: 'Whole Blood',
    },
    units: {
      type: Number,
      required: true,
      min: [1, 'Must request at least 1 unit'],
      max: 20,
    },
    urgency: {
      type: String,
      required: true,
      enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'ROUTINE'],
      default: 'HIGH',
    },
    location: {
      type: String,
      required: true,
    },
    requiredTime: {
      type: String,
      default: 'immediate',
    },
    patientNote: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: [
        'REQUEST_CREATED',
        'OPEN',
        'MATCHING',
        'ACCEPTED',
        'DONOR_ACCEPTED',
        'DONOR_DECLINED',
        'WAITING_FOR_VERIFICATION',
        'WAITING_FOR_HOSPITAL_VERIFICATION',
        'ACCEPTED_VERIFIED',
        'VERIFICATION_REJECTED',
        'BLOOD_COLLECTED',
        'COLLECTED',
        'PICKUP',
        'ASSIGNED',
        'GOING_TO_PICKUP',
        'IN_PROGRESS',
        'IN_TRANSIT',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'REQUEST_CREATED',
    },
    overallStatus: {
      type: String,
      enum: [
        'PENDING',
        'REQUEST_CREATED',
        'OPEN',
        'MATCHING',
        'DONOR_ACCEPTED',
        'DONOR_DECLINED',
        'WAITING_FOR_VERIFICATION',
        'WAITING_FOR_HOSPITAL_VERIFICATION',
        'ACCEPTED_VERIFIED',
        'VERIFICATION_REJECTED',
        'BLOOD_COLLECTED',
        'COLLECTED',
        'PICKUP',
        'ASSIGNED',
        'GOING_TO_PICKUP',
        'IN_PROGRESS',
        'IN_TRANSIT',
        'DELIVERED',
        'COMPLETED',
        'CANCELLED',
        'EXPIRED',
      ],
      default: 'REQUEST_CREATED',
    },
    donorStatus: {
      type: String,
      enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
      default: 'PENDING',
    },
    hospitalVerificationStatus: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    hospitalAddress: {
      type: String,
      default: '',
    },
    hospitalContact: {
      type: String,
      default: '',
    },
    donorAcceptedAt: {
      type: Date,
      default: null,
    },
    hospitalVerifiedAt: {
      type: Date,
      default: null,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    pickedUpAt: {
      type: Date,
      default: null,
    },
    deliveredAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    verifiedByName: {
      type: String,
      default: '',
    },
    collectionDate: {
      type: String,
      default: '',
    },
    collectionTime: {
      type: String,
      default: '',
    },
    reportingTime: {
      type: String,
      default: '',
    },
    hospitalInstructions: {
      type: String,
      default: '',
    },
    distanceKm: {
      type: Number,
      default: null,
    },
    acceptedDonor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      default: null,
    },
    matchedDonors: [
      {
        donor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Donor',
        },
        status: {
          type: String,
          enum: ['NOTIFIED', 'ACCEPTED', 'DECLINED', 'DONOR_ACCEPTED', 'DONOR_DECLINED', 'VERIFIED', 'SCREENED_FIT', 'COLLECTED'],
          default: 'NOTIFIED',
        },
        donorStatus: {
          type: String,
          enum: ['PENDING', 'ACCEPTED', 'DECLINED'],
          default: 'PENDING',
        },
        hospitalVerificationStatus: {
          type: String,
          enum: ['PENDING', 'VERIFIED', 'REJECTED'],
          default: 'PENDING',
        },
        donorAcceptedAt: Date,
        hospitalVerifiedAt: Date,
        notifiedAt: {
          type: Date,
          default: Date.now,
        },
        respondedAt: Date,
      },
    ],
    assignedRider: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const BloodRequest = mongoose.model('BloodRequest', bloodRequestSchema)

export default BloodRequest
