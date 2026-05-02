const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");
const { Pool } = require("pg");
const { get, put } = require("@vercel/blob");

const DB_PATH = path.join(__dirname, "..", "data", "db.json");
const BLOB_DB_PATH = process.env.BLOB_DB_PATH || "plm-cms/db.json";
const STATE_KEY = "main";
const DEFAULT_USERS = [
  {
    id: "jeffrey-pigeon",
    name: "Jeffrey Pigeon",
    role: "Director of Product and Marketing",
    email: "",
    phone: "",
    notes: "",
    updatedAt: null,
  },
  {
    id: "russ-miller",
    name: "Russ Miller",
    role: "Senior Product Manager",
    email: "",
    phone: "",
    notes: "",
    updatedAt: null,
  },
  {
    id: "ab-chowdhry",
    name: "AB Chowdhry",
    role: "Retail Marketing Specialist",
    email: "",
    phone: "",
    notes: "",
    updatedAt: null,
  },
];

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return crypto.randomUUID();
}

function normalizeUser(user, fallback) {
  return {
    id: user.id || fallback.id,
    name: user.name || fallback.name,
    role: String(user.role ?? fallback.role ?? "").trim(),
    email: String(user.email || "").trim(),
    phone: String(user.phone || "").trim(),
    notes: String(user.notes || "").trim(),
    updatedAt: user.updatedAt || fallback.updatedAt || null,
    passwordHash: String(user.passwordHash || "").trim(),
    passwordSalt: String(user.passwordSalt || "").trim(),
  };
}

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    phone: user.phone,
    notes: user.notes,
    updatedAt: user.updatedAt,
    hasPassword: Boolean(user.passwordHash && user.passwordSalt),
  };
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, user) {
  if (!user.passwordHash || !user.passwordSalt) {
    return false;
  }
  const attempted = hashPassword(password, user.passwordSalt).hash;
  const expectedBuffer = Buffer.from(user.passwordHash, "hex");
  const actualBuffer = Buffer.from(attempted, "hex");
  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }
  return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
}

function validatePassword(password) {
  const raw = String(password || "");
  if (raw.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  return raw;
}

function ensureUsers(users = []) {
  return DEFAULT_USERS.map((baseUser) => {
    const existing = users.find((item) => item.id === baseUser.id);
    return normalizeUser(existing || {}, baseUser);
  });
}

function ensureTimelineEntries(entries = []) {
  return entries
    .filter(Boolean)
    .map((entry) => ({
      id: entry.id || createId(),
      type: entry.type || "note",
      text: String(entry.text || "").trim(),
      createdAt: entry.createdAt || nowIso(),
      createdById: entry.createdById || null,
      createdByName: entry.createdByName || "Unknown",
    }))
    .filter((entry) => entry.text);
}

function ensureContactShape(contact) {
  return {
    id: contact.id || createId(),
    ...normalizeContactPayload(contact),
    createdAt: contact.createdAt || nowIso(),
    createdById: contact.createdById || null,
    createdByName: contact.createdByName || "Unknown",
    updatedAt: contact.updatedAt || contact.createdAt || nowIso(),
    updatedById: contact.updatedById || contact.createdById || null,
    updatedByName: contact.updatedByName || contact.createdByName || "Unknown",
    timeline: ensureTimelineEntries(contact.timeline || []),
  };
}

function getActor(db, actorId) {
  const actor = db.users.find((user) => user.id === actorId);
  if (!actor) {
    throw new Error("A valid team member must be selected");
  }
  return actor;
}

function shouldUseBlobStorage() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function shouldUsePostgresStorage() {
  return Boolean(process.env.DATABASE_URL);
}

let pgPool = null;
let pgReady = false;

function sanitizeDatabaseUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.searchParams.delete("sslmode");
    url.searchParams.delete("sslcert");
    url.searchParams.delete("sslkey");
    url.searchParams.delete("sslrootcert");
    return url.toString();
  } catch (_error) {
    return rawUrl;
  }
}

function getDatabaseIdentity(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const dbName = (url.pathname || "/").replace(/^\//, "") || "postgres";
    return `${decodeURIComponent(url.username || "unknown")}@${url.hostname}:${url.port || "5432"}/${dbName}`;
  } catch (_error) {
    return "unknown-database-target";
  }
}

function getPgPool() {
  if (!pgPool) {
    const sslMode = String(process.env.PGSSLMODE || "").toLowerCase();
    const disableSsl = sslMode === "disable";
    const noVerify =
      sslMode === "no-verify" ||
      process.env.PGSSL_NO_VERIFY === "1" ||
      process.env.PGSSL_NO_VERIFY === "true" ||
      process.env.NODE_ENV === "production";

    pgPool = new Pool({
      connectionString: sanitizeDatabaseUrl(process.env.DATABASE_URL),
      ssl: disableSsl ? false : { rejectUnauthorized: !noVerify },
    });
  }
  return pgPool;
}

