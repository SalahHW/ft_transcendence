import * as usernameModels from "../../models/userModels/usernameModels.js";

export function createUsername(username) {

	if (typeof username !== 'string') {
		throw new Error("Username must be a string");
	}
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

		if (!username) {
				return reply.code(400).send({ error: "Username is required for the update" });
		}
		try {
				const newUsername = await usernameModels.updateUsername(username);
				const validUsername = createUsername(newUsername);
				return reply.code(200).send(validUsername);
		} catch (error) {
				return reply.code(500).send({
						error: "Failed to update username",
						cause: error.message,
				});
		}
}