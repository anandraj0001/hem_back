import express from 'express'
import {
  getInventory,
  getInventorySummary,
  getExpiringInventory,
  getCriticalShortages,
  getThresholds,
  updateThresholds,
  addBloodStock,
  updateBloodStock,
  updateStockStatus,
  deleteBloodStock,
  getInventoryHistory,
} from '../controllers/inventoryController.js'
import {
  matchEmergencyRequest,
  dispatchEmergencyAlert,
} from '../controllers/emergencyMatchingController.js'
import { protect, authorize } from '../middleware/authMiddleware.js'

const router = express.Router()

// Public/Protected inventory read routes
router.get('/', protect, getInventory)
router.get('/summary', protect, getInventorySummary)
router.get('/expiring', protect, getExpiringInventory)
router.get('/critical', protect, getCriticalShortages)
router.get('/thresholds', protect, getThresholds)
router.get('/history', protect, getInventoryHistory)

// Admin/Staff stock mutation routes
router.put('/thresholds', protect, updateThresholds)
router.post('/', protect, addBloodStock)
router.put('/:id', protect, updateBloodStock)
router.patch('/:id/status', protect, updateStockStatus)
router.delete('/:id', protect, deleteBloodStock)

// Emergency blood matching & dispatch alerts
router.post('/emergency-match', protect, matchEmergencyRequest)
router.post('/emergency-alert', protect, dispatchEmergencyAlert)

export default router
