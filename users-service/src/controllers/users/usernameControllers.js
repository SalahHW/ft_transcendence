import { usernameModels } from "../models/userModels/usernameModels.js";

async function createUsername(request, reply) {
    const { username } = request.body;

    if (!username) {
        return reply.code(400).send({ error: "Username is required" });
    }
    try {
        const newUsername = await usernameModels.createUsername(username);
        return reply.code(200).send(newUsername);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to create username",
            cause: error.message,
        });
    }
}

async function readUsername(request, reply) {
    const { userId } = request.body;

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

async function updateUsername(request, reply) {
    const { username } = request.body;

    if (!username) {
        return reply.code(400).send({ error: "Username is required for the update" });
    }
    try {
        const newUsername = await usernameModels.updateUsername(username);
        return reply.code(200).send(newUsername);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to update username",
            cause: error.message,
        });
    }
}
