// Helper script to format Firebase Service Account JSON for Supabase secret
// This ensures the private key is properly escaped

// IMPORTANT: Never commit actual credentials to git!
// Store your firebase-credentials.json file locally and add it to .gitignore

const fs = require('fs');
const path = require('path');

// Load credentials from a local file (NOT committed to git)
const credentialsPath = path.join(__dirname, 'firebase-credentials.json');

if (!fs.existsSync(credentialsPath)) {
  console.error('Error: firebase-credentials.json not found!');
  console.error('Please create this file with your Firebase service account credentials.');
  console.error('Download it from: Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

// Output as single-line JSON (this is what you paste in Supabase)
console.log('\n=== COPY THIS ENTIRE LINE AND PASTE IN SUPABASE SECRET ===\n');
console.log(JSON.stringify(serviceAccount));
console.log('\n=== END ===\n');
