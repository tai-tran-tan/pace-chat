// src/main/kotlin/com/pacechat/websocket/WebSocketHandler.kt
package com.pace.ws

import com.pace.data.db.DbAccessible
import com.pace.data.model.WsMessage
import com.pace.security.JwtService
import com.pace.utility.deserialize
import com.pace.utility.toJsonString
import io.klogging.java.LoggerFactory
import io.vertx.core.http.ServerWebSocket
import io.vertx.core.json.JsonObject
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import java.time.Instant

class WebSocketHandler(
    private val vertx: io.vertx.core.Vertx,
    private val jwtService: JwtService,
    private val db: DbAccessible,
    private val connectionsManager: ConnectionsManager
) {
    private val logger = LoggerFactory.getLogger(this::class.java)
    fun handle(ws: ServerWebSocket) {
        logger.info("New WebSocket connection from: ${ws.remoteAddress()}")

        var authenticatedUserId: String? = null
        var authenticatedUsername: String? = null

        // Set a handler for when the WebSocket is closed
        ws.closeHandler {
            if (authenticatedUserId != null) {
                connectionsManager.removeConnection(authenticatedUserId!!)
                // Update user status to offline and broadcast presence
                CoroutineScope(vertx.dispatcher()).launch {
                    db.updateUserStatus(authenticatedUserId!!, "offline", Instant.now())
                    connectionsManager.broadcastMessage(
                        WsMessage.WsPresenceUpdate(
                            userId = authenticatedUserId!!,
                            status = WsMessage.UserStatus.OFFLINE,
                            lastSeen = Instant.now()
                        ),
                        excludeConnection = null
                    )
                }
                logger.info("WebSocket for user $authenticatedUsername ($authenticatedUserId) closed.")
            } else {
                logger.info("Unauthenticated WebSocket closed from: ${ws.remoteAddress()}")
            }
        }

        // Set a handler for incoming messages (frames)
        ws.handler { buffer ->
            val messageText = buffer.toString()
            try {
                val parsedMessage = JsonObject(messageText)
                val eventType = parsedMessage.getString("type").let { WsMessage.EventType.valueOf(it) }

                if (eventType == WsMessage.EventType.AUTH) {
                    if (authenticatedUserId != null) {
                        ws.writeTextMessage(WsMessage.WsAuthFailure(reason = "Already authenticated.").toJsonString())
                        ws.close()
                        return@handler
                    }
                    val authMessage = messageText.deserialize<WsMessage.WsAuthMessage>()
                    try {
                        val decoded = jwtService.verifyRefreshToken(authMessage.token)
                        authenticatedUserId = decoded.userId
                        authenticatedUsername = decoded.username

                        // Add to connections manager
                        val connection = Connection(ws, authenticatedUserId, authenticatedUsername)
                        connectionsManager.addConnection(connection)

                        // Update user status to online and broadcast presence
                        CoroutineScope(vertx.dispatcher()).launch {
                            db.updateUserStatus(authenticatedUserId, "online", null)
                            connectionsManager.broadcastMessage(
                                WsMessage.WsPresenceUpdate(
                                    userId = authenticatedUserId,
                                    status = WsMessage.UserStatus.ONLINE,
                                    lastSeen = Instant.now()
                                ),
                                excludeConnection = null
                            )
                        }

                        ws.writeTextMessage(WsMessage.WsAuthSuccess(userId = authenticatedUserId).toJsonString())
                        logger.info("User $authenticatedUsername ($authenticatedUserId) authenticated via WS.")
                    } catch (e: Exception) {
                        ws.writeTextMessage(
                            WsMessage.WsAuthFailure(reason = "Invalid or expired token.").toJsonString()
                        )
                        logger.error("WebSocket authentication failed: ${e.message}")
                        ws.close() // Close connection on auth failure
                    }
                } else {
                    // Only process other messages if authenticated
                    if (authenticatedUserId == null) {
                        ws.writeTextMessage(
                            WsMessage.WsAuthFailure(reason = "Not authenticated. Send AUTH message first.")
                                .toJsonString()
                        )
                        ws.close()
                        return@handler
                    }

                    when (eventType) {
                        WsMessage.EventType.SEND_MESSAGE -> {
                            val messageData = parsedMessage.deserialize<WsMessage.SendMessage>()
                            CoroutineScope(vertx.dispatcher()).launch {
                                val newMessage = db.addMessage(
                                    messageData.conversationId,
                                    authenticatedUserId,
                                    messageData.content,
                                    messageData.messageType,
                                    messageData.clientMessageId
                                )
                                if (newMessage != null) {
                                    // Send MESSAGE_DELIVERED ACK back to the sender
                                    ws.writeTextMessage(
                                        WsMessage.MessageDelivered(
                                            WsMessage.EventType.MESSAGE_DELIVERED,
                                            messageData.clientMessageId,
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
                                    logger.info("Message sent: ${newMessage.messageId} in ${newMessage.conversationId}")
                                } else {
                                    ws.writeTextMessage(
                                        WsMessage.MessageDelivered(
                                            WsMessage.EventType.MESSAGE_DELIVERED,
                                            messageData.clientMessageId,
                                            "N/A", // No server ID on failure
                                            Instant.now(),
                                            "failure"
                                        ).toJsonString()
                                    )
                                    logger.warn("Failed to add message to DB.")
                                }
                            }
                        }

                        WsMessage.EventType.TYPING_INDICATOR -> {
                            val typingData =parsedMessage.deserialize<WsMessage.TypingIndicator>()
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
                            val readerId = authenticatedUserId!!

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
                            logger.info("Read receipt from $authenticatedUsername for conv $conversationId up to $lastReadMessageId")
                        }

                        else -> {
                            logger.warn("Unhandled authenticated WebSocket message type: ${eventType}")
                            ws.writeTextMessage(

                                mapOf(
                                    "type" to "ERROR",
                                    "message" to "Unhandled message type: ${eventType}"
                                ).toJsonString()
                            )
                        }
                    }
                }
            } catch (e: Exception) {
                logger.error("Error processing WebSocket message: ${e.message}. Message: $messageText", e)
                ws.writeTextMessage(
                    mapOf(
                        "type" to "ERROR",
                        "message" to "Server error processing message."
                    ).toJsonString()
                )
            }
        }

        // Set a handler for WebSocket errors
        ws.exceptionHandler { t ->
            logger.error("WebSocket exception for user ${authenticatedUsername ?: ws.remoteAddress()}: ${t.message}", t)
            if (authenticatedUserId != null) {
                connectionsManager.removeConnection(authenticatedUserId)
                CoroutineScope(vertx.dispatcher()).launch {
                    db.updateUserStatus(authenticatedUserId, "offline", Instant.now())
                    connectionsManager.broadcastMessage(
                        WsMessage.WsPresenceUpdate(
                            userId = authenticatedUserId,
                            status = WsMessage.UserStatus.ONLINE, lastSeen = Instant.now()
                        ),
                        excludeConnection = null
                    )
                }
            }
            ws.close() // Close the connection on error
        }
    }
}