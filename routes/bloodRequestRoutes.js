import express from 'express'
import {
  createBloodRequest,
  getBloodRequests,
  getBloodRequestById,
  updateRequestStatus,
  donorRespondToRequest,
  verifyDonorRequest,
  markBloodCollected,
} from '../controllers/bloodRequestController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.route('/').post(protect, createBloodRequest).get(protect, getBloodRequests)
router.route('/:id').get(protect, getBloodRequestById)
router.route('/:id/status').put(protect, updateRequestStatus)
router.route('/:id/donor-respond').put(protect, donorRespondToRequest)
router.route('/:id/verify-donor').put(protect, verifyDonorRequest)
router.route('/:id/mark-collected').put(protect, markBloodCollected)

export default router
