const express = require("express");
const mongoose = require("mongoose");
const { connectDB, Vote, Key } = require('./Mongo');
const cors = require("cors");
const fs = require("fs");
const WebSocket = require('ws');
const { mutex } = require('async-mutex');
const path = require("path");
const { Wallets, Gateway } = require("fabric-network");

// ✅ Choose only one network (Org1 or Org2)
const ccpPath = path.resolve('/home/kraken/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com', "connection-org2.json");
const ccpJSON = fs.readFileSync(ccpPath, "utf8");
const ccp = JSON.parse(ccpJSON);

const app = express();
app.use(cors());
app.use(express.json());

const port = 5000;
connectDB();

// ✅ WebSocket Setup
const wss = new WebSocket.Server({ port: 5001 });
const peers = new Set();

wss.on("connection", (ws) => {
    console.log("New peer connected");
    peers.add(ws);

    ws.on("message", async (message) => {
        const voteData = JSON.parse(message);
        await handleIncomingVote(voteData);
    });

    ws.on("close", () => {
        console.log("Peer disconnected");
        peers.delete(ws);
    });
});

const BroadcastVote = async (voteData) => {
    const msg = JSON.stringify(voteData);
    peers.forEach((peer) => {
        if (peer.readyState === WebSocket.OPEN) {
            peer.send(msg);
        }
    });
};

const handleIncomingVote = async (voteData) => {
    await mutex.runExclusive(async () => {
        const { voterID, candidate } = voteData;
        const existingVote = await Vote.findOne({ voterID });
        if (!existingVote) {
            const newVote = new Vote({ voterID, candidate });
            await newVote.save();
            console.log("Stored vote from peer:", voteData);
            BroadcastVote(voteData);
        }
    });
};

// ✅ Hyperledger Fabric Transaction Function
async function submitVote(voterID, candidate) {
    try {
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "admin",
            discovery: { enabled: true, asLocalhost: true },
        });

        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("voteContract");

        await contract.submitTransaction("CastVote", voterID, candidate);
        console.log(`✅ Vote for ${candidate} added to blockchain.`);
        await gateway.disconnect();

        return { status: "success", message: "Vote added to blockchain" };
    } catch (error) {
        console.error(`❌ Error submitting transaction: ${error}`);
        return { status: "error", message: error.toString() };
    }
}

// ✅ Voting Endpoint (Saves in MongoDB & Fabric)
app.post("/vote/cast", async (req, res) => {
    const { voterID, candidate } = req.body;

    if (!voterID || !candidate) {
        return res.status(400).json({ message: "All fields are required!" });
    }

    try {
        const fabricResponse = await submitVote(voterID, candidate);

        // ✅ Save vote to MongoDB
        const newVote = new Vote({ voterID, candidate });
        await newVote.save();
        BroadcastVote(newVote);

        res.status(201).json({ message: "Vote cast successfully!", fabricResponse });

    } catch (error) {
        console.error("❌ Error storing vote:", error);
        res.status(500).json({ message: "Error storing vote.", error: error.message });
    }
});

// ✅ Fetch Entire Blockchain
app.get("/blockchain", async (req, res) => {
    try {
        const walletPath = path.join(process.cwd(), "wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "admin",
            discovery: { enabled: true, asLocalhost: true },
        });

        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("voteContract");

        console.log("📦 Fetching all votes from blockchain...");
        const result = await contract.evaluateTransaction("GetAllVotes");

        const votes = JSON.parse(result.toString());
        console.log("\n--- 🔗 Entire Blockchain Votes ---");
        console.log(JSON.stringify(votes, null, 2));

        await gateway.disconnect();
        res.status(200).json(votes);

    } catch (error) {
        console.error("❌ Error fetching blockchain:", error);
        res.status(500).json({ message: "Error retrieving blockchain data.", error: error.message });
    }
});

// ✅ Root Endpoint
app.get("/", async (req, res) => {
    res.status(200).json({ message: "✅ Server Running" });
});

// ✅ Start Server
app.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});
