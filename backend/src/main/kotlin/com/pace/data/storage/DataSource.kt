package com.pace.data.storage

import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import java.util.UUID

interface DataSource {
    suspend fun register(user: User)
    suspend fun findUserById(userId: UUID): User?
    suspend fun findUserByUsername(username: String): User?
    suspend fun findUserByEmail(email: String): User?
    suspend fun searchUsers(query: String): List<User>
    suspend fun addDeviceToken(deviceToken: DeviceToken)
    suspend fun getConversationsForUser(userId: UUID): List<Conversation>
    suspend fun findConversationById(conversationId: UUID): Conversation?
    suspend fun findPrivateConversation(user1Id: UUID, user2Id: UUID): Conversation?
    suspend fun addConversation(newConv: Conversation)
    suspend fun getMessagesForConversation(conversationId: UUID, limit: Int = 30, beforeMessageId: UUID?): List<Message>
    suspend fun hasOlderMessagesForConversation(conversationId: UUID, beforeMessageId: UUID): Boolean
    suspend fun addMessage(newMessage: Message)
    suspend fun findMessageByMessageId(messageId: UUID): Message?
    suspend fun updateUser(user: User)
    suspend fun updateConversation(conv: Conversation): Boolean
    suspend fun updateMessage(message: Message)
    suspend fun findUserByIds(userIds: List<UUID>): List<User>
    suspend fun getUserInfo(token: String): User?
}
