package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.ConversationGroupCreateRequest
import com.pace.data.model.ConversationGroupParticipantsUpdate
import com.pace.data.model.ConversationPrivateRequest
import com.pace.data.model.WsMessage
import com.pace.utility.toJsonString
import com.pace.ws.ConnectionsManager
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router

class ConversationRouter(
    private val router: Router,
    private val db: DbAccessible,
    private val connectionsManager: ConnectionsManager
) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.get("/conversations").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversations = db.getConversationsForUser(userId)
                .map {
                    it.toConversationResponse(
                        db.findUserByIds(it.participants).map { p -> p.toUserPublic() }
                    )
                }
            rc.response().setStatusCode(200).end(conversations.toJsonString())
        }

        router.get("/conversations/:conversationId").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversationId = rc.pathParam("conversationId")
            val conversation = db.findConversationById(conversationId)

            if (conversation == null || !conversation.participants.contains(userId)) {
                rc.response().setStatusCode(404)
                    .end(mapOf("message" to "Conversation not found or not accessible").toJsonString())
                return@coroutineHandler
            }
            val participants = db.findUserByIds(conversation.participants).map { it.toUserPublic() }
            rc.response().setStatusCode(200)
                .end(conversation.toConversationResponse(participants).toJsonString())
        }

        router.post("/conversations/private").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.bodyAsPojo<ConversationPrivateRequest>()
            val targetUser = db.findUserById(request.targetUserId)

            if (targetUser == null) {
                rc.response().setStatusCode(404).end(mapOf("message" to "Target user not found").toJsonString())
                return@coroutineHandler
            }
            if (targetUser.userId == userId) {
                rc.response().setStatusCode(400)
                    .end(mapOf("message" to "Cannot create private conversation with yourself").toJsonString())
                return@coroutineHandler
            }

            val participants = listOf(
                requireNotNull(db.findUserById(userId)?.toUserPublic()) {
                    "Current user can not be null here"
                },
                targetUser.toUserPublic()
            )
            val existingConv = db.findPrivateConversation(userId, targetUser.userId)
                ?.toConversationResponse(
                    participants
                )
            if (existingConv != null) {
                rc.response().setStatusCode(200).end(existingConv.toJsonString())
                return@coroutineHandler
            }

            val newConversation = db.createPrivateConversation(userId, targetUser.userId)
            rc.response().setStatusCode(201)
                .end(newConversation.toConversationResponse(participants).toJsonString())
            logger.info("Private conversation created between $userId and ${targetUser.userId}")
        }

        router.post("/conversations/group").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.bodyAsPojo<ConversationGroupCreateRequest>()

            if (request.name.isBlank() || request.participantIds.size < 2 || !request.participantIds.contains(userId)) {
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

            val newConversation = db.createGroupConversation(userId, request.name, request.participantIds)
                .toConversationResponse(
                    participants
                        .map { it.toUserPublic() }
                )
            rc.response().setStatusCode(201).end(newConversation.toJsonString())
            logger.info("Group conversation '${newConversation.name}' created by $userId")
        }

        router.put("/conversations/group/:conversationId/participants").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversationId = rc.pathParam("conversationId")
            val request = rc.bodyAsPojo<ConversationGroupParticipantsUpdate>()

            val conversation = db.findConversationById(conversationId)
            if (conversation == null || conversation.type != "group" || !conversation.participants.any { it == userId }) {
                rc.response().setStatusCode(404)
                    .end(mapOf("message" to "Group conversation not found or not accessible").toJsonString())
                return@coroutineHandler
            }

            val updatedConversation = db.updateGroupParticipants(
                conversationId,
                request.addIds,
                request.removeIds
            )

            if (updatedConversation != null) {
                rc.response().setStatusCode(200).end(mapOf("message" to "Group participants updated.").toJsonString())
                logger.info("Group participants updated for conv $conversationId by $userId")

                // Notify WebSocket clients about conversation update
                request.addIds.forEach { addedParticipantId ->
                    connectionsManager.broadcastMessageToConversationParticipants(
                        conversationId,
                        WsMessage.ConversationUpdate(
                            conversationId = conversationId,
                            changeType = "participant_added",
                            participantId = addedParticipantId
                        ).toJsonString()
                    )
                }
                request.removeIds.forEach { removedParticipantId ->
                    connectionsManager.broadcastMessageToConversationParticipants(
                        conversationId,
                        WsMessage.ConversationUpdate(
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
    }
}