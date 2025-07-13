import * as emailModels from "../models/emailModels.js";
import validator from "validator";

export function createEmail(rawEmail) {
  if (typeof rawEmail !== "string") {
    throw new Error("Email must be a string");
  }
  const email = rawEmail.trim();

  // Simplified RFC 5322 standard
  if (!email || !validator.isEmail(email)) {
    throw new Error("Invalid email address");
  }
  return email;
}

export async function readEmail(request, reply) {
  const userId = request.params.id;

  if (!userId) {
    return reply.code(400).send({ error: "UserId is required" });
  }
  try {
    const email = await emailModels.readEmail(userId);
    return reply.code(200).send(email);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read the email",
      cause: error.message,
    });
  }
}

export async function updateEmail(request, reply) {
  const { email } = request.body;
  const userId = request.user.sub;

  try {
    const currentEmail = await emailModels.readEmail(userId);

    if (!currentEmail) {
      return reply.code(404).send({
        error: "User not found",
        message: "User does not exist",
      });
    }
    if (currentEmail === email.toLowerCase()) {
      return reply.code(200).send({ email: email, message: "Email unchanged" });
    }
    const emailUsed = await emailModels.emailExists(email);
    if (emailUsed) {
      return reply.code(409).send({
        error: "Email already exists",
        message: "Email address is already used",
      });
    }
    const newEmail = await emailModels.updateEmail(userId, email);
    if (!newEmail) {
      return reply.code(404).send({
        error: "User not found",
        message: "Unable to update email: user does not exist",
      });
    }
    return reply.code(200).send(newEmail);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to update the email",
      cause: error.message,
    });
  }
}
