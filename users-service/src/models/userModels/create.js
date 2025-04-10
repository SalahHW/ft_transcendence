import { db } from "../initDb.js";

export const insertUser = async (username, password) => {
  return new Promise((resolve, reject) => {
    const query = "INSERT INTO users (username, password) VALUES (?, ?)";
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
