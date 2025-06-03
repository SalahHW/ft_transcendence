import { database } from "./database.js";

export const readWallet = async (id) => {
  const query = `
  SELECT wallet
  FROM users
  WHERE id = ?`;
  const result = await database.get(query, [id]);
  return result;
};

export const updateWallet = async (id, newWallet) => {
  const query = `
  UPDATE users
  SET wallet = ?
  WHERE id = ?`;
  const result = await database.run(query, [newWallet, id]);
  return result.changes;
};
