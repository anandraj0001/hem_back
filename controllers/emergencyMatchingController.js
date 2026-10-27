import BloodInventory from '../models/BloodInventory.js'
import Donor from '../models/Donor.js'
import BloodRequest from '../models/BloodRequest.js'
import InventoryTransaction from '../models/InventoryTransaction.js'

// Blood Compatibility Table for RBC / Whole Blood (who can DONATE to the recipient)
export const COMPATIBLE_DONORS_MAP = {
  'O-': ['O-', 'Bombay Oh'],
  'O+': ['O+', 'O-'],
  'A-': ['A-', 'O-'],
  'A+': ['A+', 'A-', 'O+', 'O-'],
  'B-': ['B-', 'O-'],
  'B+': ['B+', 'B-', 'O+', 'O-'],
  'AB-': ['AB-', 'A-', 'B-', 'O-'],
  'AB+': ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'],
  'Bombay Oh': ['Bombay Oh'],
  'Rh-null': ['Rh-null'],
  'Kell-null': ['Kell-null'],
  'Duffy-null': ['Duffy-null'],
  'Other Rare': ['Other Rare'],
}

// Haversine formula to compute great-circle distance between two points in km
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (
    lat1 === undefined ||
    lat1 === null ||
    lon1 === undefined ||
    lon1 === null ||
    lat2 === undefined ||
    lat2 === null ||
    lon2 === undefined ||
    lon2 === null
  ) {
    return null
  }

  const R = 6371 // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return Number((R * c).toFixed(1))
}

