const WebSocket = require('ws');

const wss = new WebSocket.Server({port : 5001});

const peers = new Set();WSS.js

wss.on('connection', (ws) => {
    console.log('New peer connected');
    peers.add(ws);

    ws.on('message', (message) => {
        console.log(`Received: ${message}`);
        peers.forEach(peer => {
            if (peer !== ws && peer.readyState === WebSocket.OPEN) {
                peer.send(message.toString());
            }
        });
    });

    ws.on('close', () => {
        console.log('Peer disconnected');
        peers.delete(ws);
    });
});

console.log("WebSocket Server running on ws://localhost:5001");
