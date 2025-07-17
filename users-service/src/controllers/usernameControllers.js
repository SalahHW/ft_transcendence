import * as usernameModels from "../models/usernameModels.js";

export function createUsername(rawUsername) {
	if (typeof rawUsername !== 'string') {
		throw new Error("Username must be a string");
	}
  const username = rawUsername.trim();
	const regexPattern = /^[a-zA-Z0-9_]{2,20}$/;
	if (!username || !regexPattern.test(username)) {
		throw new Error("Invalid username format. It must be 2 to 20 characters long and contain only letters, numbers, or underscores.");
	}
	return username;
}

export async function readUsername(request, reply) {
		const userId = request.params.id;

		if (!userId) {
				return reply.code(400).send({ error: "UserId is required" });
		}
		try {
				const username = await usernameModels.readUsername(userId);
				return reply.code(200).send(username);
		} catch (error) {
				return reply.code(500).send({
						error: "Failed to read username",
						cause: error.message,
				});
		}
}

export async function updateUsername(request, reply) {
  const newUsername = request.body.username;
	const userId = request.user.sub;

  let actualUsername;
  try {
    actualUsername = await usernameModels.readUsername(userId);
  } catch (err) {
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
			});
		}

  if (actualUsername === newUsername) {
    return reply
      .code(200)
      .send({ username: actualUsername, message: "Username unchanged" });
		}

  try {
    createUsername(newUsername);
  } catch (err) {
    return reply
      .code(400)
      .send({ error: "Invalid username", message: err.message });
  }

  let usernameExists;
  try {
    usernameExists = await usernameModels.usernameExists(newUsername);
  } catch (err) {
    return reply.code(500).send({
      error: "Database error",
      message: err.message,
    });
  }

  if (
    usernameExists &&
    actualUsername.toLowerCase() !== newUsername.toLowerCase()
  ) {
			return reply.code(409).send({
				error: "Username already exists",
				message: "Username is already taken",
			});
		}

  let updatedUsername;
  try {
    updatedUsername = await usernameModels.updateUsername(userId, newUsername);
  } catch (err) {
		return reply.code(500).send({
			error: "Failed to update username",
      cause: err.message,
		});
	}

  return reply.code(200).send(updatedUsername);
}
