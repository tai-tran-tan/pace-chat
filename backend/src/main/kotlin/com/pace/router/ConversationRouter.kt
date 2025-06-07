// src/main/kotlin/com/pacechat/router/ConversationRouter.kt
package com.pace.router

import com.pace.data.InMemoryDatabase
import com.pace.data.model.ConversationGroupCreateRequest
import com.pace.data.model.ConversationGroupParticipantsUpdate
import com.pace.data.model.ConversationPrivateRequest
import com.pace.data.model.WsMessage
import com.pace.ws.ConnectionsManager
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class ConversationRouter(private val router: Router) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.get("/conversations").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversations = InMemoryDatabase.getConversationsForUser(userId)
            rc.response().setStatusCode(200).end(Json.encodeToString(conversations))
        }

        router.get("/conversations/:conversationId").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversationId = rc.pathParam("conversationId")
            val conversation = InMemoryDatabase.findConversationById(conversationId)

            if (conversation == null || !conversation.participants.any { it.userId == userId }) {
                rc.response().setStatusCode(404).end(Json.encodeToString(mapOf("message" to "Conversation not found or not accessible")))
                return@coroutineHandler
            }
            rc.response().setStatusCode(200).end(Json.encodeToString(conversation))
        }

        router.post("/conversations/private").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.body().asPojo(ConversationPrivateRequest::class.java)
            val targetUser = InMemoryDatabase.findUserById(request.targetUserId)

            if (targetUser == null) {
                rc.response().setStatusCode(404).end(Json.encodeToString(mapOf("message" to "Target user not found")))
                return@coroutineHandler
            }
            if (targetUser.userId == userId) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "Cannot create private conversation with yourself")))
                return@coroutineHandler
            }

            val existingConv = InMemoryDatabase.findPrivateConversation(userId, targetUser.userId)
            if (existingConv != null) {
                rc.response().setStatusCode(200).end(Json.encodeToString(existingConv))
                return@coroutineHandler
            }

            val newConversation = InMemoryDatabase.createPrivateConversation(userId, targetUser.userId)
            rc.response().setStatusCode(201).end(Json.encodeToString(newConversation))
            logger.info("Private conversation created between $userId and ${targetUser.userId}")
        }

        router.post("/conversations/group").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.body().asPojo(ConversationGroupCreateRequest::class.java)

            if (request.name.isBlank() || request.participantIds.size < 2 || !request.participantIds.contains(userId)) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "Invalid group data. Name, at least 2 participants (including creator) are required.")))
                return@coroutineHandler
            }

            val allParticipantsExist = request.participantIds.all { id -> InMemoryDatabase.findUserById(id) != null }
            if (!allParticipantsExist) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "One or more participants not found.")))
                return@coroutineHandler
            }

            val newConversation = InMemoryDatabase.createGroupConversation(userId, request.name, request.participantIds)
            rc.response().setStatusCode(201).end(Json.encodeToString(newConversation))
            logger.info("Group conversation '${newConversation.name}' created by $userId")
        }

        router.put("/conversations/group/:conversationId/participants").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversationId = rc.pathParam("conversationId")
            val request = rc.body().asPojo(ConversationGroupParticipantsUpdate::class.java)

            val conversation = InMemoryDatabase.findConversationById(conversationId)
            if (conversation == null || conversation.type != "group" || !conversation.participants.any { it.userId == userId }) {
                rc.response().setStatusCode(404).end(Json.encodeToString(mapOf("message" to "Group conversation not found or not accessible")))
                return@coroutineHandler
            }

            val updatedConversation = InMemoryDatabase.updateGroupParticipants(
                conversationId,
                request.addIds,
                request.removeIds
            )

            if (updatedConversation != null) {
                rc.response().setStatusCode(200).end(Json.encodeToString(mapOf("message" to "Group participants updated.")))
                logger.info("Group participants updated for conv $conversationId by $userId")

                // Notify WebSocket clients about conversation update
                request.addIds.forEach { addedParticipantId ->
                    ConnectionsManager.broadcastMessageToConversationParticipants(
                        conversationId,
                        Json.encodeToString(WsMessage.ConversationUpdate(conversationId = conversationId, changeType = "participant_added", participantId = addedParticipantId))
                    )
                }
                request.removeIds.forEach { removedParticipantId ->
                    ConnectionsManager.broadcastMessageToConversationParticipants(
                        conversationId,
                        Json.encodeToString(WsMessage.ConversationUpdate(conversationId= conversationId, changeType =  "participant_removed", participantId = removedParticipantId))
                    )
                }

            } else {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "Failed to update group participants")))
            }
        }
    }
}