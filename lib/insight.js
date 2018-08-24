'use strict';

var request = require('request');

var litecore = require('litecore-lib');
var _ = litecore.deps._;

var $ = litecore.util.preconditions;
var Address = litecore.Address;
var JSUtil = litecore.util.js;
var Networks = litecore.Networks;
var Transaction = litecore.Transaction;
var UnspentOutput = Transaction.UnspentOutput;
var AddressInfo = require('./models/addressinfo');


/**
 * Allows the retrieval of information regarding the state of the blockchain
 * (and broadcasting of transactions) from/to a trusted Insight server.
 * @param {string=} url the url of the Insight server
 * @param {Network=} network whether to use livenet or testnet
 * @constructor
 */
function Insight(url, network) {
  if (!url && !network) {
    return new Insight(Networks.defaultNetwork);
  }
  if (Networks.get(url)) {
    network = Networks.get(url);
    if (network === Networks.livenet) {
      url = 'https://insight.litecore.io';
    } else {
      url = 'https://testnet.litecore.io';
    }
  }
  JSUtil.defineImmutable(this, {
    url: url,
    network: Networks.get(network) || Networks.defaultNetwork
  });
  this.request = request;
  return this;
}

/**
 * @callback Insight.GetTransactionCallback
 * @param {Error} err
 * @param {Object} transaction
 */

/**
 * Get transaction by txid
 * @param {string} txid
 * @param {GetTransactionCallback} callback
 */
Insight.prototype.getTransaction = function(txid, callback) {
  $.checkArgument(_.isFunction(callback));
  $.checkArgument(_.isString(txid));
  $.checkArgument(txid.length === 64);

  this.requestGet('/api/tx/' + txid, function(err, res, body) {
    if (err || res.statusCode !== 200) {
      return callback(err || res);
    }
    var tx = JSON.parse(body);

    return callback(null, tx);
  });
};

/**
 * @callback Insight.GetUtxosCallback
 * @param {Error} err
 * @param {Array.UnspentOutput} utxos
 */

/**
 * Retrieve a list of unspent outputs associated with an address or set of addresses
 * @param {Address|string|Array.Address|Array.string|object} params Addresses or JSON object with addresses and [minconf]
 * @param {GetUtxosCallback} callback
 */
Insight.prototype.getUtxos = function(params, callback) {
    $.checkArgument(_.isFunction(callback));

    var addresses, minconf

    if(params.addresses !== undefined || params.address !== undefined) {
        addresses = params.addresses || params.address;
    } else {
        addresses = params;
    }

    if(params.minconf !== undefined) {
        minconf = params.minconf;
    } else {
        minconf = 0;
    }

    if (!_.isArray(addresses)) {
        addresses = [addresses];
    }
    addresses = _.map(addresses, function(address) {
        return new Address(address);
    });

    this.requestPost('/api/addrs/utxo', {
        addrs: _.map(addresses, function(address) {
            return address.toString();
        }).join(',')
    }, function(err, res, unspent) {
        if (err || res.statusCode !== 200) {
            return callback(err || res);
        }
        try {
            var filtered = unspent.filter((task) => task.confirmations >= minconf );
            unspent = _.map(filtered, UnspentOutput);


        } catch (ex) {
            if (ex instanceof litecore.errors.InvalidArgument) {
                return callback(ex);
            }
        }

        return callback(null, unspent);
    });
};

/**
 * @callback Insight.BroadcastCallback
 * @param {Error} err
 * @param {string} txid
 */

/**
 * Broadcast a transaction to the litecoin network
 * @param {transaction|string} transaction
 * @param {BroadcastCallback} callback
 */
Insight.prototype.broadcast = function(transaction, callback) {
  $.checkArgument(JSUtil.isHexa(transaction) || transaction instanceof Transaction);
  $.checkArgument(_.isFunction(callback));
  if (transaction instanceof Transaction) {
    transaction = transaction.serialize();
  }

  this.requestPost('/api/tx/send', {
    rawtx: transaction
  }, function(err, res, body) {
    if (err || res.statusCode !== 200) {
      return callback(err || body);
    }
    return callback(null, body ? body.txid : null);
  });
};

/**
 * @callback Insight.AddressCallback
 * @param {Error} err
 * @param {AddressInfo} info
 */

/**
 * Retrieve information about an address
 * @param {Address|object} params Address or JSON object with address, [from], and [to]
 * @param {AddressCallback} callback
 */
Insight.prototype.address = function(params, callback) {
  $.checkArgument(_.isFunction(callback));

  var address
  if(params.address !== undefined) {
    address = new Address(params.address);
  } else {
    address = new Address(params);
  }

  var queryString = ''
  if (params.from !== undefined && !isNaN(params.from) && params.from >= 0){
      queryString += '&from=' + params.from;
  }

  if (params.to !== undefined && !isNaN(params.to) && params.to > 0){
      queryString += '&to=' + params.to;
  }

  if (queryString) queryString = '?' + queryString;

  this.requestGet('/api/addr/' + address.toString() + queryString, function(err, res, body) {
    if (err || res.statusCode !== 200) {
      return callback(err || body);
    }
    var info;
    try {
      info = AddressInfo.fromInsight(body);
    } catch (e) {
      if (e instanceof SyntaxError) {
        return callback(e);
      }
      throw e;
    }
    return callback(null, info);
  });
};

/**
 * @callback Insight.GetBlocksCallback
 * @param {Error} err
 * @param {Object} blocks
 */

/**
 * Get recent blocks
 * @param {GetBlocksCallback} callback
 *  */
Insight.prototype.getBlocks = function(callback) {
    $.checkArgument(_.isFunction(callback));

    this.requestGet('/api/blocks/', function(err, res, body) {
        if (err || res.statusCode !== 200) {
            return callback(err || res);
        }
        var blocks = JSON.parse(body);

        return callback(null, blocks);
    });
};

/**
 * @callback Insight.GetBlockCallback
 * @param {Error} err
 * @param {Object} blocks
 */

/**
 * Get block by blockhash
 * @param {string} blockhash
 * @param {GetBlockCallback} callback
 *  */
Insight.prototype.getBlock = function(blockhash, callback) {
    $.checkArgument(_.isFunction(callback));
    $.checkArgument(_.isString(blockhash));
    $.checkArgument(blockhash.length === 64);

    this.requestGet('/api/block/' + blockhash, function(err, res, body) {
        if (err || res.statusCode !== 200) {
            return callback(err || res);
        }
        var block = JSON.parse(body);

        return callback(null, block);
    });
};

/**
 * Internal function to make a post request to the server
 * @param {string} path
 * @param {?} data
 * @param {function} callback
 * @private
 */
Insight.prototype.requestPost = function(path, data, callback) {
  $.checkArgument(_.isString(path));
  $.checkArgument(_.isFunction(callback));
  this.request({
    method: 'POST',
    url: this.url + path,
    json: data
  }, callback);
};

/**
 * Internal function to make a get request with no params to the server
 * @param {string} path
 * @param {function} callback
 * @private
 */
Insight.prototype.requestGet = function(path, callback) {
  $.checkArgument(_.isString(path));
  $.checkArgument(_.isFunction(callback));
  this.request({
    method: 'GET',
    url: this.url + path
  }, callback);
};

module.exports = Insight;
