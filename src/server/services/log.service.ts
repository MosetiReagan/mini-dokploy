import { EventEmitter } from "events";
import { db } from "../db";
import { deploymentLogs } from "../db/schema";
import { eq, asc } from "drizzle-orm";
import crypto from "crypto";

export type LogLevel = "info" | "warn" | "error" | "success";

export interface LogEntry {
  id: string;
  deploymentId: string;
  timestamp: Date;
  level: LogLevel;
  message: string;
}

class LogService extends EventEmitter {
  private inMemoryLogs: Map<string, LogEntry[]> = new Map();

  async emitLog(
    deploymentId: string,
    message: string,
    level: LogLevel = "info"
  ): Promise<LogEntry> {
    const entry: LogEntry = {
      id: `log_${crypto.randomUUID()}`,
      deploymentId,
      timestamp: new Date(),
      level,
      message,
    };

    // Store in-memory buffer for instant streaming
    const current = this.inMemoryLogs.get(deploymentId) || [];
    current.push(entry);
    if (current.length > 500) current.shift(); // retain last 500
    this.inMemoryLogs.set(deploymentId, current);

    // Persist to SQLite
    try {
      db.insert(deploymentLogs)
        .values({
          id: entry.id,
          deploymentId,
          timestamp: entry.timestamp,
          level,
          message,
        })
        .run();
    } catch (err) {
      console.error("[LogService] Failed to persist log entry to SQLite:", err);
    }

    // Broadcast to WebSocket listeners
    this.emit(`log:${deploymentId}`, entry);
    this.emit("log", entry);

    return entry;
  }

  async getLogs(deploymentId: string): Promise<LogEntry[]> {
    try {
      const persisted = db
        .select()
        .from(deploymentLogs)
        .where(eq(deploymentLogs.deploymentId, deploymentId))
        .orderBy(asc(deploymentLogs.timestamp))
        .all();

      if (persisted && persisted.length > 0) {
        return persisted.map((l) => ({
          id: l.id,
          deploymentId: l.deploymentId,
          timestamp: new Date(l.timestamp),
          level: l.level as LogLevel,
          message: l.message,
        }));
      }
    } catch (err) {
      console.error("[LogService] Error querying persisted logs:", err);
    }

    return this.inMemoryLogs.get(deploymentId) || [];
  }
}

export const logService = new LogService();
