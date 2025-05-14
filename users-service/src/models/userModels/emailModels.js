import { database } from "../database.js";

export const readEmail = async (id) => {
  const query = `
  SELECT email
  FROM users
  WHERE id = ?`;
  const result = await database.get(query, [id]);
  return result;
};

export const updateEmail = async (id, newEmail) => {
  const query = `
  UPDATE users
  SET email = ?
  WHERE id = ?`;
  const result = await database.run(query, [newEmail, id]);
  return result.changes;
};
