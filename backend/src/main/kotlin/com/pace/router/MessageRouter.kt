// src/main/kotlin/com/pacechat/router/MessageRouter.kt
package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.FileUploadResponse
import com.pace.data.model.MessagesHistoryResponse
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json
import java.util.UUID

class MessageRouter(private val router: Router, private val db: DbAccessible) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.get("/conversations/:conversationId/messages").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val conversationId = rc.pathParam("conversationId")
            val limit = rc.request().getParam("limit")?.toIntOrNull() ?: 50
            val beforeMessageId = rc.request().getParam("before_message_id")

            val conversation = db.findConversationById(conversationId)
            if (conversation == null || !conversation.participants.any { it.userId == userId }) {
                rc.response().setStatusCode(404).end(Json.encodeToString(mapOf("message" to "Conversation not found or not accessible")))
                return@coroutineHandler
            }

            val messages = db.getMessagesForConversation(conversationId, limit, beforeMessageId)
            val hasMore = db.hasMoreMessages(conversationId, messages.firstOrNull()?.messageId)
            val nextBeforeMessageId = if (hasMore && messages.isNotEmpty()) messages.first().messageId else null

            rc.response().setStatusCode(200).end(Json.encodeToString(MessagesHistoryResponse(messages, hasMore, nextBeforeMessageId)))
        }

        router.post("/messages/upload").handler(BodyHandler.create().setHandleFileUploads(true)).coroutineHandler { rc ->
            val uploads = rc.fileUploads()
            if (uploads.isEmpty()) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "No file provided")))
                return@coroutineHandler
            }

            // This is a dummy endpoint for file upload.
            // In a real app, you'd handle multipart form data and save to cloud storage (S3, GCS, etc.)
            val upload = uploads.first()
            val fileName = upload.fileName()
            val contentType = upload.contentType() ?: "application/octet-stream"
            val fileSize = upload.size() // Size in bytes

            // Simulate file storage and return a dummy URL
            val fileUrl = "https://placehold.co/150x150/png?text=UploadedFile&file=${UUID.randomUUID()}_$fileName"
            rc.response().setStatusCode(201).end(Json.encodeToString(FileUploadResponse(fileUrl, contentType, fileSize)))
            logger.info("Dummy file uploaded: $fileName, size: $fileSize, temp path: ${upload.uploadedFileName()}")

            // Cleanup temp file (Vert.x BodyHandler deletes temp files by default after response)
        }
    }
}