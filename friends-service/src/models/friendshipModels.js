import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export async function createFriendship(userId, friendId) {
  const query = `
  INSERT INTO friendships (user_id, friend_id)
  VALUES (?, ?);`;

  try {
    await database.run(query, [userId, friendId]);
  } catch (err) {
    throw translateSqliteError(err);
  }
}

export async function readFriendship(userId) {
  const query = `
    SELECT *
    FROM friendships
    WHERE user_id = ?`;

  try {
    const friends = await database.get(query, [userId]);
    return friends;
  } catch (err) {
    throw translateSqliteError(err);
  }
}

export async function deleteFriendship(userId, friendId) {
  const query = `
    DELETE FROM friendships
    WHERE user_id = ? AND friend_id = ?`;

  try {
    await database.run(query, [userId, friendId]);
  } catch (err) {
    throw translateSqliteError(err);
  }
}