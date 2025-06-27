import { database } from "./database.js";

export const readPassword = async (id) => {
  const query = `
    SELECT password
    FROM credentials_auth
    WHERE id = ?`;
  return await database.get(query, [id]);
};

export const updatePassword = async (id, newPassword) => {
  const query = `
    UPDATE credentials_auth
    SET password = ?
    WHERE id = ?`;
  const result = await database.run(query, [newPassword, id]);
  return result.changes;
};
