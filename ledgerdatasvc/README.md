
# Ledger Data Service

The Ledger Data Service is an API on the hyperledger fabric network to create and list ledger entries for organziations on the particular channel. There are two types of ledger entries, asset and transction on the asset. The project makes use of [Fabric REST API](https://github.com/MaxXx1313/fabric-rest/tree/0.11.0) to connect to the fabric network. Once the ledger entry is created, this will wait for at least one replication event of the ledger entry created.

First, use [Fabric network](../hlfnw) and follow the instructions to start the fabric network. Bring up the [ledgereventsvc](../ledgereventsvc). Then follow the below launch instructions to use the ledger data service.

Change the peerOrgPorts and event_ports to Fabric REST API ports and ledgereventsvc ports accordingly if you are running in single host in [orgConfig.json](./orgConfig.json).

**Note: Change the hosts in [orgConfig.json](./orgConfig.json) to the IP adresses of machines where org1 and org2 are running. Do not mention localhost.**

## Prerequisites

* [Docker 17.06.2-ce or above](https://store.docker.com/search?type=edition&offering=community).
* [Nodejs 8.11.2](https://nodejs.org/en/download/).
* [Hyperledger Fabric v1.1.0](https://hyperledger-fabric.readthedocs.io/en/release-1.1/)


## Launch

Ledger Data service will become available on `http://localhost:8099` after launching:

```
  docker build -t ledgerdatasvc-v1 .

  docker-compose up -d
```
OR 

```
  npm install
  node ledgerdatasvc.js
```

## REST URLs


* Get all ledger entries - Gets all the ledger entries on the particular channel

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/list/all?channel=ch-common&org=org1&ccn=ledgerdata
```

* Get ledger entry by ledger reference - Gets the ledfer entry for given channel by ledger reference

Method : GET

Request Sample :
```
   http:localhost:8099/ledger?channel=ch-common&org=org1&ccn=ledgerdata&reference=ABC
```


### Asset REST URLs


* Create a asset - Creats a asset ledger entry on the given channel for the given organization

Method : POST

Request Sample :
```
   http:localhost:8099/ledger/asset?channel=ch-common&org=org1&ccn=ledgerdata
```

* Get ledger by id - Gets the ledger entry of the asset for a particular ledger id on the given channel

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/asset?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC
```

* Get ledger list sorted by created time - Gets ledger list for ledgerEntryType sorted by createdTimeStamp with additional filters for originatingtxnid, assettype, excludetype

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/list/asset?channel=ch-common&org=org1&ccn=ledgerdata&originatingtxnid=ABC&type=BookShipment&xcludetype=Atype&sort=desc
```

* Get ledger count - Gets the ledfer count on the given channel for particular type

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/count/type/asset?channel=ch-common&org=org1&ccn=ledgerdata&type=BookShipment
```

* Get history - Gets the ledfer entry history for given channel by ledger id

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/asset/history?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC
```

* Get ledger transction data - Gets the ledger transction data for given channel by ledger id

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/data/asset?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC
```

### Transction REST URLs


* Create a transction - Creats a transction ledger entry on the given channel for the given organization on the given asset

Method : POST

Request Sample :
```
   http:localhost:8099/ledger/txn?channel=ch-common&org=org1&ccn=ledgerdata
```

* Get ledger by id - Gets the ledger entry of the transction for a particular ledger id on the given channel

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/txn?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC
```

* Get ledger list sorted by created time - Gets ledger list for ledgerEntryType sorted by createdTimeStamp with additional filters for originatingtxnid, txntype, excludetype

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/list/txn?channel=ch-common&org=org1&ccn=ledgerdata&originatingtxnid=ABC&type=BookShipment&xcludetype=Atype&sort=desc
```

* Get ledger count - Gets the ledger count on the given channel for particular type

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/count/type/txn?channel=ch-common&org=org1&ccn=ledgerdata&type=BookShipment
```

* Get history - Gets the ledfer entry history for given channel by ledger id

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/txn/history?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC
```

* Get ledger transction data - Gets the ledger transction data for given channel by ledger id

Method : GET

Request Sample :
```
   http:localhost:8099/ledger/data/txn?channel=ch-common&org=org1&ccn=ledgerdata&ledgerid=ABC
```




