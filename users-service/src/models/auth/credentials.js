import { database } from "../database.js";

export const getCredentialsByUsername = async (username) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT * FROM users WHERE username = ?";
    database.get(query, [username], (err, row) => {
      if (err) reject(err);
      resolve(row);
    });
  });
};
