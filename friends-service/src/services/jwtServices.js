import { JWT_SERVICE_HOST, JWT_SERVICE_PORT } from "../config/config.js";

const JWT_SERVICE_URL = `http://${JWT_SERVICE_HOST}:${JWT_SERVICE_PORT}`;
const verifyUrl = `${JWT_SERVICE_URL}/verify`;

export async function verifyToken(token) {
  try {
    const response = await fetch(verifyUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(response);
    return response;
  } catch (err) {
    console.log(err);
    throw err;
  }
}
