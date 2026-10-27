import express from 'express'
import { getHospitalProfile, getPendingScreenings, verifyDonorReport } from '../controllers/hospitalController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/profile', protect, getHospitalProfile)
router.get('/screenings', protect, getPendingScreenings)
router.put('/screenings/:id/verify', protect, verifyDonorReport)

export default router
