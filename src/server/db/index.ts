import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import fs from "fs";
import path from "path";
import * as schema from "./schema";

const dbPath = process.env.DATABASE_URL || "./data/mini-dokploy.db";
const dbDir = path.dirname(path.resolve(dbPath));

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

// Auto-run schema DDL if tables do not exist (zero-setup reliability)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS deployments (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    repo_url TEXT NOT NULL,
    dockerfile_path TEXT NOT NULL DEFAULT './Dockerfile',
    branch TEXT NOT NULL DEFAULT 'main',
    exposed_port INTEGER NOT NULL DEFAULT 80,
    subdomain TEXT NOT NULL UNIQUE,
    custom_labels_json TEXT DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'pending',
    docker_service_id TEXT,
    image_tag TEXT,
    error_message TEXT,
    created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
  );

  CREATE TABLE IF NOT EXISTS deployment_logs (
    id TEXT PRIMARY KEY,
    deployment_id TEXT NOT NULL REFERENCES deployments(id) ON DELETE CASCADE,
    timestamp INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    level TEXT NOT NULL DEFAULT 'info',
    message TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_deployments_user_id ON deployments(user_id);
  CREATE INDEX IF NOT EXISTS idx_deployment_logs_deployment_id ON deployment_logs(deployment_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
`);

export const db = drizzle(sqlite, { schema });
