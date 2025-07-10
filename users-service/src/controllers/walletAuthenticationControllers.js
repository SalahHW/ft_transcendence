import * as userModels from "../models/userModels.js";
import { signToken } from "../plugins/jwt.js";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";
import axios from "axios";

const CHALLENGE_PREFIX = "Sign this message to login to elsalmatjori.com";

export async function registerWithWallet(request, reply) {
  const { wallet, username, signature, timestamp } = request.body;

  if (!wallet || !username || !signature || !timestamp) {
    return reply.code(400).send({ error: "Missing required fields" });
  }

  const MAX_AGE_MS = 5 * 60 * 1000;
  const now = Date.now();
  const sent = new Date(timestamp).getTime();

  if (isNaN(sent) || now - sent > MAX_AGE_MS) {
    return reply.code(400).send({ error: "Challenge expired" });
  }

  const expectedChallenge = `${CHALLENGE_PREFIX}:\n${timestamp}`;

  const existingWallet = await userModels.walletExists(wallet);
  if (existingWallet) {
    return reply.code(409).send({ error: "Wallet already registered" });
  }

  const existingUsername = await userModels.userExists(username);
  if (existingUsername) {
    return reply.code(409).send({ error: "Username already exists" });
  }

  let user;
  try {
    const recoveredAddress = recoverPersonalSignature({
      data: expectedChallenge,
      signature,
    });

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    user = await userModels.createUser({
      username,
      email: null,
      password: null,
      authenticationMethod: "wallet",
      wallet,
    });

    const response = await axios.post("http://blockchain:3001/add-player", {
      name: username,
      address: wallet,
    });

    if (!response.data || !response.data.success) {
      throw new Error("Blockchain registration failed");
    }

    const token = await signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });

    reply.setCookie("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: true,
      maxAge: 300,
    });

    return reply.code(201).send({ id: user.id, username });
  } catch (err) {
    if (user?.id) {
      try {
        await userModels.deleteUser(user.id);
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr.message);
      }
    }

    return reply.code(500).send({
      error: "Registration failed",
      cause: err.message,
    });
  }
}

export async function loginWithWallet(request, reply) {
  const { wallet, signature, timestamp } = request.body;

  if (!wallet || !signature || !timestamp) {
    return reply.code(400).send({ error: "Missing fields" });
  }

  const MAX_AGE_MS = 5 * 60 * 1000;
  const now = Date.now();
  const sentTime = new Date(timestamp).getTime();

  if (isNaN(sentTime) || now - sentTime > MAX_AGE_MS) {
    return reply.code(400).send({ error: "Challenge expired" });
  }

  const challenge = `${CHALLENGE_PREFIX}:\n${timestamp}`;

  const user = await userModels.findUserByWallet(wallet);
  if (!user) {
    return reply.code(404).send({ error: "Wallet not registered" });
  }

  try {
    const recoveredAddress = recoverPersonalSignature({
      data: challenge,
      signature,
    });

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    const token = await signToken({
      sub: user.id,
      username: user.username,
      aud: "users-service",
    });

    reply.setCookie("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: true,
      maxAge: 300,
    });

    return reply.code(200).send({ id: user.id, username: user.username });
  } catch (err) {
    return reply.code(500).send({ error: "Login failed", cause: err.message });
  }
}

export async function verifyWalletSignature(request, reply) {
  const { wallet, signature, timestamp } = request.body;

  if (!wallet || !signature || !timestamp) {
    return reply.code(400).send({ error: "Missing fields" });
  }

  const MAX_AGE_MS = 5 * 60 * 1000;
  const now = Date.now();
  const sentTime = new Date(timestamp).getTime();

  if (isNaN(sentTime) || now - sentTime > MAX_AGE_MS) {
    return reply.code(400).send({ error: "Challenge expired" });
  }

  const challenge = `${CHALLENGE_PREFIX}:\n${timestamp}`;

  try {
    const recovered = recoverPersonalSignature({
      data: challenge,
      signature,
    });

    if (recovered.toLowerCase() !== wallet.toLowerCase()) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    return reply.code(200).send({ valid: true });
  } catch (err) {
    return reply.code(400).send({
      error: "Signature verification failed",
      cause: err.message,
    });
  }
}
