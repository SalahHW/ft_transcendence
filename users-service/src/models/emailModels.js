import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export const readEmail = async (id) => {
  const query = `
    SELECT email
    FROM credentials_auth
    WHERE id = ?
    `;
  try {
    const result = await database.get(query, [id]);
    return result.email;
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const updateEmail = async (id, newEmail) => {
  const query = `
    UPDATE credentials_auth
    SET email = ?
    WHERE id = ?`;
  try {
    const result = await database.run(query, [newEmail.toLowerCase(), id]);
    if (result.changes === 0) {
      return null;
    }
    return { email: newEmail.toLowerCase() };
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const emailExists = async (email) => {
  const query = `
    SELECT 1 FROM credentials_auth
    WHERE email = ?
    LIMIT 1
  `;
  try {
    const result = await database.get(query, [email.toLowerCase()]);
    return !!result;
  } catch (error) {
    throw translateSqliteError(error);
  }
};
