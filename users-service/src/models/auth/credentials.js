import { db } from "../initDb.js";

export const getCredentialsByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE username = ?";
    db.get(query, [username], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};
