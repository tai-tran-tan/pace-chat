// src/main/kotlin/com/pacechat/websocket/ConnectionsManager.kt
package com.pace.ws

import com.pace.data.db.DbAccessible
import com.pace.utility.toJsonString
import org.apache.logging.log4j.kotlin.logger
import java.util.UUID
import java.util.concurrent.ConcurrentHashMap

class ConnectionsManager(private val db: DbAccessible) {
    // Using userId -> Connection for quick lookup and managing authenticated sessions
    private val connections = ConcurrentHashMap<UUID, Connection>()

    fun addConnection(connection: Connection) {
        connections[connection.userId] = connection
        LOGGER.info("Connection added for user: ${connection.username} (Total: ${connections.size})")
    }

    fun removeConnection(userId: UUID) {
        val connection = connections.remove(userId)
        if (connection != null) {
            LOGGER.info("Connection removed for user: ${connection.username} (Total: ${connections.size})")
        }
    }

    fun sendMessageToUser(userId: UUID, message: Any) {
        val connection = connections[userId]
        if (connection != null && !connection.session.isClosed) {
            connection.session.writeTextMessage(message.toJsonString())
            LOGGER.debug("Sent message to user $userId: $message")
        } else {
            LOGGER.warn("User $userId not connected or session closed. Message not sent: $message")
        }
    }

    fun broadcastMessage(message: Any, excludeConnection: Connection? = null) {
        connections.values.forEach { connection ->
            if (connection != excludeConnection && !connection.session.isClosed) {
                connection.session.writeTextMessage(message.toJsonString())
            }
        }
        LOGGER.debug("Broadcasted message to ${connections.size - (if (excludeConnection != null) 1 else 0)} clients: $message")
    }

    suspend fun broadcastMessageToConversationParticipants(conversationId: UUID, message: Any) {
        val conversation = db.findConversationById(conversationId)
        if (conversation != null) {
//            conversation.participants.forEach { participant ->
//                sendMessageToUser(participant, message)
//            }
            LOGGER.debug("Broadcasted message to participants of conversation $conversationId: ${message.toJsonString()}")
        } else {
            LOGGER.warn("Attempted to broadcast to non-existent conversation: $conversationId")
        }
    }

    companion object {
        private val LOGGER = logger()
    }
}