async function ensurePgReady() {
  if (pgReady) {
    return;
  }

  const pool = getPgPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS app_state (
      state_key TEXT PRIMARY KEY,
      payload JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  pgReady = true;
}

function isReadOnlyFsError(error) {
  return error && ["EROFS", "EPERM", "EACCES"].includes(error.code);
}

async function readSeedDb() {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { users: ensureUsers([]), contacts: [] };
    }
    throw error;
  }
}

async function readDbFromBlob() {
  const blob = await get(BLOB_DB_PATH, {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    useCache: false,
  });

  if (!blob) {
    return readSeedDb();
  }

  const raw = await new Response(blob.stream).text();
  return JSON.parse(raw);
}

async function writeDbToBlob(db) {
  await put(BLOB_DB_PATH, JSON.stringify(db, null, 2), {
    access: "private",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
    addRandomSuffix: false,
    contentType: "application/json",
  });
}

async function readDbFromPostgres() {
  await ensurePgReady();
  const pool = getPgPool();
  const result = await pool.query(
    "SELECT payload FROM app_state WHERE state_key = $1 LIMIT 1",
    [STATE_KEY]
  );

  if (!result.rows.length) {
    const seed = normalizeDb(await readSeedDb());
    await writeDbToPostgres(seed);
    return seed;
  }

  return result.rows[0].payload;
}

async function writeDbToPostgres(db) {
  await ensurePgReady();
  const pool = getPgPool();
  await pool.query(
    `
      INSERT INTO app_state (state_key, payload, updated_at)
      VALUES ($1, $2::jsonb, NOW())
      ON CONFLICT (state_key)
      DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()
    `,
    [STATE_KEY, JSON.stringify(db)]
  );
}

function normalizeDb(parsed) {
  if (!Array.isArray(parsed.contacts)) {
    parsed.contacts = [];
  }
  parsed.users = ensureUsers(Array.isArray(parsed.users) ? parsed.users : []);
  parsed.contacts = parsed.contacts.map(ensureContactShape);
  return parsed;
}

async function readDb() {
  try {
    let parsed;
    if (shouldUsePostgresStorage()) {
      try {
        parsed = await readDbFromPostgres();
      } catch (error) {
        const target = getDatabaseIdentity(process.env.DATABASE_URL || "");
        throw new Error(
          `Postgres connection failed for ${target}. ${error.message || ""}`.trim()
        );
      }
    } else if (shouldUseBlobStorage()) {
      parsed = await readDbFromBlob();
    } else {
      parsed = JSON.parse(await fs.readFile(DB_PATH, "utf-8"));
    }
    return normalizeDb(parsed);
  } catch (error) {
    if (error.code === "ENOENT") {
      return { users: ensureUsers([]), contacts: [] };
    }
    throw error;
  }
}

async function writeDb(db) {
  const payload = JSON.stringify(db, null, 2);

  if (shouldUsePostgresStorage()) {
    try {
      await writeDbToPostgres(db);
      return;
    } catch (error) {
      const target = getDatabaseIdentity(process.env.DATABASE_URL || "");
      throw new Error(
        `Postgres storage write failed for ${target}. Check DATABASE_URL and database access. ${error.message || ""}`.trim()
      );
    }
  }

  if (shouldUseBlobStorage()) {
    try {
      await writeDbToBlob(db);
      return;
    } catch (error) {
      throw new Error(
        `Blob storage write failed. Check BLOB_READ_WRITE_TOKEN and Blob store access. ${error.message || ""}`.trim()
      );
    }
  }

  if (process.env.VERCEL) {
    throw new Error(
      "No writable production storage configured. Set DATABASE_URL (recommended) or BLOB_READ_WRITE_TOKEN and redeploy."
    );
  }

  try {
    await fs.writeFile(DB_PATH, payload, "utf-8");
  } catch (error) {
    if (isReadOnlyFsError(error)) {
      throw new Error(
        "Local storage path is read-only. Configure writable storage before saving changes."
      );
    }
    throw error;
  }
}

function normalizeContactPayload(payload) {
  return {
    name: String(payload.name || "").trim(),
    company: String(payload.company || "").trim(),
    title: String(payload.title || "").trim(),
    email: String(payload.email || "").trim(),
    phone: String(payload.phone || "").trim(),
    website: String(payload.website || "").trim(),
    linkedIn: String(payload.linkedIn || "").trim(),
    tags: Array.isArray(payload.tags)
      ? payload.tags.map((x) => String(x).trim()).filter(Boolean)
      : [],
    nextMeetingDate: String(payload.nextMeetingDate || "").trim(),
  };
}

