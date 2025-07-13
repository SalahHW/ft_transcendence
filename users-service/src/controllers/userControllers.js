import * as userModels from "../models/userModels.js";
import * as emailModels from "../models/emailModels.js";
import { createEmail } from "./emailControllers.js";
import { createPassword } from "./passwordControllers.js";
import axios from "axios";

export async function createUser(request, reply) {
  const { username, email, password, authenticationMethod, wallet } =
    request.body;

  if (!username) return reply.code(400).send({ error: "Username is required" });

  if (authenticationMethod === "credentials") {
    if (!email) return reply.code(400).send({ error: "Email is required" });
    if (!password)
      return reply.code(400).send({ error: "Password is required" });
  }

  try {
    const exists = await userModels.userExists(username);
    if (exists)
      return reply.code(409).send({ error: "Username already exists" });

    if (authenticationMethod === "credentials") {
      const emailTaken = await emailModels.emailExists(email);
      if (emailTaken)
        return reply.code(409).send({ error: "Email already exists" });
    }

    const hashedPassword =
      authenticationMethod === "credentials"
        ? await createPassword(password)
        : null;

    const finalEmail =
      authenticationMethod === "credentials" ? createEmail(email) : null;

    const user = await userModels.createUser({
      username,
      email: finalEmail,
      password: hashedPassword,
      authenticationMethod,
      wallet,
    });

    try {
      const response = await axios.post("http://blockchain:3001/add-player", {
        name: username,
        address: wallet,
      });

      if (!response.data || !response.data.success) {
        await userModels.deleteUser(user.id);
        return reply.code(502).send({
          error: "Blockchain registration failed",
        });
      }
    } catch (error) {
      await userModels.deleteUser(user.id);
      return reply.code(502).send({
        error: "Blockchain service unavailable",
        details: error.message,
      });
    }

    return reply.code(201).send(user);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to create user", cause: error.message });
  }
}

export async function readUser(request, reply) {
  const id = request.params.id;
  if (!id) return reply.code(400).send({ error: "UserId is required" });

  try {
    const result = await userModels.readUser(id);
    if (!result) return reply.code(404).send({ error: "User not found" });
    return reply.code(200).send(result);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to read user", cause: error.message });
  }
}

export async function readUserByUsername(request, reply) {
  const username = request.params.username;
  if (!username) return reply.code(400).send({ error: "Username is required" });

  try {
    const result = await userModels.readUserByUsername(username);
    if (!result) return reply.code(404).send({ error: "User not found" });
    return reply.code(200).send(result);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to read user", cause: error.message });
  }
}

export async function readUserByWallet(request, reply) {
  const wallet = request.params.wallet;
  if (!wallet) return reply.code(400).send({ error: "Wallet is required" });

  try {
    const result = await userModels.readUserByWallet(wallet);
    if (!result) return reply.code(404).send({ error: "User not found" });
    return reply.code(200).send(result);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to read user", cause: error.message });
  }
}

export async function readAllUsers(_request, reply) {
  try {
    const result = await userModels.readAllUsers();
    return reply.code(200).send(result);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to read users", cause: error.message });
  }
}

export async function updateUser(request, reply) {
  const id = request.params.id;
  const { username, email, password } = request.body;

  if (!id) return reply.code(400).send({ error: "UserId is required" });
  if (!username) return reply.code(400).send({ error: "Username is required" });
  if (!email) return reply.code(400).send({ error: "Email is required" });
  if (!password) return reply.code(400).send({ error: "Password is required" });

  try {
    const hashedPassword = await createPassword(password);
    const finalEmail = createEmail(email);

    const updated = await userModels.updateUser(id, {
      username,
      email: finalEmail,
      password: hashedPassword,
    });

    return reply.code(200).send(updated);
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to update user", cause: error.message });
  }
}

export async function deleteUser(request, reply) {
  const id = request.params.id;
  if (!id) return reply.code(400).send({ error: "UserId is required" });

  try {
    const user = await userModels.readUser(id);
    if (!user) return reply.code(404).send({ error: "User not found" });

    if (user.wallet) {
      try {
        const response = await axios.delete(
          `http://blockchain:3001/remove/${user.wallet}`
        );

        if (!response.data || !response.data.success) {
          return reply.code(502).send({
            error: "Blockchain removePlayer failed",
            details: response.data,
          });
        }
      } catch (error) {
        return reply.code(502).send({
          error: "Blockchain service unavailable",
          details: error.message,
        });
      }
    }

    const deleted = await userModels.deleteUser(id);
    if (!deleted)
      return reply.code(500).send({ error: "Failed to delete user from DB" });

    return reply.code(200).send({ success: true });
  } catch (error) {
    return reply
      .code(500)
      .send({ error: "Failed to delete user", cause: error.message });
  }
}
