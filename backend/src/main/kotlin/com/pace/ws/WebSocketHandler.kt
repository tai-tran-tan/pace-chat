// src/main/kotlin/com/pacechat/websocket/WebSocketHandler.kt
package com.pace.ws

import com.pace.data.db.DbAccessible
import com.pace.data.model.WsMessage
import com.pace.extensions.deserialize
import com.pace.extensions.toJsonString
import com.pace.security.TokenService
import io.vertx.core.Handler
import io.vertx.core.http.ServerWebSocket
import io.vertx.core.http.ServerWebSocketHandshake
import io.vertx.core.json.JsonObject
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.apache.logging.log4j.kotlin.logger
import java.time.Instant

class WebSocketHandler(
    private val vertx: io.vertx.core.Vertx,
    private val tokenService: TokenService,
    private val db: DbAccessible,
    private val connectionsManager: ConnectionsManager
) : Handler<ServerWebSocket> {
    override fun handle(ws: ServerWebSocket) {
        LOGGER.info("New WebSocket connection from: ${ws.remoteAddress()}")

        // Set a handler for when the WebSocket is closed
        ws.closeHandler {
            val connection = connectionsManager.getConnection(ws.textHandlerID())
            if (connection != null) {
                // Update user status to offline and broadcast presence
                CoroutineScope(vertx.dispatcher()).launch {
                    announceStatus(ws.textHandlerID(), WsMessage.UserStatus.OFFLINE)
                    connectionsManager.removeConnection(ws.textHandlerID())
                    LOGGER.info("WebSocket for user ${connection.username} (${connection.userId}) closed.")
                }
            } else {
                LOGGER.info("Unauthenticated WebSocket closed from: ${ws.remoteAddress()}")
            }
        }

        // Set a handler for incoming messages (frames)
        ws.handler { buffer ->
            val messageText = buffer.toString()
            try {
                val parsedMessage = JsonObject(messageText)
                val eventType = parsedMessage.getString("type").let { WsMessage.EventType.valueOf(it) }

                if (eventType == WsMessage.EventType.PING) {
                    ws.writeTextMessage(
                        mapOf(
                            "type" to WsMessage.EventType.PONG,
                            "message" to "Alive!"
                        ).toJsonString()
                    )
                    return@handler
                }
                CoroutineScope(vertx.dispatcher()).launch {
                    announceStatus(ws.textHandlerID(), WsMessage.UserStatus.ONLINE)
                }
                val (_, authenticatedUserId, authenticatedUsername) = requireNotNull(connectionsManager.getConnection(ws.textHandlerID()))
                when (eventType) {
                    WsMessage.EventType.SEND_MESSAGE -> {
                        val messageData = parsedMessage.deserialize<WsMessage.SendMessage>()
                        CoroutineScope(vertx.dispatcher()).launch {
                            val newMessage = db.addMessage(
                                messageData.conversationId,
                                authenticatedUserId,
                                messageData.content,
                            )
                            if (newMessage != null) {
                                // Send MESSAGE_DELIVERED ACK back to the sender
                                ws.writeTextMessage(
                                    WsMessage.MessageDelivered(
                                        WsMessage.EventType.MESSAGE_DELIVERED,
                                        newMessage.messageId,
                                        newMessage.timestamp,
                                        "success"
                                    ).toJsonString()
                                )

                                // Broadcast MESSAGE_RECEIVED to other participants
                                val conversation = db.findConversationById(messageData.conversationId)
                                conversation?.participants?.forEach { participant ->
                                    if (participant != authenticatedUserId) { // Exclude sender
                                        connectionsManager.sendMessageToUser(
                                            participant,
                                            WsMessage.MessageReceived(message = newMessage)
                                        )
                                    }
                                }
                                LOGGER.info("Message sent: ${newMessage.messageId} in ${newMessage.convId}")
                            } else {
                                ws.writeTextMessage(
                                    WsMessage.MessageDelivered(
                                        WsMessage.EventType.MESSAGE_DELIVERED,
                                        null, // No server ID on failure
                                        Instant.now(),
                                        "failure"
                                    ).toJsonString()
                                )
                                LOGGER.warn("Failed to add message to DB.")
                            }
                        }
                    }

                    WsMessage.EventType.TYPING_INDICATOR -> {
                        val typingData = parsedMessage.deserialize<WsMessage.TypingIndicator>()
                        CoroutineScope(vertx.dispatcher()).launch {
                            val conversation = db.findConversationById(typingData.conversationId)
                            conversation?.participants?.forEach { participant ->
                                if (participant != authenticatedUserId) { // Exclude sender
                                    connectionsManager.sendMessageToUser(
                                        participant,
                                        WsMessage.TypingIndicator(
                                            WsMessage.EventType.TYPING_INDICATOR,
                                            typingData.conversationId,
                                            authenticatedUserId,
                                            typingData.isTyping
                                        )
                                    )
                                }
                            }
                        }
                    }

                    WsMessage.EventType.READ_RECEIPT -> {
                        val readReceiptData = parsedMessage.deserialize<WsMessage.ReadReceipt>()
                        val conversationId = readReceiptData.conversationId
                        val lastReadMessageId = readReceiptData.lastReadMessageId
                        val readerId = authenticatedUserId

                        CoroutineScope(vertx.dispatcher()).launch {
                            db.markMessagesAsRead(conversationId, lastReadMessageId, readerId)
                            val conversation = db.findConversationById(conversationId)
                            if (conversation != null) {
                                connectionsManager.broadcastMessageToConversationParticipants(
                                    conversationId,
                                    WsMessage.WsMessageReadStatus(
                                        WsMessage.EventType.MESSAGE_READ_STATUS,
                                        conversationId,
                                        lastReadMessageId,
                                        readerId,
                                        Instant.now()
                                    )
                                )
                            }
                        }
                        LOGGER.info("Read receipt from $authenticatedUsername for conv $conversationId up to $lastReadMessageId")
                    }

                    else -> {
                        LOGGER.warn("Unhandled authenticated WebSocket message type: ${eventType}")
                        ws.writeTextMessage(

                            mapOf(
                                "type" to "ERROR",
                                "message" to "Unhandled message type: ${eventType}"
                            ).toJsonString()
                        )
                    }
                }
            } catch (e: Exception) {
                LOGGER.error("Error processing WebSocket message: ${e.message}. Message: $messageText", e)
                ws.writeTextMessage(
                    mapOf(
                        "type" to "ERROR",
                        "message" to "Error processing WebSocket message: ${e.message}"
                    ).toJsonString()
                )
            }
        }

        // Set a handler for WebSocket errors
        ws.exceptionHandler { e ->
            LOGGER.error(e) { "WebSocket exception for handlerId ${ws.textHandlerID()}: ${e.message}" }
            CoroutineScope(vertx.dispatcher()).launch {
                announceStatus(ws.textHandlerID(), WsMessage.UserStatus.OFFLINE)
                connectionsManager.removeConnection(ws.textHandlerID())
                ws.close() // Close the connection on error
            }
        }
    }

    private suspend fun announceStatus(wsId: String, status: WsMessage.UserStatus) {
        val connection = requireNotNull(connectionsManager.getConnection(wsId))
        val uid = connection.userId
        val s = status.name.lowercase()
        val timestamp = Instant.now()
        db.updateUserStatus(uid, s, timestamp)
        connectionsManager.broadcastMessage(
            WsMessage.WsPresenceUpdate(
                userId = uid,
                status = status,
                lastSeen = timestamp
            ),
            excludeConnection = connection
        )
        LOGGER.info("User ${connection.username} going $s")
    }

    fun handleHandshake(wsh: ServerWebSocketHandshake) = CoroutineScope(Dispatchers.Default).launch {
        try {
//            val token = wsh.headers()?.get("WWW-"+ HttpHeaderNames.AUTHORIZATION)
            val token = wsh.query()  // TODO: pending for frontend to upgrade WS lib and pass token through header
                ?.substringAfter("access_token=")
                ?.substringBefore("&")
            if (token == null) {
                wsh.reject(401)
                LOGGER.warn { "A valid access_token is required for handshake" }
                return@launch
            }

            val user = tokenService.verifyToken(token)
            wsh.accept().onSuccess { ws ->
                connectionsManager.addConnection(
                    ws.textHandlerID(),
                    Connection(ws, user.userId, user.username)
                )
            }
        } catch (e: Exception) {
            LOGGER.warn(e) { "Rejected Handshake request due to invalid token, client: " + wsh.remoteAddress() }
            wsh.reject(401)
        }
    }

    companion object {
        private val LOGGER = logger()
    }
}