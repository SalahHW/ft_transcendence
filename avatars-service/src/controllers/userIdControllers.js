import * as userServices from "../services/userServices.js";

export async function validateUserId(request) {
  const { id } = request.params;

  const userId = parseInt(id, 10);
  if (isNaN(userId) || userId <= 0) {
    throw new Error("Invalid user ID");
  }

  await userServices.userExists(userId);
  return userId;
}
