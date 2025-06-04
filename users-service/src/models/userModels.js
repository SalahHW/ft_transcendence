import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export const createUser = async (user) => {
  const { username, password, email, wallet } = user;

  const query = `
  INSERT INTO users (username, password, email, wallet, authenticationMethod)
  VALUES (?, ?, ?, ?, 'credentials');`;

  try {
    const result = await database.run(query, [
      username,
      password,
      email,
      wallet,
    ]);
    return {
      id: result.lastID,
      username,
      email,
    };
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const createUserWithWalletOnly = async ({ username, wallet }) => {
  const email = `wallet_${wallet.slice(2, 10)}@example.com`;

  const exists = await userExists(username);
  if (exists) {
    throw new Error("Username already taken");
  }

  const query = `
  INSERT INTO users (username, email, wallet, authenticationMethod)
  VALUES (?, ?, ?, 'wallet');`;

  try {
    const result = await database.run(query, [username, email, wallet]);
    return {
      id: result.lastID,
      username,
      email,
      wallet,
      authenticationMethod: "wallet",
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

export const readUserByUsername = async (username) => {
  const query = `
  SELECT *
  FROM users
  WHERE LOWER(username) = ?`;

  try {
    const user = await database.get(query, [username.toLowerCase()]);
    return user;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const readAllUsers = async () => {
  const query = `
  SELECT id, username, email, wallet, authenticationMethod
  FROM users`;

  try {
    const users = await database.all(query);
    return users;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const updateUser = async (id, newUser) => {
  const { username, password, email, wallet } = newUser;
  const query = `
  UPDATE users
  SET username = ?,
  password = ?,
  email = ?,
  wallet = ?
  WHERE id = ?`;

  try {
    const result = await database.run(query, [
      username,
      password,
      email,
      wallet,
      id,
    ]);
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

export const userExists = async (username) => {
  const query = `
    SELECT 1
    FROM users
    WHERE LOWER(username) = ?
    LIMIT 1`;
  try {
    const user = await database.get(query, [username.toLowerCase()]);
    return !!user;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const emailExists = async (email) => {
  const query = `
  SELECT 1
  FROM users
  WHERE email = ?
  LIMIT 1`;
  try {
    const user = await database.get(query, [email.toLowerCase()]);
    return !!user;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const walletExists = async (wallet) => {
  const query = `
    SELECT 1
    FROM users
    WHERE wallet = ?
    LIMIT 1`;
  try {
    const user = await database.get(query, [wallet]);
    return !!user;
  } catch (error) {
    throw translateSqliteError(error);
  }
};
