import * as emailModels from "../../models/userModels/emailModels.js";
import validator from 'validator';

export function createEmail(rawEmail) {

	if (typeof rawEmail !== 'string') {
		throw new Error("Email must be a string");
	}
	// Delete whitespaces
	const email = rawEmail.trim();

	// Norme RFC 5322 simplifiée
	if (!email || !validator.isEmail(email)) {
		throw new Error("Invalid email address");
	}
	return email;
}

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
		const updatedEmail = createEmail(newEmail);
		return reply.code(200).send(updatedEmail);
	} catch (error) {
		return reply.code(500).send({
			error: "Failed to update the email",
			cause: error.message,
		});
	}
}
