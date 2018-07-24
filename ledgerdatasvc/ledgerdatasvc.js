/**
 * Copyright 2018 Tallyx Inc. All Rights Reserved.
 *
 */

 /**
 * A REST API to create and get the ledger entries of hyperledger fabric network.
 */

'use strict';

var express = require('express');
var bodyParser = require('body-parser');
var http = require('http');
var cors = require('cors');
var config = require('./config.json');
var sha3_512 = require('js-sha3').sha3_512;
var fs = require('fs');

var host = process.env.HOST || config.host;
var port = process.env.PORT || config.port;
var cache = require('./memorycache');
var jwt = require('jsonwebtoken');

var ledgerdatasvc = express();

var httphelper = require('./httphelper');

var _ = require('lodash');
var async = require('async');

var event_host = process.env.EVENT_HOST;
var event_port = process.env.EVENT_PORT;

/////// SET CONFIGURATONS ///////
ledgerdatasvc.options('*', cors());
ledgerdatasvc.use(cors());

//support parsing of application/json type post data
ledgerdatasvc.use(bodyParser.json({
	limit: 10485760,
	type: 'application/json'
}));

//support parsing of application/x-www-form-urlencoded post data
ledgerdatasvc.use(bodyParser.urlencoded({
	extended: false
}));


/////// START SERVER ///////
var server = http.createServer(ledgerdatasvc).listen(port, function () {});
console.log('********** SERVER STARTED **************');
console.log('**********  http://' + host + ':' + port + '  **************');
server.timeout = 240000;

/////// Init config data ///////
//todo : externalize
var sdkclienthost = process.env.SDK_CLIENT_HOST || 'localhost';
var sdkclientport = '1000';
var username = 'Admin';

var dataHashAlgo = 'SHA3-512';

var orgConfig = JSON.parse(fs.readFileSync('orgConfig.json'));
var sdkClientHosts = orgConfig.hosts;
var peerOrgs = orgConfig.peerOrgs;
var peerOrgPorts = orgConfig.peerOrgPorts;
var event_hosts = orgConfig.hosts;
var event_ports = orgConfig.event_ports;

// Channels list
var orgChannels = orgConfig.orgChannels;

// Chain code name
var orgChaincodes = orgConfig.orgChaincodes;


/////// utils ///////
function getResultMessage(resultStatus, resultMessage, resultData) {
	var msg = {
		success: resultStatus,
		message: resultMessage,
		data: resultData
	};
	return msg;
}

function getOrg(peerorgname) {
	return peerOrgs[peerorgname];
}

function getOrgPeerPort(peerorgname) {
	return peerOrgPorts[peerorgname];
}

/** enroll user, get token and cache it in memorycache 
 * @param {*} sdkclienthost host of fabric rest
 * @param {*} clientPort port of the fabric rest
*/
function getUserToken(sdkclienthost, clientPort, next) {
	console.log('====================  get User Token ==================');
	var path = '/users/';

	var options = {
		method: 'POST',
		hostname: sdkclienthost,
		port: clientPort,
		path: path
	};

	var body = {
		"username": "ledgersvcuser"
	};

	var enrollmentdata;
	var jwttoken;

	httphelper.call(options, body, 'jwttoken', true, (e, loginresult) => {
		if (e) {
			console.log('User enrollment failed.', e);
			next(e, null);
		} else {
			enrollmentdata = JSON.parse(loginresult);
			jwttoken = enrollmentdata.token;
			console.log('user enrollment success - enrollmentdata :', enrollmentdata);
			console.log('user enrollment success - token :', jwttoken);
			
			cache.set('jwttoken', jwttoken);
			
			next(null, jwttoken);
		}
	});
}

/** check for jwt token expiry
 */
function checkTokenStatus() {
	return function checkUserTokenExpiryVerify(resolve) {
		var usertoken = cache.get('jwttoken');
		if (usertoken) {
			jwt.verify(usertoken, 'thisismysecret', function(err, decoded) {
				if (err) {
					console.error('jwt token verificatoon failed. ', err);
					cache.set('jwttoken', null);
					usertoken = null;
				}
			});			
		}
		resolve(usertoken);
	};
}


