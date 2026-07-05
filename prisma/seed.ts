import path from 'path';
import dotenv from 'dotenv';

// Try multiple paths to find .env — handles Windows + ts-node quirks
const envPaths = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(__dirname, '../.env'),
  path.resolve(__dirname, '../../.env'),
];

let loaded = false;
for (const envPath of envPaths) {
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log(`Loaded .env from: ${envPath}`);
    loaded = true;
    break;
  }
}

if (!loaded) {
  console.warn('Warning: .env file not found in any expected location. Ensure DATABASE_URL is set.');
}

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set.');
  console.error('Make sure your .env file exists in the project root with DATABASE_URL defined.');
  process.exit(1);
}

import { PrismaClient } from '@prisma/client';
import { generateLicenseKey } from '../src/utils/license.util';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const licenses = [
    {
      email: 'admin@korarender.com',
      name: 'Admin Test',
      license_key: 'KR-ABCD-EFGH-IJKL',
      status: 'ACTIVE' as const,
      plan: 'STUDIO',
      expires_at: new Date('2027-12-31'),
      max_devices: 5,
    },
    {
      email: 'user@example.com',
      name: 'User Test',
      license_key: generateLicenseKey(),
      status: 'ACTIVE' as const,
      plan: 'PRO',
      expires_at: new Date('2026-12-31'),
      max_devices: 2,
    },
    {
      email: 'basic@example.com',
      name: 'Basic User',
      license_key: generateLicenseKey(),
      status: 'ACTIVE' as const,
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
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
