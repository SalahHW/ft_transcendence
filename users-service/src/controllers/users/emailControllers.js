import * as emailModels from "../../models/userModels/emailModels.js";

// export async function createEmail(request, reply) {
//     const { email } = request.body;

//     if (!email) {
//         return reply.code(400).send({ error: "UserId is required" });
//     }
//     try {
//         const email = await emailModels.createEmail(email);
//         return reply.code(200).send(email);
//     } catch (error) {
//         return reply.code(500).send({
//             error: "Failed to create an email",
//             cause: error.message,
//         });
//     }
// }

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

    if (!email) {
        return reply.code(400).send({ error: "Email is required" });
    }
    try {
        const newEmail = await emailModels.updateEmail(email);
        return reply.code(200).send(newEmail);
    } catch (error) {
        return reply.code(500).send({
            error: "Failed to update the email",
            cause: error.message,
        });
    }
}
