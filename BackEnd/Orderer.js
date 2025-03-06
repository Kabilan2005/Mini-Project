const mongoose = require("mongoose");
const { Wallets, Gateway } = require("fabric-network");
const fs = require("fs");
const path = require("path");
const { Vote } = require("./Mongo"); // Import MongoDB Vote model

// 🔹 Use your MongoDB Atlas URI
const MONGO_URI = "mongodb+srv://kabilanmamk:17293869@cluster0.uemlp.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// 🔹 Hyperledger Fabric Connection
const ccpPath = path.resolve('/home/kraken/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com', 'connection-org2.json'); // Adjust if needed
const ccpJSON = fs.readFileSync(ccpPath, "utf8");
const ccp = JSON.parse(ccpJSON);

// 🔹 Connect to MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        console.log("✅ Orderer connected to MongoDB Atlas");
    } catch (error) {
        console.error("❌ MongoDB Connection Error:", error.message);
        process.exit(1);
    }
}

// 🔹 Fetch votes from MongoDB
async function fetchVotes() {
    try {
        const votes = await Vote.find();
        console.log("\n--- Votes from MongoDB ---");
        console.log(votes);
        return votes;
    } catch (error) {
        console.error("❌ Error fetching votes:", error.message);
        return [];
    }
}

// 🔹 Submit votes to Hyperledger Fabric
async function submitVotesToFabric(votes) {
    try {
        const walletPath = path.join(process.cwd(), "../wallet");
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const identity = await wallet.get("admin");
        if (!identity) {
            throw new Error("❌ Admin identity not found. Run enrollAdmin.js first.");
        }

        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: "admin",
            discovery: { enabled: true, asLocalhost: true },
        });

        const network = await gateway.getNetwork("mychannel");
        const contract = network.getContract("voteContract");

        for (const vote of votes) {
            const { voterID, candidate } = vote;
            console.log(`🔗 Submitting vote: ${voterID} -> ${candidate}`);
            await contract.submitTransaction("CastVote", voterID, candidate);
        }

        console.log("✅ Successfully submitted all votes to the blockchain.");
        await gateway.disconnect();
    } catch (error) {
        console.error("❌ Failed to submit votes to blockchain:", error.message);
    }
}

async function startAutomation() {
    await connectDB();
    console.log("🔍 Orderer is fetching votes every 30 seconds...");

    setInterval(async () => {
        console.log("\n🔄 Fetching and submitting latest votes...");
        const votes = await fetchVotes();
        console.log(votes);
        if (votes.length > 0) {
            await submitVotesToFabric(votes);
        } else {
            console.log("⚠️ No new votes to submit.");
        }
    }, 30000); }

startAutomation();

