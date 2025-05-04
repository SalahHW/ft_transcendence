import * as passwordModels from "../models/userModels/passwordModels.js";
import { readUser } from "userControllers.js";

export async function readPassword(request, reply) {
    const userId = request.params.id;

    if (!userId) {
        return reply.code(400).send({ error: "UserId required" });
    }
    try {
        const password = await passwordModels.readPassword(userId);
        return reply.code(200).send(password);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to read the password",
            cause: error.message,
        });
    }
}

export async function updatePassword(request, reply) {
    const { oldPassword, newPassword } = request.body;
    const userId = request.params.id;

    if (!oldPassword || !newPassword) {
        return reply.code(400).send({ error: "Old and new password are required" });
    }
    const sameOldPassword = await bcrypt.compare(oldPassword, readUser());
    if (!sameOldPassword) {
        return reply.code(403).send({ error: "Old password doesn't match" });
    }
    try {
        const newHashedPassword = await bcrypt.hash(newPassword, 10);
        const result = await passwordModels.updatePassword(userId, newHashedPassword);
        return reply.code(200).send(result);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to update the password",
            cause: error.message
        });
    }
}
