export const verifyToken = async (request, reply) => {
  try {
    const decoded = await request.jwtVerify();
    return reply.code(200).send({ decoded });
  } catch (error) {
    return reply
      .code(401)
      .send({ error: "Invalid token", cause: error.message });
  }
};
