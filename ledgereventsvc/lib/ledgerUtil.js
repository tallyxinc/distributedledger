var ledgermap = new Map();
var NodeCache = require('node-cache');

const ledgerCache = new NodeCache({ stdTTL: 30, checkperiod: 45, useClones: false});

/**
 * Register the ledger entry in the cache if not already registered by event
 * @param {*} res Response object 
 * @param {*} assetId assetId of the particular ledger entry
 */
exports.registerLedgerData = function(res, assetId) {
    let mapObj=ledgerCache.get(assetId);
    if(mapObj){
        if(mapObj.type=="request"){
            throw new Error("Dupliacte request");
        }else if(mapObj.type=="notification"){
            console.log(new Date(Date.now())+" - Ledger event successful (EntryType:notification) - "+assetId);
            res.send(getResultMessage(true,"Ledger event successful",mapObj.type));
            ledgerCache.del(assetId);
            return;
        }
    }
    console.log(new Date(Date.now())+" - Ledger entry created (Make an entry in map) - "+assetId);
    ledgerCache.set(assetId,{"type":"request","handler":res});
    console.log(new Date(Date.now())+" - Ledger entry registered - " + assetId);
}


/**
 *  Get the particular ledger entry from the chache if present,
 *  else make an entry in the cache as event has been received before registerLedgerData
 * 
 * @param {*} auditpro  body of the ledger entry creation request
 */

exports.getLedgerData = function(auditpro) {

	try {
        let res = ledgerCache.get(auditpro.assetId);
        if(res){
            if(res.type=="request"){
                console.log(new Date(Date.now())+" - Ledger event successful (EntryType:request) - "+auditpro.assetId);
                res.handler.send(getResultMessage(true,"Ledger event successful",res.type));
                ledgerCache.del(auditpro.assetId);
            }  
        }
        else{
            console.log(new Date(Date.now())+" - Ledger event found (Make an entry in map) - "+auditpro.assetId);
            ledgerCache.set(auditpro.assetId,{"type":"notification"});
        }
	} catch (ex) {
		console.log(ex);
		return;
	}
}

// If did not receive the event
ledgerCache.on("expired",(assetID ,res) => {
    if(res.handler!=undefined){
        res.handler.send(getResultMessage(false,"Ledger event not found"));
    }
    console.log(new Date(Date.now())+" -  Entry has been expired for "+assetID);
});


function getResultMessage(resultStatus, resultMessage, type, resultData) {
	var msg = {
		success: resultStatus,
        message: resultMessage,
        EntryType: type,
		data: resultData
	};
	return msg;
}