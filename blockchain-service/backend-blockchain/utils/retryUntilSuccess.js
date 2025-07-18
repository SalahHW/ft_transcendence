module.exports = async function retryUntilSuccess(
  fn,
  maxRetries,
  delayMs,
  parseContractError
) {
  let attempt = 0;
  while (true) {
    try {
      const tx = await fn();
      const receipt = await tx.wait();
      return { tx, receipt };
    } catch (error) {
      attempt++;
      const { error: parsedMessage } = parseContractError?.(error) || {};
      const logicErrors = [
        "already exists",
        "does not exist",
        "invalid",
        "Match ID already used",
        "Exactly 4 matches must have this timestamp",
      ];
      if (logicErrors.some((msg) => parsedMessage?.includes(msg))) {
        throw error;
      }
      if (attempt >= maxRetries) {
        throw new Error(
          `Transaction failed after ${maxRetries} retries: ${error.message}`
        );
      }
      console.warn(
        `[Attempt ${attempt}] Retry in ${delayMs}ms: ${error.message}`
      );
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
};