/////// REST ENDPOINTS ///////

// create ledger - '/ledger/asset?channel=ch-common&org=org1&ccn=ledgerdata'
ledgerdatasvc.post('/ledger/:ledgerdatatype', function (req, res) {
	console.log('==================== create audit pro  ==================');

	//catch any error and return proper response
	try {
		var auditpro = req.body;

		if (!auditpro) {
			res.json(getResultMessage(false, "Ledger entry creation failed - invalid input."));
			return;
		}

		var channelName = req.query.channel;

		if (!channelName) {
			res.json(getResultMessage(false, "Ledger entry creation failed - invalid channel."));
			return;
		}

		var peerorgname = req.query.org;

		if (!peerorgname) {
			res.json(getResultMessage(false, "Ledger entry creation failed - invalid org."));
			return;
		}

		var chaincodeName = req.query.ccn;

		if (!chaincodeName) {
			res.json(getResultMessage(false, "Ledger entry creation failed - invalid chaincode."));
			return;
		}

		var ledgerdatatype = req.params.ledgerdatatype;

		if (!ledgerdatatype) {
			res.json(getResultMessage(false, "Ledger entry creation failed - invalid ledger type."));
			return;
		}

		var auditproId = auditpro.auditProId;

		if(!auditproId || auditproId == ''){
			auditproId = auditpro.assetId;
			auditpro.auditProId = auditpro.assetId;
		}

		var ledgerId;

		if (ledgerdatatype == 'asset') {
			ledgerId = auditpro.assetId;
		} else {
			ledgerId = auditpro.transactionId;
		}

		if(!ledgerId || ledgerId == ''){
			ledgerId = auditpro.assetId;
			auditpro.transactionId = auditpro.assetId;
		}


		if(!auditpro.originatingTxnId || auditpro.originatingTxnId == ''){
			auditpro.originatingTxnId = auditpro.assetId;

		}

		var ledgerDataStr = auditpro.ledger.data;
		if (!ledgerDataStr) {
			res.json(getResultMessage(false, "Ledger entry creation failed - invalid ledger data."));
			return;
		}

		var dataHashSignature = sha3_512(ledgerDataStr);

		auditpro.ledger.dataHashAlgo = dataHashAlgo;
		auditpro.ledger.dataHashSignature = dataHashSignature;

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {
			if (!usertoken) {
	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);
						res.json(resultdata);
						return;
					} else {
						usertoken = cache.get('jwttoken');		
						apiInvoke(res, peerorgname, channelName, chaincodeName, ledgerId, auditproId, auditpro, usertoken, dataHashAlgo, dataHashSignature);
					}	
				});
			} else {
				apiInvoke(res, peerorgname, channelName, chaincodeName, ledgerId, auditproId, auditpro, usertoken, dataHashAlgo, dataHashSignature);
			}
		});
	} catch (err) {
		console.log('Ledger entry creation failed.', err);
		res.json(getResultMessage(false, "Ledger entry creation failed." + err));
	}

	return;
});


/**
 * API call to invoke client
 */
