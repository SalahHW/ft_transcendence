module.exports = function parseContractError(error) {
  const reason = error?.reason || error?.error?.message || error?.message || "";

  if (reason.includes("Player does not exist")) {
    return { code: 404, error: "Player not found." };
  }
  if (reason.includes("Player1 not registered")) {
    return { code: 422, error: "Player 1 is not registered." };
  }
  if (reason.includes("Player2 not registered")) {
    return { code: 422, error: "Player 2 is not registered." };
  }
  if (reason.includes("Winner address is invalid")) {
    return { code: 422, error: "Invalid winner address." };
  }
  if (reason.includes("Match ID already used")) {
    return { code: 409, error: "Match has already been reported." };
  }
  if (reason.includes("Match not found")) {
    return { code: 404, error: "Match not found." };
  }
  if (reason.includes("No matches found for the player")) {
    return { code: 404, error: "No matches found for this player." };
  }
  if (reason.includes("No matches found for the winner")) {
    return { code: 404, error: "No matches found for this winner." };
  }
  if (reason.includes("Tournament already exists")) {
    return { code: 409, error: "Tournament has already been reported." };
  }
  if (reason.includes("Tournament not found")) {
    return { code: 404, error: "Tournament not found." };
  }
  if (reason.includes("No tournaments found for the winner")) {
    return { code: 404, error: "No tournaments found for this wallet." };
  }
  if (reason.includes("Only admin can transfer tokens")) {
    return { code: 403, error: "Only the admin can transfer the GOAT NFT." };
  }
  if (
    reason.includes("Token not found") ||
    reason.includes("ERC721NonexistentToken")
  ) {
    return { code: 404, error: "Token not found or invalid." };
  }
  if (reason.includes("A tournament must include exactly 4 matches")) {
    return { code: 422, error: "A tournament must include exactly 4 matches." };
  }
  if (reason.includes("One or more matchIds do not exist")) {
    return { code: 422, error: "One or more provided match IDs do not exist." };
  }

  return { code: 500, error: "Internal server error.", details: reason };
};
