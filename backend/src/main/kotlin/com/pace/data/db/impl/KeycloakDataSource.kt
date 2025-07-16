package com.pace.data.db.impl

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming
import com.google.inject.Inject
import com.pace.config.Configuration
import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import com.pace.security.token.KeycloakTokenManager
import com.pace.utility.deserialize
import com.pace.utility.toJsonString
import io.klogging.java.LoggerFactory
import io.vertx.core.MultiMap
import io.vertx.core.Vertx
import io.vertx.core.http.impl.headers.HeadersMultiMap
import io.vertx.core.json.JsonObject
import io.vertx.ext.web.client.HttpRequest
import io.vertx.ext.web.client.WebClient
import io.vertx.kotlin.coroutines.coAwait
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

    override suspend fun findUserById(userId: String): User? {
        return client.getAbs("$baseUriAdmin/users/$userId")
            .sendWithAuthToken()
            ?.deserialize<KeycloakUser>()
            ?.toUser()
    }

    override suspend fun findUserByUsername(username: String): User? {
        val res = client.getAbs(
            "$baseUriAdmin/users" +
                    "?briefRepresentation=false&username=$username&exact=true"
        ).sendWithAuthToken()
            ?.deserialize<List<KeycloakUser>>()
        if (res != null && res.size > 1) throw IllegalStateException("Duplicated username $username !!!")
        return res?.singleOrNull()?.toUser()
    }

    override suspend fun findUserByEmail(email: String): User? {
        val res = client.getAbs(
            "$baseUri/users?where=" +
                    """
                {
                    "email":{"${'$'}eq":"$email"}
                }
            """.trimIndent().urlEncode()
        ).sendWithAuthToken()!!
            .deserialize<SgRowResponse<User>>()
        return res.data.singleOrNull()
    }

    override suspend fun searchUsers(query: String): List<User> {
        val res = client.getAbs(
            "$baseUriAdmin/users" +
                    "?briefRepresentation=true&search=$query&exact=false"
        ).sendWithAuthToken()
        ?.deserialize<List<KeycloakUser>>()
        return res?.map { it.toUser() } ?: emptyList()
    }

    override suspend fun addDeviceToken(deviceToken: DeviceToken) {
        TODO("Not yet implemented")
    }

    override suspend fun getConversationsForUser(userId: String): List<Conversation> {
        return emptyList()
//        val conversations = requireNotNull(findUserById(userId)) { "Nonexistent UserId supplied!" }.conversations
//        val res = client.getAbs(
//            "$baseUri/conversations?where=" +
//                    """
//                    {"conversation_id":{"${'$'}in": ${conversations.toJsonString()}} }
//                """.trimIndent().urlEncode()
//        )
//            .sendWithAuthToken().coAwait()
//            .bodyAsJsonObject().deserialize<SgRowResponse<Conversation>>()
//        return res.data
    }

    override suspend fun findConversationById(conversationId: String): Conversation? {
        val res = client.getAbs("$baseUri/conversations/$conversationId")
            .sendWithAuthToken()!!
            .deserialize<SgRowResponse<Conversation>>()
        return res.data.singleOrNull()
    }

    override suspend fun findPrivateConversation(
        user1Id: String,
        user2Id: String
    ): Conversation? {
        val cons = getConversationsForUser(user1Id)
        return cons.firstOrNull { c -> c.type == "private" && c.participants.any { it == user2Id } }
    }

    override suspend fun addConversation(newConv: Conversation): Conversation {
        val res = client.postAbs("$baseUri/conversations")
            .sendWithAuthToken(newConv)!!
        return res.deserialize<Conversation>()
    }

    override suspend fun getMessagesForConversation(
        conversationId: String,
        limit: Int,
        beforeMessageId: String?
    ): List<Message> {
        val res = client.getAbs(
            "$baseUri/messages?where="
                    + """
                 {"conversation_id":{"${'$'}eq": "$conversationId"}}
            """.trimIndent().urlEncode()
        )
            .addQueryParam("page-size", "$limit")
            .addQueryParam("timestamp", "DESC") // get latest messages
            .sendWithAuthToken()!!
            .deserialize<SgRowResponse<Message>>()
        return res.data.sortedBy { it.timestamp } // ASC order
    }

    override suspend fun addMessage(newMessage: Message): Message {
        val res = client.postAbs("$baseUri/messages")
            .sendWithAuthToken(newMessage)!!
        return res.deserialize<Message>()
    }

    override suspend fun findMessageByMessageId(messageId: String): Message? {
        val res = client.getAbs("$baseUri/messages/$messageId")
            .sendWithAuthToken()!!.deserialize<SgRowResponse<Message>>()
        return res.data.singleOrNull()
    }

    override suspend fun updateUser(user: User) {
        client.putAbs("$baseUriAdmin/users/${user.userId}")
            .sendWithAuthToken(user.toKeycloakUser())
    }

    override suspend fun updateConversation(conv: Conversation): Conversation {
        return client.patchAbs("$baseUri/conversations/${conv.conversationId}")
            .sendWithAuthToken(conv.toUpdateRequestBody())!!
            .deserialize<SgResponseWrapper<Conversation>>().data
    }

    override suspend fun updateMessage(message: Message): Message {
        return client.patchAbs("$baseUri/messages/${message.messageId}")
            .sendWithAuthToken(message.toUpdateRequestBody())
            ?.deserialize<SgResponseWrapper<Message>>()!!.data
    }

    override suspend fun findUserByIds(userIds: List<String>): List<User> {
        val res = client.getAbs(
            "$baseUri/users?where=" + """
                {
                    "user_id":{"${'$'}in":${userIds.toJsonString()}}
                }
            """.trimIndent().urlEncode()
        ).sendWithAuthToken()?.deserialize<SgRowResponse<User>>()!!
        return res.data
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
    @JsonInclude(JsonInclude.Include.NON_NULL)
    data class KeycloakUser(
        val id: UUID?,
        var username: String?,
        var firstName: String?,
        var lastName: String?,
        var email: String?,
        var emailVerified: Boolean?,
        val attributes: Map<String, String?>?,
        val credentials: List<KeycloakCredential>?,
        val enabled: Boolean = true
    ) {
        fun toUser() =
            User(
                id.toString(),
                username,
                firstName,
                lastName,
                email,
                credentials?.firstOrNull { it.type == "password" }?.value,
                attributes?.get("status"),
                attributes?.get("avatar_url"),
                attributes?.get("last_seen")?.let { Instant.parse(it) }
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

    private suspend fun HttpRequest<*>.sendWithAuthToken(body: Any? = null): JsonObject? {
        bearerTokenAuthentication(tokenMngr.getAccessToken())
        return sendWithLog(body)
    }

    private suspend fun HttpRequest<*>.sendWithLog(body: Any? = null): JsonObject? {
        val req = this
        val res = when (body) {
            null -> send()
            is MultiMap -> sendForm(body)
            else -> sendJson(JsonObject.mapFrom(body))
        }
        return res.onComplete { ar ->
            logger.info {
                val response = ar.result()
                "${response?.statusCode()} ${req.method()} ${req.uri()} " +
                        (response?.bodyAsString() ?: "<empty response>")
            }
        }
            .onFailure {
                logger.error(it) {
                    "${req.method()} ${req.uri()} FAILED"
                }
            }.coAwait()
            .takeIf { it.statusCode() < 400 }
            ?.runCatching { this.bodyAsJsonObject() }
            ?.getOrElse { err ->
                logger.error(err) { "Deserialization problem" }
                null
            }
    }
}

private fun String.urlEncode() = URLEncoder.encode(this, Charsets.UTF_8)
private val logger = LoggerFactory.getLogger(KeycloakDataSource::class.java)
