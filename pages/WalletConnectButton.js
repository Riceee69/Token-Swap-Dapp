import React from "react";
import styles from "../styles/WalletConnectButton.module.css";

const WalletConnectButton = ({currentAccount, connectWallet, disconnectWallet}) => {
    return(
        <>
            {currentAccount === ""?             
                <button id="login_button" className={styles.button} onClick={connectWallet}>
                Sign in with MetaMask
                </button> : 
                <button id="login_button" className={styles.button} onClick={disconnectWallet}>
                Disconnect
                </button>            
            }
        </>
    )
}

export default WalletConnectButton;