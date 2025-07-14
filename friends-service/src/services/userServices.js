import { USERS_SERVICE_HOST, USERS_SERVICE_PORT } from "../config/config.js";

const USERS_SERVICE_URL = `http://${USERS_SERVICE_HOST}:${USERS_SERVICE_PORT}`;

export async function userExists(userId) {
  try {
    const response = await fetch(`${USERS_SERVICE_URL}/users/id/${userId}`);
    return response;
  } catch (err) {
    throw err;
  }
}
