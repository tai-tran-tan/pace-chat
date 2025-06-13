KEYSPACE=pace_chat
SG_USERNAME=$1
SG_PASSWORD=$2
token=$(curl -L -X POST 'http://localhost:8081/v1/auth' \
  -H 'Content-Type: application/json' \
  --data-raw '{
    "username": "'"$SG_USERNAME"'",
    "password": "'"$SG_PASSWORD"'"
}' | jq -r '.authToken')

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
        "user_id"
      ]
    },
    "columnDefinitions": [
      { "name": "user_id", "typeDefinition": "text" },
      { "name": "username", "typeDefinition": "text" },
      { "name": "email", "typeDefinition": "text" },
      { "name": "password", "typeDefinition": "text" },
      { "name": "conversations", "typeDefinition": "list<text>" },
      { "name": "status", "typeDefinition": "text" },
      { "name": "avatar_url", "typeDefinition": "text" },
      { "name": "last_seen", "typeDefinition": "text" }
    ],
    "ifNotExists": true
  }'

curl -X 'POST' \
  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/users/indexes" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{
  "column": "username",
  "ifNotExists": true
}'

curl -X 'POST' \
  "http://localhost:8082/v2/schemas/keyspaces/$KEYSPACE/tables/users/indexes" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{
  "column": "email",
  "ifNotExists": true
}'

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
        "conversation_id"
      ],
      "clusteringKey":[
        "conversation_id","timestamp", "message_id"
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
    "ifNotExists": true,
    "tableOptions": {
        "clusteringExpression": [
          {
            "column": "timestamp",
            "order": "DESC"
          },
          {
            "column": "message_id",
            "order": "ASC"
          }
        ]
      }
  }'


curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/users" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"b1c2d3e4-f5a6-7890-1234-567890a",
  "username":"bob","email":"bob@example.com","password":"password123",
  "conversations":["conv-group-devs", "conv-private-alice-bob"],
  "status":"offline","avatar_url":"https://placehold.co/50x50/00ff00/ffffff?text=B","last_seen":"2025-06-06T14:00:00Z"}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/users" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"c1d2e3f4-a5b6-7890-1234-567890ab",
  "username":"charlie","email":"charlie@example.com","password":"password123",
  "conversations":["conv-group-devs"],
  "status":"online","avatar_url":"https://placehold.co/50x50/0000ff/ffffff?text=C","last_seen":null}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/users" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"user_id":"a1b2c3d4-e5f6-7890-1234-567890abc",
  "username":"alice","email":"alice@example.com","password":"password123",
  "conversations":["conv-group-devs","conv-private-alice-bob"],
  "status":"online","avatar_url":"https://placehold.co/50x50/ff0000/ffffff?text=A","last_seen":null}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/conversations" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":"conv-group-devs","type":"group","name":"Dev Team","participants":["a1b2c3d4-e5f6-7890-1234-567890a","b1c2d3e4-f5a6-7890-1234-567890ab","c1d2e3f4-a5b6-7890-1234-567890abc"],"last_message_preview":"Daily standup at 9 AM.","last_message_timestamp":"2025-06-05T09:00:00Z","unread_count":1}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/conversations" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"conversation_id":"conv-private-alice-bob","type":"private","name":null,"participants":["a1b2c3d4-e5f6-7890-1234-567890a","b1c2d3e4-f5a6-7890-1234-567890abc"],"last_message_preview":"Hey Bob!","last_message_timestamp":"2025-06-06T13:00:00Z","unread_count":0}'

curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-pvt-1","conversation_id":"conv-private-alice-bob","sender_id":"a1b2c3d4-e5f6-7890-1234-567890abc","content":"Hi Bob!","message_type":"text","timestamp":"2025-06-06T12:58:00Z","read_by":["b1c2d3e4-f5a6-7890-1234-567890a"]}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-pvt-2","conversation_id":"conv-private-alice-bob","sender_id":"b1c2d3e4-f5a6-7890-1234-567890a","content":"Hey Alice!","message_type":"text","timestamp":"2025-06-06T13:00:00Z"}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-group-1","conversation_id":"conv-group-devs","sender_id":"a1b2c3d4-e5f6-7890-1234-567890abc","content":"Good morning team!","message_type":"text","timestamp":"2025-06-05T08:55:00Z","read_by":["b1c2d3e4-f5a6-7890-1234-567890ab"]}'
curl -X 'POST' \
  "http://localhost:8082/v2/keyspaces/$KEYSPACE/messages" \
  -H 'accept: application/json' \
  -H 'X-Cassandra-Token: '"$token" \
  -H 'Content-Type: application/json' \
  -d '{"message_id":"msg-group-2","conversation_id":"conv-group-devs","sender_id":"c1d2e3f4-a5b6-7890-1234-567890abc","content":"Daily standup at 9 AM.","message_type":"text","timestamp":"2025-06-05T09:00:00Z"}'