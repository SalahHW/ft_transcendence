import { JWT_SERVICE_URL } from "../config/config.js";

const verifyUrl = `${JWT_SERVICE_URL}/verify`;

export async function verifyToken(token) {
  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return response;
  } catch (err) {
    throw err;
  }
}
