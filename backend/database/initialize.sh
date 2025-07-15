KEYSPACE=pace_chat
SG_USERNAME=$1
SG_PASSWORD=$2
if [[ -z "$SG_USERNAME" || -z "$SG_PASSWORD" ]]; then
  echo "Missing credentials"
  exit 1
fi

token=$(curl -L -X POST 'http://localhost:8081/v1/auth' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "username": "'"$SG_USERNAME"'",
    "password": "'"$SG_PASSWORD"'"
}' | cut -d: -f2 |cut -d'"' -f2)

if [[ -z "$token"  ]]; then
  echo "Authentication failed"
  exit 1
else
  echo "Authenticated"
fi
curl -X 'POST' \
  'http://localhost:8082/v2/schemas/keyspaces' \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{ "name": "'$KEYSPACE'", "replicas": 1}'
curl -X 'POST' \
    "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables" \
    -H 'accept: application/json' \
    -H 'X-Cassandra-Token: '"$token" \
    -H 'Content-Type: application/json' \
    -d '{
    "name": "users",
    "primaryKey": {
      "partitionKey": [
        "username", "email"
      ],
      "clusteringKey": [
        "registration_date"
      ]
    },
    "columnDefinitions": [
      { "name": "username", "typeDefinition": "text" },
      { "name": "email", "typeDefinition": "text" },
      { "name": "display_name", "typeDefinition": "text" },
      { "name": "password", "typeDefinition": "text" },
      { "name": "registration_date", "typeDefinition": "timestamp" },
      { "name": "conversations", "typeDefinition": "list<text>" },
      { "name": "status", "typeDefinition": "text" },
      { "name": "avatar_url", "typeDefinition": "text" },
      { "name": "last_seen", "typeDefinition": "text" }
    ],
    "ifNotExists": true
  }'

#curl -X 'POST' \
#  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/users/indexes" \
#  -H 'accept: application/json' \
#  -H 'X-Cassandra-Token: '"$token" \
#  -H 'Content-Type: application/json' \
#  -d '{
#  "column": "username",
#  "ifNotExists": true
#}'
#
#curl -X 'POST' \
#  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/users/indexes" \
#  -H 'accept: application/json' \
#  -H 'X-Cassandra-Token: '"$token" \
#  -H 'Content-Type: application/json' \
#  -d '{
#  "column": "email",
#  "ifNotExists": true
#}'

curl -X 'POST' \
    "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables" \
    -H 'accept: application/json' \
    -H 'X-Cassandra-Token: '"$token" \
    -H 'Content-Type: application/json' \
    -d '{
    "name": "conversations",
    "primaryKey": {
      "partitionKey": [
        "conversation_id"
      ]
    },
    "columnDefinitions": [
      { "name": "conversation_id", "typeDefinition": "text" },
      { "name": "type", "typeDefinition": "text" },
      { "name": "name", "typeDefinition": "text" },
      { "name": "participants", "typeDefinition": "list<text>" },
      { "name": "last_message_preview", "typeDefinition": "text" },
      { "name": "last_message_timestamp", "typeDefinition": "text" },
      { "name": "unread_count", "typeDefinition": "int" }
    ],
    "ifNotExists": true
  }'

curl -X 'POST' \
    "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables" \
    -H 'accept: application/json' \
    -H 'X-Cassandra-Token: '"$token" \
    -H 'Content-Type: application/json' \
    -d '{
    "name": "messages",
    "primaryKey": {
      "partitionKey": [
        "message_id"
      ]
    },
    "columnDefinitions": [
      { "name": "message_id", "typeDefinition": "text" },
      { "name": "conversation_id", "typeDefinition": "text" },
      { "name": "sender_id", "typeDefinition": "text" },
      { "name": "content", "typeDefinition": "text" },
      { "name": "message_type", "typeDefinition": "text" },
      { "name": "timestamp", "typeDefinition": "text" },
      { "name": "read_by", "typeDefinition": "list<text>" },
      { "name": "client_message_id", "typeDefinition": "text" }
    ],
    "ifNotExists": true
  }'

curl -X 'POST' \
  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/messages/indexes" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{
  "column": "sender_id",
  "ifNotExists": true
}'

curl -X 'POST' \
  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/messages/indexes" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{
  "column": "conversation_id",
  "ifNotExists": true
}'

curl -X 'POST' \
  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/messages/indexes" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{
  "column": "message_type",
  "ifNotExists": true
}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/users" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"username":"bob","email":"bob@example.com",
  "password":"ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
  "conversations":["conv-group-devs", "conv-private-alice-bob"],
  "registration_date":"'"$(date -Iseconds)"'",
  "status":"offline","avatar_url":"https://placehold.co/50x50/00ff00/ffffff?text=B",
  "last_seen":"2025-06-06T14:00:00.0Z"}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/users" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"username":"charlie","email":"charlie@example.com",
  "password":"ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
  "conversations":["conv-group-devs"],
  "registration_date":"'"$(date -Iseconds)"'",
  "status":"online","avatar_url":"https://placehold.co/50x50/0000ff/ffffff?text=C",
  "last_seen":null}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/users" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"username":"alice","email":"alice@example.com",
  "password":"ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f",
  "conversations":["conv-group-devs","conv-private-alice-bob"],
  "registration_date":"'"$(date -Iseconds)"'",
  "status":"online","avatar_url":"https://placehold.co/50x50/ff0000/ffffff?text=A",
  "last_seen":null}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/conversations" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":"conv-group-devs","type":"group","name":"Dev Team","participants":["b1c2d3e4-f5a6-7890-1234-567890a","b1c2d3e4-f5a6-7890-1234-567890ab","c1d2e3f4-a5b6-7890-1234-567890abc"],"last_message_preview":"Daily standup at 9 AM.","last_message_timestamp":"2025-06-05T09:00:00.0Z","unread_count":1}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/conversations" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":"conv-private-alice-bob","type":"private","name":null,"participants":["b1c2d3e4-f5a6-7890-1234-567890a","b1c2d3e4-f5a6-7890-1234-567890abc"],"last_message_preview":"Hey Bob!","last_message_timestamp":"2025-06-06T13:00:00.0Z","unread_count":0}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-pvt-1","conversation_id":"conv-private-alice-bob","sender_id":"a1b2c3d4-e5f6-7890-1234-567890abc","content":"Hi Bob!","message_type":"text","timestamp":"2025-06-06T12:58:00.0Z","read_by":["b1c2d3e4-f5a6-7890-1234-567890a"]}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-pvt-2","conversation_id":"conv-private-alice-bob","sender_id":"b1c2d3e4-f5a6-7890-1234-567890a","content":"Hey Alice!","message_type":"text","timestamp":"2025-06-06T13:00:00.0Z"}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-group-1","conversation_id":"conv-group-devs","sender_id":"a1b2c3d4-e5f6-7890-1234-567890abc","content":"Good morning team!","message_type":"text","timestamp":"2025-06-05T08:55:00.0Z","read_by":["b1c2d3e4-f5a6-7890-1234-567890ab"]}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-group-2","conversation_id":"conv-group-devs","sender_id":"c1d2e3f4-a5b6-7890-1234-567890abc","content":"Daily standup at 9 AM.","message_type":"text","timestamp":"2025-06-05T09:00:00.0Z"}'