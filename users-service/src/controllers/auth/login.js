import { getCredentialsByUsername } from "../../models/auth/credentials.js";
import bcrypt from "bcrypt";

export const loginUser = async (request, reply) => {
  const { username, password } = request.body;

  if (!username || !password) {
    reply.statusCode = 400;
    reply.send({ error: "Username and password are required" });
    return;
  }

  try {
    const user = await getCredentialsByUsername(username);
    const isValidPass = await bcrypt.compare(password, user.password);

    if (!isValidPass) {
      reply.statusCode = 401;
      reply.send({ error: "Invalid credentials" });
      return;
    }

    const token = request.server.jwt.sign({
      id: user.id,
      username: user.username,
    });

    reply.statusCode = 200;
    reply.send({ token });
  } catch (err) {
    console.error(err);
    reply.statusCode = 500;
    reply.send({ error: "Login failed" });
  }
};
