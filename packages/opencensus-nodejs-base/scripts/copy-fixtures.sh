#!/bin/bash

find ./test -type d -exec mkdir -p ./build/{} \;
find ./test -name 'package.json' -type f -exec cp {} ./build/{} \;
