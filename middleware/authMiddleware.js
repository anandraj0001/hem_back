import jwt from 'jsonwebtoken'
import User from '../models/User.js'

export const protect = async (req, res, next) => {
  let token

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      token = req.headers.authorization.split(' ')[1]

      // Handle admin prototype bypass token
      if (token.startsWith('htx_tok_admin_')) {
        req.user = {
          _id: 'USR-ADMIN-01',
          id: 'USR-ADMIN-01',
          fullName: 'System Administrator',
          email: 'admin@hematix.org',
          role: 'admin',
          isAdmin: true,
          isVerified: true,
        }
        return next()
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtkey_hematix_2026')
      req.user = await User.findById(decoded.id).select('-password')

      if (!req.user) {
        return res.status(401).json({ message: 'User not found with this token' })
      }

      next()
    } catch (error) {
      console.error('JWT verification error:', error.message)
      res.status(401).json({ message: 'Not authorized, invalid or expired token' })
    }
  } else {
    res.status(401).json({ message: 'Not authorized, no token provided' })
  }
}

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || (!roles.includes(req.user.role) && !req.user.isAdmin)) {
      return res.status(403).json({ message: `User role '${req.user?.role}' is not authorized to access this route` })
    }
    next()
  }
}
