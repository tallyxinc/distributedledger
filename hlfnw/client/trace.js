/**
 * Simple client to listen to blocks and print out their contents.
 */

const FabricSocketClient = require('./lib/FabricSocketClient');
const log4js  = require('log4js');
log4js.configure( require('./config.json').log4js );
const logger  = log4js.getLogger('trace');

logger.info('start');

// get parameters
const API = process.env.API || 'http://localhost:7080';
if(!API){
  throw new Error("fabric-rest endpoint is not set. Please use environment variable API to set it.");
}

const socket = new FabricSocketClient(API);

socket.on('chainblock', function (block) {
  //logger.trace('block', JSON.stringify(block));
  //logger.trace('block', block);

  var proposalpayloadB64 = block.data.data[0].payload.data.actions[0].payload.chaincode_proposal_payload.input;

  var proposalpayload = proposalpayloadB64.toString('ascii');
  //console.log('proposal palyload : ', proposalpayload);

  var rgex = new RegExp('{(.*)');
  var extractStr  = proposalpayload.match(rgex);
  if (extractStr) {
    var txnDataStr = '{' + extractStr[1];
    //console.log('txn data : ', JSON.parse(txnDataStr));  
    var txnData = JSON.parse(txnDataStr);
    console.log('assetId : ', txnData.assetId);  
    console.log('Data : ', JSON.stringify(txnData));  
  }

  /*
  var txndataKey = block.data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].key;

  var txndataValue = block.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value;
  

  logger.trace('TxnId : ', txndataKey);
  logger.trace('TxnData : ', txndataValue);

  */

  /*const extension = block.data.data[0].payload.data.actions[0].payload.action.proposal_response_payload.extension;

  logger.trace('response', extension.response);*/

});

socket.on('connect', function () {
  logger.trace('connect');
});