# Distributed Ledger

 Distributed Ledger lets you easily set up a distributed blockchain network and distributed ledger on the network. It makes use of permissioned and distributed blockchain network built using hypeledger fabric. It uses the Fabric REST API bulit using fabric-node-sdk by [Altoros](https://github.com/Altoros/fabric-rest).

## Prerequisites

* [Docker 17.06.2-ce or above](https://store.docker.com/search?type=edition&offering=community).
* [Nodejs 8.11.2](https://nodejs.org/en/download/).
* [Hyperledger Fabric v1.1.0](https://hyperledger-fabric.readthedocs.io/en/release-1.1/)

## Components

### hlfnw
hlfnw stands for Hyperledger fabric network. It contains the details of the fabric network like orderer, chaincode, and crypto materials for the network components.

### ledgereventsvc
Ledger event service is responsible for listening to events from all the peers of the network through the fabric REST API and carry out specific operation based on the event.

### ledgerdatasvc
Ledger data service, as the name suggests, carries out all the ledger specific operations like creating a transaction,retrieving the ledger data. Once the ledger entry is created, ledgerdatasvc waits for at least one replication of ledger entry. This is a REST service which uses fabric rest to communicate with network.

### DLTestClient
DLTestClient is basically a dockerized apache jmeter test client. DLTestClient is used for load and performance testing on the project.

## Deployment
First bring up the fabric network by going through the instructions in [hlfnw](./hlfnw/README.md). Now as part of the network, for each peer organization Fabric REST API will be running. Now run [ledgereventsvc](./ledgereventsvc) for each Fabric REST API instance, i.e run the ledgereventsvc for the number of organiztaions present (org1 and org2 in this case). 

Then, bring up the [ledgerdatasvc](./ledgerdatasvc). You can check for instructions [here](./ledgerdatasvc/README.md) to make ledger entry requests to the network and test.

Use [DLTestCLient](./DLTestClient) to run the tests on the project.

## Contributing
Please read [CONTRIBUTING.md](./CONTRIBUTING.md) and [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) for details on our code of conduct and the process for submitting pull requests to us.

## License
[Apache 2.0](./LICENSE)

## Acknowledgments
1. [Hyperledger Fabric](https://www.hyperledger.org/projects/fabric)
2. [Altoros Fabric Rest](https://github.com/Altoros/fabric-rest)
3. [Apache Jmeter](https://jmeter.apache.org/)
4. [Hyperledger Caliper](https://github.com/hyperledger/caliper)
6. [Docker Jmeter](https://github.com/justb4/docker-jmeter)