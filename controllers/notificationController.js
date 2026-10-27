import Notification from '../models/Notification.js'

// @desc    Get all notifications for logged-in user
// @route   GET /api/notifications
// @access  Private
export const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const notifications = await Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .populate('requestId')

    const unreadCount = await Notification.countDocuments({ recipient: userId, read: false })

    res.json({
      success: true,
      count: notifications.length,
      unreadCount,
      notifications,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Mark single notification as read
// @route   PATCH /api/notifications/:id/read
// @access  Private
export const markAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true }
    )

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' })
    }

    res.json({ success: true, notification })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// @desc    Mark all user notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
export const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id
    await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() }
    )

    res.json({ success: true, message: 'All notifications marked as read' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
