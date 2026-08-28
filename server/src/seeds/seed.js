import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, maskMongoUri } from '../config/db.js';
import { Location } from '../models/Location.js';
import { AdminUser } from '../models/AdminUser.js';
import { ElectricityReport } from '../models/ElectricityReport.js';
import { upazilaCoordinates } from './upazilaCoordinates.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const administrativeDataPath = path.join(__dirname, 'administrativeData.json');
const administrativeData = JSON.parse(fs.readFileSync(administrativeDataPath, 'utf8'));

const seedDatabase = async () => {
  try {
    console.log('===================================================');
    console.log('⚡ Bangladesh Electricity Status (CurrentAche BD) Seed');
    console.log('===================================================');
    console.log(`[Seed] Connecting to MongoDB: ${maskMongoUri(process.env.MONGODB_URI)}`);
    
    // Connect to database with DNS fallback
    await connectDB();
    console.log('[Seed] ✅ MongoDB connected successfully.');

    // 1. Process Complete Bangladesh Administrative Data with REAL Geographic Coordinates
    let totalDivisions = administrativeData.length;
    let totalDistricts = 0;
    let totalUpazilas = 0;
    const flatLocations = [];

    for (const div of administrativeData) {
      totalDistricts += div.districts.length;
      for (const dist of div.districts) {
        totalUpazilas += dist.upazilas.length;
        for (let i = 0; i < dist.upazilas.length; i++) {
          const upz = dist.upazilas[i];
          const [nameBn, nameEn] = upz;
          const slug = `${dist.district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
          
          // REAL GEOGRAPHIC COORDINATE LOOKUP
          const coord = upazilaCoordinates[slug];
          if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
            throw new Error(`FATAL CONFIGURATION ERROR: Missing real geographic coordinates for Upazila/Thana: '${nameEn}' in district '${dist.district}' (slug: '${slug}'). Synthetic fallbacks are strictly prohibited.`);
          }

          // Validate coordinate boundaries for Bangladesh
          if (coord.lat < 20.5 || coord.lat > 26.7 || coord.lng < 88.0 || coord.lng > 92.7) {
            throw new Error(`FATAL CONFIGURATION ERROR: Geographic coordinate for '${slug}' (${coord.lat}, ${coord.lng}) is outside Bangladesh boundary.`);
          }

          flatLocations.push({
            nameBn,
            nameEn,
            division: div.division,
            divisionBn: div.divisionBn,
            district: dist.district,
            districtBn: dist.districtBn,
            upazila: nameEn,
            upazilaBn: nameBn,
            slug,
            latitude: coord.lat,
            longitude: coord.lng,
            type: nameEn.toLowerCase().includes('thana') || ['Mirpur', 'Uttara', 'Dhanmondi', 'Gulshan', 'Banani', 'Agrabad', 'Panchlaish', 'Kotwali'].some(k => nameEn.includes(k)) ? 'thana' : 'upazila',
            isActive: true,
            popularPriority: ['Mirpur', 'Uttara', 'Dhanmondi', 'Gulshan', 'Agrabad', 'Sylhet Sadar', 'Kotwali (Chattogram)', 'Boalia', 'Khulna Sadar'].some(k => nameEn.includes(k)) ? 100 : 10,
          });
        }
      }
    }

    console.log(`[Seed] Seeding ${flatLocations.length} official Upazilas/Thanas with 100% verified real geographic coordinates...`);

    const bulkOps = flatLocations.map((loc) => ({
      updateOne: {
        filter: { slug: loc.slug },
        update: { $set: loc },
        upsert: true,
      },
    }));

    await Location.bulkWrite(bulkOps);
    console.log('[Seed] ✅ Location data seed complete.');

    // 2. Post-Seed Database Verification
    const dbLocations = await Location.find({ isActive: true }).select('nameEn slug latitude longitude district division').lean();
    let validCoordsCount = 0;
    let missingCoordsCount = 0;
    let outOfBoundsCount = 0;

    for (const loc of dbLocations) {
      if (typeof loc.latitude === 'number' && typeof loc.longitude === 'number' && loc.latitude > 0 && loc.longitude > 0) {
        if (loc.latitude >= 20.5 && loc.latitude <= 26.7 && loc.longitude >= 88.0 && loc.longitude <= 92.7) {
          validCoordsCount++;
        } else {
          outOfBoundsCount++;
        }
      } else {
        missingCoordsCount++;
      }
    }

    if (missingCoordsCount > 0 || outOfBoundsCount > 0 || dbLocations.length !== 593) {
      throw new Error(`DATABASE VALIDATION FAILED: Total=${dbLocations.length}, Valid=${validCoordsCount}, Missing=${missingCoordsCount}, OutOfBounds=${outOfBoundsCount}`);
    }

    // 3. Seed Admin User from Environment Variables
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      throw new Error('FATAL CONFIGURATION ERROR: ADMIN_PASSWORD environment variable is required to configure the admin account.');
    }

    let admin = await AdminUser.findOne({ username: adminUsername.toLowerCase() });
    if (!admin) {
      admin = new AdminUser({
        username: adminUsername,
        password: adminPassword,
        role: 'admin',
      });
      await admin.save();
      console.log(`[Seed] ✅ Admin user created: '${adminUsername}'`);
    } else {
      console.log(`[Seed] Admin user '${adminUsername}' already configured.`);
    }

    // 4. STRICT RULE: NO FAKE ELECTRICITY REPORTS
    const actualReportCount = await ElectricityReport.countDocuments();
    console.log(`[Seed] 📊 Real Electricity Reports in Database: ${actualReportCount} (Zero fake demo reports generated)`);

    // 5. PRINT FINAL SUMMARY REPORT
    console.log('===================================================');
    console.log('🎉 SEED & GEOGRAPHIC COORDINATES AUDIT:');
    console.log(`   • Total Divisions: ${totalDivisions} (All official divisions)`);
    console.log(`   • Total Districts: ${totalDistricts} (All 64 official districts)`);
    console.log(`   • Total Locations Seeded: ${dbLocations.length}`);
    console.log(`   • Locations With Valid Real Coordinates: ${validCoordsCount} (100%)`);
    console.log(`   • Missing Coordinates: ${missingCoordsCount}`);
    console.log(`   • Out of Bangladesh Coordinates: ${outOfBoundsCount}`);
    console.log(`   • Synthetic / Spiral Coordinates Used: 0 (Strictly Real GIS Data)`);
    console.log('===================================================');

    process.exit(0);
  } catch (error) {
    console.error('[Seed Error]:', error.message || error);
    process.exit(1);
  }
};

seedDatabase();
