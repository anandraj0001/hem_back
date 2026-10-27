import express from 'express'
import BloodRequest from '../models/BloodRequest.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

// @desc    Get active delivery assignments for rider
// @route   GET /api/delivery/tasks
// @access  Private (Delivery/Admin)
router.get('/tasks', protect, async (req, res) => {
  try {
    const tasks = await BloodRequest.find({
      status: {
        $in: [
          'ACCEPTED_VERIFIED',
          'BLOOD_COLLECTED',
          'COLLECTED',
          'PICKUP',
          'ASSIGNED',
          'GOING_TO_PICKUP',
          'IN_TRANSIT',
          'DELIVERED',
          'COMPLETED',
        ],
      },
    })
      .sort({ updatedAt: -1 })
      .populate('requestedBy', 'fullName phone email')
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    res.json({ success: true, count: tasks.length, tasks })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// @desc    Accept blood transport task
// @route   PUT /api/delivery/tasks/:id/accept
// @access  Private (Delivery)
router.put('/tasks/:id/accept', protect, async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Task not found' })

    request.assignedRider = req.user._id || req.user.id
    request.status = 'PICKUP'
    request.overallStatus = 'IN_PROGRESS'
    if (!request.pickedUpAt) request.pickedUpAt = new Date()

    const updated = await request.save()

    const populated = await BloodRequest.findById(updated._id)
      .populate('requestedBy', 'fullName phone email')
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    res.json({
      success: true,
      message: 'Transport task assigned to rider. Status updated to PICKUP.',
      request: populated,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

// @desc    Update delivery transport milestone status
// @route   PUT /api/delivery/tasks/:id/status
// @access  Private (Delivery)
router.put('/tasks/:id/status', protect, async (req, res) => {
  try {
    const { status } = req.body
    const request = await BloodRequest.findById(req.params.id)
    if (!request) return res.status(404).json({ success: false, message: 'Task not found' })

    if (status) {
      request.status = status
      if (status === 'PICKUP' || status === 'ASSIGNED' || status === 'GOING_TO_PICKUP') {
        if (!request.pickedUpAt) request.pickedUpAt = new Date()
        request.overallStatus = 'IN_PROGRESS'
      } else if (status === 'BLOOD_COLLECTED') {
        if (!request.collectedAt) request.collectedAt = new Date()
      } else if (status === 'IN_TRANSIT') {
        request.overallStatus = 'IN_TRANSIT'
      } else if (status === 'DELIVERED') {
        if (!request.deliveredAt) request.deliveredAt = new Date()
        request.overallStatus = 'DELIVERED'
      } else if (status === 'COMPLETED') {
        if (!request.completedAt) request.completedAt = new Date()
        request.overallStatus = 'COMPLETED'
      }
    }

    const updated = await request.save()

    const populated = await BloodRequest.findById(updated._id)
      .populate('requestedBy', 'fullName phone email')
      .populate({
        path: 'acceptedDonor',
        populate: { path: 'user', select: 'fullName phone email profilePhoto' },
      })
      .populate('assignedRider', 'fullName phone')

    res.json({ success: true, message: `Delivery status updated to ${status}`, request: populated })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