function apiInvoke (res, peerorgname, channelName, chaincodeName, ledgerId, auditproId, auditpro, usertoken, dataHashAlgo, dataHashSignature) {
	//call api server to invoke

	//var path2 = '/channels/common/chaincodes/auditpro';
	var path2 = '/channels/' + orgChannels[channelName] + '/chaincodes/' + orgChaincodes[chaincodeName];

	var options2 = {
		method: 'POST',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname], //sdkclientport,
		path: path2
	};

	var body2 = {
		"peers": [peerOrgs[peerorgname] + '/peer0'], //["org1/peer0"],//[sdkclienthost + ":" + getOrgPeerPort(peerorgname)],
		"fcn": "createLedgerEntry",
		"args": [ledgerId, peerorgname, JSON.stringify(auditpro)]
	};

	var resultdata;

	httphelper.call(options2, body2, usertoken, true, (e, ledgerReference) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry creation failed - http call." + e.message);
			console.log('Ledger entry creation failed.', e);
			res.json(resultdata);
		} else {
			if ((ledgerReference.indexOf("Failed to order the transaction") >= 0) || (ledgerReference.indexOf("Error") >= 0)){
				resultdata = getResultMessage(false, "Ledger entry creation failed. Error : " + ledgerReference);
			} else {
				var resultMsgdata = {
					auditProId: auditproId,
					ledgerId: ledgerId,
					reference: (JSON.parse(ledgerReference)).transaction,
					dataHashAlgo: dataHashAlgo,
					dataHashSignature: dataHashSignature
				};
				resultdata = getResultMessage(true, "Ledger entry created.", resultMsgdata);
			}
			console.log(new Date(Date.now())+" Ledger entry created." + auditpro.assetId);
			var path = '/getLedger/'+auditpro.assetId;
			// Ledger entry created, wait for atleast one replication event
			
			var options = {
				method: 'GET',
				hostname : event_hosts[peerorgname],
				port : event_ports[peerorgname],
				path: path				
			};

			var resultToSend;
				httphelper.call(options, null, null, true, (e, body) => {
					if (e) {
						resultdata = getResultMessage(false,"Ledger entry created but event not found.",e.message);
						console.error('Unable to parse response as JSON.', e);
						res.json(resultdata);
					} else {
						try {
							body=JSON.parse(body);
							if (body.success) {
								resultdata.message="Ledger entry created and event found."
								resultdata.EntryType=body.EntryType;
							}else{
								resultdata.success=false;
								resultdata.message="Ledger entry created but event not found."
								resultdata.EntryType=body.EntryType;
							}
						} catch (err) {
							resultdata = getResultMessage(false, "Ledger entry created but event not found." + err.message + ":" + body);
							console.error('Unable to parse response as JSON.', err);
						}			
						res.json(resultdata);
					}
				}); //httphelper.call
			}
	});	
}

// get ledger by id - '/ledger/asset?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC'
ledgerdatasvc.get('/ledger/:ledgerdatatype', function (req, res) {
	console.log('====================  get audit pro by id ==================');

	try {
		getAuditproById(req, res, (e, r) => {
			if (e) {
				var resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
				console.error('Unable to parse response as JSON.', e);
				return res.json(resultdata);
			} else {
				return res.json(r);				
			}
		});		
	} catch (err) {
		console.log('Unable get ledger data.', err);		
		return res.json(getResultMessage(false, err.message));
	};
});

/** helper fuction for getAuditPro by Id */
function getAuditproById(req, res, callback) {
	console.log('==================== function get audit pro by id ==================');

	//catch any error and return proper response
	try {
		var ledgerId = req.query.ledgerid;

		if (!ledgerId) {
			callback(null, getResultMessage(false, 'Ledger Id must be non-empty'));
			return;
		}

		var channelName = req.query.channel;

		if (!channelName) {
			callback(null, getResultMessage(false, "Invalid channel."));
			return;
		}

		var peerorgname = req.query.org;

		if (!peerorgname) {
			callback(null, getResultMessage(false, "Invalid org."));
			return;
		}

		var chaincodeName = req.query.ccn;

		if (!chaincodeName) {
			callback(null, getResultMessage(false, "Invalid chaincode."));
			return;
		}

		var ledgerdatatype = req.params.ledgerdatatype;

		if (!ledgerdatatype) {
			callback(null, getResultMessage(false, "Invalid ledger type."));
			return;
		}

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {

			if (!usertoken) {
	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);

						callback(null, resultdata);
					} else {
						usertoken = cache.get('jwttoken');							

						apiQueryById(peerorgname, channelName, chaincodeName, ledgerId, usertoken, callback);
					}	
				});
			} else {

				apiQueryById(peerorgname, channelName, chaincodeName, ledgerId, usertoken, callback);
			}	
		});

	} catch (err) {
		console.error('Error getting ledger entries.', err);
		callback(null, getResultMessage(false, "Error getting ledger entries." + err.message));
	}
};

