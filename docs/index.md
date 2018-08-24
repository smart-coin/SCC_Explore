# Explorers
The `litecore-explorers` module provides a convenient interface to retrieve unspent transaction outputs and broadcast transactions to the Litecoin network via blockchain explorers.

## Installation
Explorers is implemented as a separate module.

For node projects:

```
npm install litecore-explorers --save
```

For client-side projects:

```
bower install litecore-explorers --save
```

## Insight
### Description
`Insight` is a simple agent to perform queries to an Insight blockchain explorer. The default servers are `https://insight.litecore.io` and `https://testnet.litecore.io`, hosted by the Litecoin Foundation. You can (and we strongly suggest you do) run your own insight server. For more information, head to [https://github.com/litecoin-project/insight-api](https://github.com/litecoin-project/insight-api)

There are currently two methods implemented: `getUnspentUtxos` and `broadcast`. The API will grow as features are requested.

#### Retrieving Unspent UTXOs for an Address (or set of)

```javascript
var Insight = require('litecore-explorers').Insight;
var insight = new Insight();

insight.getUnspentUtxos('mLitecoin...', function(err, utxos) {
  if (err) {
    // Handle errors...
  } else {
    // Maybe use the UTXOs to create a transaction
  }
});
```

#### Broadcasting a Transaction

```javascript
var insight = new Insight();
insight.broadcast(tx, function(err, returnedTxId) {
  if (err) {
    // Handle errors...
  } else {
    // Mark the transaction as broadcasted
  }
});
```
