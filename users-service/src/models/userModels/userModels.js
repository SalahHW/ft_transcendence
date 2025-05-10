import { database } from "../database.js";

export const createUser = async (user) => {
  const { username, password, email } = user;
  const query = `
  INSERT INTO users (username, password, email)
  VALUES (?, ?, ?);`;
  const result = await database.run(query, [username, password, email]);
  return {
    id: result.lastID,
    username,
    email,
  };
};

export const readUser = async (id) => {
  const query = `
  SELECT *
  FROM users
  WHERE id = ?`;
  const user = await database.get(query, [id]);
  return user;
};

export const readAllUsers = async () => {
  const query = `
  SELECT id, username, email
  FROM users`;
  const users = await database.all(query);
  return users;
};

export const updateUser = async (id, newUser) => {
  const { username, password, email } = newUser;
  const query = `
  UPDATE users
  SET username = ?,
  password = ?,
  email = ?
  WHERE id = ?`;
  const result = await database.run(query, [username, password, email, id]);
  return result.changes;
};

export const deleteUser = async (id) => {
  const query = `
  DELETE FROM users
  WHERE id = ?`;
  const result = await database.run(query, [id]);
  return result.changes;
};
