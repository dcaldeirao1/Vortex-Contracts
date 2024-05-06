const {ethers} = require('ethers')
const axios = require('axios')

require('dotenv').config()

const UNISWAP_V3_FACTORY_ADDRESS = ''

const ROPSTEN_PROVIDER = new ethers.providers.JsonRpcProvider(process.env,INFURE_URL_ROPSTEN)
const WALLET_ADDRESS = process.env.WALLET_ADDRESS
const  WALLET_SECRET = process.env.WALLET_SECRET
const first_coin_address = '0xf11D21eB5447549E3E815c6E357e3D0779FeC838';
const second_coin_address = '0xf11D21eB5447549E3E815c6E357e3D0779FeC838';

const wallet = new ethers.Wallet(WALLET_SECRET)
const connectedWallet = wallet.connect(ROPSTEN_PROVIDER)

async function main(){

    const url = '';
    const res = await axios.get(url)
    const abi = JSON.parse(res.data.result)
const factoryContract = new ethers.Contract(
    abi,
    ROPSTEN_PROVIDER
)

const tx = await factoryContract.connect(connectedWallet).createPool(
    first_coin_address,
    second_coin_address,
    500
)



}

main()