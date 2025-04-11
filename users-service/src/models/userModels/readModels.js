import { db } from "../initDb.js";

export const getAllUsers = () => {
  return new Promise((resolve, reject) => {
    const query = "SELECT id, username FROM users";
    db.all(query, (err, rows) => {
      if (err) {
        console.error("Failed to get users: ", err.message);
        reject(err);
      }
      resolve(rows);
    });
  });
};

export const getUserById = (id) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT id, username FROM users WHERE id = ?";
    db.get(query, [id], (err, row) => {
      if (err) {
        console.error(`Failed to get user #${id}: `, err.message);
        reject(err);
      }
      resolve(row);
    });
  });
};
