package com.pace.data

import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import io.klogging.java.LoggerFactory
import kotlinx.datetime.Clock
import kotlinx.datetime.Instant
import kotlinx.datetime.toJavaInstant
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.CopyOnWriteArrayList

object InMemoryDatabase {
    private val logger = LoggerFactory.getLogger(this::class.java)

    // Using ConcurrentHashMap for map-like data structures that might be modified concurrently
    // For lists, CopyOnWriteArrayList is an option if writes are infrequent compared to reads,
    // otherwise, manual synchronization (like synchronized blocks) or atomic updates are needed.
    // For simplicity in this fake backend, direct mutable lists with careful access are used,
    // but in a real Vert.x app, you'd use proper reactive databases.

    private val users = ConcurrentHashMap<String, User>()
    private val conversations = ConcurrentHashMap<String, Conversation>()
    private val messages = CopyOnWriteArrayList<Message>() // Good for frequently read, infrequently written lists
    private val deviceTokens = CopyOnWriteArrayList<DeviceToken>()

    fun init() {
        // Clear previous data if init is called multiple times
        users.clear()
        conversations.clear()
        messages.clear()
        deviceTokens.clear()

        // Initialize with dummy data matching db.json
        val aliceId = "a1b2c3d4-e5f6-7890-1234-567890abcdef"
        val bobId = "b1c2d3e4-f5a6-7890-1234-567890abcdef"
        val charlieId = "c1d2e3f4-a5b6-7890-1234-567890abcdef"

        val alice = User(aliceId, "alice", "alice@example.com", "password123", "online", "https://placehold.co/50x50/ff0000/ffffff?text=A", null)
        val bob = User(bobId, "bob", "bob@example.com", "password123", "offline", "https://placehold.co/50x50/00ff00/ffffff?text=B", Instant.parse("2025-06-06T14:00:00Z"))
        val charlie = User(charlieId, "charlie", "charlie@example.com", "password123", "online", "https://placehold.co/50x50/0000ff/ffffff?text=C", null)

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
            listOf(alicePublic, bobPublic),
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
            listOf(alicePublic, bobPublic, charliePublic),
            "Daily standup at 9 AM.",
            Instant.parse("2025-06-05T09:00:00Z"),
            1
        )
        conversations[groupConvId] = groupConv

        messages.add(Message("msg-pvt-1", privateConvId, aliceId, "Hi Bob!", "text", Instant.parse("2025-06-06T12:58:00Z"), mutableListOf(bobId)))
        messages.add(Message("msg-pvt-2", privateConvId, bobId, "Hey Alice!", "text", Instant.parse("2025-06-06T13:00:00Z"), mutableListOf()))
        messages.add(Message("msg-group-1", groupConvId, aliceId, "Good morning team!", "text", Instant.parse("2025-06-05T08:55:00Z"), mutableListOf(bobId)))
        messages.add(Message("msg-group-2", groupConvId, charlieId, "Daily standup at 9 AM.", "text", Instant.parse("2025-06-05T09:00:00Z"), mutableListOf()))

