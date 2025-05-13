import bcrypt from "bcrypt";

export async function encryptPassword(password) {
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
