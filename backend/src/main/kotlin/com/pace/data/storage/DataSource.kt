package com.pace.data.storage

import com.pace.data.db.impl.KeycloakDataSource
import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User

interface DataSource {
    suspend fun addUser(user: User): User
    suspend fun authenticate(username: String, password: String): KeycloakDataSource.AuthenticationResponse?
    suspend fun findUserById(userId: String): User?
    suspend fun findUserByUsername(username: String): User?
    suspend fun findUserByEmail(email: String): User?
    suspend fun searchUsers(query: String): List<User>
    suspend fun addDeviceToken(deviceToken: DeviceToken)
    suspend fun getConversationsForUser(userId: String): List<Conversation>
    suspend fun findConversationById(conversationId: String): Conversation?
    suspend fun findPrivateConversation(user1Id: String, user2Id: String): Conversation?
    suspend fun addConversation(newConv: Conversation): Conversation
    suspend fun getMessagesForConversation(conversationId: String, limit: Int = 50, beforeMessageId: String?): List<Message>
    suspend fun addMessage(newMessage: Message): Message
    suspend fun findMessageByMessageId(messageId: String): Message?
    suspend fun updateUser(user: User): User
    suspend fun updateConversation(conv: Conversation): Conversation
    suspend fun updateMessage(message: Message): Message
    suspend fun findUserByIds(userIds: List<String>): List<User>
    suspend fun refreshToken(refreshToken: String): KeycloakDataSource.AuthenticationResponse?
    suspend fun getUserInfo(token: String): User?
}
