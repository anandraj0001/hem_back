import BloodInventory from '../models/BloodInventory.js'
import InventoryTransaction from '../models/InventoryTransaction.js'
import StockThreshold from '../models/StockThreshold.js'

const STANDARD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']

// @desc    Get all blood inventory records with filters & search
// @route   GET /api/inventory
// @access  Private
export const getInventory = async (req, res) => {
  try {
    // 1. Sync expired items before querying
    await BloodInventory.syncExpiredStatuses()

    const { bloodGroup, componentType, status, search, expiryFilter, showArchived } = req.query

    const filter = {}

    if (!showArchived || showArchived === 'false') {
      filter.isArchived = { $ne: true }
    }

    if (bloodGroup && bloodGroup !== 'ALL') {
      filter.bloodGroup = bloodGroup
    }

    if (componentType && componentType !== 'ALL') {
      filter.componentType = componentType
    }

    if (status && status !== 'ALL') {
      filter.status = status
    }

    if (search) {
      const searchRegex = new RegExp(search.trim(), 'i')
      filter.$or = [
        { batchNumber: searchRegex },
        { bloodGroup: searchRegex },
        { storageLocation: searchRegex },
        { bloodBank: searchRegex },
        { notes: searchRegex },
      ]
    }

    const now = new Date()
    if (expiryFilter === '24h') {
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      filter.expiryDate = { $gte: now, $lte: tomorrow }
      filter.status = { $ne: 'EXPIRED' }
    } else if (expiryFilter === '3d') {
      const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      filter.expiryDate = { $gte: now, $lte: threeDays }
      filter.status = { $ne: 'EXPIRED' }
    } else if (expiryFilter === '7d') {
      const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      filter.expiryDate = { $gte: now, $lte: sevenDays }
      filter.status = { $ne: 'EXPIRED' }
    } else if (expiryFilter === 'expired') {
      filter.$or = [{ status: 'EXPIRED' }, { expiryDate: { $lte: now } }]
    }

    const inventory = await BloodInventory.find(filter)
      .populate('donorId', 'fullName bloodGroup rarePhenotype')
      .sort({ expiryDate: 1, createdAt: -1 })

    res.json({
      success: true,
      count: inventory.length,
      inventory,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get aggregated inventory summary for Admin Dashboard
// @route   GET /api/inventory/summary
// @access  Private
export const getInventorySummary = async (req, res) => {
  try {
    await BloodInventory.syncExpiredStatuses()

    const now = new Date()
    const thresholdDoc = await StockThreshold.getOrCreate()
    const thresholds = thresholdDoc.thresholds

    // Get active inventory (not archived, not expired for available units)
    const allStock = await BloodInventory.find({ isArchived: { $ne: true } })

    let totalAvailableUnits = 0
    let totalReservedUnits = 0
    let totalExpiredUnits = 0
    let totalStockBatches = allStock.length

    // Group breakdown map
    const groupSummary = {}
    STANDARD_GROUPS.forEach((bg) => {
      groupSummary[bg] = {
        bloodGroup: bg,
        availableUnits: 0,
        reservedUnits: 0,
        expiredUnits: 0,
        totalBatches: 0,
        status: 'OUT_OF_STOCK', // Default
        minimumThreshold: thresholds.get ? (thresholds.get(bg) || 5) : (thresholds[bg] || 5),
        nearestExpiry: null,
        lastUpdated: null,
      }
    })

    // Include rare phenotypes if present
    allStock.forEach((item) => {
      const bg = item.bloodGroup
      if (!groupSummary[bg]) {
        groupSummary[bg] = {
          bloodGroup: bg,
          availableUnits: 0,
          reservedUnits: 0,
          expiredUnits: 0,
          totalBatches: 0,
          status: 'OUT_OF_STOCK',
          minimumThreshold: thresholds.get ? (thresholds.get(bg) || 2) : (thresholds[bg] || 2),
          nearestExpiry: null,
          lastUpdated: null,
        }
      }

      groupSummary[bg].totalBatches += 1

      if (item.status === 'EXPIRED' || new Date(item.expiryDate) <= now) {
        groupSummary[bg].expiredUnits += item.quantity
        totalExpiredUnits += item.quantity
      } else if (item.status === 'RESERVED') {
        groupSummary[bg].reservedUnits += item.quantity
        totalReservedUnits += item.quantity
      } else if (item.status === 'AVAILABLE' || item.status === 'LOW') {
        groupSummary[bg].availableUnits += item.quantity
        totalAvailableUnits += item.quantity

        // Track nearest future expiry
        if (
          !groupSummary[bg].nearestExpiry ||
          new Date(item.expiryDate) < new Date(groupSummary[bg].nearestExpiry)
        ) {
          groupSummary[bg].nearestExpiry = item.expiryDate
        }
      }

      // Track latest updated date
      if (
        !groupSummary[bg].lastUpdated ||
        new Date(item.updatedAt) > new Date(groupSummary[bg].lastUpdated)
      ) {
        groupSummary[bg].lastUpdated = item.updatedAt
      }
    })

    // Determine status indicators for each group
    Object.values(groupSummary).forEach((group) => {
      const min = group.minimumThreshold
      if (group.availableUnits === 0) {
        group.status = 'OUT_OF_STOCK'
      } else if (group.availableUnits < min) {
        group.status = 'LOW_STOCK'
      } else {
        group.status = 'IN_STOCK'
      }
    })

    // Count expiring soon
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const expiring24h = allStock.filter(
      (s) => s.status !== 'EXPIRED' && new Date(s.expiryDate) > now && new Date(s.expiryDate) <= in24h
    ).length
    const expiring3d = allStock.filter(
      (s) => s.status !== 'EXPIRED' && new Date(s.expiryDate) > now && new Date(s.expiryDate) <= in3d
    ).length
    const expiring7d = allStock.filter(
      (s) => s.status !== 'EXPIRED' && new Date(s.expiryDate) > now && new Date(s.expiryDate) <= in7d
    ).length

    res.json({
      success: true,
      summary: {
        totalAvailableUnits,
        totalReservedUnits,
        totalExpiredUnits,
        totalStockBatches,
        expiringCounts: {
          within24h: expiring24h,
          within3d: expiring3d,
          within7d: expiring7d,
          alreadyExpired: totalExpiredUnits,
        },
        bloodGroups: Object.values(groupSummary),
        thresholds,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get expiring soon inventory grouped by urgency categories
// @route   GET /api/inventory/expiring
// @access  Private
export const getExpiringInventory = async (req, res) => {
  try {
    await BloodInventory.syncExpiredStatuses()

    const now = new Date()
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000)
    const in3d = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const in7d = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const all = await BloodInventory.find({ isArchived: { $ne: true } })
      .populate('donorId', 'fullName bloodGroup')
      .sort({ expiryDate: 1 })

    const within24h = []
    const within3d = []
    const within7d = []
    const alreadyExpired = []

    all.forEach((item) => {
      const expiry = new Date(item.expiryDate)
      const diffMs = expiry.getTime() - now.getTime()
      const hoursLeft = Math.round(diffMs / (1000 * 60 * 60))
      const daysLeft = (diffMs / (1000 * 60 * 60 * 24)).toFixed(1)

      const enriched = {
        ...item.toObject(),
        hoursLeft,
        daysLeft: Number(daysLeft),
        isExpired: expiry <= now,
      }

      if (expiry <= now || item.status === 'EXPIRED') {
        alreadyExpired.push(enriched)
      } else if (expiry <= in24h) {
        within24h.push(enriched)
      } else if (expiry <= in3d) {
        within3d.push(enriched)
      } else if (expiry <= in7d) {
        within7d.push(enriched)
      }
    })

    res.json({
      success: true,
      categories: {
        within24h: { count: within24h.length, items: within24h },
        within3d: { count: within3d.length, items: within3d },
        within7d: { count: within7d.length, items: within7d },
        alreadyExpired: { count: alreadyExpired.length, items: alreadyExpired },
      },
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get critical shortages comparing stock against thresholds
// @route   GET /api/inventory/critical
// @access  Private
export const getCriticalShortages = async (req, res) => {
  try {
    await BloodInventory.syncExpiredStatuses()

    const now = new Date()
    const thresholdDoc = await StockThreshold.getOrCreate()
    const thresholds = thresholdDoc.thresholds

    const activeStock = await BloodInventory.find({
      isArchived: { $ne: true },
      status: { $in: ['AVAILABLE', 'LOW'] },
      expiryDate: { $gt: now },
    })

    // Calculate count per group
    const counts = {}
    STANDARD_GROUPS.forEach((bg) => {
      counts[bg] = 0
    })

    activeStock.forEach((s) => {
      counts[s.bloodGroup] = (counts[s.bloodGroup] || 0) + s.quantity
    })

    const shortages = []

    STANDARD_GROUPS.forEach((bg) => {
      const min = thresholds.get ? (thresholds.get(bg) || 5) : (thresholds[bg] || 5)
      const current = counts[bg] || 0
      if (current < min) {
        const deficit = min - current
        const severity = current === 0 ? 'CRITICAL' : current <= min / 2 ? 'HIGH' : 'MODERATE'
        shortages.push({
          bloodGroup: bg,
          availableUnits: current,
          minimumThreshold: min,
          unitsDeficit: deficit,
          severity,
          status: current === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
        })
      }
    })

    // Sort by severity (CRITICAL first, then highest deficit)
    shortages.sort((a, b) => {
      const order = { CRITICAL: 0, HIGH: 1, MODERATE: 2 }
      if (order[a.severity] !== order[b.severity]) {
        return order[a.severity] - order[b.severity]
      }
      return b.unitsDeficit - a.unitsDeficit
    })

    res.json({
      success: true,
      hasShortages: shortages.length > 0,
      count: shortages.length,
      shortages,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get configurable minimum stock thresholds
// @route   GET /api/inventory/thresholds
// @access  Private
export const getThresholds = async (req, res) => {
  try {
    const doc = await StockThreshold.getOrCreate()
    res.json({ success: true, thresholds: doc.thresholds })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Update configurable minimum stock thresholds
// @route   PUT /api/inventory/thresholds
// @access  Private (Admin)
export const updateThresholds = async (req, res) => {
  try {
    const { thresholds } = req.body
    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({ success: false, message: 'Invalid thresholds data' })
    }

    let doc = await StockThreshold.findOne()
    if (!doc) {
      doc = new StockThreshold()
    }

    doc.thresholds = { ...doc.thresholds, ...thresholds }
    doc.updatedBy = req.user?._id || req.user?.id || null
    doc.updatedByName = req.user?.fullName || 'System Administrator'
    await doc.save()

    // Log adjustment transaction
    await InventoryTransaction.create({
      type: 'ADJUSTMENT',
      bloodGroup: 'SYSTEM_CONFIG',
      component: 'Threshold Settings',
      quantity: 0,
      batchNumber: 'CONFIG-UPDATE',
      performedBy: req.user?._id || null,
      performedByName: req.user?.fullName || 'System Administrator',
      reason: 'Minimum stock thresholds updated by Admin',
    })

    res.json({ success: true, message: 'Stock thresholds updated successfully', thresholds: doc.thresholds })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Add new blood stock batch to database
// @route   POST /api/inventory
// @access  Private (Admin / BloodBank)
export const addBloodStock = async (req, res) => {
  try {
    const {
      bloodGroup,
      componentType,
      quantity,
      collectionDate,
      expiryDate,
      bloodBank,
      storageLocation,
      batchNumber,
      donorId,
      donorName,
      notes,
    } = req.body

    // Validation
    if (!bloodGroup || !componentType || quantity === undefined || !expiryDate) {
      return res.status(400).json({ success: false, message: 'Missing required blood stock fields.' })
    }

    const numQty = Number(quantity)
    if (isNaN(numQty) || numQty < 0) {
      return res.status(400).json({ success: false, message: 'Quantity must be a non-negative number.' })
    }

    const parsedExpiry = new Date(expiryDate)
    if (isNaN(parsedExpiry.getTime())) {
      return res.status(400).json({ success: false, message: 'Invalid expiry date format.' })
    }

    // Generate unique batch number if not provided
    const cleanBatch = batchNumber
      ? batchNumber.trim().toUpperCase()
      : `BX-${bloodGroup.replace(/[^A-Za-z0-9]/g, '')}-${Date.now().toString(36).toUpperCase()}`

    const existing = await BloodInventory.findOne({ batchNumber: cleanBatch })
    if (existing) {
      return res.status(400).json({ success: false, message: `Batch number '${cleanBatch}' already exists.` })
    }

    const now = new Date()
    const isAlreadyExpired = parsedExpiry <= now

    const newStock = await BloodInventory.create({
      bloodGroup,
      componentType: componentType || 'Whole Blood',
      quantity: numQty,
      units: numQty,
      collectionDate: collectionDate ? new Date(collectionDate) : new Date(),
      expiryDate: parsedExpiry,
      status: isAlreadyExpired ? 'EXPIRED' : numQty === 0 ? 'OUT_OF_STOCK' : numQty <= 2 ? 'LOW' : 'AVAILABLE',
      bloodBank: bloodBank || 'Central HemaTix Blood Reserve',
      storageLocation: storageLocation || 'Cold Vault Unit A-1',
      batchNumber: cleanBatch,
      donorId: donorId || null,
      donorName: donorName || null,
      notes: notes || '',
    })

    // Log transaction
    await InventoryTransaction.create({
      type: 'ADD',
      bloodGroup: newStock.bloodGroup,
      component: newStock.componentType,
      quantity: newStock.quantity,
      batchNumber: newStock.batchNumber,
      inventory: newStock._id,
      performedBy: req.user?._id || null,
      performedByName: req.user?.fullName || 'System Administrator',
      reason: `Added new stock batch: ${newStock.batchNumber} (${newStock.quantity} units)`,
    })

    res.status(201).json({
      success: true,
      message: 'Blood stock batch successfully created in database',
      stock: newStock,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Update blood stock details
// @route   PUT /api/inventory/:id
// @access  Private (Admin)
export const updateBloodStock = async (req, res) => {
  try {
    const { quantity, storageLocation, bloodBank, notes, expiryDate, status } = req.body
    const stock = await BloodInventory.findById(req.params.id)

    if (!stock) {
      return res.status(404).json({ success: false, message: 'Blood stock record not found' })
    }

    const oldQty = stock.quantity
    if (quantity !== undefined) {
      const numQty = Number(quantity)
      if (numQty < 0) return res.status(400).json({ success: false, message: 'Quantity cannot be negative' })
      stock.quantity = numQty
      stock.units = numQty
    }

    if (storageLocation) stock.storageLocation = storageLocation
    if (bloodBank) stock.bloodBank = bloodBank
    if (notes !== undefined) stock.notes = notes
    if (expiryDate) stock.expiryDate = new Date(expiryDate)
    if (status) stock.status = status

    await stock.save()

    // Log transaction
    await InventoryTransaction.create({
      type: 'ADJUSTMENT',
      bloodGroup: stock.bloodGroup,
      component: stock.componentType,
      quantity: stock.quantity - oldQty,
      batchNumber: stock.batchNumber,
      inventory: stock._id,
      performedBy: req.user?._id || null,
      performedByName: req.user?.fullName || 'System Administrator',
      reason: `Stock updated: Quantity changed from ${oldQty} to ${stock.quantity}`,
    })

    res.json({ success: true, message: 'Blood stock updated successfully', stock })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Update stock status (RESERVE, RELEASE, EXPIRE, TRANSFUSE/ISSUE)
// @route   PATCH /api/inventory/:id/status
// @access  Private (Admin / BloodBank)
export const updateStockStatus = async (req, res) => {
  try {
    const { action, unitsToIssue, reason, relatedRequestId, recipientHospital } = req.body
    const stock = await BloodInventory.findById(req.params.id)

    if (!stock) {
      return res.status(404).json({ success: false, message: 'Blood stock record not found' })
    }

    let transactionType = 'ADJUSTMENT'
    let qtyChange = 0

    if (action === 'RESERVE') {
      stock.status = 'RESERVED'
      transactionType = 'RESERVE'
      qtyChange = stock.quantity
    } else if (action === 'RELEASE') {
      stock.status = stock.quantity <= 2 ? 'LOW' : 'AVAILABLE'
      transactionType = 'RELEASE'
      qtyChange = stock.quantity
    } else if (action === 'EXPIRE') {
      stock.status = 'EXPIRED'
      transactionType = 'EXPIRE'
      qtyChange = stock.quantity
    } else if (action === 'ISSUE' || action === 'TRANSFUSE') {
      const issueUnits = Number(unitsToIssue) || stock.quantity
      if (issueUnits > stock.quantity) {
        return res.status(400).json({ success: false, message: `Cannot issue ${issueUnits} units. Only ${stock.quantity} units available.` })
      }
      stock.quantity -= issueUnits
      stock.units = stock.quantity
      if (stock.quantity === 0) {
        stock.status = 'OUT_OF_STOCK'
      }
      transactionType = 'TRANSFUSE/ISSUE'
      qtyChange = issueUnits
    }

    await stock.save()

    // Log transaction
    await InventoryTransaction.create({
      type: transactionType,
      bloodGroup: stock.bloodGroup,
      component: stock.componentType,
      quantity: qtyChange,
      batchNumber: stock.batchNumber,
      inventory: stock._id,
      performedBy: req.user?._id || null,
      performedByName: req.user?.fullName || 'System Administrator',
      reason: reason || `Status action '${action}' performed on batch ${stock.batchNumber}`,
      relatedRequestId: relatedRequestId || null,
      recipientHospital: recipientHospital || null,
    })

    res.json({ success: true, message: `Batch ${stock.batchNumber} status updated to ${stock.status}`, stock })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Soft-delete / archive blood stock
// @route   DELETE /api/inventory/:id
// @access  Private (Admin)
export const deleteBloodStock = async (req, res) => {
  try {
    const stock = await BloodInventory.findById(req.params.id)
    if (!stock) {
      return res.status(404).json({ success: false, message: 'Stock not found' })
    }

    stock.isArchived = true
    stock.status = 'ARCHIVED'
    await stock.save()

    await InventoryTransaction.create({
      type: 'REMOVE',
      bloodGroup: stock.bloodGroup,
      component: stock.componentType,
      quantity: stock.quantity,
      batchNumber: stock.batchNumber,
      inventory: stock._id,
      performedBy: req.user?._id || null,
      performedByName: req.user?.fullName || 'System Administrator',
      reason: req.body?.reason || `Stock batch ${stock.batchNumber} archived/removed from active inventory`,
    })

    res.json({ success: true, message: `Batch ${stock.batchNumber} has been archived.` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Get inventory transactions history
// @route   GET /api/inventory/history
// @access  Private
export const getInventoryHistory = async (req, res) => {
  try {
    const { bloodGroup, type, limit = 100 } = req.query
    const filter = {}

    if (bloodGroup && bloodGroup !== 'ALL') filter.bloodGroup = bloodGroup
    if (type && type !== 'ALL') filter.type = type

    const history = await InventoryTransaction.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))

    res.json({
      success: true,
      count: history.length,
      history,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
