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
    CREATE TABLE IF NOT EXISTS avatars (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    avatar_url TEXT UNIQUE NOT NULL);`;

    await database.exec(query);

    console.log("Database initialized");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    console.error("File should be located at ", DB_PATH);
    process.exit(1);
  }
};
