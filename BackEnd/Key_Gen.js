const crypt=require('crypto');
const E_C=require('elliptic').ec;

const ec=new E_C('secp256k1');

const gen_keys=(voterID)=>
{
    const hash=crypt.createHash('sha256').update(voterID).digest('hex');

    const Private_Key=ec.keyFromPrivate(hash);
    const Public_Key=ec.keyFromPublic(hash);

    
}