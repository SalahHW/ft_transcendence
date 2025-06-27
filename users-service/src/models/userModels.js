import { database } from "./database.js";
import { translateSqliteError } from "./errors/translateSqliteError.js";

export const createUser = async ({
  username,
  password,
  email,
  wallet,
  authenticationMethod,
}) => {
  const createUserQuery = `
    INSERT INTO users (username, authenticationMethod, wallet)
    VALUES (?, ?, ?);
  `;

  try {
    const userResult = await database.run(createUserQuery, [
      username,
      authenticationMethod,
      wallet,
    ]);
    const userId = userResult.lastID;

    if (authenticationMethod === "credentials") {
      await createCredentials(userId, email, password);
    }

    return { id: userId, username, email, wallet };
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const createCredentials = async (id, email, password) => {
  const createCredentialsQuery = `
    INSERT INTO credentials_auth (id, email, password)
    VALUES (?, ?, ?);
  `;

  try {
    await database.run(createCredentialsQuery, [
      id,
      email.toLowerCase(),
      password,
    ]);
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const readUser = async (id) => {
  const query = `
    SELECT u.id, u.username, u.wallet, u.authenticationMethod, c.email, c.password
    FROM users u
    LEFT JOIN credentials_auth c ON u.id = c.id
    WHERE u.id = ?
  `;
  try {
    return await database.get(query, [id]);
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const readUserByUsername = async (username) => {
  const query = `
    SELECT u.id, u.username, u.wallet, u.authenticationMethod, c.email, c.password
    FROM users u
    LEFT JOIN credentials_auth c ON u.id = c.id
    WHERE LOWER(u.username) = ?
  `;
  try {
    return await database.get(query, [username.toLowerCase()]);
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const readAllUsers = async () => {
  const query = `
    SELECT u.id, u.username, u.wallet, u.authenticationMethod, c.email
    FROM users u
    LEFT JOIN credentials_auth c ON u.id = c.id
  `;
  try {
    return await database.all(query);
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const updateUser = async (id, { username, password, email }) => {
  try {
    await database.run(`UPDATE users SET username = ? WHERE id = ?`, [
      username,
      id,
    ]);
    await database.run(
      `UPDATE credentials_auth SET email = ?, password = ? WHERE id = ?`,
      [email, password, id]
    );
    return { id, username, email };
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const deleteUser = async (id) => {
  const deleteCredentialsQuery = `DELETE FROM credentials_auth WHERE id = ?`;
  const deleteUserQuery = `DELETE FROM users WHERE id = ?`;

  try {
    await database.run(deleteCredentialsQuery, [id]);
    const result = await database.run(deleteUserQuery, [id]);
    return result.changes;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const userExists = async (username) => {
  const query = `
    SELECT 1 FROM users
    WHERE LOWER(username) = ?
    LIMIT 1
  `;
  try {
    const user = await database.get(query, [username.toLowerCase()]);
    return !!user;
  } catch (error) {
    throw translateSqliteError(error);
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

export const walletExists = async (wallet) => {
  const query = `
    SELECT 1 FROM users
    WHERE LOWER(wallet) = ?
    LIMIT 1
  `;
  try {
    const result = await database.get(query, [wallet.toLowerCase()]);
    return !!result;
  } catch (error) {
    throw translateSqliteError(error);
  }
};

export const findUserByWallet = async (wallet) => {
  const query = `
    SELECT id, username, wallet, authenticationMethod
    FROM users
    WHERE LOWER(wallet) = ?
  `;
  try {
    return await database.get(query, [wallet.toLowerCase()]);
  } catch (error) {
    throw translateSqliteError(error);
  }
};
