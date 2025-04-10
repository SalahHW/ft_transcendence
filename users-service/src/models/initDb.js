import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./database/db.sqlite', (err) => {
  if (err) {
    throw new Error('Connection error to SQLite: ', err.message);
  } else {
    console.log('Connected to SQLite');
  }
});

const initializeDatabase = () => {
  const createUsersTable = `
  CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.run(createUsersTable, (err) => {
    if (err) {
      throw new Error('Error creating users table: ', err.message);
    } else {
      console.log('Database initialized');
    };
  });
};

export { db, initializeDatabase };