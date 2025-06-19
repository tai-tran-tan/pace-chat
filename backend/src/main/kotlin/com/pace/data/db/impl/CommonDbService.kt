package com.pace.data.db.impl

import com.pace.data.db.DbAccessible
import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import io.klogging.java.LoggerFactory
import java.time.Instant
import java.util.UUID

internal class CommonDbService(
    val storage: DataSource
) : DbAccessible {
    private val logger = LoggerFactory.getLogger(this::class.java)

    // --- User Operations ---
    override suspend fun registerUser(user: User): User {
        return storage.addUser(user).also {
            logger.info("Registered user: ${user.username}")
        }
    }

    override suspend fun findUserByIds(userIds: List<String>): List<User> {
        return storage.findUserByIds(userIds)
    }

    override suspend fun authenticateUser(username: String, password: String): User? {
        return storage.authenticate(username, password)
    }

    override suspend fun findUserById(userId: String): User? {
        return storage.findUserById(userId)
    }

    override suspend fun findUserByUsername(username: String): User? {
        return storage.findUserByUsername(username)
    }

    override suspend fun findUserByEmail(email: String): User? {
        return storage.findUserByEmail(email);
    }

    override suspend fun searchUsers(query: String): List<User> {
        return storage.searchUsers(query)
    }

    override suspend fun updateUserProfile(
        userId: String,
        username: String?,
        email: String?,
        avatarUrl: String?
    ): User? {
        val user = storage.findUserById(userId)
        return user?.apply {
            if (username != null) this.username = username
            if (email != null) this.email = email
            if (avatarUrl != null) this.avatarUrl = avatarUrl
            storage.updateUser(user)
            logger.info("User $userId profile updated.")
        }
    }

    override suspend fun updateUserStatus(userId: String, status: String, lastSeen: Instant?) {
        storage.findUserById(userId)?.apply {
            this.status = status
            this.lastSeen = lastSeen
            storage.updateUser(this)
        }
    }

    override suspend fun addDeviceToken(userId: String, deviceToken: String, platform: String) {
        storage.addDeviceToken(DeviceToken(userId, deviceToken, platform, Instant.now()))
        // In a real app, you might want to replace existing tokens for a user/platform
    }

    // --- Conversation Operations ---
    override suspend fun getConversationsForUser(userId: String): List<Conversation> {
        return storage.getConversationsForUser(userId)
    }

    override suspend fun findConversationById(conversationId: String): Conversation? {
        return storage.findConversationById(conversationId)
    }

    override suspend fun findPrivateConversation(user1Id: String, user2Id: String): Conversation? {
        return storage.findPrivateConversation(user1Id, user2Id)
    }

    override suspend fun createPrivateConversation(user1Id: String, user2Id: String): Conversation {
        val user1 = storage.findUserById(user1Id)!!
        val user2 = storage.findUserById(user2Id)!!
        val newConv = Conversation(
            conversationId = "conv-private-${user1.username}-${user2.username}",
            type = "private",
            name = null,
            participants = mutableListOf(user1Id, user2Id),
            lastMessagePreview = null,
            lastMessageTimestamp = null,
            unreadCount = 0
        )
        storage.addConversation(newConv)
        user1.conversations.add(newConv.conversationId)
        user2.conversations.add(newConv.conversationId)
        storage.updateUser(user1)
        storage.updateUser(user2)
        logger.info("Created private conversation: ${newConv.conversationId}")
        return newConv
    }

    override suspend fun createGroupConversation(
        creatorId: String,
        name: String,
        participantIds: List<String>
    ): Conversation {
        val newConv = Conversation(
            conversationId = UUID.randomUUID().toString(),
            type = "group",
            name = name,
            participants = participantIds.toMutableList(),
            lastMessagePreview = null,
            lastMessageTimestamp = null,
            unreadCount = 0
        )
        storage.addConversation(newConv)
        participantIds.forEach {
            storage.findUserById(it)!!.apply {
                conversations.add(newConv.conversationId)
            }.let { storage.updateUser(it) }
        }
        logger.info("Created group conversation: ${newConv.conversationId}")
        return newConv
    }

    override suspend fun updateGroupParticipants(
        conversationId: String,
        addIds: List<String>?,
        removeIds: List<String>?
    ): Conversation? {
        val conversation = storage.findConversationById(conversationId)
        conversation?.let { conv ->
            if (conv.type != "group") return null

            val currentParticipantIds = conv.participants

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

            conv.participants = currentParticipantIds // Update the list reference
            logger.info("Updated participants for conversation: $conversationId")
            return storage.updateConversation(conv)
        }
        return null
    }

    // --- Message Operations ---
    override suspend fun getMessagesForConversation(
        conversationId: String,
        limit: Int,
        beforeMessageId: String?
    ): List<Message> {
        return storage.getMessagesForConversation(conversationId, limit, beforeMessageId)
    }

    override suspend fun hasMoreMessages(conversationId: String, oldestMessageId: String?): Boolean {
        if (oldestMessageId == null) return false
        val allMessages = storage.getMessagesForConversation(conversationId, beforeMessageId = oldestMessageId)
            .sortedBy { it.timestamp }

        val index = allMessages.indexOfFirst { it.messageId == oldestMessageId }
        return index > 0 // If index is > 0, there are messages before it
    }

    override suspend fun addMessage(
        conversationId: String,
        senderId: String,
        content: String,
        messageType: String,
        clientMessageId: String?
    ): Message? {
        val conversation = storage.findConversationById(conversationId)
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
            timestamp = Instant.now(),
            readBy = mutableListOf(senderId),
            clientMessageId = clientMessageId
        )
        storage.addMessage(newMessage)
        // Update last_message_preview and timestamp for the conversation directly
        // Note: For concurrent access, you might want to use atomic updates or
        // ensure this is done in a thread-safe manner depending on your actual DB.
        conversation.lastMessagePreview = content
        conversation.lastMessageTimestamp = newMessage.timestamp
        storage.updateConversation(conversation)
        logger.info("Message added: ${newMessage.messageId} in ${newMessage.conversationId}")
        return newMessage
    }

    override suspend fun markMessagesAsRead(
        conversationId: String,
        lastReadMessageId: String,
        readerId: String
    ): List<Message> {
        val updatedMessages = mutableListOf<Message>()
        var foundLastRead = false
        storage.getMessagesForConversation(conversationId, beforeMessageId = lastReadMessageId)
            .sortedByDescending{ it.timestamp }
            .forEach { msg ->
                if (msg.messageId == lastReadMessageId) {
                    foundLastRead = true
                }
                if (foundLastRead && !msg.readBy.contains(readerId)) {
                    msg.readBy.add(readerId)
                    updatedMessages.add(msg)
                } else if (!foundLastRead && msg.timestamp
                        .isAfter(storage.findMessageByMessageId(lastReadMessageId)!!.timestamp)
                    && !msg.readBy.contains(readerId)
                ) {
                    msg.readBy.add(readerId)
                    updatedMessages.add(msg)
                }
            }
        updatedMessages.forEach { storage.updateMessage(it) }
        logger.info("Marked ${updatedMessages.size} messages in conv $conversationId as read by $readerId up to $lastReadMessageId")
        return updatedMessages
    }
}