require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 100
            }
        }
    },
    networks: {
        fuji: {
            url: "https://api.avax-test.network/ext/bc/C/rpc",
            chainId: 43113,
            accounts: [process.env.PRIVATE_KEY],
        },
    },
    defaultNetwork: "fuji",
};
