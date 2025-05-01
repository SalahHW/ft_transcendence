import { userModels } from "../models/userModels/userModels.js";

async function createUser(request, reply) {
    const { userId, username, password, email } = request.body;

    if (!userId || !username || !password || !email) {
        return reply.code(400).send({ error: "Lack of information related to the user" });
    }
    try {
        const newUser = await userModels.createUser(userId, username, password, email);
        return reply.code(200).send(newUser);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to create the user",
            cause: error.message,
        });
    }
}

async function readUser(request, reply) {
    const { userId } = request.body;

    if (!userId) {
        return reply.code(400).send({ error: "UserId is required" });
    }
    try {
        const user = await userModels.readUser(userId);
        return reply.code(200).send(user);
    } catch (error) {
        return reply.code(500).send({ 
            error: "Failed to read the user",
            cause: error.message,
        });
    }
}

async function updateUser(request, reply) {
    const { userId } = request.body;

    if (!userId) {
        return reply.code(400).send({ error: "UserId is required" });
    }
    try {
        const updatedUser = await userModels.updateUser(userId);
        return reply.code(200).send(updatedUser);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to update the user",
            cause: error.message,
        });
    }
}

async function deleteUser(request, reply) {
    const { userId } = request.body;

    if (!userId) {
        return reply.code(400).send({ error: "UserId is required" });
    }
    try {
        const deletedUserId = await userModels.deleteUser(userId);
        return reply.code(200).send({ success: `User ${deletedUserId} has been deleted with success` });
    } catch (error) {
        return reply.code(500).send({ 
            error: "Failed to delete the user",
            cause: error.message,
        });
    }
}