/** API call to query ledger by Id */
function apiQueryById (peerorgname, channelName, chaincodeName, ledgerId, usertoken, callback) {
	//call api server to invoke

	var paramStr = '?&peer=' + peerOrgs[peerorgname] + '%2Fpeer0&fcn=getLedgerEntry&args=%5B%22' + ledgerId + '%22%5D';

	var path2 = '/channels/' + orgChannels[channelName] + '/chaincodes/' + orgChaincodes[chaincodeName] + paramStr;

	var options2 = {
		method: 'GET',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname], //sdkclientport,
		path: path2
	};

	//call sdk-client
	var resultdata;

	httphelper.call(options2, null, usertoken, true, (e, body) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
			console.error('Unable to parse response as JSON.', e);

			callback(null, resultdata);
			return;
		} else {
			try {
				if (body.indexOf("Ledger Entry does not exist") >= 0) {
					resultdata = getResultMessage(false, "Ledger entry not found.");
				} else {
					resultdata = getResultMessage(true, "Ledger entry found.", (JSON.parse(body)).result);
				}

			} catch (err) {
				resultdata = getResultMessage(false, "Ledger entry not found." + err.message + ":" + body);
				console.error('Unable to parse response as JSON.', err);
			}

			callback(null, resultdata);
			return;

		}
	}); //httphelper.call
}

// get ledger list - '/ledger/list/all?channel=ch-common&org=org1&ccn=ledgerdata'
ledgerdatasvc.get('/ledger/list/all', function (req, res) {
	console.log('==================== get audit pro list ==================');

	//catch any error and return proper response
	try {
		var channelName = req.query.channel;

		if (!channelName) {
			res.json(getResultMessage(false, "Invalid channel."));
			return;
		}

		var peerorgname = req.query.org;

		if (!peerorgname) {
			res.json(getResultMessage(false, "Invalid org."));
			return;
		}

		var chaincodeName = req.query.ccn;

		if (!chaincodeName) {
			res.json(getResultMessage(false, "Invalid chaincode."));
			return;
		}

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {
			if (!usertoken) {

	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);

						res.json(resultdata);
						return;
					} else {
						usertoken = cache.get('jwttoken');		

						apiQueryAll(res, peerorgname, channelName, chaincodeName, usertoken);			
					}	
				});
			} else {

				apiQueryAll(res, peerorgname, channelName, chaincodeName, usertoken);
			}
		});

	} catch (err) {
		console.log('Error getting ledger entries.', err);
		res.json(getResultMessage(false, "Error getting ledger entries." + err));
	}
	
	return;
});

/** API call to query ledger list */
function apiQueryAll (res, peerorgname, channelName, chaincodeName, usertoken) {
	//call api server to invoke

	var paramStr = '?&peer=' + peerOrgs[peerorgname] + '%2Fpeer0&fcn=getAllLedgerEntries&args=%5B%22%22%5D';
	var path = '/channels/' + orgChannels[channelName] + '/chaincodes/' + orgChaincodes[chaincodeName] + paramStr;

	var options = {
		method: 'GET',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname],
		path: path
	};
	
	//call sdk-client
	var resultdata;

	httphelper.call(options, null, usertoken, true, (e, body) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
			console.error('Unable to parse response as JSON.', e);

			res.json(resultdata);
		} else {
			try {
				var ledgerList = (JSON.parse(body)).result;
				resultdata = getResultMessage(true, "Ledger entry found. Count : " + ledgerList.length, ledgerList);

			} catch (err) {
				resultdata = getResultMessage(false, "Ledger entry not found." + err.message);
				console.error('Unable to parse response as JSON.', err + " : " + body);
			}

			res.json(resultdata);
		}
	}); //httphelper.call
}

