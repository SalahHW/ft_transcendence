import { database } from './database.js';
import { translateSqliteError } from './errors/translateSqliteError.js';

export const createUser = async (user) => {
    const { username, password, email, walletAddress } = user;

    const query = `
  INSERT INTO users (username, password, email, walletAddress)
  VALUES (?, ?, ?, ?);`;

    try {
        const result = await database.run(query, [
            username,
            password,
            email,
            walletAddress,
        ]);
        return {
            id: result.lastID,
            username,
            email,
            walletAddress,
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
        const result = await database.run(query, [
            username,
            password,
            email,
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
