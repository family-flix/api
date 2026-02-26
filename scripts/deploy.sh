#!/bin/bash

# Load environment variables from .env file
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

# Configuration - PLEASE EDIT THESE VARIABLES
# ========================================================
# NAS SSH Host (e.g., admin@192.168.1.100)
# Use values from .env if available, otherwise default to placeholders or exit
: "${NAS_HOST:?Need to set NAS_HOST in .env}"
: "${NAS_PORT:=22}"
: "${NAS_DIR:?Need to set NAS_DIR in .env}"

# Binary name (output filename)
BINARY_NAME="flixapi"

# Command to restart the service on NAS
# Option 1: Systemd (if installed as a service)
# RESTART_CMD="sudo systemctl restart family-flix"
# Option 2: Docker (if running in container)
# RESTART_CMD="docker restart family-flix-api"
# Option 3: Use the built-in restart command
: "${RESTART_CMD:=./$BINARY_NAME restart}"
# ========================================================

set -e

# Ensure we are in the project root
cd "$(dirname "$0")/.."

mkdir -p dist

# Version control
VERSION=$(grep '"version":' package.json | cut -d'"' -f4)
GIT_COMMIT=$(git rev-parse --short HEAD)
BUILD_VERSION="${VERSION}-${GIT_COMMIT}"

echo "🚧 Building Go binary for Linux/amd64 (Version: ${BUILD_VERSION}) with CGO enabled..."
# Build with optimizations (-s -w strips debug info to reduce size)
CC=x86_64-linux-musl-gcc CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build -trimpath -ldflags="-s -w -X main.version=${BUILD_VERSION} -extldflags -static" -o dist/$BINARY_NAME main.go

if [ ! -f "dist/$BINARY_NAME" ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Prepare SSH options
SSH_OPTS=""
if [ -n "$NAS_SSH_KEY" ]; then
  SSH_OPTS="-i $NAS_SSH_KEY"
fi

# SSH Multiplexing Setup to reduce password prompts
SOCKET_DIR="/tmp/family_flix_deploy_$$"
mkdir -p "$SOCKET_DIR"
SOCKET_PATH="$SOCKET_DIR/socket"

# Ensure cleanup on exit
cleanup() {
    # echo "🧹 Closing SSH connection..."
    ssh -S "$SOCKET_PATH" -O exit "$NAS_HOST" >/dev/null 2>&1 || true
    rm -rf "$SOCKET_DIR"
}
trap cleanup EXIT

echo "🔌 Establishing persistent SSH connection (you only need to enter password once)..."
# Start master connection
ssh -M -S "$SOCKET_PATH" -fN -p "$NAS_PORT" $SSH_OPTS "$NAS_HOST"

# Update SSH_OPTS to use the control socket for subsequent commands
SSH_OPTS="$SSH_OPTS -o ControlPath=$SOCKET_PATH"

echo "🚀 Uploading binary and config to NAS ($NAS_HOST:$NAS_PORT)..."
# Rename the existing binary on the server to avoid "Text file busy" error
ssh -p $NAS_PORT $SSH_OPTS $NAS_HOST "if [ -f $NAS_DIR/$BINARY_NAME ]; then mv $NAS_DIR/$BINARY_NAME $NAS_DIR/$BINARY_NAME.old; fi"

# Use -O for legacy SCP protocol if SFTP subsystem is not enabled
scp -O -P $NAS_PORT $SSH_OPTS dist/$BINARY_NAME $NAS_HOST:$NAS_DIR/$BINARY_NAME
scp -O -P $NAS_PORT $SSH_OPTS config.yaml $NAS_HOST:$NAS_DIR/config.yaml

echo "🔄 Restarting service on NAS..."
ssh -p $NAS_PORT $SSH_OPTS $NAS_HOST "cd $NAS_DIR && mkdir -p data && $RESTART_CMD"

# Check status after restart
echo "🔍 Checking service status..."
sleep 2
ssh -p $NAS_PORT $SSH_OPTS $NAS_HOST "cd $NAS_DIR && ./$BINARY_NAME status || (echo '❌ Service failed to start! Checking logs...' && cat daemon.log)"

echo "✅ Deployment completed successfully!"