// get ledger list for ledgerEntryType sorted by createdTimeStamp with additional filters for originatingtxnid, txntype/assettype, excludetype
// - '/ledger/list/asset?channel=ch-common&org=org1&ccn=ledgerdata&originatingtxnid=ABC&type=BookShipment&excludetype=Atype&sort=desc'
ledgerdatasvc.get('/ledger/list/:ledgerdatatype', function (req, res) {
	console.log('==================== get audit pro list for type ==================');

	//catch any error and return proper response
	try {
		var ledgerdatatype = req.params.ledgerdatatype;

		if (!ledgerdatatype) {
			res.json(getResultMessage(false, "Invalid ledger type."));
			return;
		}

		var originatingTxnId = req.query.originatingtxnid;
		var includeType = req.query.type;
		var excludeType = req.query.excludetype;


		var sortOrder = req.query.sort || 'desc';

		var channelName = req.query.channel;

		if (!channelName) {
			res.json(getResultMessage(false, "Invalid channel."));
			return;
		}

		var peerorgname = req.query.org;

		if (!peerorgname) {
			res.json(getResultMessage(false, "Invalid Org."));
			return;
		}

		var chaincodeName = req.query.ccn;

		if (!chaincodeName) {
			res.json(getResultMessage(false, "Invalid chaincode."));
			return;
		}

		var query;

		var selecterFields = "\\\"ledgerEntryType\\\":\\\"" + ledgerdatatype + "\\\"";

		//var selecterFields = "\\\"ledgerEntryType\\\":\\\"" + ledgerdatatype + "\\\",\\\"crudLog.createdTimeStamp\\\":{\\\"$gt\\\":null}";

		if (originatingTxnId) {
			selecterFields = selecterFields + "," + "\\\"originatingTxnId\\\":\\\"" + originatingTxnId + "\\\"";
		}

		var typeField;
		if (ledgerdatatype == "asset") {
			typeField = "assetType";
		} else {
			typeField = "transactionType";
		}

		if (includeType) {
			selecterFields = selecterFields + "," + "\\\"" + typeField + "\\\":\\\"" + includeType + "\\\"";
		}

		if (excludeType) {
			selecterFields = selecterFields + "," + "\\\"$not\\\":{\\\"" + typeField + "\\\":\\\"" + excludeType + "\\\"}";
		}

		query = "\"{\\\"selector\\\":{" + selecterFields + "}}\"";

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {
			if (!usertoken) {

	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);

						res.json(resultdata);
						return;
					} else {
						usertoken = cache.get('jwttoken');		

						apiQueryFilters(peerorgname, query, channelName, chaincodeName, res, sortOrder, usertoken);			
					}	
				});
			} else {

				apiQueryFilters(peerorgname, query, channelName, chaincodeName, res, sortOrder,usertoken);
			}
		});

	} catch (err) {
		console.log('Error getting ledger entries.', err);
		res.json(getResultMessage(false, "Error getting ledger entries." + err));
	}

	return;
});

/** API call to query ledger list with filters */
function apiQueryFilters(peerorgname, query, channelName, chaincodeName, res, sortOrder, usertoken) {
	var paramStr = '?&peer=' + peerOrgs[peerorgname] + '%2Fpeer0&fcn=getLedgerEntriesForQuery&args=%5B' + query + '%5D';
	var path = '/channels/' + orgChannels[channelName] + '/chaincodes/' + orgChaincodes[chaincodeName] + paramStr;

	console.log('\n ==**==>  path : ' + path);
	var options = {
		method: 'GET',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname],
		path: path
	};

	//call sdk-client
	var resultdata;
	httphelper.call(options, null, usertoken, true, (e, body) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
			console.error('Unable to parse response as JSON.', e);

			res.json(resultdata);
		}
		else {
			try {
				var resultJsonArray = JSON.parse(body).result;
				if (resultJsonArray.length > 0) {
					//sort result locally
					var queryResult = JSON.parse(body).result;
					var sortedResult = [];
					queryResult.forEach(function (resultItem) {
						sortedResult.push(resultItem.Record);
					});
					sortedResult.sort(compareValues("crudLog.createdTimeStamp", sortOrder));
					resultdata = getResultMessage(true, "Ledger entry found. Count : " + sortedResult.length, sortedResult);
				}
				else {
					resultdata = getResultMessage(false, "Ledger entry not found.");
				}

			}
			catch (err) {
				resultdata = getResultMessage(false, "Ledger entry not found." + err.message);
				console.error('Unable to parse response as JSON.', err);
			}
			res.json(resultdata);
		}
	}); //httphelper.call
}

// function for dynamic sorting
function compareValues(key, order) {
	return function (a, b) {

		const dataValueA = _.get(a, key);
		const dataValueB = _.get(b, key);

		var comparison = 0;
		if (dataValueA > dataValueB) {
			comparison = 1;
		} else if (dataValueA < dataValueB) {
			comparison = -1;
		}
		return (
			(order == 'desc') ? (comparison * -1) : comparison
		);
	};
}


