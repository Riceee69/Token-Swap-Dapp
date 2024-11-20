import React, {useEffect, useState} from "react";
import {ethers} from 'ethers';
import styles from "@/styles/Home.module.css";
import TokenSelector from "./TokenSelector.js";
import WalletConnectButton from "./WalletConnectButton.js";

export default function Home() {

  const [currentAccount, setCurrentAccount] = useState("");
  const [swapFromToken, setSwapFromToken] = useState({});
  const [swapToToken, setSwapToToken] = useState({});
  const [swapFromAmount, setSwapFromAmount] = useState('');
  const [swapToAmount, setSwapToAmount] = useState('');
  const [gasPrice, setGasPrice] = useState('');
  const NETWORK_ID = "1"

  useEffect(() => {
    const { ethereum } = window;

    if(!ethereum){
      alert("Please install EVM Wallet!");
      return;
    }

    const handleAccountsChanged = async ([newAddress]) => {

      if(newAddress === undefined){
        setCurrentAccount("");
        console.log("Wallet disconnected")
        return;
      }

      //console.log("address changed to: ", newAddress);
      setCurrentAccount(newAddress);
    }

    ethereum.on("accountsChanged", handleAccountsChanged);

    //removes event listener when component unmounts
    return () => {
      ethereum.removeListener("accountsChanged", handleAccountsChanged)
    }
  }, [])

  const connectWallet = async () => {
    try {
      const { ethereum } = window;

      if (!ethereum){
        window.alert("Please install a web3 wallet");
      }

      const [userAddress] = await ethereum.request({method: "eth_requestAccounts"})
      await checkNetwork();
      setCurrentAccount(userAddress);
      //console.log('currentAddress:', userAddress);
    } catch (error) {
      if (error.code === 4001) {
        // User rejected the request
        console.log("User rejected the connect request");
        return;
      } else if (error.code === -32002) {
        // Request already pending
        alert("A connection request is already pending. Please check your MetaMask extension.");
        return;
      } else {
        console.error("An error occurred while connecting to the wallet:", error);
        return;
      }
    }
  }

  const disconnectWallet = async() => {
    //disconnects all user connected wallets
    await window.ethereum.request({
      "method": "wallet_revokePermissions",
      "params": [
       {
         eth_accounts: {}
       }
     ],
     });
    setCurrentAccount('');
  }

  const setFromTokenAmount = (event) => {
      setSwapFromAmount(event.target.value);
  }

  const setToTokenAmount = async () => {
    if(swapFromAmount !== ''){
    const priceParams = new URLSearchParams({
      chainId: '1', // / Ethereum mainnet. See the 0x Cheat Sheet for all supported endpoints: https://0x.org/docs/introduction/0x-cheat-sheet
      sellToken: `${swapFromToken.address}`, 
      buyToken: `${swapToToken.address}`,
      sellAmount: `${swapFromAmount * 10 ** 18}`,
      taker: `${currentAccount}`, //Address that will make the trade
  });
    
  const priceResponse = await fetch(`/api/getPrice?${priceParams.toString()}`);
  const priceData = await priceResponse.json();
  //console.log(priceData)
  if(priceData.liquidityAvailable){
    setSwapToAmount(Number(priceData.buyAmount)/ 10 ** 18)
    setGasPrice((Number(BigInt(priceData.gas) * BigInt(priceData.gasPrice)) / 1e18).toFixed(6))
  }else{
    window.alert("Pair untradable")
  }
  }else{
    setSwapToAmount('')
    setGasPrice('')
  }
}

//getting swap token contractABI using ethers library
const getABI = async () => {
  const provider = new ethers.EtherscanProvider("mainnet", process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY );
  try {
    const contractInfo = await provider.getContract(swapFromToken.address);
    const contractABI = contractInfo.interface.fragments;//ABI path
    console.log(contractABI)
    await setAllowance(contractABI);
  } catch (error) {
    console.error("Error fetching ABI:", error);
  }
}

const setAllowance = async (contractABI) => {
  try {
    const { ethereum } = window;

    if (ethereum) {
      const provider = new ethers.BrowserProvider(ethereum, "any");
      const signer = await provider.getSigner();
      const erc20token = new ethers.Contract(
        swapFromToken.address,
        contractABI,
        signer
      );
      const approveTxn = await erc20token.approve(
        "0x000000000022D473030F116dDEE9F6B43aC78BA3", 
        BigInt((Number(swapFromAmount) + 0.2) * 1e18)//adding extra for approval to manage gas costs
      )
      await approveTxn.wait();
      await executeSwap();
      console.log("Allowance approved")
    }
  } catch (error) {
    if (error.code === 4001) {
      window.alert("User rejected the transaction");
    }else{
    console.log(error);
    }
  }
}

const executeSwap = async () => {
  if(swapFromAmount !== ''){
    const quoteParams = new URLSearchParams({
      chainId: '1', // / Ethereum mainnet. See the 0x Cheat Sheet for all supported endpoints: https://0x.org/docs/introduction/0x-cheat-sheet
      sellToken: `${swapFromToken.address}`, 
      buyToken: `${swapToToken.address}`,
      sellAmount: `${swapFromAmount * 10 ** 18}`,
      taker: `${currentAccount}`, //Address that will make the trade
  });
    
    const quoteResponse = await fetch(`/api/getQuote?${quoteParams.toString()}`);
    const quoteData = await quoteResponse.json();
    console.log(quoteData)

    // Sign permit2.eip712 returned from quote
    if (quoteData.permit2.eip712) {
      const domain = {
        name: '"Permit2"',
        chainId: 1,
        verifyingContract: '0x000000000022d473030f116ddee9f6b43ac78ba3' 
      };
  
      const types = {
        TokenPermissions: [
          {
              name: "token",
              type: "address"
          },
          {
              name: "amount",
              type: "uint256"
          }
      ],
        PermitTransferFrom: [
          {
              name: "permitted",
              type: "TokenPermissions"
          },
          {
              name: "spender",
              type: "address"
          },
          {
              name: "nonce",
              type: "uint256"
          },
          {
              name: "deadline",
              type: "uint256"
          }
      ],
      };

      const value = quoteData.permit2.eip712; 
  
      const provider = new ethers.BrowserProvider(ethereum, "any");
      const signer = await provider.getSigner();
  
      try {
        const signature = await signer.signTypedData(domain, types, value);
        console.log('Signature:', signature);
      } catch (error) {
        console.error('Error signing data:', error);
      }
    }
  }
}

const handleSwap = async () => {
  await getABI();
}

const checkNetwork = async() => {
  if (window.ethereum.networkVersion !== NETWORK_ID){
    await switchChain();
  }
}

const switchChain = async() => {
  const chainIdHex = `0x${Number(NETWORK_ID).toString(16)}`
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: chainIdHex }],
    });
  } catch (switchError) {
    console.error("Failed to switch chain: ", switchError);
  }
}

  return (
    <div>
      <div className={styles.titleHeader}>
          <h1>My DEX Aggregator</h1>
          <div className={styles.titleHeader}>
            <WalletConnectButton 
              currentAccount={currentAccount} 
              connectWallet={connectWallet}
              disconnectWallet={disconnectWallet}            
            />
          </div>
      </div>
        <div className={styles.container}>
          <div className={styles.row}>
                <h4 style={{marginBottom: '10px', color: `#fafafa`}}>Swap</h4>
                <div>
                  <div className={styles.tokenSelectorSection}>
                    <TokenSelector swapToken={swapFromToken} setSwapToken={setSwapFromToken}/>
                    <input type="text" className={styles.amountInputBox} onChange={setFromTokenAmount} 
                    onBlur={setToTokenAmount}/>
                  </div>
                  <div className={styles.imageContainer}>
                    <img src="/arrow-swap-svgrepo-com.svg" className={styles.centeredImage} />
                  </div>
                  <div className={styles.tokenSelectorSection}>
                    <TokenSelector swapToken={swapToToken} setSwapToken={setSwapToToken}/>
                    <input type="text" className={styles.amountInputBox} value={swapToAmount} readOnly/>
                  </div>
                </div>
                <div className={styles.rowFooter}>
                  <b className={styles.gasEstimateText}>Estimated Gas(in eth): {`${gasPrice}`}</b>
                  <button className={styles.swapButton} disabled={!currentAccount} 
                    onClick={handleSwap}
                  >
                    Swap
                  </button>
                </div>
          </div>
      </div>
      <div className={`${styles.footer}`}>
            <h4>
              Checkout more of my projects on
              <a href="https://github.com/Riceee69" target="_blank"> <u>Github</u></a>
            </h4>
      </div>
   </div>  
  );
}

