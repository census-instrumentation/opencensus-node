#!/bin/bash

COMPONENT_NAME="opencensus"
CONTEXT="@opencensus"

## declare an array variable
declare -a packages=(
                "packages/${COMPONENT_NAME}-core"
                "packages/${COMPONENT_NAME}-nodejs"
                "packages/${COMPONENT_NAME}-instrumentation-http"
                "packages/${COMPONENT_NAME}-instrumentation-https"
                "packages/${COMPONENT_NAME}-instrumentation-mongodb-core"
                "packages/${COMPONENT_NAME}-exporter-stackdriver"
                "packages/${COMPONENT_NAME}-exporter-zipkin"
                "packages/${COMPONENT_NAME}-propagation-b3"
                "packages/${COMPONENT_NAME}-instrumentation-all"
                )
NUMPACKAGES=${#packages[@]}

echo "01 - Lerna bootstrap"
#Lerna - package.ini

#lerna bootstrap
node_modules/.bin/lerna bootstrap


#correct the link to build/src according to typescript build output
echo "02 - Fix modules link"
function correctModulesLinks {
  CURRENT_PATH=`pwd`
  for (( i=0; i<${NUMPACKAGES}; i++ ))
  do
    if [ $i -gt 0 ]
    then
      echo "Fix ${packages[$i]} to ${COMPONENT_NAME}-core"
      cd  ${packages[$i]}/node_modules/${CONTEXT}
      ln -sfn ../../../${COMPONENT_NAME}-core/build/src ${COMPONENT_NAME}-core
      cd $CURRENT_PATH
    fi
  done

  #fix nodejs - dependecies
  echo "Fix ${packages[1]} dependecies"
  cd ${packages[1]}/node_modules/${CONTEXT}/
  ln -sfn ../../../${COMPONENT_NAME}-instrumentation-all/build/src ${COMPONENT_NAME}-instrumentation-all
  cd $CURRENT_PATH

  echo "Fix ${packages[2]} dependecies"
  cd ${packages[2]}/node_modules/${CONTEXT}/
  ln -sfn ../../../${COMPONENT_NAME}-propagation-b3/build/src ${COMPONENT_NAME}-propagation-b3
  cd $CURRENT_PATH

  echo "Fix ${packages[3]} dependecies"
  cd ${packages[3]}/node_modules/${CONTEXT}/
  ln -sfn ../../../${COMPONENT_NAME}-instrumentation-http/build/src ${COMPONENT_NAME}-instrumentation-http
  cd $CURRENT_PATH

  #fix instrumentation-all dependecies
  echo "Fix ${packages[8]} dependecies"
  cd ${packages[8]}/node_modules/${CONTEXT}/
  ln -sfn ../../../${COMPONENT_NAME}-instrumentation-http/build/src ${COMPONENT_NAME}-instrumentation-http
  ln -sfn ../../../${COMPONENT_NAME}-instrumentation-https/build/src ${COMPONENT_NAME}-instrumentation-https
  ln -sfn ../../../${COMPONENT_NAME}-instrumentation-mongodb-core/build/src ${COMPONENT_NAME}-instrumentation-mongodb-core
  cd $CURRENT_PATH

}

correctModulesLinks

echo "Building modules"
node_modules/.bin/lerna run build

echo "End update lerna links"