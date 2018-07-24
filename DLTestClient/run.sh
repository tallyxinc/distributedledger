#!/bin/bash

TARGET_HOST=$1
TARGET_PORT=$2
TARGET_PATH=$3
REQUEST_COUNT=$4
ITERATION_COUNT=$5
TEST_FILE_NAME=$6

# curr_time=`date`
# curr_time=`echo $curr_time | sed -e "s/ /_/g"`

L_DIR=/DLTestClient/logs
R_DIR=${L_DIR}/report
rm -rf ${R_DIR} > /dev/null 2>&1
mkdir -p ${R_DIR}

/bin/rm -f ${L_DIR}/*  > /dev/null 2>&1
chmod 777 -R ${L_DIR}/

set -e
freeMem=`awk '/MemFree/ { print int($2/1024) }' /proc/meminfo`
s=$(($freeMem/10*8))
x=$(($freeMem/10*8))
n=$(($freeMem/10*2))
export JVM_ARGS="-Xmn${n}m -Xms${s}m -Xmx${x}m"

echo "JVM_ARGS=${JVM_ARGS}"
echo "jmeter args=$@"
echo "START Running Jmeter on `date '+%m/%d/%Y %I:%M:%S %p'`"

jmeter -JTARGET_HOST=${TARGET_HOST} -JTARGET_PORT=${TARGET_PORT} \
	-JTARGET_PATH=${TARGET_PATH} -JREQUEST_COUNT=${REQUEST_COUNT} -JITERATION_COUNT=${ITERATION_COUNT} \
	-n -t /${TEST_FILE_NAME}.jmx -l ${L_DIR}/${TEST_FILE_NAME}_REQ_CNT_${REQUEST_COUNT}.csv -j ${L_DIR}/${TEST_FILE_NAME}_REQ_CNT_${REQUEST_COUNT}_jmeter.log \
	-e -o ${R_DIR}

echo "END Running Jmeter on `date '+%m/%d/%Y %I:%M:%S %p'`"
