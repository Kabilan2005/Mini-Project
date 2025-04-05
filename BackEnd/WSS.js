const WebSocket = require('ws');
const Crypt = require('crypto');
const rl = require('readline');

const peers = new Map();
const receivedMessages = new Set();
const connectedAddrs = new Set();

const port = process.argv[2] || 5000; // Cmd 2nd arg port number defaults to 5000
const knownPeer = process.argv[3]; // Cmd 3rd arg ip

const server = new WebSocket.Server({ port }, () => {
    console.log(`WebSocket server running on ws://localhost:${port}`);
});

const connectToPeer = (address) => {
    if (connectedAddrs.has(address)) return;
    const ws = new WebSocket(address, {
        headers: {
            'x-peer-port': port 
        }
    });


    ws.on("open", () => {
        console.log(`Connected to peer: ${knownPeer}`);
        peers.add(ws);
    });

    ws.on("message", (message) => {
        // const msgHash = crypto.createHash("sha256").update(message).digest("hex");
        // if (receivedMessages.has(msgHash)) return;
        peers.set(ws, address);
        connectedAddrs.add(address);
        receivedMessages.add(message);
        console.log(`Received from peer ${knownPeer}:`, message.toString());
        broadcast(message, ws);
    });

    ws.on("close", () => {
        console.log(`Disconnected from peer: ${knownPeer}`);
        peers.delete(ws);
        connectedAddrs.delete(address);
        peers.delete(ws);
    });

    ws.on("error", (err) => {
        console.error(`Error connecting to ${knownPeer}:`, err.message);
    });
}

server.on("connection", (ws, req) => {
    console.log("New peer connected from:", req.socket.remoteAddress);

    const ip = req.socket.remoteAddress.replace("::ffff:", "");
    const peerPort = req.headers['x-peer-port'];
    const remoteAddr = `ws://${ip}:${peerPort}`;

    peers.set(ip, remoteAddr);


    if (peerPort && !connectedAddrs.has(remoteAddr)) {
        connectToPeer(remoteAddr);
    }

    ws.on("message", (message) => {
        // const msgHash = crypto.createHash("sha256").update(message).digest("hex");
        // if (receivedMessages.has(msgHash)) return;
        receivedMessages.add(message);
        console.log("Received:", message.toString());
        broadcast(message, ws);
    });

    ws.on("close", () => {
        console.log("Peer disconnected.");
        peers.delete(ws);
        connectedAddrs.delete(remoteAddr);
    });
});

function broadcast(message, sender) {
    peers.forEach((peer) => {
        if (peer !== sender && peer.readyState === WebSocket.OPEN) {
            peer.send(message);
        }
    });
}

if (knownPeer) {
    connectToPeer(knownPeer);
}

process.stdin.on("data", (data) => {
    const message = data.toString().trim();
    broadcast(message, null);
});
