// Import required libraries
import { ethers } from "ethers";   // interacts with the blockchain
import fs from "fs";               // reads local files (like ABI)
import dotenv from "dotenv";       // loads .env variables
dotenv.config();

// ------------------------------------------------------------
// Load the ABI file (this describes the contract's functions)
// ------------------------------------------------------------
const ABI = JSON.parse(fs.readFileSync("./abi.json", "utf8"));

// ------------------------------------------------------------
// Connect to the blockchain
// - RPC_URL: your Sepolia endpoint (Infura, Alchemy, etc.)
// - PRIVATE_KEY: wallet that will send transactions
// ------------------------------------------------------------
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ------------------------------------------------------------
// Connect to the deployed PriceAlert contract
// ------------------------------------------------------------
const contract = new ethers.Contract(
  process.env.CONTRACT_ADDRESS, // address from Remix deployment
  ABI,                          // ABI loaded above
  wallet                        // wallet used to sign transactions
);

// ------------------------------------------------------------
// Threshold to check against (BTC/USD uses 8 decimals)
// Example: 30000 → 30000 * 10^8
// ------------------------------------------------------------
const THRESHOLD = ethers.parseUnits("30000", 8);

// ------------------------------------------------------------
// Function that:
// 1. Sends a checkPrice() transaction
// 2. Waits for it to be mined
// 3. Reads and prints any emitted events
// ------------------------------------------------------------
async function runCheck() {
  try {
    // Call the contract function (this sends a transaction)
    const tx = await contract.checkPrice(THRESHOLD);
    console.log("Checking price... tx:", tx.hash);

    // Wait for the transaction to be mined
    const receipt = await tx.wait();

    // Loop through logs to find our events
    for (const log of receipt.logs) {
      try {
        // Try parsing the log as our contract's event
        const parsed = contract.interface.parseLog(log);

        console.log(`\nEVENT → ${parsed.name}`);
        console.log(parsed.args); // show threshold + currentPrice
      } catch {
        // Ignore logs from other contracts (if any)
      }
    }

  } catch (err) {
    // Print any error message
    console.error("Error:", err.message);
  }
}

// ------------------------------------------------------------
// Start the bot
// Checks every 15 seconds
// ------------------------------------------------------------
console.log("🔥 Price Alert Bot Running...\n");
setInterval(runCheck, 15000);
