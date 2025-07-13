import { USERS_SERVICE_HOST, USERS_SERVICE_PORT } from "../config/config.js";
import { handleServiceError } from "./errors/serviceErrorHandler.js";

const USERS_SERVICE_URL = `http://${USERS_SERVICE_HOST}:${USERS_SERVICE_PORT}`;

export async function userExists(userId) {
  try {
    const response = await fetch(`${USERS_SERVICE_URL}/users/id/${userId}`);

    if (response.status === 404) {
      const err = new Error(`User ${userId} not found`);
      err.status = 404;
      throw err;
    }
    return response.ok;
  } catch (err) {
    throw handleServiceError(err);
  }
}
