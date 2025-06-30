import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export const createAvatar = async (userId, fileName) => {
  const query = `
  INSERT INTO avatars (user_id, avatar_name)
  VALUES (?, ?);`;

  try {
    await database.run(query, [userId, fileName]);
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const readAvatar = async (userId) => {
  const query = `
  SELECT *
  FROM avatars
  WHERE user_id = ?`;

  try {
    const avatar = await database.get(query, [userId]);
    return avatar;
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const updateAvatar = async (userId, newFileName) => {
  const query = `
  UPDATE avatars
  SET avatar_name = ?
  WHERE user_id = ?`;

  try {
    await database.run(query, [newFileName, userId]);
  } catch (err) {
    throw translateSqliteError(err);
  }
};

export const deleteAvatar = async (userId) => {
  const query = `
  DELETE FROM avatars
  WHERE user_id = ?`;

  try {
    await database.run(query, [userId]);
  } catch (err) {
    throw translateSqliteError(err);
  }
};
