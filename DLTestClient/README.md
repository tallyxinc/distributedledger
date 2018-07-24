# DLTestClient

 DLTestClient is a simple dockerized jmeter client on the docker. Place your jmeter test files(.jmx) in the tests folder and run the client after changing the test file name in environment. Currently the folder consists of 4 test plans for the project. Fours tests differ from each other based on the payload size.
 
  The [.env](./.env) gives the same ease of running as jmeter command with run time parameters. Reports are generated for the test cases in the logs folder. Logs consist of HTML,CSV reports and a jmeter log for the particular test.

  **Note: Change the TARGET_HOST variable in [.env](./.env) to IP address of the system where ledgerdatasvc is running.**

## Launch

DLTestCLient will run the test for the mentioned [enviroment](./.env) after below command.

```
  docker build -t dltestclient-v1

  docker-compose up
  
```

## Acknowledgments
1. [Apache Jmeter](https://jmeter.apache.org/)
2. [Docker Jmeter](https://github.com/justb4/docker-jmeter)