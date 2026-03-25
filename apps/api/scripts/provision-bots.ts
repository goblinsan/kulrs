/**
 * provision-bots.ts
 *
 * One-time script to create Firebase Auth accounts and DB user rows
 * for all Kulrs bot personalities.
 *
 * Run from apps/api/:
 *   npm run provision:bots
 *
 * Requires:
 *   - apps/api/.env.local with DATABASE_URL and FIREBASE_PROJECT_ID
 *   - Firebase Application Default Credentials (gcloud auth application-default login)
 *     OR GOOGLE_APPLICATION_CREDENTIALS pointing to a service account JSON
 *
 * Idempotent: safe to re-run. Existing Firebase accounts are left as-is;
 * DB rows are upserted to ensure isBot=true.
 *
 * Outputs: scripts/bot-credentials.json (gitignored)
 */

import { randomUUID } from 'crypto';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import admin from 'firebase-admin';
import { getDb, users } from '@kulrs/db';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from apps/api/.env.local
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// ---------------------------------------------------------------------------
// Bot roster — keep in sync with ideas/agent-bot-personalities.md
// ---------------------------------------------------------------------------
const BOTS = [
  {
    username: 'mireille',
    email: 'mireille@kulrs.com',
    displayName: 'mireille',
  },
  { username: 'hex_junkie', email: 'hex@kulrs.com', displayName: 'hex_junkie' },
  { username: 'sol_studio', email: 'sol@kulrs.com', displayName: 'sol_studio' },
  { username: 'nyx', email: 'nyx@kulrs.com', displayName: 'nyx' },
  { username: 'sundrop', email: 'sundrop@kulrs.com', displayName: 'sundrop' },
  {
    username: 'fieldnotes',
    email: 'fieldnotes@kulrs.com',
    displayName: 'fieldnotes',
  },
  {
    username: 'retrograde',
    email: 'retrograde@kulrs.com',
    displayName: 'retrograde',
  },
  {
    username: 'civic_grey',
    email: 'civic@kulrs.com',
    displayName: 'civic_grey',
  },
  {
    username: 'pastelwave',
    email: 'pastelwave@kulrs.com',
    displayName: 'pastelwave',
  },
  { username: 'inkwell', email: 'inkwell@kulrs.com', displayName: 'inkwell' },
  {
    username: 'saltflat',
    email: 'saltflat@kulrs.com',
    displayName: 'saltflat',
  },
  {
    username: 'velvetroom',
    email: 'velvetroom@kulrs.com',
    displayName: 'velvetroom',
  },
  {
    username: 'chromalab',
    email: 'chromalab@kulrs.com',
    displayName: 'chromalab',
  },
  { username: 'zestpop', email: 'zestpop@kulrs.com', displayName: 'zestpop' },
  {
    username: 'driftwood',
    email: 'driftwood@kulrs.com',
    displayName: 'driftwood',
  },
];

// ---------------------------------------------------------------------------
// Firebase init
// ---------------------------------------------------------------------------
function initFirebase() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId)
    throw new Error('FIREBASE_PROJECT_ID is not set in .env.local');
  admin.initializeApp({ projectId });
  return admin.auth();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('🤖 Provisioning Kulrs bot accounts...\n');

  const auth = initFirebase();
  const db = getDb();

  type Credential = {
    username: string;
    email: string;
    password: string;
    firebaseUid: string;
    dbUserId: string;
  };
  const credentials: Credential[] = [];

  for (const bot of BOTS) {
    process.stdout.write(`  ${bot.username.padEnd(14)}`);

    // --- Firebase Auth ---
    let firebaseUid: string;
    let password: string;

    try {
      const existing = await auth.getUserByEmail(bot.email);
      firebaseUid = existing.uid;
      password = '(existing — see previous credentials file)';
      process.stdout.write('Firebase ✓ (existing)  ');
    } catch (err: unknown) {
      const fbErr = err as { code?: string };
      if (fbErr.code !== 'auth/user-not-found') throw err;

      password = randomUUID();
      const created = await auth.createUser({
        email: bot.email,
        displayName: bot.displayName,
        password,
        emailVerified: true,
      });
      firebaseUid = created.uid;
      process.stdout.write('Firebase ✓ (created)   ');
    }

    // --- DB upsert ---
    const [row] = await db
      .insert(users)
      .values({
        firebaseUid,
        email: bot.email,
        displayName: bot.displayName,
        isBot: true,
      })
      .onConflictDoUpdate({
        target: users.firebaseUid,
        set: {
          email: bot.email,
          displayName: bot.displayName,
          isBot: true,
          updatedAt: new Date(),
        },
      })
      .returning({ id: users.id });

    console.log(`DB ✓  uid=${firebaseUid.slice(0, 8)}…`);

    credentials.push({
      username: bot.username,
      email: bot.email,
      password,
      firebaseUid,
      dbUserId: row.id,
    });
  }

  // --- Write credentials file ---
  const outPath = join(__dirname, 'bot-credentials.json');
  writeFileSync(outPath, JSON.stringify({ bots: credentials }, null, 2));

  console.log('\n✅ All bots provisioned.');
  console.log(`\n📄 Credentials written to:\n   ${outPath}`);
  console.log('\n⚠️  Store these in OpenClaw config and delete the file.\n');
}

main().catch(err => {
  console.error('\n❌ Provisioning failed:', err);
  process.exit(1);
});