        logger.info("InMemoryDatabase initialized with dummy data.")
    }

    // --- User Operations ---
    fun registerUser(username: String, email: String, password: String): User {
        val newUser = User(
            userId = UUID.randomUUID().toString(),
            username = username,
            email = email,
            password = password,
            status = "offline",
            avatarUrl = "https://placehold.co/50x50/${(0..0xFFFFFF).random().toString(16).padStart(6, '0')}/ffffff?text=${username.first().uppercase()}",
            lastSeen = null
        )
        users[newUser.userId] = newUser
        logger.info("Registered user: ${newUser.username}")
        return newUser
    }

    fun authenticateUser(username: String, password: String): User? {
        return users.values.find { it.username == username && it.password == password }
    }

    fun findUserById(userId: String): User? {
        return users[userId]
    }

    fun findUserByUsername(username: String): User? {
        return users.values.find { it.username == username }
    }

    fun findUserByEmail(email: String): User? {
        return users.values.find { it.email == email }
    }

    fun searchUsers(query: String): List<User> {
        return users.values.filter { it.username.contains(query, ignoreCase = true) || it.email.contains(query, ignoreCase = true) }
    }

    fun updateUserProfile(userId: String, username: String?, email: String?, avatarUrl: String?): User? {
        val user = users[userId]
        user?.apply {
            if (username != null) this.username = username
            if (email != null) this.email = email
            if (avatarUrl != null) this.avatarUrl = avatarUrl
        }
        logger.info("User $userId profile updated.")
        return user
    }

    fun updateUserStatus(userId: String, status: String, lastSeen: Instant?) {
        users[userId]?.apply {
            this.status = status
            this.lastSeen = lastSeen
        }
    }

    fun addDeviceToken(userId: String, deviceToken: String, platform: String) {
        deviceTokens.add(DeviceToken(userId, deviceToken, platform, Clock.System.now()))
        // In a real app, you might want to replace existing tokens for a user/platform
    }

    // --- Conversation Operations ---
    fun getConversationsForUser(userId: String): List<Conversation> {
        return conversations.values
            .filter { conv -> conv.participants.any { it.userId == userId } }
            .sortedByDescending { it.lastMessageTimestamp?.toJavaInstant() ?: java.time.Instant.MIN }
    }

    fun findConversationById(conversationId: String): Conversation? {
        return conversations[conversationId]
    }

    fun findPrivateConversation(user1Id: String, user2Id: String): Conversation? {
        return conversations.values.find { conv ->
            conv.type == "private" &&
                    conv.participants.size == 2 &&
                    conv.participants.any { it.userId == user1Id } &&
                    conv.participants.any { it.userId == user2Id }
        }
    }

    fun createPrivateConversation(user1Id: String, user2Id: String): Conversation {
        val user1 = users[user1Id]!!.toUserPublic()
        val user2 = users[user2Id]!!.toUserPublic()
        val newConv = Conversation(
            conversationId = UUID.randomUUID().toString(),
            type = "private",
            name = null,
            participants = listOf(user1, user2),
            lastMessagePreview = null,
            lastMessageTimestamp = null,
            unreadCount = 0
        )
        conversations[newConv.conversationId] = newConv
        logger.info("Created private conversation: ${newConv.conversationId}")
        return newConv
    }

    fun createGroupConversation(creatorId: String, name: String, participantIds: List<String>): Conversation {
        val participantsList = participantIds.mapNotNull { findUserById(it)?.toUserPublic() }
        val newConv = Conversation(
            conversationId = UUID.randomUUID().toString(),
            type = "group",
            name = name,
            participants = participantsList,
            lastMessagePreview = null,
            lastMessageTimestamp = null,
            unreadCount = 0
        )
        conversations[newConv.conversationId] = newConv
        logger.info("Created group conversation: ${newConv.conversationId}")
        return newConv
    }

    fun updateGroupParticipants(conversationId: String, addIds: List<String>?, removeIds: List<String>?): Conversation? {
        val conversation = conversations[conversationId]
        conversation?.let { conv ->
            if (conv.type != "group") return null

            val currentParticipantIds = conv.participants.map { it.userId }.toMutableSet()

            addIds?.forEach { idToAdd ->
                if (findUserById(idToAdd) != null) {
                    currentParticipantIds.add(idToAdd)
                }
            }
            removeIds?.forEach { idToRemove ->
                currentParticipantIds.remove(idToRemove)
            }

            if (currentParticipantIds.isEmpty()) {
                logger.warn("Attempted to remove all participants from group $conversationId. Preventing.")
                return null // Prevent empty group
            }

            val newParticipants = currentParticipantIds.mapNotNull { findUserById(it)?.toUserPublic() }
            conv.participants = newParticipants // Update the list reference
            logger.info("Updated participants for conversation: $conversationId")
            return conv
        }
        return null
    }

    // --- Message Operations ---
    fun getMessagesForConversation(conversationId: String, limit: Int, beforeMessageId: String?): List<Message> {
        var filteredMessages = messages.filter { it.conversationId == conversationId }
            .sortedBy { it.timestamp } // Ensure sorted by timestamp ascending

        if (beforeMessageId != null) {
            val index = filteredMessages.indexOfFirst { it.messageId == beforeMessageId }
            if (index != -1) {
                filteredMessages = filteredMessages.take(index)
            }
        }

        return filteredMessages.takeLast(limit) // Return the last 'limit' messages
    }

    fun hasMoreMessages(conversationId: String, oldestMessageId: String?): Boolean {
        if (oldestMessageId == null) return false
        val allMessages = messages.filter { it.conversationId == conversationId }
            .sortedBy { it.timestamp }

        val index = allMessages.indexOfFirst { it.messageId == oldestMessageId }
        return index > 0 // If index is > 0, there are messages before it
    }

    fun addMessage(
        conversationId: String,
        senderId: String,
        content: String,
        messageType: String,
        clientMessageId: String?
    ): Message? {
        val conversation = conversations[conversationId]
        if (conversation == null) {
            logger.warn("Attempted to add message to non-existent conversation: $conversationId")
            return null
        }
        val newMessage = Message(
            messageId = UUID.randomUUID().toString(),
            conversationId = conversationId,
            senderId = senderId,
            content = content,
            messageType = messageType,
            timestamp = Clock.System.now(),
            readBy = mutableListOf(senderId),
            clientMessageId = clientMessageId
        )
        messages.add(newMessage)
        // Update last_message_preview and timestamp for the conversation directly
        // Note: For concurrent access, you might want to use atomic updates or
        // ensure this is done in a thread-safe manner depending on your actual DB.
        conversation.lastMessagePreview = content
        conversation.lastMessageTimestamp = newMessage.timestamp
        logger.info("Message added: ${newMessage.messageId} in ${newMessage.conversationId}")
        return newMessage
    }

    fun markMessagesAsRead(conversationId: String, lastReadMessageId: String, readerId: String): List<Message> {
        val updatedMessages = mutableListOf<Message>()
        val relevantMessages = messages
            .filter { it.conversationId == conversationId }
            .sortedBy { it.timestamp }

        var foundLastRead = false
        for (msg in relevantMessages) {
            if (msg.messageId == lastReadMessageId) {
                foundLastRead = true
            }
            if (foundLastRead && !msg.readBy.contains(readerId)) {
                msg.readBy.add(readerId)
                updatedMessages.add(msg)
            } else if (!foundLastRead && msg.timestamp.toJavaInstant().isBefore(messages.first { it.messageId == lastReadMessageId }.timestamp.toJavaInstant()) && !msg.readBy.contains(readerId)) {
                msg.readBy.add(readerId)
                updatedMessages.add(msg)
            }
        }
        logger.info("Marked ${updatedMessages.size} messages in conv $conversationId as read by $readerId up to $lastReadMessageId")
        return updatedMessages
    }
}