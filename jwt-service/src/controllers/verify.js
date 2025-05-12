export const verifyToken = async (request, reply) => {
  try {
    const decoded = await request.jwtVerify();
    reply.statusCode = 200;
    reply.send({ decoded });
  } catch (error) {
    reply.statusCode = 401;
    reply.send({ error: "Invalid token", cause: error.message });
  }
};
