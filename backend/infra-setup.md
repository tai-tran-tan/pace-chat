1. Start Cassandra and startgate
```bash
docker compose -f docker-compose.yaml up -d
```
2. Create schema and dummy data
```bash
sudo chmod +x ./database/initialize.sh
./database/initialize.sh cassandra cassandra
```