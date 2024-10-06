// telegram-web-app/src/components/LaunchTokens.js
import React, { useState } from "react";
import { ethers } from "ethers";

const LaunchTokens = () => {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [initialSupply, setInitialSupply] = useState("");
  const [status, setStatus] = useState("");
  const [gamification, setGamification] = useState({ points: 0, level: 1 });

  const handleCreateToken = async () => {
    if (!tokenName || !tokenSymbol || !initialSupply) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      // Initialize WalletConnect Provider
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();

      // Vortex Token Contract ABI
      const VortexTokenABI = [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address to, uint amount) returns (bool)",
        "function deploy(string memory name, string memory symbol, uint256 initialSupply, address owner)",
        // Add other necessary function ABIs
      ];

      // Replace with your deployed contract address
      const vortexTokenAddress = process.env.REACT_APP_VORTEX_TOKEN_ADDRESS;
      const vortexToken = new ethers.Contract(
        vortexTokenAddress,
        VortexTokenABI,
        signer
      );

      // Create Token Transaction
      const tx = await vortexToken.deploy(
        tokenName,
        tokenSymbol,
        ethers.utils.parseUnits(initialSupply, 18),
        await signer.getAddress()
      );

      setStatus("Transaction sent. Waiting for confirmation...");

      await tx.wait();

      setStatus("Token created successfully!");

      // Gamification: Award points for creating a token
      setGamification((prev) => ({ ...prev, points: prev.points + 10 }));
    } catch (error) {
      console.error(error);
      setStatus("Token creation failed.");
    }
  };

  return (
    <div className="launch-tokens">
      <h2>Create Token & Borrow Liquidity</h2>
      <input
        type="text"
        placeholder="Token Name"
        value={tokenName}
        onChange={(e) => setTokenName(e.target.value)}
      />
      <input
        type="text"
        placeholder="Token Symbol"
        value={tokenSymbol}
        onChange={(e) => setTokenSymbol(e.target.value)}
      />
      <input
        type="number"
        placeholder="Initial Supply"
        value={initialSupply}
        onChange={(e) => setInitialSupply(e.target.value)}
      />
      <button onClick={handleCreateToken}>Create Token</button>
      <p>{status}</p>
      <div className="gamification">
        <h3>Gamification</h3>
        <p>Points: {gamification.points}</p>
        <p>Level: {gamification.level}</p>
      </div>
    </div>
  );
};

export default LaunchTokens;
