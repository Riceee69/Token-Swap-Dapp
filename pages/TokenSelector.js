import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/TokenSelector.module.css";

const TokenSelector = ({swapToken, setSwapToken}) => {
  const tokens = useRef([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filteredTokens, setFilteredTokens] = useState([]);

  useEffect(() => {
    const fetchTokens = async () => {
    const response = await fetch('https://tokens.coingecko.com/uniswap/all.json');
    const data = await response.json();
    tokens.current = data.tokens;
    setFilteredTokens(tokens.current);
    }

    fetchTokens();
  }, [])

  const setSelectedToken = (token) => {
    setSwapToken(token);
    setIsModalOpen(false);
  }

  const searchToken = (event) => {
     const filterTokens = tokens.current.filter(token => {
      return token.name.toLowerCase().includes(event.target.value.toLowerCase())
     })

     setFilteredTokens(filterTokens);
  }

  return (
    <div>
        <button className={styles.selectTokenBtn} onClick={() => setIsModalOpen(true)}>
          {Object.keys(swapToken).length > 0?
          <>
          <img src={swapToken.logoURI} alt={swapToken.symbol} />
          <p style={{marginLeft: "8px"}}>{swapToken.symbol}</p>
          </> 
          :"Select a Token"}
        </button>

      {/* Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => {
          setIsModalOpen(false)
          setFilteredTokens(tokens.current)
        }}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Select a Token</h3>
              <button className={styles.closeBtn} onClick={() => {
                setIsModalOpen(false)
                setFilteredTokens(tokens.current)
              }}>
                &times;
              </button>
            </div>
            <input type="text" className={styles.tokenInput} placeholder="Search tokens..." 
              onChange={searchToken}
            />
            <ul className={styles.tokenList}>
              {filteredTokens.map((token) => (
                <li key={token.address} className={styles.tokenItem} 
                  onClick={() => {
                    setSelectedToken(token)
                    setFilteredTokens(tokens.current)
                  }}
                >
                  <img src={token.logoURI} alt={token.symbol} />
                  {token.name}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenSelector;
