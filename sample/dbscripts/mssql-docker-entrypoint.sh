#!/bin/bash

# Start the script to run initial migrations
/usr/config/setup.sh &

# Start SQL Server
/opt/mssql/bin/sqlservr
