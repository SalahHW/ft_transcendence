import { database } from "./database.js";

export const readEmail = async (id) => {
  const query = `
    SELECT email
    FROM credentials_auth
    WHERE id = ?`;
  return await database.get(query, [id]);
};

export const updateEmail = async (id, newEmail) => {
  const query = `
    UPDATE credentials_auth
    SET email = ?
    WHERE id = ?`;
  const result = await database.run(query, [newEmail.toLowerCase(), id]);
  return result.changes;
};
