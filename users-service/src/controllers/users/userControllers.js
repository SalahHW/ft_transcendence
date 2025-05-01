import { userModels } from "../models/userModels/userModels.js";

async function createUser(request, reply) {
    const { userId, username, password, email } = request.body;

    if (!userId || !username || !password || !email) {
        return reply.code(400).send({ error: "Lack of information related to the user" });
    }
    try {
        const newUser = await userModels.createUser(userId, username, password, email);
        return reply.code(200).send(newUser);
    } catch (err) {
        return reply.code(500).send({ error: "Failed to create the user" });
    }
}

async function readUser(request, reply) {
    const { userId } = request.body;

    if (!userId) {
        return reply.code(400).send({ error: "UserId is required" });
    }
    try {
        const user = await userModels.userModels(userId);
        return reply.code(200).send(user);
    } catch (err) {
        return reply.code(500).send({ error : "Failed to read the user" });
    }
}

async function deleteUser(requet, reply) {
    const { userId } = request.body;

    if (!userId) {
        return reply.code(400).send({ error: "UserId is required" });
    }
    try {
        const userId = await userModels.userModels(userId);
        return reply.code(200).send() // ??
    } catch (err) {
        return reply.code(500).send({ error: "Failed to delete the user" });
    }
}