'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const { PrismaClient } = require('@prisma/client');

function generateLicenseKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `KR-${seg()}-${seg()}-${seg()}`;
}

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const licenses = [
    {
      email: 'admin@korarender.com',
      name: 'Admin Test',
      license_key: 'KR-ABCD-EFGH-IJKL',
      status: 'ACTIVE',
      plan: 'STUDIO',
      expires_at: new Date('2027-12-31'),
      max_devices: 5,
    },
    {
      email: 'user@example.com',
      name: 'User Test',
      license_key: generateLicenseKey(),
      status: 'ACTIVE',
      plan: 'PRO',
      expires_at: new Date('2026-12-31'),
      max_devices: 2,
    },
    {
      email: 'basic@example.com',
      name: 'Basic User',
      license_key: generateLicenseKey(),
      status: 'ACTIVE',
      plan: 'BASIC',
      expires_at: new Date('2026-06-30'),
      max_devices: 1,
    },
  ];

  for (const license of licenses) {
    await prisma.license.upsert({
      where: { license_key: license.license_key },
      update: {},
      create: license,
    });
    console.log(`  ✓ ${license.email} (${license.plan})`);
  }

  console.log('\nSeed completed successfully.');
  console.log('\nTest credentials:');
  console.log('  Email: admin@korarender.com');
  console.log('  Key:   KR-ABCD-EFGH-IJKL');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });