package com.pace.data.db.impl

import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import io.klogging.java.LoggerFactory
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

internal class InMemoryDataSource : DataSource {
    private val logger = LoggerFactory.getLogger(this::class.java)

    // Using ConcurrentHashMap for map-like data structures that might be modified concurrently
    // For lists, CopyOnWriteArrayList is an option if writes are infrequent compared to reads,
    // otherwise, manual synchronization (like synchronized blocks) or atomic updates are needed.
    // For simplicity in this fake backend, direct mutable lists with careful access are used,
    // but in a real Vert.x app, you'd use proper reactive databases.

    val users = ConcurrentHashMap<String, User>()
    val conversations = ConcurrentHashMap<String, Conversation>()
    val messages = CopyOnWriteArrayList<Message>() // Good for frequently read, infrequently written lists
    val deviceTokens = CopyOnWriteArrayList<DeviceToken>()

    init {
        // Clear previous data if init is called multiple times
        users.clear()
        conversations.clear()
        messages.clear()
        deviceTokens.clear()

        // Initialize with dummy data matching db.json
        val aliceId = "a1b2c3d4-e5f6-7890-1234-567890abcdef"
        val bobId = "b1c2d3e4-f5a6-7890-1234-567890abcdef"
        val charlieId = "c1d2e3f4-a5b6-7890-1234-567890abcdef"

        val alice = User(
            aliceId,
            "alice",
            "alice@example.com",
            "password123",
            "online",
            mutableListOf(),
            "https://placehold.co/50x50/ff0000/ffffff?text=A",
            null
        )
        val bob = User(
            bobId,
            "bob",
            "bob@example.com",
            "password123",
            "offline",
            mutableListOf(),
            "https://placehold.co/50x50/00ff00/ffffff?text=B",
            Instant.parse("2025-06-06T14:00:00Z")
        )
        val charlie = User(
            charlieId,
            "charlie",
            "charlie@example.com",
            "password123",
            "online",
            mutableListOf(),
            "https://placehold.co/50x50/0000ff/ffffff?text=C",
            null
        )

        users[aliceId] = alice
        users[bobId] = bob
        users[charlieId] = charlie

        val alicePublic = alice.toUserPublic()
        val bobPublic = bob.toUserPublic()
        val charliePublic = charlie.toUserPublic()

        val privateConvId = "conv-private-alice-bob"
        val privateConv = Conversation(
            privateConvId,
            "private",
            null,
            mutableListOf(bobId, aliceId),
            "Hey Bob!",
            Instant.parse("2025-06-06T13:00:00Z"),
            0
        )
        conversations[privateConvId] = privateConv

        val groupConvId = "conv-group-devs"
        val groupConv = Conversation(
            groupConvId,
            "group",
            "Dev Team",
            mutableListOf(aliceId, bobId, charlieId),
            "Daily standup at 9 AM.",
            Instant.parse("2025-06-05T09:00:00Z"),
            1
        )
        conversations[groupConvId] = groupConv

        messages.add(
            Message(
                "msg-pvt-1",
                privateConvId,
                aliceId,
                "Hi Bob!",
                "text",
                Instant.parse("2025-06-06T12:58:00Z"),
                mutableListOf(bobId)
            )
        )
        messages.add(
            Message(
                "msg-pvt-2",
                privateConvId,
                bobId,
                "Hey Alice!",
                "text",
                Instant.parse("2025-06-06T13:00:00Z"),
                mutableListOf()
            )
        )
        messages.add(
            Message(
                "msg-group-1",
                groupConvId,
                aliceId,
                "Good morning team!",
                "text",
                Instant.parse("2025-06-05T08:55:00Z"),
                mutableListOf(bobId)
            )
        )
        messages.add(
            Message(
                "msg-group-2",
                groupConvId,
                charlieId,
                "Daily standup at 9 AM.",
                "text",
                Instant.parse("2025-06-05T09:00:00Z"),
                mutableListOf()
            )
        )

        logger.info("InMemoryDatabase initialized with dummy data.")
    }

    override suspend fun addUser(user: User): User {
        users[user.userId] = user
        return user
    }

    override suspend fun authenticate(username: String, password: String): User? {
        return users.values.find { it.username == username && it.password == password }
    }

    override suspend fun findUserById(userId: String): User? {
        return users[userId]
    }

    override suspend fun findUserByUsername(username: String): User? {
        return users.values.find { it.username == username }
    }

    override suspend fun findUserByEmail(email: String): User? {
        return users.values.find { it.email == email }
    }

    override suspend fun searchUsers(query: String): List<User> {
        return users.values.filter { it.username.contains(query, ignoreCase = true) || it.email.contains(query, ignoreCase = true) }
    }

    override suspend fun updateUser(user: User): User {
        users[user.userId] = user
        return user
    }

    override suspend fun addDeviceToken(deviceToken: DeviceToken) {
        deviceTokens.add(deviceToken)
        // In a real app, you might want to replace existing tokens for a user/platform
    }

    // --- Conversation Operations ---
    override suspend fun getConversationsForUser(userId: String): List<Conversation> {
        return conversations.values
            .filter { conv -> conv.participants.any { it == userId } }
            .sortedByDescending { it.lastMessageTimestamp ?: java.time.Instant.MIN }
    }

    override suspend fun findConversationById(conversationId: String): Conversation? {
        return conversations[conversationId]
    }

    override suspend fun findPrivateConversation(user1Id: String, user2Id: String): Conversation? {
        return conversations.values.find { conv ->
            conv.type == "private" &&
                    conv.participants.size == 2 &&
                    conv.participants.any { it == user1Id } &&
                    conv.participants.any { it == user2Id }
        }
    }

    override suspend fun addConversation(newConv: Conversation): Conversation {
        conversations[newConv.conversationId] = newConv
        return newConv
    }

    override suspend fun updateConversation(conv: Conversation): Conversation {
        conversations[conv.conversationId] = conv
        return conv
    }

    override suspend fun updateMessage(message: Message): Message {
        return message // no action due to ref-modification
    }

    override suspend fun findUserByIds(userIds: List<String>): List<User> {
        return users.filter { (k, _) -> userIds.contains(k) }.values.toList()
    }

    // --- Message Operations ---
    override suspend fun getMessagesForConversation(conversationId: String, limit: Int, beforeMessageId: String?): List<Message> {
        var filteredMessages = messages.filter { it.conversationId == conversationId }
            .sortedByDescending { it.timestamp } // Ensure sorted by timestamp descending

        if (beforeMessageId != null) {
            val index = filteredMessages.indexOfFirst { it.messageId == beforeMessageId }
            if (index != -1) {
                filteredMessages = filteredMessages.take(index)
            }
        }

        return filteredMessages.takeLast(limit) // Return the last 'limit' messages
    }

    override suspend fun addMessage(newMessage: Message): Message {
        messages.add(newMessage)
        return newMessage
    }

    override suspend fun findMessageByMessageId(messageId: String): Message? {
        return messages.find { it.messageId == messageId }
    }
}
