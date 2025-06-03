import * as walletModels from "../models/walletModels.js";

import fetch from "node-fetch";

const BLOCKCHAIN_SERVICE_URL = process.env.BLOCKCHAIN_SERVICE_URL;

export async function createWallet(username, wallet) {
  if (!/^0x[a-fA-F0-9]{40}$/.test(wallet)) {
    throw new Error("Invalid wallet address format");
  }

  try {
    const response = await fetch(`${BLOCKCHAIN_SERVICE_URL}/add-player`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username, address: wallet }),
    });

    if (!response.ok) {
      const errJson = await response.json().catch(() => ({}));
      throw new Error(`Blockchain error: ${errJson.error || "Unknown error"}`);
    }

    return wallet;
  } catch (error) {
    throw new Error(`Blockchain communication failed: ${error.message}`);
  }
}

export async function readWallet(request, reply) {
  const userId = request.params.id;

  if (!userId) {
    return reply.code(400).send({ error: "UserId is required" });
  }

  try {
    const walletAddress = await walletModels.readWallet(userId);
    return reply.code(500).send(walletAddress);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read the wallet address",
      cause: error.message,
    });
  }
}
