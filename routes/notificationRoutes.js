import express from 'express'
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.use(protect)

router.get('/', getNotifications)
router.patch('/read-all', markAllAsRead)
router.patch('/:id/read', markAsRead)

export default router
