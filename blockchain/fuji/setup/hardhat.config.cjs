require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");

module.exports = {
  solidity: "0.8.20",
  networks: {
    fuji: {
      url: "https://ava-testnet.public.blastapi.io/ext/bc/C/rpc",
      accounts: [
        "0x5AB6354E10f8bda8DC8CCc7c32C218b68455d9A10x8528eaa3abd6f40d396de1d677924b03b4b232ce10afd9627c79c1660c4cbca6"
      ]
    }
  },
  etherscan: {
    apiKey: {
      avalancheFujiTestnet: "6JWDJGUQRZNJS2TSKZ96PZ7WDSN7Q22UYG"
    }
  },
  sourcify: {
    enabled: true
  }
};
