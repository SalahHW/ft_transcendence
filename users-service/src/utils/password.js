import bcrypt from "bcrypt";

export async function encryptPassword(password) {
	return await bcrypt.hash(password, 10);
}

export async function comparePassword(passwordA, passwordB) {
	return await bcrypt.compare(passwordA, passwordB);
}
