import bip39 from 'bip39'
import axios from 'axios';
import HDKey from 'hdkey';
import  ec  from 'elliptic';
import { HttpStatusCode } from 'axios';
import {ethers} from 'ethers'
import * as bitcoin from 'bitcoinjs-lib';
import {config} from '../config.js'
import {TronWeb} from 'tronweb';
import {exec} from 'child_process'

const secp256k1 = new ec.ec('secp256k1');

const tronWeb = new TronWeb({
    fullHost: 'https://api.trongrid.io',
    solidityNode: 'https://api.trongrid.io'
});

export function InitApi(app) {
    routes.createTrxWallet(app)
    routes.createEthWallet(app)
    routes.createBtcWallet(app)
    routes.getBtcBalance(app)
    routes.getEthBalance(app)
    routes.getTrc20Balance(app)
    routes.getCosts(app)
    routes.getBitcoinInfo(app)
    routes.getEthereumInfo(app)
    routes.getUsdtInfo(app)
    routes.getRippleInfo(app)
    routes.getSolanaInfo(app)
    routes.getCardanoInfo(app)
    routes.getAvalancheInfo(app)
    routes.getBnbInfo(app)
}

const routes = {
    createTrxWallet: (app) => {
        app.post('/api/create_trx_wallet', async (req, res) => {
            const {phrase} = req.body;
            console.log(phrase)
                // Generate seed from mnemonic
                if (phrase && typeof phrase == 'string') {
                    const seed = await bip39.mnemonicToSeed(phrase ?? "");
                
                // Create HDKey from the seed
                const hdkey = HDKey.fromMasterSeed(seed);
                
                // Derivation path for TRON (BIP44)
                const derivationPath = "m/44'/195'/0'/0/0"; // Change the index if needed
                const childKey = hdkey.derive(derivationPath);
                
                // Get private key and public key
                const privateKey = childKey.privateKey.toString('hex');
                const tronWeb = new TronWeb({
                    fullHost: 'https://api.trongrid.io',
                });
                
                // Generate TRON address from private key
                const address = tronWeb.address.fromPrivateKey(privateKey);

                res.status(HttpStatusCode.Ok).send({
                    private_key: privateKey,
                    address: address
                });
                } else {
                    res.status(400)
                }
            }
        )
    },
    createEthWallet: (app) => {
        app.post('/api/create_eth_wallet', async (req, res) => {
            const {phrase} = req.body;
                // Generate seed from mnemonic
                if (phrase && typeof phrase == 'string') {
                    try {
                        // Create a wallet from the mnemonic
                        const wallet = ethers.Wallet.fromPhrase(phrase);
                
                        // Get the address and private key
                        const address = wallet.address;
                        const privateKey = wallet.privateKey;
                
                        console.log('Generated Ethereum Address:', address);
                        console.log('Private Key:', privateKey);
                        res.status(HttpStatusCode.Ok).send({
                            private_key: privateKey,
                            address: address
                        });
                    } catch (error) {
                        res.status(HttpStatusCode.BadRequest).send({
                            error: "Create error: " + error
                        });
                    }
                } else {
                    res.status(400)
                }
            }
        )
    },
    createBtcWallet: (app) => {
        app.post('/api/create_btc_wallet', async (req, res) => {
            const { phrase } = req.body;
    
            if (phrase && typeof phrase === 'string') {
                try {
                    // Validate the mnemonic phrase
                    const isValidMnemonic = bip39.validateMnemonic(phrase);
                    if (!isValidMnemonic) {
                        return res.status(400).send({
                            error: "Invalid mnemonic phrase."
                        });
                    }
    
                    // Generate seed from the mnemonic
                    const seed = await bip39.mnemonicToSeed(phrase);
    
                    // Create a BIP32 root key from the seed
                    const root = bitcoin.bip32.fromSeed(seed);
    
                    const path = "m/84'/0'/0'/0/0"; // BIP84 is used for SegWit addresses
                    const child = root.derivePath(path);
                    
                    const privateKey = child.toWIF();
    
                    const { address } = bitcoin.payments.p2wpkh({ pubkey: child.publicKey });
    
                    console.log('Generated Bitcoin Address (Bech32 - Trust Wallet):', address);
                    console.log('Private Key (WIF):', privateKey);
                    
                    res.status(200).send({
                        private_key: privateKey,
                        address: address
                    });
                } catch (error) {
                    res.status(400).send({
                        error: "Create error: " + error.message
                    });
                }
            } else {
                res.status(400).send({
                    error: "Invalid mnemonic phrase."
                });
            }
        });
    },
    getBtcBalance: (app) => {
        app.post('/api/btc_balance', async (req, res) => {
            const { address } = req.body;
            if (address && typeof address === 'string') {
                try {
                    // Make a GET request to BlockCypher API to fetch balance
                    const response = await axios.get(`https://api.blockcypher.com/v1/btc/main/addrs/${address}/balance`);
                    
                    const balanceInSatoshis = response.data.final_balance;
                    const balanceInBTC = balanceInSatoshis === 0 ? 0.00 : (balanceInSatoshis / 100000000).toFixed(10).replace(/\.?0+$/, '');
                    
                    console.log(`Bitcoin balance for ${address}: ${balanceInBTC} BTC`);
                    
                    res.status(200).send({
                        address: address,
                        balance: balanceInBTC,
                    });
                } catch (error) {
                    res.status(400).send({
                        error: "Error fetching balance: " + error.message,
                    });
                }
            } else {
                res.status(400).send({
                    error: "Invalid Bitcoin address."
                });
            }
        });
    },
    getEthBalance: (app) => {
        app.post('/api/eth_balance', async (req, res) => {
            const { address } = req.body;
            if (address && typeof address === 'string') {
                try {
                    const provider = new ethers.JsonRpcProvider(`https://mainnet.infura.io/v3/${config.INFURA_KEY}`);
                    
                    const balanceInWei = await provider.getBalance(address);
                    
                    const balanceInEth = ethers.formatEther(balanceInWei);
    
                    console.log(`Ethereum balance for ${address}: ${balanceInEth} ETH`);
                    res.status(200).send({
                        address: address,
                        balance: balanceInEth,
                    });
                } catch (error) {
                    res.status(400).send({
                        error: "Error fetching balance: " + error.message,
                    });
                }
            } else {
                res.status(400).send({
                    error: "Invalid mnemonic phrase."
                });
            }
        });
    },
    getTrc20Balance: (app) => {
        app.post('/api/trc20_balance', async (req, res) => {
            const { address } = req.body;
    
            if (address && typeof address === 'string') {
                try {
                    tronWeb.setAddress(config.TRC20_ADDRESS);

                    let contract = await tronWeb.contract().at(config.TRC20_ADDRESS); 
                    let result = await contract.balanceOf(address).call();
 
                    const balance = (Number(result) / 1e6).toFixed(6).replace(/\.?0+$/, '')

                    res.status(200).send({
                        address: address,
                        balance: balance.toString()
                    });
                } catch (error) {
                    console.log(error)
                    res.status(400).send({
                        error: "Error fetching balance: " + error.message,
                    });
                }
            } else {
                res.status(400).send({
                    error: "Invalid address.",
                });
            }
        });
    },
    getCosts: (app) => {
        app.get('/api/crypto_costs', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether,solana,cardano,ripple,binancecoin,avalanche-2&vs_currencies=usd"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                // Parse the JSON response
                const response = JSON.parse(stdout);
                
                // Get prices of BTC, ETH, and USDT (TRC-20)
                const bitcoinPrice = response.bitcoin.usd;
                const ethereumPrice = response.ethereum.usd;
                const tetherPrice = response.tether.usd;
                const avalanchePrice = response['avalanche-2'].usd;
                const solanaPrice = response.solana.usd;
                const cardanoPrice = response.cardano.usd;
                const ripplePrice = response.ripple.usd;
                const binancePrice = response.binancecoin.usd;


                res.status(200).send({
                    btc: bitcoinPrice,
                    eth: ethereumPrice,
                    usdt: tetherPrice,
                    cardano: cardanoPrice,
                    xrp: ripplePrice,
                    avalanche: avalanchePrice,
                    solana: solanaPrice,
                    bnb: binancePrice
                });
            });            
        });
    },

    getBitcoinInfo: (app) => {
        app.get('/api/bitcoin_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/bitcoin"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getEthereumInfo: (app) => {
        app.get('/api/ethereum_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/ethereum"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getRippleInfo: (app) => {
        app.get('/api/ripple_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/ripple"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getUsdtInfo: (app) => {
        app.get('/api/usdt_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/tether"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getSolanaInfo: (app) => {
        app.get('/api/solana_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/solana"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getCardanoInfo: (app) => {
        app.get('/api/cardano_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/cardano"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getBnbInfo: (app) => {
        app.get('/api/bnb_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/binancecoin"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },

    getAvalancheInfo: (app) => {
        app.get('/api/avalanche_info', async (req, res) => {
    
            const curlCommand = `curl -s "https://api.coingecko.com/api/v3/coins/avalanche-2"`;

            exec(curlCommand, (error, stdout, stderr) => {
                if (error) {
                console.error(`Error executing curl command: ${error.message}`);
                return;
                }
                if (stderr) {
                console.error(`Error in curl response: ${stderr}`);
                return;
                }
                
                const response = JSON.parse(stdout);
                
                 const price = response.market_data.current_price.usd
                 const market_cap = response.market_data.market_cap.usd
                 const change = response.market_data.price_change_percentage_24h


                res.status(200).send({
                    usd_price: price,
                    market_cap: market_cap,
                    change_24h: change
                });
            });            
        });
    },
}