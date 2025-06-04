import {
  loginUserWithWallet,
  registerUserWithWallet,
  verifyWalletUser,
} from "../controllers/walletAuthenticationControllers.js";

export default async function walletAuthenficationRoutes(fastify, options) {
  fastify.post("/auth/wallet/login", loginUserWithWallet);
  fastify.post("/auth/wallet/register", registerUserWithWallet);
  fastify.post("/auth/wallet/verify", verifyWalletUser);
}
