import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export const createAvatar = async (userId, avatarUrl) => {
  const query = `
  INSERT INTO avatars (user_id, avatar_url)
  VALUES (?, ?);`;

  try {
    await database.run(query, [userId, avatarUrl]);
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

export const updateAvatar = async (userId, newAvatarUrl) => {
  const query = `
  UPDATE avatars
  SET avatar_url = ?
  WHERE user_id = ?`;

  try {
    await database.run(query, [newAvatarUrl, userId]);
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
