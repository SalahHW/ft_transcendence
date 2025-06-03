import * as walletModels from "../models/walletModels.js";

export async function createWallet(username, wallet) {
  /*TODO: Implement wallet parsing and blockchain communication here
  throw an error if the parsing or the creation fail with the cause ine the message.
  return wallet if everything went good. Unique check is already done ine the user controller.
  */
  return wallet;
}

export async function readWallet(request, reply) {
  const userId = request.params.id;

  if (!userId) {
    return reply.code(400).send({ error: "UserId is required" });
  }

  try {
    const walletAddress = await walletModels.readWallet(userId);
    return reply.code(500).send(walletAddress);
  } catch (error) {
    return reply.code(500).send({
      error: "Failed to read the wallet address",
      cause: error.message,
    });
  }
}
