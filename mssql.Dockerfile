# mssql doesn't have an in-built way of initializing a database on
# container startup, hence we'll have to do some setup ourselves.
# Derived from: https://github.com/microsoft/mssql-docker/tree/master/linux/preview/examples/mssql-customize

FROM mcr.microsoft.com/mssql/server:2019-CU9-ubuntu-16.04

# Create a config directory
RUN mkdir -p /usr/config
WORKDIR /usr/config

# Bundle config source
COPY ./sample/dbscripts/mssql-docker-entrypoint.sh /usr/config/entrypoint.sh
COPY ./sample/dbscripts/mssql-docker-setup.sh /usr/config/setup.sh

ENTRYPOINT ["./entrypoint.sh"]
