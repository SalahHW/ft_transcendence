import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { DB_PATH } from "../config/config.js";

export let database;

export async function initializeDatabase() {
  try {
    database = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });

    const query = `
    CREATE TABLE IF NOT EXISTS friendships (
      user_id    INTEGER NOT NULL,
      friend_id  INTEGER NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, friend_id));`;

    await database.exec(query);
  } catch (err) {
    console.error("Database initialization failed:", err.message);
    console.error("File should be located at ", DB_PATH);
    process.exit(1);
  }
}
