const admin = require('firebase-admin');
const fs = require('fs');
const dotenv = require('dotenv');

async function main() {
  if (fs.existsSync('.env')) {
    const envConfig = dotenv.parse(fs.readFileSync('.env'));
    for (const k in envConfig) {
      process.env[k] = envConfig[k];
    }
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase credentials missing from .env');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });

  const db = admin.firestore();
  const snapshot = await db.collection('test_orders').get();
  console.log(`Firestore 'test_orders' count: ${snapshot.size}`);
  snapshot.forEach(doc => {
    console.log(`- Doc ID: ${doc.id}, data:`, doc.data());
  });
}

main().catch(console.error);
