package com.pace.data.db.impl

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming
import com.google.inject.Inject
import com.pace.config.Configuration
import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import com.pace.utility.deserialize
import com.pace.utility.toJsonString
import io.klogging.java.LoggerFactory
import io.vertx.core.Future
import io.vertx.core.MultiMap
import io.vertx.core.http.impl.headers.HeadersMultiMap
import io.vertx.core.json.JsonObject
import io.vertx.ext.web.client.HttpRequest
import io.vertx.ext.web.client.HttpResponse
import io.vertx.ext.web.client.WebClient
import io.vertx.kotlin.coroutines.coAwait
import java.net.URLEncoder


class KeycloakDataSource @Inject constructor(
    @Inject private val client: WebClient,
    @Inject private val configuration: Configuration
) : DataSource {
    private val baseUri = configuration.authService.baseUrl
    private val baseUriUser = "$baseUri/realms/${configuration.authService.realmName}"
    private val baseUriAdmin = "$baseUri/admin/realms/${configuration.authService.realmName}"

    override suspend fun addUser(user: User): User {
        val res = client.postAbs("$baseUri/users")
            .sendWithAuthToken(user).coAwait()
        return res.bodyAsJsonObject()
            .deserialize<User>()
    }

    override suspend fun getUserInfo(token: String): User? {
        return client.getAbs("$baseUriUser/protocol/openid-connect/userinfo")
            .putHeader("Authorization", token)
            .sendWithLog()
            .coAwait()
            .takeIf { it.statusCode() == 200 }
            ?.bodyAsJsonObject()
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
            ).coAwait()
            .takeIf { it.statusCode() == 200 }
            ?.bodyAsJsonObject()
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
            ).coAwait()
            .takeIf { it.statusCode() == 200 }
            ?.bodyAsJsonObject()
            ?.deserialize<AuthenticationResponse>()
    }

    override suspend fun findUserById(userId: String): User? {
        val res = client.getAbs("$baseUri/users/$userId")
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
        return res.data.singleOrNull()
    }

    override suspend fun findUserByUsername(username: String): User? {
        val res = client.getAbs(
            "$baseUri/users?where=" + """
                {
                    "username":{"${'$'}eq":"$username"}
                }
            """.trimIndent().urlEncode()
        ).sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
        return res.data.singleOrNull()
    }

    override suspend fun findUserByEmail(email: String): User? {
        val res = client.getAbs(
            "$baseUri/users?where=" +
                    """
                {
                    "email":{"${'$'}eq":"$email"}
                }
            """.trimIndent().urlEncode()
        ).sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
        return res.data.singleOrNull()
    }

    override suspend fun searchUsers(query: String): List<User> {
        val res = client.getAbs(
            "$baseUri/users?where=" + """
                {
                    "username":{"${'$'}eq":"$query"}
                }
            """.trimIndent().urlEncode()
        ).sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
        return res.data
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
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<Conversation>>()
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
            .sendWithAuthToken(newConv).coAwait()
        return res.bodyAsJsonObject().deserialize<Conversation>()
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
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject()
            .deserialize<SgRowResponse<Message>>()
        return res.data.sortedBy { it.timestamp } // ASC order
    }

    override suspend fun addMessage(newMessage: Message): Message {
        val res = client.postAbs("$baseUri/messages")
            .sendWithAuthToken(newMessage).coAwait()
        return res.bodyAsJsonObject().deserialize<Message>()
    }

    override suspend fun findMessageByMessageId(messageId: String): Message? {
        val res = client.getAbs("$baseUri/messages/$messageId")
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<Message>>()
        return res.data.singleOrNull()
    }

    override suspend fun updateUser(user: User): User {
        return client.patchAbs("$baseUri/users/${user.userId}")
            .sendWithAuthToken(user.toUpdateRequestBody()).coAwait()
            .bodyAsJsonObject().apply {
                getJsonObject("data")
                    ?.put("user_id", user.userId) // add again for deserialization
            }
            .deserialize<SgResponseWrapper<User>>().data
    }

    override suspend fun updateConversation(conv: Conversation): Conversation {
        return client.patchAbs("$baseUri/conversations/${conv.conversationId}")
            .sendWithAuthToken(conv.toUpdateRequestBody()).coAwait()
            .bodyAsJsonObject()
            .apply {
                getJsonObject("data")
                    ?.put("conversation_id", conv.conversationId) // add again for deserialization
            }.deserialize<SgResponseWrapper<Conversation>>().data
    }

    override suspend fun updateMessage(message: Message): Message {
        return client.patchAbs("$baseUri/messages/${message.messageId}")
            .sendWithAuthToken(message.toUpdateRequestBody()).coAwait()
            .bodyAsJsonObject().apply {
                getJsonObject("data")
                    ?.put("message_id", message.messageId) // add again for deserialization
            }
            .deserialize<SgResponseWrapper<Message>>().data
    }

    override suspend fun findUserByIds(userIds: List<String>): List<User> {
        val res = client.getAbs(
            "$baseUri/users?where=" + """
                {
                    "user_id":{"${'$'}in":${userIds.toJsonString()}}
                }
            """.trimIndent().urlEncode()
        ).sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
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

    private data class SgRowResponse<T : Any> @JsonCreator constructor(
        val count: Int? = null,
        val pageState: String? = null,
        val data: List<T>
    )

    private data class SgResponseWrapper<T : Any> @JsonCreator constructor(
        val data: T
    )

    private fun HttpRequest<*>.sendWithAuthToken(body: Any? = null): Future<out HttpResponse<out Any?>> {
        bearerTokenAuthentication(configuration.authService.accessToken)
        return sendWithLog(body)
    }

    private fun HttpRequest<*>.sendWithLog(body: Any? = null): Future<out HttpResponse<out Any?>> {
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
            }
    }
}

private fun String.urlEncode() = URLEncoder.encode(this, Charsets.UTF_8)
private val logger = LoggerFactory.getLogger(KeycloakDataSource::class.java)
