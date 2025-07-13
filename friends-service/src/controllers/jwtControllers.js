import * as jwtServices from "../services/jwtServices.js";

export async function verifyAuthentication(request, reply) {
  const token = request.cookies?.token;

  console.log("coucou");
  if (!token) {
    return reply.code(401).send({ error: "Authentication token is missing" });
  }

  const verificationResult = await jwtServices.verifyToken(token);
  console.log(verificationResult);
}
