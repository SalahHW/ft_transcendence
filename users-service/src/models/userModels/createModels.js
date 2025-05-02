import { database } from "../database.js";

export const insertUser = async (username, password) => {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
    database.run(query, [username, password], function (err) {
      if (err) reject(err);
      resolve({ id: this.lastID, username });
    });
  });
};
