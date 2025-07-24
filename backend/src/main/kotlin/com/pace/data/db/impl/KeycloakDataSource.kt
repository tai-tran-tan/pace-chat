package com.pace.data.db.impl

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming
import com.google.inject.Inject
import com.pace.config.Configuration
import com.pace.data.db.dao.DaoCreator
import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import com.pace.extensions.deserialize
import com.pace.extensions.sendWithLog
import com.pace.security.TokenService
import com.pace.security.token.KeycloakTokenManager
import io.vertx.core.Vertx
import io.vertx.core.buffer.Buffer
import io.vertx.ext.web.client.HttpRequest
import io.vertx.ext.web.client.WebClient
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import org.apache.logging.log4j.kotlin.logger
import java.time.Instant
import java.util.UUID


class KeycloakDataSource @Inject constructor(
    @Inject private val vertx: Vertx,
    @Inject private val client: WebClient,
    @Inject private val configuration: Configuration
) : DataSource {
    private val authConfig = configuration.authService
    private val baseUri = authConfig.baseUrl
    private val baseUriUser = "$baseUri/realms/${authConfig.realmName}"
    private val baseUriAdmin = "$baseUri/admin/realms/${authConfig.realmName}"
    private val tokenMngr = KeycloakTokenManager(vertx, authConfig)
    private val tokenService = TokenService.create(client, authConfig)
    override suspend fun register(user: User) {
        client.postAbs("$baseUriAdmin/users")
            .sendWithAuthToken(user.toKeycloakUser())
    }

    override suspend fun getUserInfo(token: String): User? {
        return client.getAbs("$baseUriUser/protocol/openid-connect/userinfo")
            .putHeader("Authorization", token)
            .sendWithLog()
            ?.deserialize<User>()
    }

    override suspend fun findUserById(userId: UUID): User? {
        return client.getAbs("$baseUriAdmin/users/$userId")
            .sendWithAuthToken()
            ?.deserialize<KeycloakUser>()
            ?.toUser()
    }

    override suspend fun findUserByUsername(username: String): User? {
        val res = client.getAbs("$baseUriAdmin/users" +
                    "?briefRepresentation=false&username=$username&exact=true"
        ).sendWithAuthToken()
            ?.deserialize<List<KeycloakUser>>()
        if (res != null && res.size > 1) throw IllegalStateException("Duplicated username $username !!!")
        return res?.singleOrNull()?.toUser()
    }

    override suspend fun findUserByEmail(email: String): User? {
        val res = client.getAbs("$baseUriAdmin/users" +
                    "?briefRepresentation=false&email=$email&exact=true"
        ).sendWithAuthToken()
            ?.deserialize<List<KeycloakUser>>()
        if (res != null && res.size > 1) throw IllegalStateException("Duplicated email $email !!!")
        return res?.singleOrNull()?.toUser()
    }

    override suspend fun searchUsers(query: String): List<User> {
        val res = client.getAbs("$baseUriAdmin/users" +
                    "?briefRepresentation=false&search=$query&exact=false"
        ).sendWithAuthToken()
            ?.deserialize<List<KeycloakUser>>()
        return res?.map { it.toUser() } ?: emptyList()
    }

    override suspend fun addDeviceToken(deviceToken: DeviceToken) {
        TODO("Not yet implemented")
    }

    private val conversationDao = DaoCreator.createConversationDao()
    override suspend fun getConversationsForUser(userId: UUID): List<Conversation> {
        return conversationDao.findByUser(userId).all()
    }

    override suspend fun findConversationById(conversationId: UUID): Conversation? {
        val conversations = conversationDao.findById(conversationId).all()
            .filter{ it.exitedTime == null } // filter out exited members
        val participants = conversations
            .map { it.userId }
        return conversations.firstOrNull().apply {
            checkNotNull(this) { "Conversation $conversationId not found!" }
            this.participants.addAll(participants)
        }
    }

    override suspend fun findPrivateConversation(
        user1Id: UUID,
        user2Id: UUID
    ): Conversation? {
        val participants = listOf(user1Id, user2Id)
        val allPrivate = conversationDao.findByAnyUser(participants).all()
            .filter { it.type == "private" }
            .filter{ it.exitedTime == null }
            .groupBy { it.convId }
            .also { LOGGER.debug { "Returned ${it.size} conversations" } }
            .takeIf { it.isNotEmpty() }

        return allPrivate
            ?.values
            ?.firstOrNull { v -> v.map{ it.userId }.containsAll(participants) }
            ?.first()
            ?.apply {
                this.participants.addAll(participants)
            }
    }

    override suspend fun addConversation(newConv: Conversation) {
        conversationDao.save(newConv)
    }

    override suspend fun getMessagesForConversation(
        conversationId: UUID,
        limit: Int,
        beforeMessageId: UUID?
    ): List<Message> {
        return messageDao.findByConversation(conversationId, limit).all()
    }

    override suspend fun addMessage(newMessage: Message) {
        messageDao.save(newMessage)
    }

    override suspend fun findMessageByMessageId(messageId: UUID): Message? {
       return messageDao.findById(messageId)
    }

    override suspend fun updateUser(user: User) {
        val origin = requireNotNull(findUserById(user.userId)) { "User not found" }
        val update = origin.copy(
            username = user.username ?: origin.username,
            firstName = user.firstName ?: origin.firstName,
            lastName = user.lastName ?: origin.lastName,
            email = user.email ?: origin.email,
            avatarUrl = user.avatarUrl ?: origin.avatarUrl,
            status = user.status ?: origin.status,
            lastSeen = user.lastSeen ?: origin.lastSeen
        )

        client.putAbs("$baseUriAdmin/users/${user.userId}")
            .sendWithAuthToken(update.toKeycloakUser())
    }

    override suspend fun updateConversation(conv: Conversation) =
        conversationDao.update(conv)

    private val messageDao = DaoCreator.createMessageDao()
    override suspend fun updateMessage(message: Message) {
        messageDao.update(message)
    }

    override suspend fun findUserByIds(userIds: List<UUID>): List<User> {
        return userIds.map { id ->
            CoroutineScope(vertx.dispatcher()).async {
                requireNotNull(findUserById(id)) { "User not found"}
            }
        }.awaitAll()
    }

    private suspend fun HttpRequest<*>.sendWithAuthToken(body: Any? = null): Buffer? {
        bearerTokenAuthentication(tokenMngr.getAccessToken())
        return sendWithLog(body)
    }

    companion object {
        private val LOGGER = logger()
    }

}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
@JsonIgnoreProperties(ignoreUnknown = true)
data class AuthenticationResponse(
    val accessToken: String,
    val expiresIn: Long,
    val refreshToken: String,
    val refreshExpiresIn: Long,
    val tokenType: String,
    val idToken: String,
)

data class KeycloakCredential(
    val type: String = "password",
    val value: String?,
    val temporary: Boolean = false
)

@JsonIgnoreProperties(ignoreUnknown = true)
data class KeycloakUser(
    val id: UUID?,
    var username: String?,
    var firstName: String?,
    var lastName: String?,
    var email: String?,
    var emailVerified: Boolean?,
    val attributes: Map<String, List<String>?>?,
    val credentials: List<KeycloakCredential>?,
    val enabled: Boolean = true
) {
    fun toUser() =
        User(
            userId = id!!,
            username = username,
            firstName = firstName,
            lastName = lastName,
            email = email,
            password = credentials?.firstOrNull { it.type == "password" }?.value,
            status = attributes?.get("status")?.firstOrNull(),
            avatarUrl = attributes?.get("avatar_url")?.firstOrNull(),
            lastSeen = attributes?.get("last_seen")?.firstOrNull()?.let { Instant.parse(it) }
        )
}