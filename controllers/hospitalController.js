import Hospital from '../models/Hospital.js'
import BloodRequest from '../models/BloodRequest.js'
import Donor from '../models/Donor.js'
import MedicalReport from '../models/MedicalReport.js'

// @desc    Get Hospital profile
// @route   GET /api/hospital/profile
// @access  Private (Hospital)
export const getHospitalProfile = async (req, res) => {
  try {
    let hospital = await Hospital.findOne({ user: req.user._id || req.user.id })
    if (!hospital) {
      hospital = await Hospital.create({
        user: req.user._id,
        hospitalName: req.user.fullName || 'Sanjeevani General Hospital',
        registrationNumber: `HOSP-${Date.now().toString(36).toUpperCase()}`,
        contactPhone: req.user.phone || '011-23456789',
        contactEmail: req.user.email,
        address: {
          fullAddress: 'Trauma Command Center, Metro Medical Enclave, New Delhi',
          location: { lat: 28.6139, lng: 77.2090 },
        },
      })
    }
    res.json({ success: true, hospital })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get all pending donor medical reports for Blood Bank verification
// @route   GET /api/hospital/screenings
// @access  Private (Hospital/BloodBank/Admin)
export const getPendingScreenings = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ verificationStatus: 'PENDING' }).populate('donor')
    res.json({ success: true, count: reports.length, reports })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Verify or reject donor medical report
// @route   PUT /api/hospital/screenings/:id/verify
// @access  Private (Hospital/BloodBank/Admin)
export const verifyDonorReport = async (req, res) => {
  try {
    const { status, clinicalNotes } = req.body // status: 'APPROVED_FIT' | 'REJECTED_UNFIT'
    const report = await MedicalReport.findById(req.params.id)
    if (!report) return res.status(404).json({ message: 'Medical report not found' })

    report.verificationStatus = status
    report.verifiedBy = req.user._id
    report.verifiedAt = new Date()
    report.clinicalNotes = clinicalNotes || ''
    await report.save()

    // Update corresponding donor's eligibility status
    const donor = await Donor.findById(report.donor)
    if (donor) {
      if (status === 'APPROVED_FIT') {
        donor.screeningStatus = 'eligible_for_donation'
        donor.isEligible = true
      } else {
        donor.screeningStatus = 'not_eligible'
        donor.isEligible = false
      }
      await donor.save()
    }

    res.json({ success: true, message: `Donor status updated to ${status}`, report })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
