const FabricCAServices = require('fabric-ca-client');
const { Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const ccpPath = path.resolve('/home/kraken/fabric/fabric-samples/test-network/organizations/peerOrganizations/org2.example.com', 'connection-org2.json');
const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
const ccp = JSON.parse(ccpJSON);

async function registerUser() {
    try {
        const caURL = ccp.certificateAuthorities['ca.org2.example.com'].url;
        const ca = new FabricCAServices(caURL);

        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);

        const userIdentity = await wallet.get('voter1');
        if (userIdentity) {
            console.log('✅ Voter1 already exists in the wallet');
            return;
        }

        // Get admin identity
        const adminIdentity = await wallet.get('admin');
        if (!adminIdentity) {
            console.error('❌ Admin identity does not exist. Enroll admin first.');
            return;
        }

        const provider = wallet.getProviderRegistry().getProvider(adminIdentity.type);
        const adminUser = await provider.getUserContext(adminIdentity, 'admin');

        const secret = await ca.register({
            affiliation: '',
            enrollmentID: 'voter1',
            role: 'client'
        }, adminUser);

        const enrollment = await ca.enroll({
            enrollmentID: 'voter1',
            enrollmentSecret: secret
        });

        const x509Identity = {
            credentials: {
                certificate: enrollment.certificate,
                privateKey: enrollment.key.toBytes(),
            },
            mspId: 'Org2MSP',
            type: 'X.509',
        };

        await wallet.put('voter1', x509Identity);
        console.log('✅ Successfully registered and enrolled voter1');

    } catch (error) {
        console.error(`❌ Failed to register user: ${error.message}`);
    }
}

registerUser();
