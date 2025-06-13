// src/main/kotlin/com/pacechat/websocket/ConnectionsManager.kt
package com.pace.ws

import com.pace.data.db.DbAccessible
import io.klogging.java.LoggerFactory
import java.util.concurrent.ConcurrentHashMap

class ConnectionsManager(private val db: DbAccessible) {
    private val logger = LoggerFactory.getLogger(this::class.java)
    // Using userId -> Connection for quick lookup and managing authenticated sessions
    private val connections = ConcurrentHashMap<String, Connection>()

    fun addConnection(connection: Connection) {
        connections[connection.userId] = connection
        logger.info("Connection added for user: ${connection.username} (Total: ${connections.size})")
    }

    fun removeConnection(userId: String) {
        val connection = connections.remove(userId)
        if (connection != null) {
            logger.info("Connection removed for user: ${connection.username} (Total: ${connections.size})")
        }
    }

    fun sendMessageToUser(userId: String, message: String) {
        val connection = connections[userId]
        if (connection != null && !connection.session.isClosed) {
            connection.session.writeTextMessage(message)
            logger.debug("Sent message to user $userId: $message")
        } else {
            logger.warn("User $userId not connected or session closed. Message not sent: $message")
        }
    }

    fun broadcastMessage(message: String, excludeConnection: Connection? = null) {
        connections.values.forEach { connection ->
            if (connection != excludeConnection && !connection.session.isClosed) {
                connection.session.writeTextMessage(message)
            }
        }
        logger.debug("Broadcasted message to ${connections.size - (if (excludeConnection != null) 1 else 0)} clients: $message")
    }

    fun broadcastMessageToConversationParticipants(conversationId: String, message: String) {
        val conversation = db.findConversationById(conversationId)
        if (conversation != null) {
            conversation.participants.forEach { participant ->
                sendMessageToUser(participant.userId, message)
            }
            logger.debug("Broadcasted message to participants of conversation $conversationId: $message")
        } else {
            logger.warn("Attempted to broadcast to non-existent conversation: $conversationId")
        }
    }
}