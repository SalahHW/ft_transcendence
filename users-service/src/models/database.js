import sqlite3 from "sqlite3";
import { open } from "sqlite";
import { DB_PATH } from "../config/config.js";

export let database;

export const initializeDatabase = async () => {
  try {
    database = await open({
      filename: DB_PATH,
      driver: sqlite3.Database,
    });
    console.log("Connected to SQLite at ", DB_PATH);

    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      wallet TEXT UNIQUE NOT NULL,
      has_2fa BOOLEAN DEFAULT 0,
      login_type TEXT DEFAULT 'credentials',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;

    await database.exec(query);
    console.log("Database initialized");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    console.error("File should be located at ", DB_PATH);
    process.exit(1);
  }
};
