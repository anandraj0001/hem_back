import BloodRequest from '../models/BloodRequest.js'
import Donor from '../models/Donor.js'
import Notification from '../models/Notification.js'

// @desc    Create emergency blood request
// @route   POST /api/blood-requests
// @access  Private (Hospital/Admin)
export const createBloodRequest = async (req, res) => {
  try {
    const {
      bloodGroup,
      rarePhenotype,
      rarePhenotypeType,
      component,
      units,
      urgency,
      location,
      hospitalName,
      hospitalAddress,
      hospitalContact,
      requiredTime,
      patientNote,
    } = req.body

    const request = await BloodRequest.create({
      requestedBy: req.user._id || req.user.id,
      hospitalName: hospitalName || req.user.fullName || 'Sanjeevani Trauma Center',
      hospitalAddress: hospitalAddress || 'Ring Road, Karol Bagh, New Delhi',
      hospitalContact: hospitalContact || req.user.phone || '+91 11 4022 5588',
      bloodGroup,
      rarePhenotype: Boolean(rarePhenotype),
      rarePhenotypeType: rarePhenotype ? rarePhenotypeType : null,
      component: component || 'Whole Blood',
      units: Number(units) || 1,
      urgency: urgency || 'HIGH',
      location: location || hospitalAddress || 'Trauma ICU Desk',
      requiredTime: requiredTime || 'immediate',
      patientNote: patientNote || '',
      status: 'REQUEST_CREATED',
      overallStatus: 'REQUEST_CREATED',
      donorStatus: 'PENDING',
      hospitalVerificationStatus: 'PENDING',
    })

    // Search & match verified eligible donors
    const filter = {
      bloodGroup,
      isEligible: true,
      availability: true,
    }
    if (rarePhenotype && rarePhenotypeType) {
      filter.rarePhenotype = rarePhenotypeType
    }

    const matchedDonorsList = await Donor.find(filter).populate('user', 'fullName phone email').limit(10)

    if (matchedDonorsList.length > 0) {
      request.matchedDonors = matchedDonorsList.map((d) => ({
        donor: d._id,
        status: 'NOTIFIED',
        donorStatus: 'PENDING',
        hospitalVerificationStatus: 'PENDING',
        notifiedAt: new Date(),
      }))
      await request.save()

      // Create notification for matched donors
      for (const d of matchedDonorsList) {
        if (d.user?._id) {
          try {
            await Notification.create({
              recipient: d.user._id,
              donor: d._id,
              type: 'REQUEST_ALERT',
              title: `Urgent Blood Request: ${bloodGroup}`,
              message: `Urgent request for ${units} unit(s) of ${bloodGroup} blood at ${request.hospitalName}.`,
              requestId: request._id,
              requestData: {
                requestId: `REQ-${request._id.toString().slice(-4).toUpperCase()}`,
                hospitalName: request.hospitalName,
                hospitalAddress: request.hospitalAddress,
                hospitalContact: request.hospitalContact,
                bloodGroup: request.bloodGroup,
                component: request.component,
                units: request.units,
                urgency: request.urgency,
                requestDate: request.createdAt,
                location: request.location,
                overallStatus: 'REQUEST_CREATED',
                status: 'REQUEST_CREATED',
              },
            })
          } catch (notifErr) {
            console.error('Error creating donor alert notification:', notifErr.message)
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Emergency blood request created and dispatched to matched eligible donors',
      request,
      matchesFound: matchedDonorsList.length,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get all active blood requests
// @route   GET /api/blood-requests
// @access  Private
export const getBloodRequests = async (req, res) => {
  try {
    const requests = await BloodRequest.find()
      .sort({ createdAt: -1 })
      .populate('requestedBy', 'fullName phone email')
      .populate('verifiedBy', 'fullName phone email')
      .populate({
        path: 'matchedDonors.donor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    res.json({ success: true, count: requests.length, requests })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get single blood request by ID
// @route   GET /api/blood-requests/:id
// @access  Private
export const getBloodRequestById = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
      .populate('requestedBy', 'fullName phone email')
      .populate('verifiedBy', 'fullName phone email')
      .populate({
        path: 'matchedDonors.donor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' })
    }

    res.json({ success: true, request })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Donor responds to request (Accept / Decline)
// @route   PUT /api/blood-requests/:id/donor-respond
// @access  Private (Donor)
export const donorRespondToRequest = async (req, res) => {
  try {
    const { response } = req.body // 'ACCEPTED' | 'DECLINED' or 'accepted' | 'declined'
    const cleanResponse = (response || '').toUpperCase()

    if (!['ACCEPTED', 'DECLINED'].includes(cleanResponse)) {
      return res.status(400).json({ success: false, message: 'Response must be ACCEPTED or DECLINED' })
    }

    const request = await BloodRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' })
    }

    // Find donor profile associated with logged in user
    let donor = await Donor.findOne({ user: req.user._id || req.user.id })
    if (!donor) {
      donor = await Donor.create({
        user: req.user._id || req.user.id,
        fullName: req.user.fullName || 'Blood Donor',
        bloodGroup: request.bloodGroup || 'O-',
        govtId: req.user.govtId || 'GOVT-VERIFIED',
        isEligible: true,
        availability: true,
      })
    }

    if (cleanResponse === 'ACCEPTED') {
      request.donorStatus = 'ACCEPTED'
      request.donorAcceptedAt = new Date()
      request.hospitalVerificationStatus = 'PENDING'
      request.overallStatus = 'WAITING_FOR_HOSPITAL_VERIFICATION'
      request.status = 'DONOR_ACCEPTED'
      request.acceptedDonor = donor._id

      // Update matched donors entry
      let foundMatch = false
      request.matchedDonors = (request.matchedDonors || []).map((m) => {
        if (m.donor && m.donor.toString() === donor._id.toString()) {
          foundMatch = true
          return {
            ...m.toObject(),
            donor: m.donor,
            status: 'DONOR_ACCEPTED',
            donorStatus: 'ACCEPTED',
            hospitalVerificationStatus: 'PENDING',
            donorAcceptedAt: new Date(),
            respondedAt: new Date(),
          }
        }
        return m
      })

      if (!foundMatch) {
        request.matchedDonors.push({
          donor: donor._id,
          status: 'DONOR_ACCEPTED',
          donorStatus: 'ACCEPTED',
          hospitalVerificationStatus: 'PENDING',
          donorAcceptedAt: new Date(),
          respondedAt: new Date(),
        })
      }
    } else {
      request.donorStatus = 'DECLINED'
      request.overallStatus = 'DONOR_DECLINED'
      request.status = 'DONOR_DECLINED'

      request.matchedDonors = (request.matchedDonors || []).map((m) => {
        if (m.donor && m.donor.toString() === donor._id.toString()) {
          return {
            ...m.toObject(),
            donor: m.donor,
            status: 'DECLINED',
            donorStatus: 'DECLINED',
            respondedAt: new Date(),
          }
        }
        return m
      })
    }

    const updated = await request.save()

    // Populate for clean response
    const populated = await BloodRequest.findById(updated._id)
      .populate('requestedBy', 'fullName phone email')
      .populate('verifiedBy', 'fullName phone email')
      .populate({
        path: 'matchedDonors.donor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })

    res.json({
      success: true,
      message:
        cleanResponse === 'ACCEPTED'
          ? 'Request accepted! Waiting for hospital verification.'
          : 'Request declined.',
      request: populated,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Hospital verifies/approves donor response
// @route   PUT /api/blood-requests/:id/verify-donor
// @access  Private (Hospital/Admin)
export const verifyDonorRequest = async (req, res) => {
  try {
    const {
      verificationStatus = 'VERIFIED',
      donorId,
      collectionDate,
      collectionTime,
      reportingTime,
      hospitalInstructions,
      distanceKm,
    } = req.body

    const isVerified = verificationStatus.toUpperCase() === 'VERIFIED'

    const request = await BloodRequest.findById(req.params.id)
    if (!request) {
      return res.status(404).json({ success: false, message: 'Blood request not found' })
    }

    if (isVerified) {
      request.hospitalVerificationStatus = 'VERIFIED'
      request.hospitalVerifiedAt = new Date()
      request.verifiedBy = req.user._id || req.user.id
      request.verifiedByName = req.user.fullName || 'Hospital Medical Officer'
      request.overallStatus = 'ACCEPTED_VERIFIED'
      request.status = 'ACCEPTED_VERIFIED'

      const todayStr = new Date().toISOString().split('T')[0]
      request.collectionDate = collectionDate || todayStr
      request.collectionTime = collectionTime || '03:30 PM'
      request.reportingTime = reportingTime || '03:00 PM'
      request.hospitalInstructions =
        hospitalInstructions ||
        'Please report to 2nd Floor Blood Bank reception 30 minutes before collection with a valid Government ID. Please stay well-hydrated.'
      if (distanceKm !== undefined) request.distanceKm = Number(distanceKm)

      if (donorId) {
        request.acceptedDonor = donorId
      }

      // Update matched donor subdoc
      request.matchedDonors = (request.matchedDonors || []).map((m) => {
        if (!donorId || (m.donor && m.donor.toString() === donorId.toString())) {
          return {
            ...m.toObject(),
            donor: m.donor,
            status: 'VERIFIED',
            hospitalVerificationStatus: 'VERIFIED',
            hospitalVerifiedAt: new Date(),
          }
        }
        return m
      })

      const updated = await request.save()

      // Identify donor recipient user for DB notification
      let donorUser = null
      let targetDonor = null
      if (request.acceptedDonor) {
        targetDonor = await Donor.findById(request.acceptedDonor).populate('user')
        donorUser = targetDonor?.user
      }

      let createdNotification = null
      if (donorUser) {
        createdNotification = await Notification.create({
          recipient: donorUser._id || donorUser.id,
          donor: targetDonor._id,
          type: 'DONOR_VERIFIED',
          title: 'Blood Donation Request Verified & Approved',
          message: `Your blood donation request has been verified and approved by ${request.hospitalName}.`,
          requestId: request._id,
          requestData: {
            requestId: `REQ-${request._id.toString().slice(-4).toUpperCase()}`,
            hospitalName: request.hospitalName,
            hospitalAddress: request.hospitalAddress || request.location || 'Hospital Blood Bank Desk',
            hospitalContact: request.hospitalContact || req.user.phone || '+91 11 4022 5588',
            bloodGroup: request.bloodGroup,
            component: request.component,
            units: request.units,
            urgency: request.urgency,
            requestDate: request.createdAt,
            verifiedDate: request.hospitalVerifiedAt,
            collectionDate: request.collectionDate,
            collectionTime: request.collectionTime,
            reportingTime: request.reportingTime,
            location: request.location,
            distanceKm: request.distanceKm || 4.8,
            status: request.status,
            overallStatus: request.overallStatus,
            hospitalInstructions: request.hospitalInstructions,
          },
        })
      }

      const populated = await BloodRequest.findById(updated._id)
        .populate('requestedBy', 'fullName phone email')
        .populate('verifiedBy', 'fullName phone email')
        .populate({
          path: 'matchedDonors.donor',
          populate: { path: 'user', select: 'fullName phone email profilePhoto' },
        })
        .populate({
          path: 'acceptedDonor',
          populate: { path: 'user', select: 'fullName phone email profilePhoto' },
        })

      return res.json({
        success: true,
        message: `Blood donation request verified and approved by ${request.hospitalName}. Donor notified.`,
        request: populated,
        notification: createdNotification,
      })
    } else {
      request.hospitalVerificationStatus = 'REJECTED'
      request.overallStatus = 'VERIFICATION_REJECTED'
      request.status = 'VERIFICATION_REJECTED'
      const updated = await request.save()

      return res.json({
        success: true,
        message: 'Request verification rejected by hospital.',
        request: updated,
      })
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Hospital records blood collected from donor
// @route   PUT /api/blood-requests/:id/mark-collected
// @access  Private (Hospital/Admin)
export const markBloodCollected = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' })

    request.status = 'BLOOD_COLLECTED'
    request.overallStatus = 'BLOOD_COLLECTED'
    request.collectedAt = new Date()

    const updated = await request.save()

    const populated = await BloodRequest.findById(updated._id)
      .populate('requestedBy', 'fullName phone email')
      .populate('verifiedBy', 'fullName phone email')
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    res.json({
      success: true,
      message: 'Blood donation collection recorded successfully. Ready for delivery transport.',
      request: populated,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Update request status
// @route   PUT /api/blood-requests/:id/status
// @access  Private
export const updateRequestStatus = async (req, res) => {
  try {
    const { status, assignedRider, overallStatus } = req.body
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Request not found' })

    if (status) {
      request.status = status
      if (status === 'BLOOD_COLLECTED' && !request.collectedAt) {
        request.collectedAt = new Date()
      } else if (status === 'PICKUP' || status === 'ASSIGNED' || status === 'GOING_TO_PICKUP') {
        if (!request.pickedUpAt) request.pickedUpAt = new Date()
      } else if (status === 'DELIVERED') {
        if (!request.deliveredAt) request.deliveredAt = new Date()
      } else if (status === 'COMPLETED') {
        if (!request.completedAt) request.completedAt = new Date()
      } else if (status === 'CANCELLED') {
        if (!request.cancelledAt) request.cancelledAt = new Date()
      }
    }

    if (overallStatus) request.overallStatus = overallStatus
    if (assignedRider) request.assignedRider = assignedRider

    const updated = await request.save()

    const populated = await BloodRequest.findById(updated._id)
      .populate('requestedBy', 'fullName phone email')
      .populate('verifiedBy', 'fullName phone email')
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    res.json({ success: true, request: populated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

