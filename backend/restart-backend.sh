#!/bin/bash

APP_NAME="sspl-backend"
APP_PATH="/var/www/vhosts/ssplt10.cloud/httpdocs_live/httpdocs/backend/server.cjs"
PORT=3001

echo "Stopping PM2 process if exists..."
pm2 stop $APP_NAME 2>/dev/null
pm2 delete $APP_NAME 2>/dev/null

echo "Killing any processes using port $PORT..."
sudo lsof -t -i :$PORT | xargs -r sudo kill -9

echo "Confirming port $PORT is free..."
sudo lsof -i :$PORT
if [ $? -eq 1 ]; then
    echo "Port $PORT is free."
else
    echo "WARNING: Port $PORT still in use!"
fi

echo "Starting backend with PM2..."
pm2 start $APP_PATH --name $APP_NAME --node-args="--experimental-fetch"

echo "Tailing the last 50 lines of logs..."
pm2 logs $APP_NAME --lines 50