// get ledger entry by ledger reference - '/ledger?channel=ch-common&org=org1&ccn=ledgerdata&reference=ABC'
ledgerdatasvc.get('/ledger', function (req, res) {
	console.log('==================== get ledger entry by ledger reference ==================');

	//catch any error and return proper response
	try {
		var trxnId = req.query.reference;

		if (!trxnId) {
			res.json(getResultMessage(false, 'Ledger Id must be non-empty'));
			return;
		}

		var channelName = req.query.channel;

		if (!channelName) {
			res.json(getResultMessage(false, "Invalid channel."));
			return;
		}

		var peerorgname = req.query.org;

		if (!peerorgname) {
			res.json(getResultMessage(false, "Invalid org."));
			return;
		}

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {
			if (!usertoken) {

	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);

						res.json(resultdata);
						return;
					} else {
						usertoken = cache.get('jwttoken');		

						apiQueryByLedgerReference(peerorgname, channelName, trxnId, res, usertoken);			
					}	
				});
			} else {

				apiQueryByLedgerReference(peerorgname, channelName, trxnId, res, usertoken);
			}
		});

	} catch (err) {
		console.error('Error getting ledger entries.', err);
		res.json(getResultMessage(false, "Error getting ledger entries." + err.message));
	}

	return;
});

/** API call to query ledger by ledger reference */
function apiQueryByLedgerReference(peerorgname, channelName, trxnId, res, usertoken) {
	var paramStr = '?&peer=peer1';
	var path = '/channels/' + orgChannels[channelName] + '/transactions/' + trxnId + paramStr;
	var options = {
		method: 'GET',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname],
		path: path
	};
	//call sdk-client
	var resultdata;
	httphelper.call(options, null, usertoken, true, (e, body) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
			console.error('Unable to parse response as JSON.', e);

			res.json(resultdata);
		}
		else {
			try {
				if (body.indexOf("\"ok\":false") >= 0) {
					resultdata = getResultMessage(false , "Ledger entry not found." + body);	
				} else {
					var txn = JSON.parse(body);
					console.log("===> txn : " + JSON.stringify(txn));
					var auditproStr = txn.transactionEnvelope.payload.data.actions[0].payload.action.proposal_response_payload.extension.results.ns_rwset[0].rwset.writes[0].value;
					resultdata = getResultMessage(true, "Ledger entry found.", JSON.parse(auditproStr));
		
				}
			}
			catch (err) {
				resultdata = getResultMessage(false, "Ledger entry not found." + err.message);
				console.error('Unable to parse response as JSON.', err);
			}
			res.json(resultdata);
		}
	});
}

// get count of ledger for type for org - '/ledger/count/type/txn?channel=ch-common&org=org1&ccn=ledgerdata&type=BookShipment'
ledgerdatasvc.get('/ledger/count/type/:ledgerdatatype', function (req, res) {
	console.log('==================== get count of auditpro for assettype/txntype for org ==================');

	//catch any error and return proper response
	try {
		var ledgerdatatype = req.params.ledgerdatatype;
		if (!ledgerdatatype) {
			res.json(getResultMessage(false, "Invalid ledger type."));
			return;
		}

		var filterType = req.query.type;
		if (!filterType) {
			res.json(getResultMessage(false, "Invalid " + ledgerdatatype + " type."));
			return;
		}

		var channelName = req.query.channel;
		if (!channelName) {
			res.json(getResultMessage(false, "Invalid channel."));
			return;
		}

		var peerorgname = req.query.org;
		if (!peerorgname) {
			res.json(getResultMessage(false, "Invalid org."));
			return;
		}

		var chaincodeName = req.query.ccn;
		if (!chaincodeName) {
			res.json(getResultMessage(false, "Invalid chaincode."));
			return;
		}

		var selecterFields = "\\\"ledgerEntryType\\\":\\\"" + ledgerdatatype + "\\\"";

		var filterField = (ledgerdatatype == "asset") ? "assetType" : "transactionType";

		selecterFields = selecterFields + "," + "\\\"" + filterField + "\\\":\\\"" + filterType + "\\\"";

		//var query = "\"{\\\"selector\\\":{\\\"" + filterField + "\\\":\\\"" + filterType + "\\\"},\\\"fields\\\":[\\\"auditProId\\\"]}\"";

		var query = "\"{\\\"selector\\\":{" + selecterFields + "},\\\"fields\\\":[\\\"auditProId\\\"]}\"";

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {
			if (!usertoken) {

	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);

						res.json(resultdata);
						return;
					} else {
						usertoken = cache.get('jwttoken');		

						apiQueryCount(peerorgname, query, channelName, chaincodeName, res, filterField, filterType, usertoken);			
					}	
				});
			} else {

				apiQueryCount(peerorgname, query, channelName, chaincodeName, res, filterField, filterType, usertoken);
			}
		});

	} catch (err) {
		console.log('Error getting ledger entries.', err);
		res.json(getResultMessage(false, "Error getting ledger entries." + err));
	}

	return;
});

