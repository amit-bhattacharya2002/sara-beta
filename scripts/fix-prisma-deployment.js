#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Fixing Prisma deployment issues...');

try {
  // Clean existing Prisma artifacts
  console.log('🧹 Cleaning existing Prisma artifacts...');
  const prismaPaths = [
    'node_modules/.prisma',
    'node_modules/@prisma/client',
    '.prisma'
  ];

  prismaPaths.forEach(p => {
    if (fs.existsSync(p)) {
      execSync(`rm -rf ${p}`, { stdio: 'inherit' });
    }
  });

  // Reinstall Prisma
  console.log('📦 Reinstalling Prisma...');
  execSync('npm install @prisma/client prisma', { stdio: 'inherit' });

  // Generate Prisma clients
  console.log('🔧 Generating Prisma clients...');
  execSync('npx prisma generate', { stdio: 'inherit' });

  // Verify Prisma clients were generated
  const businessClientPath = path.join(__dirname, '../node_modules/.prisma/client');

  if (!fs.existsSync(businessClientPath)) {
    throw new Error('Prisma client generation failed');
  }

  console.log('✅ Prisma clients generated successfully');

  // Check for Query Engine binaries
  const prismaClientPath = path.join(__dirname, '../node_modules/.prisma/client');
  if (fs.existsSync(prismaClientPath)) {
    const files = fs.readdirSync(prismaClientPath);
    const queryEngineFiles = files.filter(file => file.includes('query_engine'));
    console.log(`🔍 Found ${queryEngineFiles.length} Query Engine binary(ies):`, queryEngineFiles);
  }

  // Create a deployment-specific configuration
  const deploymentConfig = `
// Deployment-specific Prisma configuration
module.exports = {
  prisma: {
    binaryTargets: ['native', 'rhel-openssl-3.0.x'],
    engineType: 'binary',
  },
};
`;

  fs.writeFileSync(path.join(__dirname, '../prisma-deployment.config.js'), deploymentConfig);
  console.log('✅ Created deployment configuration');

  console.log('🎉 Prisma deployment fix completed successfully!');

} catch (error) {
  console.error('❌ Failed to fix Prisma deployment:', error.message);
  process.exit(1);
} 