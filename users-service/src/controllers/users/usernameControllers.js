import { usernameModels } from "../models/userModels/usernameModels.js";

async function createUsername(request, reply) {
    const { username } = request.body;

    if (!username) {
        return reply.code(400).send({ error: "Username is required"});
    }

    return reply.code(200).send(username);
}

async function updateUsername(request, reply) {
    const { username } = request.body;

    if (!username) {
        return reply.code(400).send({ error: "Username is required for the update"});
    }
    try {
        const newUsername = await usernameModels.update(username);
        return reply.code(200).send(newUsername);
    } catch (err) {
        return reply.code(500).send({ error: "Failed to update username" });
    }
}