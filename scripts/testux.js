const axios = require("axios");

const API_KEY = "WFA85M6D1Z4BI9QX53BBXDM9EMDPIPR3W8";
const TOKEN_ADDRESS = "0xdb61863E82176C6872b29053D20E1C73721C271B";
const BASE_URL = "https://api.bscscan.com/api"; // For BSC; use 'https://api.etherscan.io/api' for Ethereum

async function getTokenPrice() {
  try {
    const response = await axios.get(BASE_URL, {
      params: {
        module: "token",
        action: "tokeninfo",
        contractaddress: TOKEN_ADDRESS,
        apikey: API_KEY,
      },
    });

    const data = response.data.result[0];
    const tokenPrice = data.tokenPriceUSD;
    const marketCap = data.tokenMarketCapUSD;

    console.log(`Token Price: $${tokenPrice}`);
    console.log(`Market Cap: $${marketCap}`);
  } catch (error) {
    console.error("Error fetching token price and market cap:", error);
  }
}

getTokenPrice();
