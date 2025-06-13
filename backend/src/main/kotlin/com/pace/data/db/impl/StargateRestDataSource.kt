package com.pace.data.db.impl

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.databind.annotation.JsonSerialize
import com.google.inject.Inject
import com.pace.data.model.Conversation
import com.pace.data.model.DeviceToken
import com.pace.data.model.Message
import com.pace.data.model.User
import com.pace.data.storage.DataSource
import com.pace.utility.deserialize
import io.klogging.java.LoggerFactory
import io.vertx.core.Future
import io.vertx.core.json.JsonObject
import io.vertx.ext.web.client.HttpRequest
import io.vertx.ext.web.client.HttpResponse
import io.vertx.ext.web.client.WebClient
import io.vertx.kotlin.coroutines.coAwait
import java.net.URLEncoder

internal class StargateRestDataSource @Inject constructor(@Inject private val client: WebClient) : DataSource {
    private val baseUri = "http://localhost:8082/v2/keyspaces/pace_chat"
    override suspend fun addUser(user: User): User {
        val res = client.postAbs("$baseUri/users")
            .sendWithAuthToken(user).coAwait()
        return res.bodyAsJsonObject()
            .also { logger.info { it } }
            .deserialize<User>()
    }

    override suspend fun authenticate(username: String, password: String): User? {
        val u = findUserByUsername(username)
        return requireNotNull(u?.takeIf { u ->
            u.password == password
        }) { "User not found!" }
    }

    override suspend fun findUserById(userId: String): User? {
        val res = client.getAbs("$baseUri/users/$userId")
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
        return res.data.singleOrNull()
    }

    override suspend fun findUserByUsername(username: String): User? {
        val res = client.getAbs("$baseUri/users")
            .addQueryParam(
                "where", """
                {
                    "username":{"${'$'}eq":"$username"}
                }
            """.trimIndent()
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
            """.trimIndent().let { URLEncoder.encode(it, Charsets.UTF_8) }
        ).sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<User>>()
        return res.data.singleOrNull()
    }

    override suspend fun searchUsers(query: String): List<User> {
        TODO("Not yet implemented")
    }

    override suspend fun addDeviceToken(deviceToken: DeviceToken) {
        TODO("Not yet implemented")
    }

    override suspend fun getConversationsForUser(userId: String): List<Conversation> {
        return requireNotNull(findUserById(userId)) { "Nonexistent UserId supplied!" }.conversations
    }

    override suspend fun findConversationById(conversationId: String): Conversation? {
        val res = client.getAbs("$baseUri/conversations/$conversationId")
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<Conversation>>()
        return res.data.firstOrNull()
    }

    override suspend fun findPrivateConversation(
        user1Id: String,
        user2Id: String
    ): Conversation? {
        val convs = findUserById(user1Id)?.conversations ?: emptySet<Conversation>()
        return convs.firstOrNull { it.participants.any { p -> p.userId == user2Id } }
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
        val res = client.getAbs("$baseUri/messages/$conversationId")
            .addQueryParam("page-size", "20")
            .addQueryParam("timestamp", "DESC")
            .sendWithAuthToken().coAwait()
            .bodyAsJsonObject().deserialize<SgRowResponse<Message>>()
        return res.data
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
            .sendWithAuthToken(user).coAwait()
            .bodyAsJsonObject().deserialize<User>()
    }

    override suspend fun updateConversation(conv: Conversation): Conversation {
        return client.patchAbs("$baseUri/conversations/${conv.conversationId}")
            .sendWithAuthToken(conv).coAwait()
            .bodyAsJsonObject().deserialize<Conversation>()
    }

    override suspend fun updateMessage(message: Message): Message {
        return client.patchAbs("$baseUri/messages/${message.messageId}")
            .sendWithAuthToken(message).coAwait()
            .bodyAsJsonObject().deserialize<Message>()
    }

    @JsonSerialize
    private data class SgRowResponse<T : Any> @JsonCreator constructor(
        val count: Int,
        val pageState: String? = null,
        val data: List<T>
    )
}

private val logger = LoggerFactory.getLogger(StargateRestDataSource::class.java)
private fun HttpRequest<*>.sendWithAuthToken(body: Any? = null): Future<out HttpResponse<out Any?>> {
    putHeader("X-Cassandra-Token", "0a3235a0-5b8a-4f36-86ec-07febaabfbdd")
    return if (body != null) sendJson(JsonObject.mapFrom(body))
    else send()
        .onComplete { ar ->
            logger.info {
                "${this@sendWithAuthToken.method()} ${this@sendWithAuthToken.uri()} " + ar.result().bodyAsString()
            }
        }
        .onFailure {
            logger.error(it) {
                "${this@sendWithAuthToken.method()} ${this@sendWithAuthToken.uri()} FAILED"
            }
        }
}