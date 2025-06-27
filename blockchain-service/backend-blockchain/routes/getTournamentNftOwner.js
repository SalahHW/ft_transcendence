module.exports = async function (fastify) {
    fastify.get('/nft/tournament/:tokenId', async (request, reply) => {
        const tokenId = request.params.tokenId;
        const contract = fastify.tournamentNft;

        try {
            const owner = await contract.ownerOf(tokenId);
            reply.send({ success: true, tokenId, owner });
        } catch (err) {
            request.log.error(err);
            reply.status(404).send({ success: false, error: "Token not found or invalid." });
        }
    });
};
