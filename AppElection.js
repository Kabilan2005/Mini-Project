const grpc = require('@grpc/grpc-js');
// Communication between the client and the Gateway using Google's high performance RPC Remote Procedure Calls (is Stateful)
// Using which a client can request to perform endorsements,submission and query bc state
// Cross Platform and Well defined Contracts .proto(service files) Requires gateway endpoint address is the address of a peer, which provides the Fabric Gateway service to establish Connection.

const { connect, hash, signers } = require('@hyperledger/fabric-gateway');
// Functions for connection

const crypto = require('node:crypto');
// For Crypto dependent Methods and Functions

const fs = require('node:fs/promises');
// For accessing from the OS's File System Promises are used to eliminate callback hell that is to write a more cleaner code

const { TextDecoder } = require('node:util');
const path = require('node:path');

const express = require('express');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Path to crypto materials.
// Here for TLS connection for gRPC TLS certificates are neededv contains ->/users /msp /peers /ca
const cryptoPath = envOrDefault(
    'CRYPTO_PATH',
    path.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'test-network',
        'organizations',
        'peerOrganizations',
        'org1.example.com'
    )
);

// Path to user private key directory.
const keyDirectoryPath = envOrDefault(
    'KEY_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@org1.example.com',
        'msp',
        'keystore'
    )
);

// Path to user certificate directory.
const certDirectoryPath = envOrDefault(
    'CERT_DIRECTORY_PATH',
    path.resolve(
        cryptoPath,
        'users',
        'User1@org1.example.com',
        'msp',
        'signcerts'
    )
);

const channelName = envOrDefault('CHANNEL_NAME', 'mychannel');
const chaincodeName = envOrDefault('CHAINCODE_NAME', 'basic');
const mspId = envOrDefault('MSP_ID', 'Org1MSP');


// The above crypto materials are necessary say for eg eventhough performing only querying state 
// Everything is carried out as a proposal from the client to the peer

// Path to peer tls certificate.
const tlsCertPath = envOrDefault(
    'TLS_CERT_PATH',
    path.resolve(cryptoPath, 'peers', 'peer0.org1.example.com', 'tls', 'ca.crt')
);

// This is necessary for securing gRPC connections.

// gRPC Connections Establishment Requirements
// Endpoint address of a gateway peer
const peerEndpoint = envOrDefault('PEER_ENDPOINT', 'localhost:7051');

// Gateway peer SSL host name override.
// The following is the host name to which gateway connects.
const peerHostAlias = envOrDefault('PEER_HOST_ALIAS', 'peer0.org1.example.com');

const utf8Decoder = new TextDecoder();
// Decoder for converting binary responses from gRPC to human readable format (unit8Array) 

let contract;
let pollingActive = false;
let authenticated = false;

async function main() {
    displayInputParameters();

    // The gRPC client connection should be shared by all Gateway connections to this endpoint since there are connection overheads.
    const client = await newGrpcConnection();

    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
        hash: hash.sha256,
        // Default timeouts for different gRPC calls 
        // Creating a gateway using idenity, signer and sha256 for sending a transcation aa a proposal to assure integrity.

        // Setting deadlines for recieving response so that appropriate actions can be taken
        evaluateOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        endorseOptions: () => {
            return { deadline: Date.now() + 15000 }; // 15 seconds
        },
        submitOptions: () => {
            return { deadline: Date.now() + 5000 }; // 5 seconds
        },
        commitStatusOptions: () => {
            return { deadline: Date.now() + 60000 }; // 1 minute
        },
    });

    try {
        // Get a network instance representing the channel where the smart contract is deployed.
        const network = gateway.getNetwork(channelName);

        // Get the smart contract from the network to interact with the network.
        contract = network.getContract(chaincodeName);

        await InitLedger(contract);

    } catch (err) {
        console.error("❌ Blockchain Initialization Error:", err);
    } finally {
        // gateway.close();
        // client.close();
    }
}

main().catch((error) => {
    console.error('******** FAILED to run the application:', error);
    process.exitCode = 1;
});




