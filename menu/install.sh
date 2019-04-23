#!/bin/bash
# Sync scripts into this repo into users home directory

SCRIPTNAME=$(basename "$0")

# Change to directory where the install script resides
cd "$(dirname "$0")"

echo "Updating the git submodule for applauncher2."
git submodule update -v

echo "Copying the applauncher2 configuration."
cp con-espressione.config.yml applauncher2/cfg/con-espressione.config.yml

echo "Done."
