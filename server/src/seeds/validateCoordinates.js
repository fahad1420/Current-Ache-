import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { upazilaCoordinates } from './upazilaCoordinates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adminData = JSON.parse(fs.readFileSync(path.join(__dirname, 'administrativeData.json'), 'utf8'));

let total = 0;
let valid = 0;
const missing = [];
const outOfBounds = [];

for (const div of adminData) {
  for (const dist of div.districts) {
    for (const upz of dist.upazilas) {
      total++;
      const [nameBn, nameEn] = upz;
      const slug = `${dist.district.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${nameEn.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const coord = upazilaCoordinates[slug];

      if (!coord || typeof coord.lat !== 'number' || typeof coord.lng !== 'number') {
        missing.push({ district: dist.district, nameEn, slug });
      } else if (coord.lat < 20.5 || coord.lat > 26.7 || coord.lng < 88.0 || coord.lng > 92.7) {
        outOfBounds.push({ district: dist.district, nameEn, slug, coord });
      } else {
        valid++;
      }
    }
  }
}

console.log('===================================================');
console.log('📍 BANGLADESH GEOGRAPHIC COORDINATES AUDIT:');
console.log(`   • Total locations checked: ${total}`);
console.log(`   • Valid geographic coordinates: ${valid}`);
console.log(`   • Missing coordinates: ${missing.length}`);
console.log(`   • Out of bounds coordinates: ${outOfBounds.length}`);
console.log('===================================================');

if (missing.length > 0) {
  console.error('MISSING LIST:', missing);
  process.exit(1);
}

if (outOfBounds.length > 0) {
  console.error('OUT OF BOUNDS LIST:', outOfBounds);
  process.exit(1);
}

console.log('✅ 100% of all 593 Upazilas/Thanas have verified geographic coordinates in Bangladesh!');
