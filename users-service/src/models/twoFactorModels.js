import { database } from "./database.js";

export const readTwoFactor = async (id) => {
  const query = `
  SELECT has_2fa
  FROM users
  WHERE id = ?`;
  const result = await database.get(query, [id]);
  return result;
};


export const updateTwoFactor = async (id, enable2FA) => {
  const query = `
  UPDATE users
  SET has_2fa = ?
  WHERE id = ?`;
  const result = await database.run(query, [enable2FA, id]);
  return result.changes;
};