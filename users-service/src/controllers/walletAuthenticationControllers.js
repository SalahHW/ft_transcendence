import { ethers } from "ethers";
import fetch from "node-fetch";
import {
  readUserByWallet,
  createUserWithWalletOnly,
} from "../models/walletAuthenticationModels.js";

function verifySignature({ walletAddress, message, signature }) {
  const recovered = ethers.verifyMessage(message, signature);
  return recovered.toLowerCase() === walletAddress.toLowerCase();
}

export const verifyWalletUser = async (request, reply) => {
  const { walletAddress, message, signature, username } = request.body;

  if (!walletAddress || !message || !signature) {
    return reply.code(400).send({ error: "Missing required fields" });
  }

  const isValid = verifySignature({ walletAddress, message, signature });
  if (!isValid) {
    return reply.code(401).send({ error: "Invalid signature" });
  }

  try {
    let user = await readUserByWallet(walletAddress);

    if (user) {
      if (user.authenticationMethod !== "wallet") {
        return reply.code(403).send({
          error:
            "Wallet linked to a credential-based account. Please use username/password.",
        });
      }
    } else {
      if (!username) {
        return reply
          .code(400)
          .send({ error: "Username is required for new wallet registration" });
      }

      user = await createUserWithWalletOnly({ username, walletAddress });
    }

    const token = await request.server.signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });

    reply
      .setCookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      })
      .code(200)
      .send({
        message: user
          ? "Wallet login successful"
          : "Wallet registered successfully",
        user: { id: user.id, username: user.username },
      });
  } catch (err) {
    reply
      .code(500)
      .send({ error: "Wallet verification failed", cause: err.message });
  }
};

export const loginUserWithWallet = async (request, reply) => {
  const { walletAddress, signature, message } = request.body;

  if (!walletAddress || !signature || !message) {
    return reply.code(400).send({ error: "Missing required fields" });
  }

  const isValid = verifySignature({ walletAddress, message, signature });
  if (!isValid) {
    return reply.code(401).send({ error: "Invalid signature" });
  }

  try {
    const user = await readUserByWallet(walletAddress);
    if (!user) {
      return reply
        .code(401)
        .send({ error: "No user found for this wallet address" });
    }

    if (user.authenticationMethod !== "wallet") {
      return reply.code(403).send({
        error:
          "Wallet linked to a credential-based account. Please log in with username/password.",
      });
    }

    const token = await request.server.signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });

    reply
      .setCookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      })
      .code(200)
      .send({ message: "Login via wallet successful" });
  } catch (err) {
    return reply
      .code(500)
      .send({ error: "Wallet login failed", cause: err.message });
  }
};

export const registerUserWithWallet = async (request, reply) => {
  const { username, walletAddress, signature, message } = request.body;

  if (
    !walletAddress ||
    !signature ||
    !message ||
    !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)
  ) {
    return reply.code(400).send({ error: "Invalid input" });
  }

  const isValid = verifySignature({ walletAddress, message, signature });
  if (!isValid) {
    return reply.code(401).send({ error: "Invalid signature" });
  }

  let user;

  try {
    user = await createUserWithWalletOnly({ username, walletAddress });

    const blockchainUrl = `${process.env.BLOCKCHAIN_SERVICE_URL}/add-player`;
    const response = await fetch(blockchainUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: username, address: walletAddress }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error("❌ Blockchain service responded with error:", result);

      await deleteUser(user.id);

      return reply.status(500).send({
        error: "Blockchain registration failed",
        blockchainError: result,
      });
    }

    const token = await request.server.signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });

    reply
      .setCookie("token", token, {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24,
      })
      .code(200)
      .send({ message: "Wallet registration successful" });
  } catch (err) {
    if (user && user.id) {
      try {
        await deleteUser(user.id);
      } catch (cleanupError) {
        console.error("⚠️ Failed to rollback user after error:", cleanupError);
      }
    }

    return reply
      .code(403)
      .send({ error: "Wallet registration failed", cause: err.message });
  }
};
