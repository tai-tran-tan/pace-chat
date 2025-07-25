# Developer Setup Instructions
### Start Cassandra and Keycloak + Postgres
```bash
  docker compose -f docker-compose.yaml up -d
```
### Copy cql script into Cassandra container
```bash
  docker cp infra/bootstrap.cql cassandra-db:/tmp
```
### Execute the cql script to create required keyspaces, tables and indices
Since docker volumes are separated from containers, you only need to run this script once. It will not be deleted even if the container is removed.
```bash
  docker exec -it cassandra-db cqlsh -f /tmp/bootstrap.cql
```
