import mongoose from 'mongoose'
import dotenv from 'dotenv'

dotenv.config()
dotenv.config({ path: './backend/.env' })

const DEFAULT_MONGODB_URI = 'mongodb+srv://anishraj2810_db_user:KSgZgg2u0WwlOXR1@cluster0.n72ona5.mongodb.net/hematix?retryWrites=true&w=majority&compressors=zlib'

const connectDB = async () => {
  if (mongoose.connection.readyState >= 1) {
    return mongoose.connection
  }

  try {
    let uri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI

    // Auto-strip accidental angle brackets if user wrote <password>
    if (uri.includes('<') && uri.includes('>')) {
      uri = uri.replace(/<([^>]+)>/g, '$1')
    }

    const conn = await mongoose.connect(uri)
    console.log(`\x1b[32m✔ MongoDB Connected Successfully: ${conn.connection.host} / ${conn.connection.name}\x1b[0m`)
    return conn
  } catch (error) {
    console.error(`\x1b[31m✖ MongoDB Connection Error: ${error.message}\x1b[0m`)
    console.error('\x1b[33mTip: Please verify your MongoDB Atlas credentials, database user permissions, and Network Access (IP Whitelist 0.0.0.0/0) in Atlas.\x1b[0m')
  }
}

export default connectDB