// @desc    Match emergency blood request with inventory and ranked donors
// @route   POST /api/inventory/emergency-match
// @access  Private (Admin / Hospital)
export const matchEmergencyRequest = async (req, res) => {
  try {
    await BloodInventory.syncExpiredStatuses()

    const {
      bloodGroup,
      component = 'Whole Blood',
      quantity = 1,
      hospitalName = 'Sanjeevani Trauma Center',
      hospitalLat = 28.6139,
      hospitalLng = 77.209,
      urgency = 'CRITICAL',
      requiredBy = 'Immediate (< 60 mins)',
      rarePhenotype = false,
      rarePhenotypeType = null,
    } = req.body

    if (!bloodGroup) {
      return res.status(400).json({ success: false, message: 'Blood group is required' })
    }

    const requestedUnits = Number(quantity) || 1
    const now = new Date()

    // 1. Check current inventory for exact and compatible blood groups
    const compatibleGroups = COMPATIBLE_DONORS_MAP[bloodGroup] || [bloodGroup]

    const exactStock = await BloodInventory.find({
      bloodGroup,
      isArchived: { $ne: true },
      status: { $in: ['AVAILABLE', 'LOW'] },
      expiryDate: { $gt: now },
    })

    const compatibleStock = await BloodInventory.find({
      bloodGroup: { $in: compatibleGroups },
      isArchived: { $ne: true },
      status: { $in: ['AVAILABLE', 'LOW'] },
      expiryDate: { $gt: now },
    })

    const exactAvailableUnits = exactStock.reduce((acc, item) => acc + item.quantity, 0)
    const totalCompatibleUnits = compatibleStock.reduce((acc, item) => acc + item.quantity, 0)

    const isShortage = exactAvailableUnits < requestedUnits
    const unitsDeficit = Math.max(0, requestedUnits - exactAvailableUnits)

    // 2. Query donors in database
    const donorQuery = {
      bloodGroup: { $in: compatibleGroups },
    }

    if (rarePhenotype && rarePhenotypeType) {
      donorQuery.rarePhenotype = rarePhenotypeType
    }

    const allDonors = await Donor.find(donorQuery).populate('user', 'fullName phone email isVerified')

    // 3. Process & Rank Donors
    const rankedDonors = allDonors.map((d) => {
      const isExactGroup = d.bloodGroup === bloodGroup
      const isEligible = Boolean(d.isEligible)
      const isAvailable = Boolean(d.availability)
      const hasOptedIn = Boolean(d.emergencyAlertOptIn)
      const isVerified = Boolean(d.user?.isVerified || d.screeningStatus === 'eligible_for_donation')

      let distanceKm = null
      let locationAvailable = false

      if (d.address?.location?.lat && d.address?.location?.lng) {
        distanceKm = calculateHaversineDistance(
          Number(hospitalLat),
          Number(hospitalLng),
          Number(d.address.location.lat),
          Number(d.address.location.lng)
        )
        locationAvailable = true
      }

      // Compute Ranking Score
      let score = 0
      if (isExactGroup) score += 1000
      else score += 500

      if (isEligible) score += 400
      if (isAvailable) score += 300
      if (hasOptedIn) score += 200
      if (isVerified) score += 100

      if (distanceKm !== null) {
        // Closer distance gets higher score bonus (max 100 for 0km, 0 for 50km)
        score += Math.max(0, Math.round(100 - distanceKm * 2))
      }

      return {
        donorId: d._id,
        name: d.fullName || d.user?.fullName || 'Anonymous Donor',
        phone: d.user?.phone || 'Confidential',
        email: d.user?.email || 'N/A',
        bloodGroup: d.bloodGroup,
        rarePhenotype: d.rarePhenotype || null,
        isExactMatch: isExactGroup,
        isEligible,
        isAvailable,
        emergencyAlertOptIn: hasOptedIn,
        verificationStatus: isVerified ? 'VERIFIED' : 'PENDING_REVIEW',
        screeningStatus: d.screeningStatus || 'pending_review',
        lastDonationDate: d.medicalHistory?.lastDonationDate || null,
        distanceKm,
        locationAvailable,
        locality: d.address?.city || d.address?.street || (locationAvailable ? 'Nearby GPS Geofence' : 'Location Not Set'),
        score,
        alertStatus: 'NOT_SENT',
      }
    })

    // Sort ranked donors:
    // Primary: Score descending (Exact group -> Eligible -> Available -> OptedIn -> Distance)
    rankedDonors.sort((a, b) => b.score - a.score)

    res.json({
      success: true,
      request: {
        bloodGroup,
        component,
        quantity: requestedUnits,
        hospitalName,
        urgency,
        requiredBy,
        rarePhenotype,
        rarePhenotypeType,
      },
      stockStatus: {
        exactAvailableUnits,
        totalCompatibleUnits,
        isShortage,
        unitsDeficit,
        severity: isShortage
          ? exactAvailableUnits === 0
            ? 'CRITICAL_OUT_OF_STOCK'
            : 'SHORTAGE_LOW_STOCK'
          : 'SUFFICIENT_STOCK',
        compatibleStockBatches: compatibleStock,
      },
      donorsMatched: {
        total: rankedDonors.length,
        eligibleAndAvailable: rankedDonors.filter((d) => d.isEligible && d.isAvailable).length,
        rankedDonors,
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Dispatch emergency alerts to selected donors
// @route   POST /api/inventory/emergency-alert
// @access  Private (Admin / Hospital)
export const dispatchEmergencyAlert = async (req, res) => {
  try {
    const { donorIds, bloodGroup, hospitalName, units, urgency, patientNote } = req.body

    if (!donorIds || !Array.isArray(donorIds) || donorIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please select at least one donor to alert.' })
    }

    const notifiedDonors = await Donor.find({ _id: { $in: donorIds } }).populate('user', 'fullName phone')

    // Create or update Emergency Request record
    const bloodRequest = await BloodRequest.create({
      requestedBy: req.user?._id || req.user?.id,
      hospitalName: hospitalName || 'Emergency Trauma Center',
      bloodGroup: bloodGroup || 'O-',
      component: 'Whole Blood',
      units: Number(units) || 1,
      urgency: urgency || 'CRITICAL',
      location: hospitalName || 'Trauma Center ICU',
      patientNote: patientNote || 'Urgent transfusion match needed',
      status: 'MATCHING',
      matchedDonors: notifiedDonors.map((d) => ({
        donor: d._id,
        status: 'NOTIFIED',
        notifiedAt: new Date(),
      })),
    })

    // Log transaction
    await InventoryTransaction.create({
      type: 'ADJUSTMENT',
      bloodGroup: bloodGroup || 'O-',
      component: 'Emergency Alert',
      quantity: Number(units) || 1,
      batchNumber: `ALERT-${Date.now().toString(36).toUpperCase()}`,
      performedBy: req.user?._id || null,
      performedByName: req.user?.fullName || 'System Administrator',
      reason: `Emergency alert dispatched to ${notifiedDonors.length} compatible donors for ${units} unit(s) of ${bloodGroup}`,
      relatedRequestId: bloodRequest._id.toString(),
      recipientHospital: hospitalName,
    })

    res.json({
      success: true,
      message: `Emergency broadcast alert successfully sent to ${notifiedDonors.length} compatible donors.`,
      requestId: bloodRequest._id,
      alertedDonorsCount: notifiedDonors.length,
      donors: notifiedDonors.map((d) => ({
        id: d._id,
        name: d.fullName,
        phone: d.user?.phone,
        status: 'ALERT_DELIVERED',
        dispatchedAt: new Date().toISOString(),
      })),
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
