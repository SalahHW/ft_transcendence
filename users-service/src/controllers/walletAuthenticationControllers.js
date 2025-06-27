import * as userModels from "../models/userModels.js";
import { signToken } from "../plugins/jwt.js";
import { recoverPersonalSignature } from "@metamask/eth-sig-util";

const CHALLENGE_MESSAGE = "Sign this message to login to elsalmajori.games";

export async function registerWithWallet(request, reply) {
  const { wallet, username, signature } = request.body;

  if (!wallet || !username || !signature) {
    return reply.code(400).send({ error: "Missing required fields" });
  }

  const existingWallet = await userModels.walletExists(wallet);
  if (existingWallet) {
    return reply.code(409).send({ error: "Wallet already registered" });
  }

  const existingUsername = await userModels.userExists(username);
  if (existingUsername) {
    return reply.code(409).send({ error: "Username already exists" });
  }

  try {
    const recoveredAddress = recoverPersonalSignature({
      data: CHALLENGE_MESSAGE,
      signature,
    });

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    const user = await userModels.createUser({
      username,
      email: null,
      password: null,
      authenticationMethod: "wallet",
      wallet,
    });

    try {
      const token = await signToken({
        sub: user.id,
        username: user.username,
        aud: "users-service",
      });

      reply.setCookie("token", token, {
        path: "/",
        httpOnly: true,
        sameSite: "Strict",
        secure: false, // TODO: Secure flag for prod
      });

      return reply.code(201).send({ id: user.id, username });
    } catch (tokenError) {
      await userModels.deleteUser(user.id);
      return reply
        .code(500)
        .send({ error: "Registration failed", cause: tokenError.message });
    }
  } catch (err) {
    return reply
      .code(500)
      .send({ error: "Registration failed", cause: err.message });
  }
}

export async function loginWithWallet(request, reply) {
  const { wallet, signature } = request.body;

  if (!wallet || !signature) {
    return reply.code(400).send({ error: "Missing wallet or signature" });
  }

  const user = await userModels.findUserByWallet(wallet);
  if (!user) {
    return reply.code(404).send({ error: "Wallet not registered" });
  }

  try {
    const recoveredAddress = recoverPersonalSignature({
      data: CHALLENGE_MESSAGE,
      signature,
    });

    if (recoveredAddress.toLowerCase() !== wallet.toLowerCase()) {
      return reply.code(401).send({ error: "Invalid signature" });
    }

    const token = await signToken({ id: user.id, username: user.username });

    reply.setCookie("token", token, {
      path: "/",
      httpOnly: true,
      sameSite: "Strict",
      secure: false, // TODO: Update .env to set production mode
    });

    return reply.code(200).send({ id: user.id, username: user.username });
  } catch (err) {
    return reply.code(500).send({ error: "Login failed", cause: err.message });
  }
}
