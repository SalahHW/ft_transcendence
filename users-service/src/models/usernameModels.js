import { database } from "./database.js";

export const readUsername = async (id) => {
  const query = `
  SELECT username 
  FROM users 
  WHERE id = ?`;
  const result = await database.get(query, [id]);
  return result ? result.username : null;
};

export const updateUsername = async (id, newUsername) => {
  const query = `
  UPDATE users
  SET username = ?
  WHERE id = ?`;
  const result = await database.run(query, [newUsername, id]);
  return result.changes;
};
