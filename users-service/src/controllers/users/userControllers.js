import * as userModels from "../../models/userModels/userModels.js";
import { createUsername } from "./usernameControllers.js";
import { createEmail } from "./emailControllers.js";
import { encryptPassword } from "../../utils/password.js";

export async function createUser(request, reply) {
	const { username, password, email } = request.body;

		if (!username || !password || !email) {
				return reply.code(400).send({ error: "Lack of information related to the user" });
		}
		try {
				createUsername(username);
				createEmail(email);
				const hashedPassword = await encryptPassword(password);
				const newUser = await userModels.createUser({ username, password: hashedPassword, email });
				return reply.code(201).send(newUser);
		} catch (error) {
				return reply.code(500).send({
						error: "Failed to create the user",
						cause: error.message,
				});
		}
}

export async function readUser(request, reply) {
	const userId = request.params.id;

	if (!userId) {
		return reply.code(400).send({ error: "UserId is required" });
	}
	try {
		const user = await userModels.readUser(userId);
		if (!user) {
			return reply.code(404).send({ error: "User not found" });
		}
		delete user.password;
		return reply.code(200).send(user);
	} catch (error) {
		return reply.code(500).send({
			error: "Failed to read the user",
			cause: error.message,
		});
	}
}

export async function readUserByUsername(request, reply) {
  const username = request.params.username;

  if (!username) {
    return reply.code(400).send({ error: "Username is required" });
  }

  try {
    const user = await userModels.readUserByUsername(username);
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }
    delete user.password;
    return reply.code(200).send(user);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read the user",
      cause: error.message,
    });
  }
}

export async function readAllUsers(request, reply) {
  try {
    const users = await userModels.readAllUsers();
    if (!users) {
      return reply.code(404).send({ error: "No users found" });
    }
    return reply.code(200).send(users);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read all users",
      cause: error.message,
    });
  }
}

export async function readUserByUsername(request, reply) {
  const username = request.params.username;

  if (!username) {
    return reply.code(400).send({ error: "Username is required" });
  }

  try {
    const user = await userModels.readUserByUsername(username);
    if (!user) {
      return reply.code(404).send({ error: "User not found" });
    }
    delete user.password;
    return reply.code(200).send(user);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read the user",
      cause: error.message,
    });
  }
}

export async function readAllUsers(request, reply) {
  try {
    const users = await userModels.readAllUsers();
    if (!users) {
      return reply.code(404).send({ error: "No users found" });
    }
    return reply.code(200).send(users);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read all users",
      cause: error.message,
    });
  }
}

export async function updateUser(request, reply) {
	const userId = request.params.id;
	const { username, password, email } = request.body;

	if (!userId) {
		return reply.code(400).send({ error: "UserId is required" });
	}
	try {
		const updatedUser = await userModels.updateUser(userId, { username, password, email });
		return reply.code(200).send(updatedUser);
	} catch (error) {
		return reply.code(500).send({
			error: "Failed to update the user",
			cause: error.message,
		});
	}
}

export async function deleteUser(request, reply) {
	const userId = request.params.id;

  if (!userId) {
    return reply.code(400).send({ error: "UserId is required" });
  }
  try {
    const deletedUserId = await userModels.deleteUser(userId);
    return reply
      .code(204)
      .send({ success: `User ${deletedUserId} has been deleted with success` });
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to delete the user",
      cause: error.message,
    });
  }
}
