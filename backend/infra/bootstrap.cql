CREATE KEYSPACE if not exists pace_chat WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': '1'
}  AND durable_writes = true;

CREATE TABLE if not exists conversations_by_user (
    user_id uuid,
    conv_id timeuuid,
    title text,
    type varchar,
    exited_time timestamp,
    PRIMARY KEY ((user_id), conv_id)
) with clustering order by (conv_id asc);

create index if not exists on conversations_by_user(conv_id);

CREATE TABLE if not exists messages_by_conversation (
    conv_id timeuuid,
    sender_id uuid,
    message_id timeuuid,
    content text,
    type varchar,
    read_by list<uuid>,
    PRIMARY KEY ((conv_id), message_id, sender_id)
) with clustering order by (message_id asc, sender_id asc);