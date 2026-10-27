import User from '../models/User.js'
import Donor from '../models/Donor.js'
import Hospital from '../models/Hospital.js'
import jwt from 'jsonwebtoken'

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'supersecretjwtkey_hematix_2026', {
    expiresIn: '30d',
  })
}

// @desc    Register a new user in MongoDB
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req, res) => {
  try {
    const {
      fullName,
      email,
      phone,
      password,
      role,
      govtId,
      profilePhoto,
      bloodGroup,
      dob,
      gender,
      hospitalName,
      registrationNumber,
      address,
    } = req.body

    const cleanEmail = email ? email.trim().toLowerCase() : ''
    const cleanPhone = phone ? phone.replace(/\D/g, '') : ''

    const userExists = await User.findOne({
      $or: [{ email: cleanEmail }, { phone: cleanPhone }],
    })

    if (userExists) {
      return res.status(400).json({ message: 'An account with this email address or phone number already exists.' })
    }

    const user = await User.create({
      fullName: fullName.trim(),
      email: cleanEmail,
      phone: cleanPhone,
      password, // Will be hashed via UserSchema pre-save hook
      role,
      govtId: govtId.trim(),
      profilePhoto: profilePhoto || null,
      isVerified: false,
      isAdmin: role === 'admin',
    })

    // Create role-specific subdocument in MongoDB
    if (role === 'donor') {
      await Donor.create({
        user: user._id,
        fullName: user.fullName,
        bloodGroup: bloodGroup || 'O-',
        dob: dob || null,
        gender: gender || 'male',
        govtId: user.govtId,
        screeningStatus: 'pending_review',
        isEligible: false,
      })
    } else if (role === 'hospital') {
      await Hospital.create({
        user: user._id,
        hospitalName: hospitalName || `${user.fullName} Medical Center`,
        registrationNumber: registrationNumber || `HOSP-${Date.now().toString(36).toUpperCase()}`,
        contactPhone: user.phone,
        contactEmail: user.email,
        address: address || {
          fullAddress: 'Trauma Command Center, Metro Ward',
          location: { lat: 28.6139, lng: 77.2090 },
        },
      })
    }

    const token = generateToken(user._id)

    res.status(201).json({
      success: true,
      message: 'Account registered successfully in database!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        govtId: user.govtId,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: error.message || 'Server error during registration' })
  }
}

// @desc    Authenticate user & get JWT token from MongoDB
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req, res) => {
  try {
    const { identifier, email, phone, password } = req.body
    const loginId = (identifier || email || phone || '').trim()

    // 1. Check Admin Credentials: ID: admin@123 / Password: admin@123
    if (
      (loginId === 'admin@123' || loginId === 'admin@hematix.org' || loginId === 'admin') &&
      (password === 'admin@123' || password === 'admin123')
    ) {
      const adminToken = `htx_tok_admin_${Date.now()}`
      return res.json({
        success: true,
        message: 'Admin authentication granted',
        token: adminToken,
        user: {
          id: 'USR-ADMIN-01',
          fullName: 'System Administrator',
          name: 'System Administrator',
          email: 'admin@hematix.org',
          phone: '9999999999',
          govtId: 'SYS-ADMIN-01',
          role: 'admin',
          isAdmin: true,
          isVerified: true,
        },
      })
    }

    // 2. Query MongoDB by Email or Phone
    const cleanPhone = loginId.replace(/\D/g, '')
    const user = await User.findOne({
      $or: [
        { email: loginId.toLowerCase() },
        { phone: cleanPhone.length >= 10 ? cleanPhone : 'NONE' },
      ],
    })

    if (!user) {
      return res.status(401).json({ message: 'No account found with this email or phone number.' })
    }

    // 3. Verify password via bcryptjs
    const isMatch = await user.matchPassword(password)
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password. Please try again.' })
    }

    const token = generateToken(user._id)

    res.json({
      success: true,
      message: 'Login successful!',
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        govtId: user.govtId,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: error.message || 'Server error during login' })
  }
}

// @desc    Get logged in user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json({
      success: true,
      user: {
        id: user._id,
        fullName: user.fullName,
        name: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        govtId: user.govtId,
        profilePhoto: user.profilePhoto,
        isVerified: user.isVerified,
        isAdmin: user.isAdmin,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}

// @desc    Update user profile
// @route   PUT /api/user/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id || req.user.id)
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    user.fullName = req.body.fullName || user.fullName
    user.email = req.body.email || user.email
    user.phone = req.body.phone || user.phone
    if (req.body.profilePhoto !== undefined) {
      user.profilePhoto = req.body.profilePhoto
    }

    const updatedUser = await user.save()

    res.json({
      success: true,
      user: {
        id: updatedUser._id,
        fullName: updatedUser.fullName,
        name: updatedUser.fullName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        govtId: updatedUser.govtId,
        profilePhoto: updatedUser.profilePhoto,
        isVerified: updatedUser.isVerified,
        isAdmin: updatedUser.isAdmin,
      },
    })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
}
