import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export const readUsername = async (id) => {
  const query = `
  SELECT username 
  FROM users 
  WHERE id = ?`;
  try {
    const result = await database.get(query, [id]);
    return result ? result.username : null;
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const updateUsername = async (id, newUsername) => {
  const query = `
  UPDATE users
  SET username = ?
  WHERE id = ?`;
  try {
    const result = await database.run(query, [newUsername, id]);
    if (result.changes === 0) {
      return null;
    }
    return { username: newUsername };
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const usernameExists = async (username) => {
  const query = `
    SELECT 1 FROM users
    WHERE username = ?
    LIMIT 1
  `;
  try {
    const result = await database.get(query, [username]);
    return !!result;
  } catch (error) {
    throw translateSqliteError(error);
  }
};
