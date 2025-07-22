package com.pace.data.db.impl

import com.datastax.oss.driver.api.core.uuid.Uuids
import com.pace.data.db.DbAccessible
import com.pace.data.model.Conversation
import com.pace.data.model.Message
import com.pace.data.model.ProfileUpdate
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import org.apache.logging.log4j.kotlin.logger
import java.time.Instant
import java.util.UUID

internal class CommonDbService(
    val storage: DataSource
) : DbAccessible {

    // --- User Operations ---
    override suspend fun registerUser(user: User) {
        storage.register(user).also {
            LOGGER.info("Registered user: ${user.username}")
        }
    }

    override suspend fun findUserByIds(userIds: List<UUID>): List<User> {
        return storage.findUserByIds(userIds)
    }

    override suspend fun authenticateUser(username: String, password: String): AuthenticationResponse? {
        return storage.authenticate(username, password)
    }

    override suspend fun refreshToken(refreshToken: String): AuthenticationResponse? {
        return storage.refreshToken(refreshToken)
    }

    override suspend fun getUserInfo(token: String): User? {
        return storage.getUserInfo(token)
    }

    override suspend fun findUserById(userId: UUID): User? {
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
        userId: UUID,
        update: ProfileUpdate,
    ) {
            storage.updateUser(User(
                userId,
                null,
                update.firstName,
                update.lastName,
                update.email,
                null,
                status = null,
                avatarUrl = update.avatarUrl,
                null
                ))
            LOGGER.info("User $userId profile updated.")
    }

    override suspend fun updateUserStatus(userId: UUID, status: String, lastSeen: Instant?) {
        val user = User(
            userId = userId,
            username = null,
            firstName = null,
            lastName = null,
            email = null,
            password = null,
            avatarUrl = null,
            status = status,
            lastSeen = lastSeen
        )
        storage.updateUser(user)
    }

    override suspend fun addDeviceToken(userId: UUID, deviceToken: String, platform: String) {
//        storage.addDeviceToken(DeviceToken(userId, deviceToken, platform, Instant.now()))
        // In a real app, you might want to replace existing tokens for a user/platform
    }

    // --- Conversation Operations ---
    override suspend fun getConversationsForUser(userId: UUID): List<Conversation> {
        return storage.getConversationsForUser(userId)
    }

    override suspend fun findConversationById(conversationId: UUID): Conversation? {
        return storage.findConversationById(conversationId)
    }

    override suspend fun findPrivateConversation(user1Id: UUID, user2Id: UUID): Conversation? {
        return storage.findPrivateConversation(user1Id, user2Id)
    }

    override suspend fun createPrivateConversation(user1Id: UUID, user2Id: UUID): Conversation {
        val user1 = storage.findUserById(user1Id)!!
        val user2 = storage.findUserById(user2Id)!!
        val newConv = Conversation(
            user1.userId,
            type = "private",
            title = "private-conv-${user1.username}-and-${user2.username}",
            lastMessagePreview = null,
            lastMessageTimestamp = null,
        )
        storage.addConversation(newConv)
        storage.addConversation(newConv.copy(userId = user2Id))
        LOGGER.info("Created private conversation: ${newConv.convId}")
        return newConv
    }

    override suspend fun createGroupConversation(
        creatorId: UUID,
        title: String,
        participantIds: List<UUID>
    ): Conversation {
        val newConv = Conversation(
            userId = creatorId,
            convId = UUID.randomUUID(),
            type = "group",
            title = title,
            participants = participantIds.toMutableSet(),
            lastMessagePreview = null,
            lastMessageTimestamp = null,
        )
        participantIds.firstOrNull { id -> storage.findUserById(id) == null}
            ?.let { throw IllegalArgumentException("Nonexisted user $it") }

        storage.addConversation(newConv)
        participantIds.forEach {
            storage.addConversation(newConv.copy(userId = it))
        }

        LOGGER.info("Created group conversation: ${newConv.convId}")
        return newConv
    }

    override suspend fun updateGroupParticipants(
        conversationId: UUID,
        addIds: List<UUID>?,
        removeIds: List<UUID>?
    ): Boolean {
        val conversation = storage.findConversationById(conversationId)
        if (conversation == null || conversation.type != "group") return false

        val currentParticipantIds = conversation.participants

        if (addIds?.all { findUserById(it) != null } == true) {
            addIds.forEach {
                storage.addConversation(conversation.copy(userId = it))
                currentParticipantIds.add(it)
            }
        }


        if (currentParticipantIds == removeIds) {
            LOGGER.warn("Attempted to remove all participants from group $conversationId. Preventing.")
            return false // Prevent empty group
        }

        removeIds?.forEach{
            storage.updateConversation(
                conversation.copy(userId = it, exitedTime = Instant.now())
            )
        }

        conversation.participants = currentParticipantIds // Update the list reference
        LOGGER.info("Updated participants for conversation: $conversationId")
        return storage.updateConversation(conversation)
    }

    // --- Message Operations ---
    override suspend fun getMessagesForConversation(
        conversationId: UUID,
        limit: Int,
        beforeMessageId: UUID?
    ): List<Message> {
        return storage.getMessagesForConversation(conversationId, limit, beforeMessageId)
    }

    override suspend fun hasMoreMessages(conversationId: UUID, oldestMessageId: UUID?): Boolean {
        if (oldestMessageId == null) return false
        val allMessages = storage.getMessagesForConversation(conversationId, beforeMessageId = oldestMessageId)
            .sortedBy { it.timestamp }

        return allMessages.any { it.messageId == oldestMessageId }
    }

    override suspend fun addMessage(
        conversationId: UUID,
        senderId: UUID,
        content: String,
    ): Message? {
        val conversation = storage.findConversationById(conversationId)
        if (conversation == null) {
            LOGGER.warn("Attempted to add message to non-existent conversation: $conversationId")
            return null
        }
        val newMessage = Message(
            messageId = Uuids.timeBased(),
            convId = conversationId,
            senderId = senderId,
            content = content,
            readBy = mutableListOf(senderId),
        )
        storage.addMessage(newMessage)
        // Update last_message_preview and timestamp for the conversation directly
        // Note: For concurrent access, you might want to use atomic updates or
        // ensure this is done in a thread-safe manner depending on your actual DB.
        storage.updateConversation(conversation)
        LOGGER.info("Message added: ${newMessage.messageId} in ${newMessage.convId}")
        return newMessage
    }

    override suspend fun markMessagesAsRead(
        conversationId: UUID,
        lastReadMessageId: UUID,
        readerId: UUID
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
        LOGGER.info("Marked ${updatedMessages.size} messages in conv $conversationId as read by $readerId up to $lastReadMessageId")
        return updatedMessages
    }

    companion object {
        private val LOGGER = logger()
    }
}