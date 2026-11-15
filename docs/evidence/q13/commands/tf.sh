#!/usr/bin/env bash
# tofu in the scratch working directory, with the coordinator's provider mirror.
export TF_CLI_CONFIG_FILE=/home/ash/github/qrwty/.scratch/Q13/tofurc TF_IN_AUTOMATION=1
exec /home/ash/github/qrwty/.scratch/tools/tofu-1.13.2/tofu -chdir=/home/ash/github/qrwty/.scratch/Q13/tf "$@"
