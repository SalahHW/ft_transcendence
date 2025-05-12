import bcrypt from "bcrypt";

export async function encryptPassword(password) {
		// Mot de passe compose de lettres, chiffres et underscores. 6 a 12 caracteres.
		const regexPattern = /^[a-zA-Z0-9?!.#*"']{6,12}$/;
		if (!password || !regexPattern.test(password)) {
				throw new Error("Invalid password format. It must be 6 to 12 characters long and contain only letters, numbers, or special characters");
		}
		return await bcrypt.hash(password, 10);
}

export async function comparePassword(passwordA, passwordB) {
		// Boolean
		const isValidPassword = await bcrypt.compare(passwordA, passwordB);

		if (!isValidPassword) {
				return false;
		}
		return true;
}