async function listContacts(search = "") {
  const db = await readDb();
  const term = search.trim().toLowerCase();
  const contacts = [...db.contacts].sort(
    (a, b) =>
      new Date(b.updatedAt || b.createdAt || 0).getTime() -
      new Date(a.updatedAt || a.createdAt || 0).getTime()
  );

  if (!term) {
    return contacts;
  }

  return contacts.filter((contact) => {
    const haystack = [
      contact.name,
      contact.company,
      contact.title,
      contact.email,
      contact.phone,
      contact.website,
      contact.linkedIn,
      ...(contact.tags || []),
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

async function getContactById(id) {
  const db = await readDb();
  return db.contacts.find((contact) => contact.id === id) || null;
}

async function listUsers() {
  const db = await readDb();
  return db.users.map(sanitizeUser);
}

async function updateUser(userId, payload) {
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  user.role = String(payload.role || "").trim();
  user.email = String(payload.email || "").trim();
  user.phone = String(payload.phone || "").trim();
  user.notes = String(payload.notes || "").trim();
  user.updatedAt = nowIso();

  await writeDb(db);
  return sanitizeUser(user);
}

async function authenticateUser(userId, password) {
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  const normalizedPassword = validatePassword(password);
  const firstTimeSetup = !user.passwordHash || !user.passwordSalt;

  if (firstTimeSetup) {
    const encrypted = hashPassword(normalizedPassword);
    user.passwordHash = encrypted.hash;
    user.passwordSalt = encrypted.salt;
    user.updatedAt = nowIso();
    await writeDb(db);
    return {
      authenticated: true,
      firstTimeSetup: true,
      user: sanitizeUser(user),
    };
  }

  const ok = verifyPassword(normalizedPassword, user);
  if (!ok) {
    throw new Error("Incorrect password");
  }

  return {
    authenticated: true,
    firstTimeSetup: false,
    user: sanitizeUser(user),
  };
}

async function resetUserPassword(userId, currentPassword, newPassword) {
  const db = await readDb();
  const user = db.users.find((item) => item.id === userId);
  if (!user) {
    return null;
  }

  if (!user.passwordHash || !user.passwordSalt) {
    throw new Error("Password is not set yet for this user");
  }

  const normalizedCurrent = validatePassword(currentPassword);
  const normalizedNew = validatePassword(newPassword);

  const currentMatches = verifyPassword(normalizedCurrent, user);
  if (!currentMatches) {
    throw new Error("Current password is incorrect");
  }

  const encrypted = hashPassword(normalizedNew);
  user.passwordHash = encrypted.hash;
  user.passwordSalt = encrypted.salt;
  user.updatedAt = nowIso();
  await writeDb(db);

  return sanitizeUser(user);
}

async function createContact(payload, actorId) {
  const db = await readDb();
  const base = normalizeContactPayload(payload);
  const actor = getActor(db, actorId);

  if (!base.name) {
    throw new Error("Name is required");
  }

  const createdAt = nowIso();

  const created = {
    id: createId(),
    ...base,
    createdAt,
    createdById: actor.id,
    createdByName: actor.name,
    updatedAt: createdAt,
    updatedById: actor.id,
    updatedByName: actor.name,
    timeline: [
      {
        id: createId(),
        type: "system",
        text: "Contact created",
        createdAt,
        createdById: actor.id,
        createdByName: actor.name,
      },
    ],
  };

  db.contacts.push(created);
  await writeDb(db);
  return created;
}

async function updateContact(id, payload, actorId) {
  const db = await readDb();
  const index = db.contacts.findIndex((contact) => contact.id === id);
  const actor = getActor(db, actorId);

  if (index === -1) {
    return null;
  }

  const normalized = normalizeContactPayload(payload);
  if (!normalized.name) {
    throw new Error("Name is required");
  }

  const existing = db.contacts[index];
  const updatedAt = nowIso();
  const updated = {
    ...existing,
    ...normalized,
    updatedAt,
    updatedById: actor.id,
    updatedByName: actor.name,
  };

  if (!Array.isArray(updated.timeline)) {
    updated.timeline = [];
  }

  updated.timeline.unshift({
    id: createId(),
    type: "system",
    text: "Contact details updated",
    createdAt: updatedAt,
    createdById: actor.id,
    createdByName: actor.name,
  });

  db.contacts[index] = updated;
  await writeDb(db);
  return updated;
}

async function deleteContact(id, actorId) {
  const db = await readDb();
  getActor(db, actorId);
  const initialLength = db.contacts.length;
  db.contacts = db.contacts.filter((contact) => contact.id !== id);

  if (db.contacts.length === initialLength) {
    return false;
  }

  await writeDb(db);
  return true;
}

async function addTimelineEntry(id, text, actorId, type = "note") {
  const db = await readDb();
  const contact = db.contacts.find((item) => item.id === id);
  const actor = getActor(db, actorId);

  if (!contact) {
    return null;
  }

  const cleanedText = String(text || "").trim();
  if (!cleanedText) {
    throw new Error("Note text is required");
  }

  if (!Array.isArray(contact.timeline)) {
    contact.timeline = [];
  }

  const entry = {
    id: createId(),
    type,
    text: cleanedText,
    createdAt: nowIso(),
    createdById: actor.id,
    createdByName: actor.name,
  };

  contact.timeline.unshift(entry);
  contact.updatedAt = nowIso();
  contact.updatedById = actor.id;
  contact.updatedByName = actor.name;
  await writeDb(db);
  return entry;
}

module.exports = {
  addTimelineEntry,
  createContact,
  deleteContact,
  getContactById,
  listContacts,
  listUsers,
  authenticateUser,
  resetUserPassword,
  updateUser,
  updateContact,
};
