import express from 'express'
import { getAdminStats, getAllUsers, verifyUser } from '../controllers/adminController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/stats', protect, getAdminStats)
router.get('/users', protect, getAllUsers)
router.put('/users/:id/verify', protect, verifyUser)

export default router
