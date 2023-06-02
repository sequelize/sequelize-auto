FROM debian:stable-slim

RUN apt-get update && \
	apt-get -yq --no-install-recommends install sqlite3=3.* && \
	mkdir -p /usr/db

WORKDIR /usr/db

CMD truncate -s 0 northwind.sqlite && \
  sqlite3 northwind.sqlite < sqlite-sample-model.sql && \
  sqlite3 northwind.sqlite < sqlite-sample-data.sql