/** API call to query ledger count for filter */
function apiQueryCount(peerorgname, query, channelName, chaincodeName, res, filterField, filterType, usertoken) {
	var paramStr = '?&peer=' + peerOrgs[peerorgname] + '%2Fpeer0&fcn=getLedgerEntriesForQuery&args=%5B' + query + '%5D';
	var path = '/channels/' + orgChannels[channelName] + '/chaincodes/' + orgChaincodes[chaincodeName] + paramStr;

	var options = {
		method: 'GET',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname],
		path: path
	};

	//call sdk-client
	var resultdata;
	httphelper.call(options, null, usertoken, true, (e, body) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
			console.error('Unable to parse response as JSON.', e);

			res.json(resultdata);
		}
		else {
			try {
				var resultJsonArray = JSON.parse(body).result;
				var assetCount = 0;
				if (resultJsonArray.length > 0) {
					//sort result locally
					var queryResult = JSON.parse(body).result;
					assetCount = queryResult.length;
					resultdata = getResultMessage(true, "Ledger entry found.", {
						peer: peerorgname,
						[filterField]: filterType,
						count: assetCount
					});
				}
				else {
					resultdata = getResultMessage(true, "Ledger entry not found.", {
						peer: peerorgname,
						[filterField]: filterType,
						count: assetCount
					});
				}

			}
			catch (err) {
				resultdata = getResultMessage(false, "Ledger entry not found." + err.message);
				console.error('Unable to parse response as JSON.', err);
			}
			res.json(resultdata);
		}
	});//httphelper.call
}

// get history for auditpro by id - '/ledger/asset/history?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC'
ledgerdatasvc.get('/ledger/:ledgerdatatype/history', function (req, res) {
	console.log('==================== get audit pro history by id ==================');

	//catch any error and return proper response
	try {
		var ledgerId = req.query.ledgerid;

		if (!ledgerId) {
			res.json(getResultMessage(false, 'Invalid ledger id.'));
			return;
		}

		var channelName = req.query.channel;

		if (!channelName) {
			res.json(getResultMessage(false, "Invalid channel."));
			return;
		}

		var peerorgname = req.query.org;

		if (!peerorgname) {
			res.json(getResultMessage(false, "Invalid org."));
			return;
		}

		var chaincodeName = req.query.ccn;

		if (!chaincodeName) {
			res.json(getResultMessage(false, "Invalid chaincode."));
			return;
		}

		//check user token
		var checkUserToken = new Promise(
			checkTokenStatus()
		);

		checkUserToken.then(function(usertoken) {
			if (!usertoken) {

	
				getUserToken(sdkClientHosts[peerorgname],peerOrgPorts[peerorgname], (e, r) => {
					if (e) {
						var resultdata = getResultMessage(false, "User enrollment failed." + e.message);
						console.error('User enrollment failed.', e);

						res.json(resultdata);
						return;
					} else {
						usertoken = cache.get('jwttoken');		

						apiQueryHistory(peerorgname, ledgerId, channelName, chaincodeName, res, usertoken);			
					}	
				});
			} else {

				apiQueryHistory(peerorgname, ledgerId, channelName, chaincodeName, res, usertoken);
			}
		});

	} catch (err) {
		console.error('Error getting ledger entries.', err);
		res.json(getResultMessage(false, "Error getting ledger entries." + err.message));
	}

	return;
});

