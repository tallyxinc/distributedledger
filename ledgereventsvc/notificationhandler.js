
var httphelper = require('./httphelper');
var getLedgerData = require('./lib/ledgerUtil').getLedgerData;

var peerOrgs = {
	"ORG1":"ORG1",
	"ORG2":"ORG2"
};

// Notifying once the event occured
exports.notify = function (txnData, eventPeer, notifyhost, notifyhostport, next) {
	console.log("Notification Handler - notify");

    //catch any error and return proper response
    try {
		
		var auditData = txnData;

		if(eventPeer.toUpperCase() != auditData.ledgerChain.orginatingNodeId){
			console.log(new Date(Date.now())+" - Ignoring the event for "+eventPeer.toUpperCase());
			return;
        }
        else{
        getLedgerData(auditData);
        next();
        }

	} catch (err) {
		console.error('>>>>>> Notification failed.', err);
		next(err, null);
	}
	return;
} 