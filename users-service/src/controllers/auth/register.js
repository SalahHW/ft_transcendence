import { insertUser } from "../../models/userModels/createModels.js";
import bcrypt from "bcrypt";

export const createUser = async (request, reply) => {
  const { username, password } = request.body;

  if (!username || !password) {
    reply.statusCode = 400;
    reply.send({ error: "Username and password are required" });
    return;
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await insertUser(username, hashedPassword);
    reply.statusCode = 201;
    reply.send({ id: newUser.id, username: newUser.username });
  } catch (err) {
    if (err.code === "SQLITE_CONSTRAINT") {
      reply.statusCode = 409;
      reply.send({ error: "Username already exists" });
      return;
    }

    reply.statusCode = 500;
    reply.send({ error: "Failed to register user" });
    console.error(err);
    return;
  }
};
