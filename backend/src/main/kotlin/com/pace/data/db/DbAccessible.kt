package com.pace.data.db

import com.pace.data.model.Conversation
import com.pace.data.model.Message
import com.pace.data.model.User
import java.time.Instant

interface DbAccessible {
    suspend fun findUserByUsername(username: String): User?
    suspend fun markMessagesAsRead(conversationId: String, lastReadMessageId: String, readerId: String): List<Message>
    suspend fun addMessage(
        conversationId: String,
        senderId: String,
        content: String,
        messageType: String,
        clientMessageId: String?
    ): Message?

    suspend fun hasMoreMessages(conversationId: String, oldestMessageId: String?): Boolean
    suspend fun getMessagesForConversation(conversationId: String, limit: Int, beforeMessageId: String?): List<Message>
    suspend fun updateGroupParticipants(conversationId: String, addIds: List<String>?, removeIds: List<String>?): Conversation?
    suspend fun createGroupConversation(creatorId: String, name: String, participantIds: List<String>): Conversation
    suspend fun createPrivateConversation(user1Id: String, user2Id: String): Conversation
    suspend fun findPrivateConversation(user1Id: String, user2Id: String): Conversation?
    suspend fun findConversationById(conversationId: String): Conversation?
    suspend fun getConversationsForUser(userId: String): List<Conversation>
    suspend fun addDeviceToken(userId: String, deviceToken: String, platform: String)
    suspend fun updateUserStatus(userId: String, status: String, lastSeen: Instant?)
    suspend fun updateUserProfile(userId: String, username: String?, email: String?, avatarUrl: String?): User?
    suspend fun searchUsers(query: String): List<User>
    suspend fun findUserByEmail(email: String): User?
    suspend fun findUserById(userId: String): User?
    suspend fun authenticateUser(username: String, password: String): User?
    suspend fun registerUser(user: User): User
    suspend fun findUserByIds(userIds: List<String>): List<User>
}