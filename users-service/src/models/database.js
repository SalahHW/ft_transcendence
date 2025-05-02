import sqlite3 from "sqlite3";
import { open } from "sqlite";

const databasePath = "./database/db.sqlite";
export let database;

export const initializeDatabase = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    console.log("Connected to SQLite at ", databasePath);

    const query = `
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );`;
      
    await database.exec(query);
    console.log("Database initialized");
  } catch (error) {
    console.error("Database initialization failed:", error.message);
    throw error;
  }
};

// const db = new sqlite3.Database('./database/db.sqlite', (err) => {
//   if (err) {
//     throw new Error('Connection error to SQLite: ', err.message);
//   } else {
//     console.log('Connected to SQLite');
//   }
// });

// const initializeDatabase = () => {
//   const createUsersTable = `
//   CREATE TABLE IF NOT EXISTS users (
//   id INTEGER PRIMARY KEY AUTOINCREMENT,
//       username TEXT UNIQUE NOT NULL,
//       password TEXT NOT NULL,
//       created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );
//   `;

//   db.run(createUsersTable, (err) => {
//     if (err) {
//       throw new Error("Error creating users table: ", err.message);
//     } else {
//       console.log("Database initialized");
//     }
//   });
// };
