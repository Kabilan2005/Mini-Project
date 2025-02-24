const express = require("express");
const mongoose = require("mongoose"); 
const {connectDB,Vote,Key}=require('./Mongo');
const cors = require("cors");
const fs = require("fs");

function generateKeys(voterID) {
  let privateKey = Buffer.from(voterID).toString('base64');  // Base64 encoding as private key
  let publicKey = Buffer.from(privateKey).toString('hex');   // Hex encoding as public key
  return { privateKey, publicKey };
}

const cryptoKey = "electioncommisionward43"; // Secret key for encryption

function encrypt_server(data) {
  let encrypted = "";
  for (let i = 0; i < data.length; i++) {
      encrypted += String.fromCharCode(data.charCodeAt(i) ^ cryptoKey.charCodeAt(i % cryptoKey.length));
  }
  return Buffer.from(encrypted, "utf-8").toString("base64");
}

function decrypt_server(encryptedData) {
  let decrypted = "";
  let encrypted = Buffer.from(encryptedData, "base64").toString("utf-8"); // Convert from Base64
  for (let i = 0; i < encrypted.length; i++) {
      decrypted += String.fromCharCode(encrypted.charCodeAt(i) ^ cryptoKey.charCodeAt(i % cryptoKey.length));
  }
  return decrypted;
}

const app = express();

app.use(cors());
app.use(express.json());
const port = 5000;

connectDB();

function generateKeys(voterID) {
  let privateKey = Buffer.from(voterID).toString('base64');  // Base64 encoding as private key
  let publicKey = Buffer.from(privateKey).toString('hex');   // Hex encoding as public key
  return { privateKey, publicKey };
}

function encrypt(data, privateKey) {
  let key = privateKey.charCodeAt(0);  
  // Use the first character's ASCII value as the key temporarily
  return data.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ key)  
      // Basic XOR encryption
  ).join('');
}
function decrypt(encryptedData, publicKey) {
  let base64Key = Buffer.from(publicKey, 'hex').toString();  
  // Convert Hex to Base64 to find the private key
  // Sample Encryption is employed Cryptography is employed for higher security in real time implementation
  let key = base64Key.charCodeAt(0);  
  let decryptedBase64 = Buffer.from(encryptedData, 'base64').toString(); 
  let decrypted = decryptedBase64.split('').map(char => 
      String.fromCharCode(char.charCodeAt(0) ^ key)
  ).join('');
  return decrypted;
}

app.post("/vote/cast", async (req, res) => {
  const { voterID, candidate} = req.body;
  let {publicKey,privateKey}=generateKeys(voterID);
  console.log(voterID,candidate,publicKey,privateKey);
  if (!voterID || !candidate) {
    return res.status(400).json({ message: "All fields are required!" });
  }

  try {
    // Encrypting voterID and candidate using private key
    const encryptedVoterID = encrypt(voterID, privateKey);
    const encryptedCandidate = encrypt(candidate, privateKey);

    // Saving encrypted vote to Votes Collection
    const newVote = new Vote({
      voterID: encryptedVoterID,
      candidate: encryptedCandidate,
    });

    console.log(newVote);
    await newVote.save();

    // Saving public key to PublicKeys DB
    // Keys are Generated using openssl and stored in PEM Privacy Enhanced Mail -> Keys File

    // PEM is used to store cryptographic Keys for sending over internet

    server_encypted_voterID=encrypt_server(voterID);
    server_encypted_key=encrypt_server(publicKey);
    
    const newPublicKeyEntry = new Key({
      voterID: server_encypted_voterID,
      publickey: server_encypted_key,
    });
    
    console.log(decrypt_server(server_encypted_voterID));
    await newPublicKeyEntry.save();

    res.status(201).json({ message: "Vote cast successfully!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error storing vote.", error: error.message });
  }
});

app.get("/", async(req,res)=>{
    res.status(201).json({message:"Server Running"});
});

app.listen(port, '0.0.0.0',() => {
    console.log(`Server running on http://localhost:${port}`);
});

