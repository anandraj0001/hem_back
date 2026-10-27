import express from 'express'
import dotenv from 'dotenv'
import cors from 'cors'
import connectDB from './config/db.js'

// Import Routes
import authRoutes from './routes/authRoutes.js'
import donorRoutes from './routes/donorRoutes.js'
import hospitalRoutes from './routes/hospitalRoutes.js'
import bloodRequestRoutes from './routes/bloodRequestRoutes.js'
import deliveryRoutes from './routes/deliveryRoutes.js'
import adminRoutes from './routes/adminRoutes.js'
import inventoryRoutes from './routes/inventoryRoutes.js'
import notificationRoutes from './routes/notificationRoutes.js'
import { seedInitialInventoryIfEmpty } from './config/seedInventoryData.js'
import { updateProfile } from './controllers/authController.js'
import { protect } from './middleware/authMiddleware.js'

dotenv.config()
dotenv.config({ path: './backend/.env' })

// Only connect at startup in standalone/server mode
if (process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].includes('server.js'))) {
  connectDB().then(() => {
    seedInitialInventoryIfEmpty()
  })
}

const app = express()

app.use(express.json())
app.use(cors())

// Serverless DB connection verification
app.use(async (req, res, next) => {
  try {
    await connectDB()
  } catch (err) {
    console.error('Database connection error in request:', err)
  }
  next()
})

app.use('/api/auth', authRoutes)
app.use('/api/donor', donorRoutes)
app.use('/api/hospital', hospitalRoutes)
app.use('/api/blood-requests', bloodRequestRoutes)
app.use('/api/delivery', deliveryRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/user/profile', protect, updateProfile)


app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'HemaTix Rare Blood Emergency Coordination Backend',
    database: 'MongoDB (hematix)',
    timestamp: new Date().toISOString(),
  })
})

app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: err.message || 'Internal Server Error' })
})

const PORT = process.env.PORT || 5000

const isDirectRun = process.argv[1] && (process.argv[1].endsWith('server.js') || process.argv[1].includes('server.js'))

if (isDirectRun && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\x1b[36m🚀 HemaTix Backend Server running in ${process.env.NODE_ENV || 'development'} mode on http://localhost:${PORT}\x1b[0m`)
  })
}

export default app

