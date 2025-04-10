import { db } from '../models/initDb.js';

export const fetchUsers = async () => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT id, username FROM users';
    db.all(query, (err, rows) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        console.log('All users fetched');
        resolve(rows);
      }
    });
  });
};

export const addUser = async (username, password) => {
  return new Promise((resolve, reject) => {
    const query = 'INSERT INTO users (username, password) VALUES (?, ?)';
    db.run(query, [username, password], function (err) {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        console.log(`New user created: ${username}`);
        resolve({ id: this.lastID });
      }
    });
  });
};

export const userExists = async (username) => {
  return new Promise((resolve, reject) => {
    const query = 'SELECT COUNT(*) as count FROM users WHERE username = ?';
    db.get(query, [username], (err, row) => {
      if (err) {
        console.error(err.message);
        reject(err);
      } else {
        resolve(row.count > 0);
      }
    });
  });
};