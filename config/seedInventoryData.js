import BloodInventory from '../models/BloodInventory.js'
import InventoryTransaction from '../models/InventoryTransaction.js'
import StockThreshold from '../models/StockThreshold.js'
import Donor from '../models/Donor.js'
import User from '../models/User.js'

export const seedInitialInventoryIfEmpty = async () => {
  try {
    const count = await BloodInventory.countDocuments()
    const now = new Date()

    // 1. Ensure Stock Thresholds exist
    await StockThreshold.getOrCreate()

    // 2. Ensure initial seed donors with coordinates exist in MongoDB if Donor count is small
    const donorCount = await Donor.countDocuments()
    if (donorCount < 5) {
      const sampleDonors = [
        {
          name: 'Aarav Sharma',
          email: 'aarav.sharma@example.com',
          phone: '9811200111',
          bloodGroup: 'O-',
          rarePhenotype: 'Bombay Oh',
          lat: 28.6448,
          lng: 77.1895, // Karol Bagh (approx 4.2 km)
          city: 'Karol Bagh, New Delhi',
          isEligible: true,
          availability: true,
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
        {
          name: 'Pooja Verma',
          email: 'pooja.verma@example.com',
          phone: '9811200222',
          bloodGroup: 'O-',
          rarePhenotype: null,
          lat: 28.5672,
          lng: 77.2100, // AIIMS Ansari Nagar (approx 5.4 km)
          city: 'Ansari Nagar, New Delhi',
          isEligible: true,
          availability: true,
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
        {
          name: 'Rohan Gupta',
          email: 'rohan.gupta@example.com',
          phone: '9811200333',
          bloodGroup: 'A-',
          rarePhenotype: 'Kell-null',
          lat: 28.6304,
          lng: 77.2177, // Connaught Place (approx 2.1 km)
          city: 'Connaught Place, New Delhi',
          isEligible: true,
          availability: true,
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
        {
          name: 'Ananya Iyer',
          email: 'ananya.iyer@example.com',
          phone: '9811200444',
          bloodGroup: 'B+',
          rarePhenotype: null,
          lat: 28.5244,
          lng: 77.2177, // Saket (approx 10.3 km)
          city: 'Saket, New Delhi',
          isEligible: true,
          availability: true,
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
        {
          name: 'Vikram Singh',
          email: 'vikram.singh@example.com',
          phone: '9811200555',
          bloodGroup: 'AB-',
          rarePhenotype: 'Rh-null',
          lat: 28.7041,
          lng: 77.1025, // Rohini (approx 14.8 km)
          city: 'Rohini, New Delhi',
          isEligible: true,
          availability: false, // Currently busy
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
        {
          name: 'Kavita Menon',
          email: 'kavita.menon@example.com',
          phone: '9811200666',
          bloodGroup: 'O+',
          rarePhenotype: null,
          lat: 28.5921,
          lng: 77.0460, // Dwarka Sector 12 (approx 18.2 km)
          city: 'Dwarka, New Delhi',
          isEligible: true,
          availability: true,
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
        {
          name: 'Suresh Raina',
          email: 'suresh.raina@example.com',
          phone: '9811200777',
          bloodGroup: 'A+',
          rarePhenotype: null,
          lat: 28.6289,
          lng: 77.0805, // Janakpuri (approx 12.6 km)
          city: 'Janakpuri, New Delhi',
          isEligible: true,
          availability: true,
          emergencyAlertOptIn: true,
          screeningStatus: 'eligible_for_donation',
        },
      ]

      for (const d of sampleDonors) {
        let user = await User.findOne({ email: d.email })
        if (!user) {
          user = await User.create({
            fullName: d.name,
            email: d.email,
            phone: d.phone,
            password: 'Password@123',
            role: 'donor',
            govtId: `DL-GOV-${Math.floor(100000 + Math.random() * 900000)}`,
            isVerified: true,
          })
        }

        const existingDonor = await Donor.findOne({ user: user._id })
        if (!existingDonor) {
          await Donor.create({
            user: user._id,
            fullName: d.name,
            bloodGroup: d.bloodGroup,
            rarePhenotype: d.rarePhenotype,
            address: {
              street: d.city,
              city: 'New Delhi',
              state: 'Delhi',
              pincode: '110001',
              location: {
                lat: d.lat,
                lng: d.lng,
              },
            },
            govtId: user.govtId,
            isEligible: d.isEligible,
            availability: d.availability,
            emergencyAlertOptIn: d.emergencyAlertOptIn,
            screeningStatus: d.screeningStatus,
            medicalHistory: {
              lastDonationDate: new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000),
            },
          })
        }
      }
    }

    // 3. Seed Blood Inventory if empty
    if (count === 0) {
      console.log('\x1b[36m💉 Seeding initial realistic blood inventory records into MongoDB...\x1b[0m')

      const initialBatches = [
        // O- (Universal, Critical supply)
        {
          bloodGroup: 'O-',
          componentType: 'Whole Blood',
          quantity: 2,
          units: 2,
          collectionDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 18 * 60 * 60 * 1000), // Expiring in 18 hours!
          status: 'LOW',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit A-1 (Shelf 1)',
          batchNumber: 'BX-OM-2026-A101',
          notes: 'High demand universal whole blood unit - expiring within 24 hours',
        },
        {
          bloodGroup: 'O-',
          componentType: 'RBC',
          quantity: 3,
          units: 3,
          collectionDate: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000), // Expiring in 2 days
          status: 'AVAILABLE',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit A-1 (Shelf 2)',
          batchNumber: 'BX-OM-2026-A102',
          notes: 'Packed red blood cells for trauma reserve',
        },

        // O+ (Standard high supply)
        {
          bloodGroup: 'O+',
          componentType: 'Whole Blood',
          quantity: 18,
          units: 18,
          collectionDate: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 25 * 24 * 60 * 60 * 1000),
          status: 'AVAILABLE',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit B-1 (Shelf 1)',
          batchNumber: 'BX-OP-2026-B201',
          notes: 'Routine donor drive collection batch',
        },

        // A+
        {
          bloodGroup: 'A+',
          componentType: 'RBC',
          quantity: 12,
          units: 12,
          collectionDate: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 28 * 24 * 60 * 60 * 1000),
          status: 'AVAILABLE',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit B-2 (Shelf 1)',
          batchNumber: 'BX-AP-2026-B301',
          notes: 'Stable stock for general surgery',
        },

        // A- (Low stock)
        {
          bloodGroup: 'A-',
          componentType: 'Whole Blood',
          quantity: 2,
          units: 2,
          collectionDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000), // Expiring in 5 days
          status: 'LOW',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit A-2 (Shelf 3)',
          batchNumber: 'BX-AM-2026-A201',
          notes: 'Below minimum threshold of 5 units',
        },

        // B+
        {
          bloodGroup: 'B+',
          componentType: 'Whole Blood',
          quantity: 14,
          units: 14,
          collectionDate: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 22 * 24 * 60 * 60 * 1000),
          status: 'AVAILABLE',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit C-1 (Shelf 2)',
          batchNumber: 'BX-BP-2026-C101',
          notes: 'Adequate stock',
        },

        // B- (Critical Shortage: 1 unit)
        {
          bloodGroup: 'B-',
          componentType: 'Plasma',
          quantity: 1,
          units: 1,
          collectionDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000), // Expiring in 6 days
          status: 'LOW',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cryo-Cabinet Deep Freeze 03',
          batchNumber: 'BX-BM-2026-C201',
          notes: 'Critical shortage: only 1 unit remaining in vault',
        },

        // AB+ (Universal Plasma)
        {
          bloodGroup: 'AB+',
          componentType: 'Plasma',
          quantity: 6,
          units: 6,
          collectionDate: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000), // Deep frozen plasma
          status: 'AVAILABLE',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cryo-Cabinet Deep Freeze 01',
          batchNumber: 'BX-ABP-2026-D101',
          notes: 'Fresh frozen plasma units',
        },

        // AB- (Out of stock: 0 units / Reserved)
        {
          bloodGroup: 'AB-',
          componentType: 'Whole Blood',
          quantity: 0,
          units: 0,
          collectionDate: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
          status: 'OUT_OF_STOCK',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Cold Vault Unit A-3',
          batchNumber: 'BX-ABM-2026-D201',
          notes: 'Stock depleted, awaiting replacement donor',
        },

        // Bombay Oh (Ultra Rare Phenotype)
        {
          bloodGroup: 'Bombay Oh',
          componentType: 'RBC',
          quantity: 1,
          units: 1,
          collectionDate: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000),
          status: 'LOW',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Special Rare Phenotype Vault 01',
          batchNumber: 'BX-RARE-BOMBAY-01',
          notes: 'Ultra-rare Bombay phenotype unit from certified donor Aarav Sharma',
        },

        // Expired batch for demonstration
        {
          bloodGroup: 'O+',
          componentType: 'Platelets',
          quantity: 2,
          units: 2,
          collectionDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
          expiryDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000), // Expired yesterday
          status: 'EXPIRED',
          bloodBank: 'Central HemaTix Blood Reserve',
          storageLocation: 'Quarantine Discard Bin Q-1',
          batchNumber: 'BX-EXP-2026-Q901',
          notes: 'Past 5-day shelf life for platelets. Awaiting clinical biohazard disposal.',
        },
      ]

      const created = await BloodInventory.insertMany(initialBatches)

      // Insert audit transaction log entries for the initial batch
      const initialTransactions = created.map((item) => ({
        type: item.status === 'EXPIRED' ? 'EXPIRE' : 'ADD',
        bloodGroup: item.bloodGroup,
        component: item.componentType,
        quantity: item.quantity,
        batchNumber: item.batchNumber,
        inventory: item._id,
        performedByName: 'System Seed Automation',
        reason: `Initial stock registration: ${item.batchNumber}`,
      }))

      await InventoryTransaction.insertMany(initialTransactions)
      console.log(`\x1b[32m✔ Successfully seeded ${created.length} blood stock records and audit trails into MongoDB!\x1b[0m`)
    }
  } catch (error) {
    console.error(`\x1b[31m✖ Error during inventory seeding: ${error.message}\x1b[0m`)
  }
}
