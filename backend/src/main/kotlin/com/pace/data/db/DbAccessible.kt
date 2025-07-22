package com.pace.data.db

import com.pace.data.db.impl.AuthenticationResponse
import com.pace.data.model.Conversation
import com.pace.data.model.Message
import com.pace.data.model.ProfileUpdate
import com.pace.data.model.User
import java.time.Instant
import java.util.UUID

interface DbAccessible {
    suspend fun findUserByUsername(username: String): User?
    suspend fun markMessagesAsRead(conversationId: UUID, lastReadMessageId: UUID, readerId: UUID): List<Message>
    suspend fun addMessage(
        conversationId: UUID,
        senderId: UUID,
        content: String,
    ): Message?

    suspend fun hasMoreMessages(conversationId: UUID, oldestMessageId: UUID?): Boolean
    suspend fun getMessagesForConversation(conversationId: UUID, limit: Int, beforeMessageId: UUID?): List<Message>
    suspend fun updateGroupParticipants(conversationId: UUID, addIds: List<UUID>?, removeIds: List<UUID>?): Boolean
    suspend fun createGroupConversation(creatorId: UUID, title: String, participantIds: List<UUID>): Conversation
    suspend fun createPrivateConversation(user1Id: UUID, user2Id: UUID): Conversation
    suspend fun findPrivateConversation(user1Id: UUID, user2Id: UUID): Conversation?
    suspend fun findConversationById(conversationId: UUID): Conversation?
    suspend fun getConversationsForUser(userId: UUID): List<Conversation>
    suspend fun addDeviceToken(userId: UUID, deviceToken: String, platform: String)
    suspend fun updateUserStatus(userId: UUID, status: String, lastSeen: Instant?)
    suspend fun updateUserProfile(userId: UUID, update: ProfileUpdate)
    suspend fun searchUsers(query: String): List<User>
    suspend fun findUserByEmail(email: String): User?
    suspend fun findUserById(userId: UUID): User?
    suspend fun authenticateUser(username: String, password: String): AuthenticationResponse?
    suspend fun registerUser(user: User)
    suspend fun findUserByIds(userIds: List<UUID>): List<User>
    suspend fun refreshToken(refreshToken: String): AuthenticationResponse?
    suspend fun getUserInfo(token: String): User?
}