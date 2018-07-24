/**
 * Simple client to listen to blocks and print out their contents.
 */
var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
const FabricSocketClient = require('./lib/FabricSocketClient');
const log4js  = require('log4js');
log4js.configure( require('./config.json').log4js );
const logger  = log4js.getLogger('ledgereventsvc');
var registerLedgerData = require('./lib/ledgerUtil').registerLedgerData;

logger.info('start');

// get parameters

var notificationhandler = require('./notificationhandler');

var notifyhost = process.env.NOTIFY_TARGET_HOST || 'localhost';
var notifyhostport = process.env.NOTIFY_TARGET_HOST_PORT || '8040';

var notificationenabled = process.env.NOTIFICATION_ENABLED || 'true';

const API_HOST_IP = process.env.API_HOST_IP || 'localhost';
const API_HOST_PORT = process.env.API_HOST_PORT || '4000';

const API = 'http://' +  API_HOST_IP + ':' + API_HOST_PORT;
if(!API){
  throw new Error("fabric-rest endpoint is not set. Please use environment variable to set it.");
}

var eventPeer = process.env.EVENT_PEER || 'ORG1';

const socket = new FabricSocketClient(API);

socket.on('chainblock', function (block) {
  //logger.trace('block', JSON.stringify(block));
  //logger.trace('block', block);

  try {
    var blockData = block.data.data;
    console.log('block size : ', blockData.length);
    blockData.forEach(function(item, index, blockData) {
      console.log('block no. : ', index);
      var proposalpayloadB64 = item.payload.data.actions[0].payload.chaincode_proposal_payload.input;
  
      var proposalpayload = proposalpayloadB64.toString('ascii');
  
      var rgex = new RegExp('{(.*)');
      var extractStr  = proposalpayload.match(rgex);

      if (extractStr) {
        var txnDataStr = '{' + extractStr[1];
        
        if (notificationenabled == 'true') {
          console.log('==================== notify  ==================');
          //catch any error and return proper response
          try {
            var notificationTxnData = JSON.parse(txnDataStr);
            notificationTxnData.ledger.data = "";

            console.log(new Date().toString() +" : assetId - "+ notificationTxnData.assetId);

            notificationhandler.notify(notificationTxnData, eventPeer, notifyhost, notifyhostport, (e, resultData) => {
              if (e) {
                console.error('>>>*>> Notification failed.', e);	
              } else {
                console.log(">>>*>> Notification completed. Data : " + JSON.stringify(resultData));
              }
            });				
          } catch (err) {
              console.error('>>>*>> Notification failed.', err);
          }
        }
      }
    });
  } catch (err) {
      console.error('>>>*>> Block processing failed.', err);
  }

});

socket.on('connect', function () {
  logger.trace('connect');
});

function getResultMessage(resultStatus, resultMessage, resultData) {
	var msg = {
		success: resultStatus,
		message: resultMessage,
		data: resultData
	};
	return msg;
}


var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cors());
var port = process.env.PORT || 1010;
app.listen(port);
console.log('================ Service is runnning at ' + port+" ================");

/** Get the particular ledger entry if event of the same has been received */
app.get("/getLedger/:assetID", (req,res) =>{
  var assetID = req.params.assetID;
  registerLedgerData(res,assetID);
});