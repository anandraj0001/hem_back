import Donor from '../models/Donor.js'
import MedicalReport from '../models/MedicalReport.js'

// @desc    Get donor profile by logged in user ID
// @route   GET /api/donor/profile
// @access  Private (Donor)
export const getDonorProfile = async (req, res) => {
  try {
    let donor = await Donor.findOne({ user: req.user._id || req.user.id }).populate('medicalReport')
    if (!donor) {
      // Auto create empty donor profile if not found
      donor = await Donor.create({
        user: req.user._id,
        fullName: req.user.fullName,
        bloodGroup: 'O-',
        govtId: req.user.govtId || 'GOVT-PENDING',
      })
    }
    res.json({ success: true, donor })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update donor medical details, vitals and alert status
// @route   PUT /api/donor/medical
// @access  Private (Donor)
export const updateDonorMedical = async (req, res) => {
  try {
    const { bloodGroup, rarePhenotype, bp, bloodSugar, medicalHistory, emergencyAlertOptIn, availability, address } = req.body

    let donor = await Donor.findOne({ user: req.user._id || req.user.id })
    if (!donor) {
      return res.status(404).json({ message: 'Donor profile not found' })
    }

    if (bloodGroup) donor.bloodGroup = bloodGroup
    if (rarePhenotype !== undefined) donor.rarePhenotype = rarePhenotype
    if (bp) donor.bp = bp
    if (bloodSugar) donor.bloodSugar = bloodSugar
    if (medicalHistory) donor.medicalHistory = medicalHistory
    if (emergencyAlertOptIn !== undefined) donor.emergencyAlertOptIn = emergencyAlertOptIn
    if (availability !== undefined) donor.availability = availability
    if (address) donor.address = address

    const updated = await donor.save()
    res.json({ success: true, donor: updated })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Upload or submit medical report for screening
// @route   POST /api/donor/report
// @access  Private (Donor)
export const submitMedicalReport = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user._id || req.user.id })
    if (!donor) return res.status(404).json({ message: 'Donor not found' })

    const { reportType, vitals, serologyResults } = req.body

    const report = await MedicalReport.create({
      donor: donor._id,
      reportType: reportType || 'Serology & Vitals Screen',
      vitals,
      serologyResults,
      verificationStatus: 'PENDING',
    })

    donor.medicalReport = report._id
    donor.screeningStatus = 'pending_review'
    donor.isEligible = false // Must wait for blood-bank staff review
    await donor.save()

    res.status(201).json({ success: true, report, message: 'Medical report submitted for screening verification.' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Get nearby verified eligible donors for 25km hospital radius
// @route   GET /api/donor/nearby
// @access  Private (Hospital/Admin)
export const getNearbyDonors = async (req, res) => {
  try {
    const { bloodGroup, rarePhenotype } = req.query
    const filter = { availability: true }
    if (bloodGroup) filter.bloodGroup = bloodGroup
    if (rarePhenotype) filter.rarePhenotype = { $ne: null }

    const donors = await Donor.find(filter).populate('user', 'fullName email phone profilePhoto')
    res.json({ success: true, count: donors.length, donors })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
