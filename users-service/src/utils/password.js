import bcrypt from "bcrypt";

export async function encryptPassword(password) {
  try {
    const encryptedPassword = await bcrypt.hash(password, 10);
    return encryptedPassword;
  } catch (error) {
    throw new Error("Error encrypting password: " + error.message);
  }
}

export async function comparePassword(password, oldPassword) {
  try {
    const isMatch = await bcrypt.compare(password, oldPassword);
    return isMatch;
  } catch (error) {
    throw new Error("Error comparing password: ", error.message);
  }
}
