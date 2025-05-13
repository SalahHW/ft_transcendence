import { database } from "./database.js";

export const readPassword = async (id) => {
  const query = `
  SELECT password
  FROM users
  WHERE id = ?`;
  const result = await database.get(query, [id]);
  return result;
};

export const updatePassword = async (id, newPassword) => {
  const query = `
  UPDATE users
  SET password = ?
  WHERE id = ?`;
  const result = await database.run(query, [newPassword, id]);
  return result.changes;
};
