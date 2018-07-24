
# Ledger Event Service

The Ledger Event Service is an event listening service on the hyperledger fabric network REST API. It processes the events once received.

First, use [Fabric network](../hlfnw) and follow the instructions to start the fabric network. Then follow the below launch instructions to use the ledger event service.

Ledgereventsvc maintains an events cache registry of all the events. Once the request from ledgerdatasvc is made for the particular ledger entry in the cache, ledgereventsvc looks for that in the cache and responds back if the entry is present, or waits till the event occurs to send a response.

**Note: Change the API_HOST_IP variable in [.env](./.env) to IP address of the system where org1 organization is running. Do the same changes for ledgereventsvc of org2 and change COMPOSE_PROJECT_NAME,EVENT_PEER accordingly and run for org2 ledgereventsvc. Change PORT varibale to available port for org2 if you running on single host. Do not mention localhost.**

## Prerequisites

* [Docker 17.06.2-ce or above](https://store.docker.com/search?type=edition&offering=community).
* [Nodejs 8.11.2](https://nodejs.org/en/download/).
* [Hyperledger Fabric v1.1.0](https://hyperledger-fabric.readthedocs.io/en/release-1.1/)


## Launch

Ledger Event service will be up and running after:

```
  docker build -t ledgereventsvc-v1 .

  docker-compose up -d
```