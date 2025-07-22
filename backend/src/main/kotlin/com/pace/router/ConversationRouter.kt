package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.ConversationGroupCreateRequest
import com.pace.data.model.ConversationGroupParticipantsUpdate
import com.pace.data.model.ConversationPrivateRequest
import com.pace.data.model.WsMessage
import com.pace.utility.toJsonString
import com.pace.ws.ConnectionsManager
import io.vertx.ext.web.Router
import org.apache.logging.log4j.kotlin.logger
import java.util.UUID

class ConversationRouter(
    private val router: Router, private val db: DbAccessible, private val connectionsManager: ConnectionsManager
) {
    fun setupRoutes(): Router {
        router.get("/conversations").coroutineHandler { rc ->
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val conversations = db.getConversationsForUser(userId)
                .map { c ->
                    val conv = requireNotNull(db.findConversationById(c.convId))
                    val participants = db.findUserByIds(conv.participants.toList()).map { it.toUserPublic() }
                    conv.toConversationResponse(participants)
                }
            rc.response().setStatusCode(200).end(conversations.toJsonString())
        }

        router.get("/conversations/:conversationId").coroutineHandler { rc ->
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val conversationId = rc.pathParam("conversationId").let { UUID.fromString(it) }
            val conv = db.findConversationById(conversationId)
                ?.takeIf { it.participants.contains(userId) }

            if (conv == null) {
                rc.response().setStatusCode(404)
                    .end(mapOf("message" to "Conversation not found or not accessible").toJsonString())
                return@coroutineHandler
            }
            val participants = db.findUserByIds(conv.participants.toList()).map { it.toUserPublic() }
            rc.response().setStatusCode(200)
                .end(conv.toConversationResponse(participants).toJsonString())
        }

        router.post("/conversations/private").coroutineHandler { rc ->
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val request = rc.bodyAsPojo<ConversationPrivateRequest>()

            if (request.targetUserId == userId) {
                rc.response().setStatusCode(400)
                    .end(mapOf("message" to "Cannot create private conversation with yourself").toJsonString())
                return@coroutineHandler
            }

            val targetUser = db.findUserById(request.targetUserId)
            if (targetUser == null) {
                rc.response().setStatusCode(404).end(mapOf("message" to "Target user not found").toJsonString())
                return@coroutineHandler
            }

            val participants = listOf(
                requireNotNull(db.findUserById(userId)) {
                    "Current user can not be null here"
                },
                targetUser
            ).map { u -> u.toUserPublic() }
            val existingConv = db.findPrivateConversation(userId, targetUser.userId)
                ?.toConversationResponse(participants)
            if (existingConv != null) {
                rc.response().setStatusCode(200).end(existingConv.toJsonString())
                return@coroutineHandler
            }

            val newConversation = db.createPrivateConversation(userId, targetUser.userId)
            rc.response().setStatusCode(201).end(newConversation.toConversationResponse(participants).toJsonString())
            LOGGER.info("Private conversation created between $userId and ${targetUser.userId}")
        }

        router.post("/conversations/group").coroutineHandler { rc ->
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val request = rc.bodyAsPojo<ConversationGroupCreateRequest>()

            if (request.title.isBlank() || request.participantIds.size < 2 || !request.participantIds.contains(userId)) {
                rc.response().setStatusCode(400)
                    .end(mapOf("message" to "Invalid group data. Name, at least 2 participants (including creator) are required.").toJsonString())
                return@coroutineHandler
            }

            val participants = db.findUserByIds(request.participantIds)
            val allParticipantsExist = request.participantIds.size == participants.size
            if (!allParticipantsExist) {
                rc.response().setStatusCode(400)
                    .end(mapOf("message" to "One or more participants not found.").toJsonString())
                return@coroutineHandler
            }

            val newConversation =
                db.createGroupConversation(userId, request.title, request.participantIds).toConversationResponse(
                    participants.map { it.toUserPublic() })
            rc.response().setStatusCode(201).end(newConversation.toJsonString())
            LOGGER.info("Group conversation '${newConversation.title}' created by $userId")
        }

        router.put("/conversations/group/:conversationId/participants").coroutineHandler { rc ->
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val conversationId = rc.pathParam("conversationId").let { UUID.fromString(it) }
            val request = rc.bodyAsPojo<ConversationGroupParticipantsUpdate>()

            val groups = db.getConversationsForUser(userId).filter { it.type == "group" && it.convId == conversationId }
            if (groups.isEmpty()) {
                rc.response().setStatusCode(404)
                    .end(mapOf("message" to "Group conversation not found or not accessible").toJsonString())
                return@coroutineHandler
            }

            val updatedConversation = db.updateGroupParticipants(
                conversationId, request.addIds, request.removeIds
            )

            if (updatedConversation) {
                rc.response().setStatusCode(200).end(mapOf("message" to "Group participants updated.").toJsonString())
                LOGGER.info("Group participants updated for conv $conversationId by $userId")

                // Notify WebSocket clients about conversation update
                request.addIds.forEach { addedParticipantId ->
                    connectionsManager.broadcastMessageToConversationParticipants(
                        conversationId, WsMessage.ConversationUpdate(
                            conversationId = conversationId,
                            changeType = "participant_added",
                            participantId = addedParticipantId
                        ).toJsonString()
                    )
                }
                request.removeIds.forEach { removedParticipantId ->
                    connectionsManager.broadcastMessageToConversationParticipants(
                        conversationId, WsMessage.ConversationUpdate(
                            conversationId = conversationId,
                            changeType = "participant_removed",
                            participantId = removedParticipantId
                        ).toJsonString()
                    )
                }

            } else {
                rc.response().setStatusCode(400)
                    .end(mapOf("message" to "Failed to update group participants").toJsonString())
            }
        }
        return router
    }

    companion object {
        private val LOGGER = logger()
    }
}