import { createUser } from "./users/userControllers.js";

export const registerUser = async (request, reply) => {
  return createUser(request, reply);
};

export const loginUser = async (request, reply) => {
  const { username, password } = request.body;

  if (!username || !password) {
    reply.statusCode = 401;
    reply.send({ error: "Username and password are required" });
    return;
  }

  
};
