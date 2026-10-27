import mongoose from 'mongoose'

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    donor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Donor',
      default: null,
    },
    type: {
      type: String,
      enum: ['DONOR_VERIFIED', 'REQUEST_ALERT', 'DONOR_ACCEPTED', 'GENERAL'],
      default: 'DONOR_VERIFIED',
    },
    title: {
      type: String,
      required: true,
      default: 'Blood Donation Request Verified',
    },
    message: {
      type: String,
      required: true,
    },
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'BloodRequest',
      default: null,
    },
    requestData: {
      requestId: String,
      hospitalName: String,
      hospitalAddress: String,
      hospitalContact: String,
      bloodGroup: String,
      component: String,
      units: Number,
      urgency: String,
      requestDate: Date,
      verifiedDate: Date,
      collectionDate: String,
      collectionTime: String,
      reportingTime: String,
      location: String,
      distanceKm: Number,
      status: String,
      overallStatus: String,
      hospitalInstructions: String,
    },
    read: {
      type: Boolean,
      default: false,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
)

const Notification = mongoose.model('Notification', notificationSchema)

export default Notification
