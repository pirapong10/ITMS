#!/usr/bin/env node
/**
 * Production Secret Key Generator for ITSM Enterprise
 */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

console.log('🔐 ========================================================');
console.log('   ITSM Enterprise — Production Key & Secret Generator');
console.log('========================================================\n');

const jwtSecret = crypto.randomBytes(32).toString('hex');
const encryptionKey = crypto.randomBytes(32).toString('hex');
const dbPassword = crypto.randomBytes(16).toString('hex');

console.log('✅ Generated Cryptographically Secure Keys:');
console.log(`- JWT_SECRET:     ${jwtSecret}`);
console.log(`- ENCRYPTION_KEY: ${encryptionKey}`);
console.log(`- DB_PASSWORD:    ${dbPassword}\n`);

const envPath = path.join(process.cwd(), '.env.production');
const examplePath = path.join(process.cwd(), '.env.production.example');

let content = '';
if (fs.existsSync(examplePath)) {
  content = fs.readFileSync(examplePath, 'utf8');
} else {
  content = `# PRODUCTION ENVIRONMENT CONFIGURATION
NODE_ENV=production
PORT=3000
DATABASE_URL=postgres://itsm_admin:${dbPassword}@postgres:5432/itsm_prod
POSTGRES_USER=itsm_admin
POSTGRES_PASSWORD=${dbPassword}
POSTGRES_DB=itsm_prod
JWT_SECRET=${jwtSecret}
ENCRYPTION_KEY=${encryptionKey}
`;
}

// Replace placeholder secrets
content = content.replace(/JWT_SECRET=.*/g, `JWT_SECRET=${jwtSecret}`);
content = content.replace(/ENCRYPTION_KEY=.*/g, `ENCRYPTION_KEY=${encryptionKey}`);

fs.writeFileSync(envPath, content, 'utf8');
console.log(`📄 Successfully written configuration to: .env.production\n`);
console.log('🚀 Next Step: Review .env.production and run ./scripts/deploy.sh');
