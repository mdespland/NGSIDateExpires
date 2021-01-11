#!/bin/bash
docker run -it --rm -v ${PWD}:/app -w /app -p 9229:9229 node /bin/bash
