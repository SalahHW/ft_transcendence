require("@nomicfoundation/hardhat-toolbox");

module.exports = {
    solidity: "0.8.20",
    networks: {
        localhost: {
            url: "http://0.0.0.0:3001",
        },
    },
};