FROM alpine:3.6


ARG JMETER_VERSION="4.0"
ENV JMETER_HOME /opt/apache-jmeter-${JMETER_VERSION}
ENV	JMETER_BIN	${JMETER_HOME}/bin
ENV	JMETER_DOWNLOAD_URL  redrockdigimark.com/apachemirror//jmeter/binaries/apache-jmeter-${JMETER_VERSION}.tgz

ARG TARGET_HOST
ARG TARGET_PORT
ARG TARGET_PATH
ARG REQUEST_COUNT
ARG ITERATION_COUNT
ARG TEST_FILE_NAME

# Install extra packages
RUN    apk update \
	&& apk upgrade \
	&& apk add ca-certificates \
	&& update-ca-certificates \
	&& apk add --update openjdk8-jre tzdata curl unzip bash \
	&& rm -rf /var/cache/apk/* \
	&& mkdir -p /tmp/dependencies  \
	&& curl -L --silent ${JMETER_DOWNLOAD_URL} >  /tmp/dependencies/apache-jmeter-${JMETER_VERSION}.tgz  \
	&& mkdir -p /opt  \
	&& tar -xf /tmp/dependencies/apache-jmeter-${JMETER_VERSION}.tgz -C /opt  \
	&& rm -rf /tmp/dependencies

# Set global PATH such that "jmeter" command is found
ENV PATH $PATH:$JMETER_BIN

ADD tests/*.jmx /

COPY run.sh /

WORKDIR	${JMETER_HOME}

CMD /run.sh ${TARGET_HOST} ${TARGET_PORT} ${TARGET_PATH} ${REQUEST_COUNT} ${ITERATION_COUNT} ${TEST_FILE_NAME}