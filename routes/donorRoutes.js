import express from 'express'
import { getDonorProfile, updateDonorMedical, submitMedicalReport, getNearbyDonors } from '../controllers/donorController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/profile', protect, getDonorProfile)
router.put('/medical', protect, updateDonorMedical)
router.post('/report', protect, submitMedicalReport)
router.get('/nearby', protect, getNearbyDonors)

export default router
