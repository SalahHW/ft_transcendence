import { database } from "../database.js";
import { translateSqliteError } from "../errors/translateSqliteError.js";

export const createUser = async (user) => {
  const { username, password, email } = user;

  const query = `
  INSERT INTO users (username, password, email)
  VALUES (?, ?, ?);`;

  try {
    const result = await database.run(query, [username, password, email]);
    return {
      id: result.lastID,
      username,
      email,
    };
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const readUser = async (id) => {
  const query = `
  SELECT *
  FROM users
  WHERE id = ?`;

  try {
    const user = await database.get(query, [id]);
    return user;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const readAllUsers = async () => {
  const query = `
  SELECT id, username, email
  FROM users`;

  try {
    const users = await database.all(query);
    return users;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const updateUser = async (id, newUser) => {
  const { username, password, email } = newUser;
  const query = `
  UPDATE users
  SET username = ?,
  password = ?,
  email = ?
  WHERE id = ?`;

  try {
    const result = await database.run(query, [username, password, email, id]);
    return result.changes;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const deleteUser = async (id) => {
  const query = `
  DELETE FROM users
  WHERE id = ?`;

  try {
    const result = await database.run(query, [id]);
    return result.changes;
  } catch (error) {
    throw translateSqliteError(error);
  }
};
