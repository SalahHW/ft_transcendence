import { USERS_SERVICE_URL } from "../config/config.js";

export async function userExists(userId) {
  try {
    const response = await fetch(`${USERS_SERVICE_URL}/users/id/${userId}`);
    return response;
  } catch (err) {
    throw err;
  }
}
