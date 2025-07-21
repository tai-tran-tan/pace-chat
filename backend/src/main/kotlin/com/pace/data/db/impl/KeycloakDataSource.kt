package com.pace.data.db.impl

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude
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
import com.pace.security.token.KeycloakTokenManager
import com.pace.utility.deserialize
import io.vertx.core.MultiMap
import io.vertx.core.Vertx
import io.vertx.core.buffer.Buffer
import io.vertx.core.http.impl.headers.HeadersMultiMap
import io.vertx.ext.web.client.HttpRequest
import io.vertx.ext.web.client.WebClient
import io.vertx.kotlin.coroutines.coAwait
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import org.apache.logging.log4j.kotlin.logger
import java.net.URLEncoder
import java.time.Instant
import java.util.UUID


class KeycloakDataSource @Inject constructor(
    @Inject private val vertx: Vertx,
    @Inject private val client: WebClient,
    @Inject private val configuration: Configuration
) : DataSource {
    private val baseUri = configuration.authService.baseUrl
    private val baseUriUser = "$baseUri/realms/${configuration.authService.realmName}"
    private val baseUriAdmin = "$baseUri/admin/realms/${configuration.authService.realmName}"
    private val tokenMngr = KeycloakTokenManager(vertx, configuration.authService)

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

    override suspend fun authenticate(username: String, password: String): AuthenticationResponse? {
        return client.postAbs("$baseUriUser/protocol/openid-connect/token")
            .sendWithLog(
                HeadersMultiMap()
                    .add("grant_type", "password")
                    .add("client_id", configuration.authService.clientId)
                    .add("username", username)
                    .add("password", password)
                    .add("scope", "openid profile_full")
                    .add("client_secret", configuration.authService.clientSecret)
            )
            ?.deserialize<AuthenticationResponse>()
    }

    override suspend fun refreshToken(refreshToken: String): AuthenticationResponse? {
        return client.postAbs("$baseUriUser/protocol/openid-connect/token")
            .sendWithLog(
                HeadersMultiMap()
                    .add("grant_type", "refresh_token")
                    .add("client_id", configuration.authService.clientId)
                    .add("refresh_token", refreshToken)
                    .add("client_secret", configuration.authService.clientSecret)
            )
            ?.deserialize<AuthenticationResponse>()
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
        return messageDao.findByConversation(conversationId).all()
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

    private suspend fun HttpRequest<*>.sendWithLog(body: Any? = null): Buffer? {
        val req = this
        val res = when (body) {
            null -> send()
            is MultiMap -> sendForm(body)
            else -> sendJson(body)
        }
        return res.onComplete { ar ->
            LOGGER.info {
                val response = ar.result()
                "${response?.statusCode()} ${req.method()} ${req.uri()} " +
                        (response?.bodyAsString() ?: "<empty response>")
            }
        }
            .onFailure {
                LOGGER.error(it) {
                    "${req.method()} ${req.uri()} FAILED"
                }
            }.coAwait()
            .takeIf { it.statusCode() < 400 }
            ?.runCatching { this.bodyAsBuffer() }
            ?.getOrElse { err ->
                LOGGER.error(err) { "Deserialization problem" }
                null
            }
    }

    companion object {
        private val LOGGER = logger()
    }
}
private fun String.urlEncode() = URLEncoder.encode(this, Charsets.UTF_8)


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
@JsonInclude(JsonInclude.Include.NON_NULL)
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
            id!!,
            username,
            firstName,
            lastName,
            email,
            credentials?.firstOrNull { it.type == "password" }?.value,
            attributes?.get("status")?.firstOrNull(),
            attributes?.get("avatar_url")?.firstOrNull(),
            attributes?.get("last_seen")?.firstOrNull()?.let { Instant.parse(it) }
        )
}

private data class SgRowResponse<T : Any> @JsonCreator constructor(
    val count: Int? = null,
    val pageState: String? = null,
    val data: List<T>
)

private data class SgResponseWrapper<T : Any> @JsonCreator constructor(
    val data: T
)