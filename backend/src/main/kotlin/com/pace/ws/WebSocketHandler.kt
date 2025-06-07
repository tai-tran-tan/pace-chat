// src/main/kotlin/com/pacechat/websocket/WebSocketHandler.kt
package com.pace.ws

import com.pace.data.InMemoryDatabase
import com.pace.data.model.WsMessage
import com.pace.security.JwtService
import io.klogging.java.LoggerFactory
import io.vertx.core.http.ServerWebSocket
import io.vertx.core.json.JsonObject
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch
import kotlinx.datetime.Clock
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class WebSocketHandler(
    private val vertx: io.vertx.core.Vertx,
    private val jwtService: JwtService,
    private val inMemoryDatabase: InMemoryDatabase,
    private val connectionsManager: ConnectionsManager
) {
    private val logger = LoggerFactory.getLogger(this::class.java)
    private val json = Json {
        ignoreUnknownKeys = true
        coerceInputValues = true
        encodeDefaults = true
    }

    fun handle(ws: ServerWebSocket) {
        logger.info("New WebSocket connection from: ${ws.remoteAddress()}")

        var authenticatedUserId: String? = null
        var authenticatedUsername: String? = null

        // Set a handler for when the WebSocket is closed
        ws.closeHandler {
            if (authenticatedUserId != null) {
                connectionsManager.removeConnection(authenticatedUserId!!)
                // Update user status to offline and broadcast presence
                inMemoryDatabase.updateUserStatus(authenticatedUserId!!, "offline", Clock.System.now())
                CoroutineScope(vertx.dispatcher()).launch {
                    connectionsManager.broadcastMessage(
                        json.encodeToString(WsMessage.WsPresenceUpdate(
                            userId = authenticatedUserId!!,
                            status = WsMessage.UserStatus.OFFLINE,
                            lastSeen = Clock.System.now()
                        )),
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
                val type = parsedMessage.getString("type")

                if (type == "AUTH") {
                    if (authenticatedUserId != null) {
                        ws.writeTextMessage(json.encodeToString(WsMessage.WsAuthFailure(reason = "Already authenticated.")))
                        ws.close()
                        return@handler
                    }
                    val authMessage = json.decodeFromString<WsMessage.WsAuthMessage>(messageText)
                    try {
                        val decoded = jwtService.verifyRefreshToken(authMessage.token)
                        authenticatedUserId = decoded.userId
                        authenticatedUsername = decoded.username

                        // Add to connections manager
                        val connection = Connection(ws, authenticatedUserId, authenticatedUsername)
                        connectionsManager.addConnection(connection)

                        // Update user status to online and broadcast presence
                        inMemoryDatabase.updateUserStatus(authenticatedUserId, "online", null)
                        CoroutineScope(vertx.dispatcher()).launch {
                            connectionsManager.broadcastMessage(
                                json.encodeToString(WsMessage.WsPresenceUpdate(userId = authenticatedUserId, status = WsMessage.UserStatus.ONLINE, lastSeen = Clock.System.now())),
                                excludeConnection = null
                            )
                        }

                        ws.writeTextMessage(json.encodeToString(WsMessage.WsAuthSuccess(userId = authenticatedUserId)))
                        logger.info("User $authenticatedUsername ($authenticatedUserId) authenticated via WS.")

                    } catch (e: Exception) {
                        ws.writeTextMessage(json.encodeToString(WsMessage.WsAuthFailure(reason = "Invalid or expired token.")))
                        logger.error("WebSocket authentication failed: ${e.message}")
                        ws.close() // Close connection on auth failure
                    }
                } else {
                    // Only process other messages if authenticated
                    if (authenticatedUserId == null) {
                        ws.writeTextMessage(json.encodeToString(WsMessage.WsAuthFailure(reason = "Not authenticated. Send AUTH message first.")))
                        ws.close()
                        return@handler
                    }

                    // Handle other messages based on their type
                    val wsMessage = try {
                        json.decodeFromString<WsMessage>(messageText)
                    } catch (e: Exception) {
                        logger.error("Failed to deserialize WS message: ${e.message}", e)
                        ws.writeTextMessage(json.encodeToString(mapOf("type" to "ERROR", "message" to "Invalid message format.")))
                        return@handler
                    }

                    when (wsMessage.type) {
                        WsMessage.EventType.SEND_MESSAGE -> {
                            val messageData = wsMessage as WsMessage.SendMessage
                            val newMessage = inMemoryDatabase.addMessage(
                                messageData.conversationId,
                                authenticatedUserId,
                                messageData.content,
                                messageData.messageType,
                                messageData.clientMessageId
                            )
                            CoroutineScope(vertx.dispatcher()).launch {
                                if (newMessage != null) {
                                    // Send MESSAGE_DELIVERED ACK back to the sender
                                    ws.writeTextMessage(json.encodeToString(WsMessage.MessageDelivered(
                                        WsMessage.EventType.MESSAGE_DELIVERED,
                                        messageData.clientMessageId,
                                        newMessage.messageId,
                                        newMessage.timestamp,
                                        "success"
                                    )))

                                    // Broadcast MESSAGE_RECEIVED to other participants
                                    val conversation = inMemoryDatabase.findConversationById(messageData.conversationId)
                                    if (conversation != null) {
                                        conversation.participants.forEach { participant ->
                                            if (participant.userId != authenticatedUserId) { // Exclude sender
                                                connectionsManager.sendMessageToUser(
                                                    participant.userId,
                                                    json.encodeToString(WsMessage.MessageReceived(message = newMessage))
                                                )
                                            }
                                        }
                                    }
                                    logger.info("Message sent: ${newMessage.messageId} in ${newMessage.conversationId}")
                                } else {
                                    ws.writeTextMessage(json.encodeToString(WsMessage.MessageDelivered(
                                        WsMessage.EventType.MESSAGE_DELIVERED,
                                        messageData.clientMessageId,
                                        "N/A", // No server ID on failure
                                        Clock.System.now(),
                                        "failure"
                                    )))
                                    logger.warn("Failed to add message to DB.")
                                }
                            }
                        }
                        WsMessage.EventType.TYPING_INDICATOR -> {
                            val typingData = wsMessage as WsMessage.TypingIndicator
                            val conversation = inMemoryDatabase.findConversationById(typingData.conversationId)
                            if (conversation != null) {
                                CoroutineScope(vertx.dispatcher()).launch {
                                    conversation.participants.forEach { participant ->
                                        if (participant.userId != authenticatedUserId) { // Exclude sender
                                            connectionsManager.sendMessageToUser(
                                                participant.userId,
                                                json.encodeToString(WsMessage.TypingIndicator(
                                                    WsMessage.EventType.TYPING_INDICATOR,
                                                    typingData.conversationId,
                                                    authenticatedUserId,
                                                    typingData.isTyping
                                                ))
                                            )
                                        }
                                    }
                                }
                            }
                        }
                        WsMessage.EventType.READ_RECEIPT -> {
                            val readReceiptData = wsMessage as WsMessage.ReadReceipt
                            val conversationId = readReceiptData.conversationId
                            val lastReadMessageId = readReceiptData.lastReadMessageId
                            val readerId = authenticatedUserId!!

                            inMemoryDatabase.markMessagesAsRead(conversationId, lastReadMessageId, readerId)

                            val conversation = inMemoryDatabase.findConversationById(conversationId)
                            if (conversation != null) {
                                CoroutineScope(vertx.dispatcher()).launch {
                                    connectionsManager.broadcastMessageToConversationParticipants(
                                        conversationId,
                                        json.encodeToString(WsMessage.WsMessageReadStatus(
                                            WsMessage.EventType.MESSAGE_READ_STATUS,
                                            conversationId,
                                            lastReadMessageId,
                                            readerId,
                                            Clock.System.now()
                                        ))
                                    )
                                }
                            }
                            logger.info("Read receipt from $authenticatedUsername for conv $conversationId up to $lastReadMessageId")
                        }
                        else -> {
                            logger.warn("Unhandled authenticated WebSocket message type: ${wsMessage.type}")
                            ws.writeTextMessage(json.encodeToString(mapOf("type" to "ERROR", "message" to "Unhandled message type: ${wsMessage.type}")))
                        }
                    }
                }
            } catch (e: Exception) {
                logger.error("Error processing WebSocket message: ${e.message}. Message: $messageText", e)
                ws.writeTextMessage(json.encodeToString(mapOf("type" to "ERROR", "message" to "Server error processing message.")))
            }
        }

        // Set a handler for WebSocket errors
        ws.exceptionHandler { t ->
            logger.error("WebSocket exception for user ${authenticatedUsername ?: ws.remoteAddress()}: ${t.message}", t)
            if (authenticatedUserId != null) {
                connectionsManager.removeConnection(authenticatedUserId)
                inMemoryDatabase.updateUserStatus(authenticatedUserId, "offline", Clock.System.now())
                CoroutineScope(vertx.dispatcher()).launch {
                    connectionsManager.broadcastMessage(
                        json.encodeToString(WsMessage.WsPresenceUpdate(userId = authenticatedUserId,
                             status = WsMessage.UserStatus.ONLINE, lastSeen = Clock.System.now())),
                        excludeConnection = null
                    )
                }
            }
            ws.close() // Close the connection on error
        }
    }
}