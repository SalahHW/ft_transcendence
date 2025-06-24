import { database } from "./database.js";

export async function readUserByWallet(walletAddress) {
  const result = await database.get("SELECT * FROM users WHERE wallet = ?", [
    walletAddress,
  ]);
  return result;
}

export async function createUserWithWalletOnly({ username, walletAddress }) {
  const existing = await database.get("SELECT * FROM users WHERE wallet = ?", [
    walletAddress,
  ]);
  if (existing) {
    throw new Error("This wallet is already linked to an existing user.");
  }

  const email = `wallet_${walletAddress.slice(2, 10)}@example.com`;
  const password = "wallet_auth_placeholder";

  await database.run(
    "INSERT INTO users (username, email, password, wallet, authenticationMethod) VALUES (?, ?, ?, ?, ?)",
    [username, email, password, walletAddress, "wallet"]
  );

  const user = await database.get("SELECT * FROM users WHERE wallet = ?", [
    walletAddress,
  ]);
  return user;
}
