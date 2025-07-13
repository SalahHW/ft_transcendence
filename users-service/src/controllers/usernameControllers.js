import * as usernameModels from "../models/usernameModels.js";

export function createUsername(rawUsername) {
	if (typeof rawUsername !== 'string') {
		throw new Error("Username must be a string");
	}
	const username = rawUsername.trim().toLowerCase();
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
	const { username } = request.body;
	const userId = request.user.sub;

	try {
		const validUsername = createUsername(username);
		
		const currentUsername = await usernameModels.readUsername(userId);

		if (!currentUsername) {
			return reply.code(404).send({
				error: "User not found",
				message: "User does not exist",
			});
		}
		if (currentUsername === validUsername) {
			return reply.code(200).send({ username: validUsername, message: "Username unchanged" });
		}
		const usernameUsed = await usernameModels.usernameExists(validUsername);
		if (usernameUsed) {
			return reply.code(409).send({
				error: "Username already exists",
				message: "Username is already taken",
			});
		}
		const newUsername = await usernameModels.updateUsername(userId, validUsername);
		if (!newUsername) {
			return reply.code(404).send({
				error: "User not found",
				message: "Unable to update username: user does not exist",
			});
		}
		return reply.code(200).send(newUsername);
	} catch (error) {
		return reply.code(500).send({
			error: "Failed to update username",
			cause: error.message,
		});
	}
}