/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Deterministic JSON.stringify()
const stringify  = require('json-stringify-deterministic');
const sortKeysRecursive  = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');

class VoteCasting extends Contract {

    async InitLedger(ctx) {
        const parties = [
        //     {
        //         ID: 'party1',
        //         Symbol: 'Symbol1',
        //         Leader: 'Leader1',
        //         Votes: 0,
        //     },
        //     {
        //         ID: 'party2',
        //         Symbol: 'Symbol2',
        //         Leader: 'Leader2',
        //         Votes: 0,
        //     },
        //     {
        //         ID: 'party3',
        //         Symbol: 'Symbol3',
        //         Leader: 'Leader3',
        //         Votes: 0,
        //     },
        //     {
        //         ID: 'party4',
        //         Symbol: 'Symbol4',
        //         Leader: 'Leader4',
        //         Votes: 0,
        //     },
        //     {
        //         ID: 'party5',
        //         Symbol: 'Symbol5',
        //         Leader: 'Leader5',
        //         Votes: 0,
        //     },
        //     {
        //         ID: 'party6',
        //         Symbol: 'Symbol6',
        //         Leader: 'Leader6',
        //         Votes: 0,
        //     },
        ];

        for (const party of parties) {
            party.docType = 'party';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(party.ID, Buffer.from(stringify(sortKeysRecursive(party))));
        }
    }

    // CreateAsset issues a new asset to the world state with given details.
    async CreateParty(ctx, id, symbol, leader) {
        const exists = await this.PartyExists(ctx, id);
        if (exists) {
            throw new Error(`The party ${id} already exists`);
        }

        const party = {
            ID: id,
            Symbol: symbol,
            Leader: leader,
            Votes:0
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(party))));
        return JSON.stringify(party);
    }

    // ReadAsset returns the asset stored in the world state with given id.
    async ReadParty(ctx, id) {
        const partyJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!partyJSON || partyJSON.length === 0) {
            throw new Error(`The party ${id} does not exist`);
        }
        console.log(partyJSON);
        return partyJSON.toString();
    }

    // UpdateAsset updates an existing asset in the world state with provided parameters.
    async UpdateParty(ctx, id, symbol,leader) {
        const exists = await this.PartyExists(ctx, id);
        if (!exists) {
            throw new Error(`The party ${id} does not exist`);
        }

        // overwriting original asset with new asset
        const updatedParty = {
            ID: id,
            Symbol: symbol,
            Leader: leader,
            Votes:exists.Votes
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        return ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(updatedParty))));
    }

    // DeleteAsset deletes an given asset from the world state.
    async DeleteParty(ctx, id) {
        const exists = await this.PartyExists(ctx, id);
        if (!exists) {
            throw new Error(`The party ${id} does not exist`);
        }
        return ctx.stub.deleteState(id);
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async PartyExists(ctx, id) {
        const partyJSON = await ctx.stub.getState(id);
        return partyJSON && partyJSON.length > 0;
    }

    // TransferAsset updates the owner field of asset with given id in the world state.
    async TransferParty(ctx, id, newLeader) {
        const partyString = await this.ReadParty(ctx, id);
        const party = JSON.parse(partyString);
        const oldLeader = party.Leader;
        party.Leader = newLeader;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(party))));
        return oldLeader;
    }

    // GetAllAssets returns all assets found in the world state.
    async GetResults(ctx) {
        const allResults = [];
        // range query with empty string for startKey and endKey does an open-ended query of all assets in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push(record);
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }

    async CastVote(ctx,id){
        const partyString = await this.ReadParty(ctx, id);
        const party = JSON.parse(partyString);
        party.Votes = party.Votes+1;
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(party))));
        return party.Votes;
    }
}

module.exports = VoteCasting;