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

    const avatarTableQuery = `
    CREATE TABLE IF NOT EXISTS avatars (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      image_url TEXT UNIQUE NOT NULL
      );`;
    
    const userAvatarTableQuery = `
    CREATE TABLE IF NOT EXISTS user_avatar (
      user_id INTEGER PRIMARY KEY,
      avatar_id INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (avatar_id) REFERENCES avatars(id)
      );`

    const defaultAvatarQuery = `
    INSERT INTO avatars (id, image_url)
    VALUES (1, '/avatars/default.png');`

    await database.exec(avatarTableQuery);
    await database.exec(userAvatarTableQuery);
    await database.run(defaultAvatarQuery);
    
    console.log("Database initialized");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    console.error("File should be located at ", DB_PATH);
    process.exit(1);
  }
};
