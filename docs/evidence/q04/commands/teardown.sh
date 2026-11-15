#!/usr/bin/env bash
# Q04 teardown: drain the stack, then remove every arm-A resource of project qrwtya-q04 by its
# exact name (containers, networks, volumes, the image tag). Never prunes. Run from the export
# with the stack environment. Prints what it removed.
set -uo pipefail
P=${COMPOSE_PROJECT_NAME:?}
[[ $P == qrwtya* ]] || { echo "refusing project $P"; exit 2; }
pnpm stop >/dev/null 2>&1; echo "{\"stop\":$?}"
node /home/ash/github/qrwty/infra/local/profile-check.mjs teardown >/dev/null 2>&1
for c in $(docker ps -a --filter "label=com.docker.compose.project=$P" --format '{{.Names}}' | sort); do
  docker rm -f "$c" >/dev/null && echo "{\"container\":\"$c\"}"
done
for c in $(docker ps -a --filter label=qrwty.arm=a --format '{{.Names}}' | grep "^$P-" | sort); do
  docker rm -f "$c" >/dev/null && echo "{\"container\":\"$c\"}"
done
for n in "$P-rehearsal" "${P}_default"; do
  docker network inspect "$n" >/dev/null 2>&1 && docker network rm "$n" >/dev/null && echo "{\"network\":\"$n\"}"
done
for v in $(docker volume ls --filter "label=com.docker.compose.project=$P" --format '{{.Name}}' | sort); do
  docker volume rm "$v" >/dev/null && echo "{\"volume\":\"$v\"}"
done
docker image rm "$P-app:latest" >/dev/null 2>&1 && echo "{\"image\":\"$P-app:latest\"}"
echo "{\"left\":{\"containers\":$(docker ps -a --filter label=qrwty.arm=a -q | wc -l),\"volumes\":$(docker volume ls -q --filter label=qrwty.arm=a | wc -l),\"networks\":$(docker network ls -q --filter label=qrwty.arm=a | wc -l),\"images\":$(docker images -q --filter label=qrwty.arm=a | wc -l)}}"
