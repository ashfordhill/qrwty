#!/usr/bin/env bash
# Q05 diagnostic smoke teardown, by exact name only (no prune): the Compose project qrwtya-q05
# (containers, its network and named volumes), the image qrwtya-q05-app, and the scratch copy's
# private .runtime/. Prints what remains with the qrwtya-q05 name or the qrwty.arm=a label.
#
#   bash smoke-down.sh <export copy>
set -uo pipefail
cd "$1"
export COMPOSE_PROJECT_NAME=qrwtya-q05 LOCAL_HTTP_PORT=47241 LOCAL_IDENTITY_PORT=47242 LOCAL_OBJECT_PORT=47243
pnpm stop; echo "stop exit=$?"
docker compose --profile '*' down --volumes --remove-orphans; echo "down exit=$?"
docker image rm qrwtya-q05-app:latest; echo "image rm exit=$?"
rm -rf .runtime
echo "containers: $(docker ps -a --filter name=qrwtya-q05 --format '{{.Names}}' | tr '\n' ' ')"
echo "labelled containers: $(docker ps -a --filter label=qrwty.arm=a --format '{{.Names}}' | tr '\n' ' ')"
echo "volumes: $(docker volume ls --filter name=qrwtya-q05 -q | tr '\n' ' ')"
echo "networks: $(docker network ls --filter name=qrwtya-q05 -q | tr '\n' ' ')"
echo "images: $(docker image ls --format '{{.Repository}}:{{.Tag}}' | grep qrwtya-q05 | tr '\n' ' ')"
