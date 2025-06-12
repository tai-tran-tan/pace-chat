package com.pace.data.db

import com.pace.data.model.Conversation
import com.pace.data.model.Message
import com.pace.data.model.User
import kotlinx.datetime.Instant

interface DbAccessible {
    fun findUserByUsername(username: String): User?
    fun markMessagesAsRead(conversationId: String, lastReadMessageId: String, readerId: String): List<Message>
    fun addMessage(
        conversationId: String,
        senderId: String,
        content: String,
        messageType: String,
        clientMessageId: String?
    ): Message?

    fun hasMoreMessages(conversationId: String, oldestMessageId: String?): Boolean
    fun getMessagesForConversation(conversationId: String, limit: Int, beforeMessageId: String?): List<Message>
    fun updateGroupParticipants(conversationId: String, addIds: List<String>?, removeIds: List<String>?): Conversation?
    fun createGroupConversation(creatorId: String, name: String, participantIds: List<String>): Conversation
    fun createPrivateConversation(user1Id: String, user2Id: String): Conversation
    fun findPrivateConversation(user1Id: String, user2Id: String): Conversation?
    fun findConversationById(conversationId: String): Conversation?
    fun getConversationsForUser(userId: String): List<Conversation>
    fun addDeviceToken(userId: String, deviceToken: String, platform: String)
    fun updateUserStatus(userId: String, status: String, lastSeen: Instant?)
    fun updateUserProfile(userId: String, username: String?, email: String?, avatarUrl: String?): User?
    fun searchUsers(query: String): List<User>
    fun findUserByEmail(email: String): User?
    fun findUserById(userId: String): User?
    fun authenticateUser(username: String, password: String): User?
    fun registerUser(username: String, email: String, password: String): User
}