/** API call to query ledger history */
function apiQueryHistory(peerorgname, ledgerId, channelName, chaincodeName, res, usertoken) {
	var paramStr = '?&peer=' + peerOrgs[peerorgname] + '%2Fpeer0&fcn=getHistoryForLedgerEntry&args=%5B%22' + ledgerId + '%22%5D';
	var path = '/channels/' + orgChannels[channelName] + '/chaincodes/' + orgChaincodes[chaincodeName] + paramStr;

	var options = {
		method: 'GET',
		hostname: sdkClientHosts[peerorgname],
		port: peerOrgPorts[peerorgname],
		path: path
	};

	//call sdk-client
	var resultdata;
	httphelper.call(options, null, usertoken, true, (e, body) => {
		if (e) {
			resultdata = getResultMessage(false, "Ledger entry not found." + e.message);
			console.error('Unable to parse response as JSON.', e);

			res.json(resultdata);
		}
		else {
			try {
				resultdata = getResultMessage(true, "Ledger entry found.", JSON.parse(body).result);

			}
			catch (err) {
				resultdata = getResultMessage(false, "Ledger entry not found." + err.message);
				console.error('Unable to parse response as JSON.', err);
			}
			res.json(resultdata);
		}
	});//httphelper.call
}

// get ledger txn data for id - '/ledger/data/asset?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC'
ledgerdatasvc.get('/ledger/data/:ledgerdatatype', function (req, res) {
	console.log('==================== get audit pro data for id ==================');

	try {
		getAuditproById(req, res, (e, retObj) => {
			if (e) {
				return res.json(getResultMessage(false, e.message));
			}
	
			//Try parsing the Ledger's Txn Data
			var txndata = getTxnData(retObj)
			if (!txndata.success) {
				return res.json(txndata);
			}
	
			var rootObj;
			try {
				rootObj = txndata.data;
				//Check if there is any relations avaialble, if not return the main txn object alone.
				var rels = retObj.data.ledgerChain.relations;
				if (!rels) {
					return res.json(txndata);
				}
	
				//Loop through each relation and get the ledger entry and extract the txn data of from that ledger entry
				async.eachSeries(rels, function (rel, callback) {
					req.query.ledgerid = rel.relId;
					getAuditproById(req, res, (e, rObj) => {
						if (e) {
							return callback(e);
						}
	
						//Try parsing the Ledger's Txn Data for the current relation entry
						var txndata = getTxnData(rObj)
						if (!txndata.success) {
							return callback(new Error(txndata.message));
						}
	
						//There could be multiple relational entries for a given relation type. Hence store all of them in an array
						if (!rootObj[rel.relType]) {
							rootObj[rel.relType] = new Array();
						}
						rootObj[rel.relType].push(txndata.data);
						callback();
					});
				}, function (err) {
					if (err) {
						res.json(getResultMessage(false, err.message));
					} else {
						res.json(getResultMessage(true, 'Successfully retrieved', rootObj));
					}
				});
			} catch (ex) {
				console.log('Unable get ledger data.', ex);
				return res.json(getResultMessage(false, ex.message));
			}
		});	
	} catch (err) {
		console.log('Unable get ledger data.', err);		
		return res.json(getResultMessage(false, err.message));
	}
});

/** helper function to validate ledger data */
function getTxnData(auditresp) {
	if (!auditresp.success) {
		return auditresp;
	}
	var ledgerentry = auditresp.data;

	if (!ledgerentry) {
		return getResultMessage(false, 'Audit Entry not found.');
	}
	if (!ledgerentry.ledger || !ledgerentry.ledger.data) {
		return getResultMessage(false, 'Invalid Audit Entry - Txn Data not found.');
	}

	try {
		return getResultMessage(true, 'Successfully parsed the Txn Data', JSON.parse(ledgerentry.ledger.data));
	} catch (ex) {
		return getResultMessage(false, ex.message);
	}
}