// For new gRPC connection instance creation (client) 
async function newGrpcConnection() {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

// Helper function that reads your signcerts directory and builds the identity structure needed by Fabric.
async function newIdentity() {
    const certPath = await getFirstDirFileName(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

// To read Private Key File the only file in the keystore dir.
// To read the only Certificate for that user
async function getFirstDirFileName(dirPath) {
    const files = await fs.readdir(dirPath);
    const file = files[0];
    if (!file) {
        throw new Error(`No files in directory: ${dirPath}`);
    }
    return path.join(dirPath, file);
}

// Function to use fs/promises to read the private key file and create a signer object that can sign transaction proposals.
async function newSigner() {
    const keyPath = await getFirstDirFileName(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

async function InitLedger(contract) {
    console.log(
        '\n--> Submit Transaction: InitLedger, function creates the initial set of Parties on the ledger'
    );

    await contract.submitTransaction('InitLedger');

    console.log('*** Transaction committed successfully');
}

let votes;

// Printing the Current state of the ledger
async function GetAllVotes(contract) {
    console.log(
        '\n--> Evaluate Transaction: GetAllVotes, function returns all the current assets on the ledger'
    );

    const resultBytes = await contract.evaluateTransaction('GetResults');

    const resultJson = utf8Decoder.decode(resultBytes);
    votes = JSON.parse(resultJson);
}

// Casting a Vote to a Party
async function castVote(contract, id) {
    console.log(
        '\n--> Submit Transaction: CastVote, function cast vote to a party on the ledger'
    );
    const votes = await contract.submitTransaction('CastVote', id);
    const VotesCount = utf8Decoder.decode(votes);
    console.log(VotesCount);
}

// Biometric simulation

app.post('/auth', (req, res) => {
    console.log("Simulating biometric verification...");
    setTimeout(() => {
        authenticated = true;
        res.json({ status: 'success', message: 'Authority Verified' });
    }, 10000);
});

app.post('/add-party', async (req, res) => {
    if (!authenticated) return res.status(403).json({ error: 'Unauthorized' });
    const { id, symbol, leader } = req.body;
    try {
        await contract.submitTransaction('CreateParty', id, symbol, leader);
        res.json({ status: 'success', message: `Party ${id} added` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/start-poll', (req, res) => {
    if (!authenticated) return res.status(403).json({ error: 'Unauthorized' });
    pollingActive = true;
    res.json({ status: 'Polling Started' });
});

app.post('/stop-poll', (req, res) => {
    if (!authenticated) return res.status(403).json({ error: 'Unauthorized' });
    pollingActive = false;
    res.json({ status: 'Polling Stopped' });
});

app.get('/get-message', (req, res) => {
    console.log(votes);
    GetAllVotes(contract);
    res.json(votes);
});

app.post('/cast-vote', async (req, res) => {
    if (!pollingActive) return res.status(403).json({ error: 'Polling not active' });
    const id = req.body;
    try {
        const result = await contract.submitTransaction('CastVote', id.id);
        res.json({ message: `Vote cast for ${id.id}` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, '0.0.0.0',() => {
    console.log(`Server running at http://localhost:${PORT}`);
});

/**
 * displayInputParameters() will print the global scope parameters used by the main driver routine.
 */
function displayInputParameters() {
    console.log(`channelName:       ${channelName}`);
    console.log(`chaincodeName:     ${chaincodeName}`);
    console.log(`mspId:             ${mspId}`);
    console.log(`cryptoPath:        ${cryptoPath}`);
    console.log(`keyDirectoryPath:  ${keyDirectoryPath}`);
    console.log(`certDirectoryPath: ${certDirectoryPath}`);
    console.log(`tlsCertPath:       ${tlsCertPath}`);
    console.log(`peerEndpoint:      ${peerEndpoint}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
    console.log(`peerHostAlias:     ${peerHostAlias}`);
}

// Finding Environment Variable or Setting to Default
function envOrDefault(key, defaultValue) {
    return process.env[key] || defaultValue;
}