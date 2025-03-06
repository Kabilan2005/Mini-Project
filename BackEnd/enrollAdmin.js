const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve('/home/kraken/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com', 'connection-org2.json'); // Ensure correct path
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

async function enrollAdmin() {
    try {
        const caInfo = ccp.certificateAuthorities['ca.org2.example.com'];
        const caTLSCACerts = caInfo.tlsCACerts.pem;
        const ca = new FabricCAServices(caInfo.url, { trustedRoots: caTLSCACerts, verify: false }, caInfo.caName);

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`🔍 Checking wallet at: ${walletPath}`);

        const identity = await wallet.get('admin');
        if (identity) {
            console.log('✅ Admin identity already exists in the wallet');
            return;
        }

        console.log('🚀 Enrolling admin...');
        const enrollment = await ca.enroll({ enrollmentID: 'admin', enrollmentSecret: 'adminpw' });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org2MSP',  
            // Ensure this matches your connection profile
            type: 'X.509',
        };

        await wallet.put('admin', x509Identity);
        console.log('✅ Successfully enrolled admin and stored credentials in the wallet');
    } catch (error) {
        console.error(`❌ Failed to enroll admin: ${error.message}`);
    }
}

enrollAdmin();
