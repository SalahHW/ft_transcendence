import { USERS_SERVICE_URL } from "../config/config.js";
import { handleServiceError } from "./errors/serviceErrorHandler.js";

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
