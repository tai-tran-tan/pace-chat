// src/main/kotlin/com/pacechat/router/MessageRouter.kt
package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.FileUploadResponse
import com.pace.data.model.MessagesHistoryResponse
import com.pace.extensions.coroutineHandler
import com.pace.extensions.toJsonString
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import org.apache.logging.log4j.kotlin.logger
import java.util.UUID


class MessageRouter(private val router: Router, private val db: DbAccessible) {

    fun setupRoutes(): Router {
        // get messages in a conversation
        router.get("/conversations/:conversationId/messages")
            .coroutineHandler { rc ->
                val userId = rc.user().subject().let { UUID.fromString(it) }
                val conversationId = rc.pathParam("conversationId").let { UUID.fromString(it) }
                val limit = rc.request().getParam("limit")?.toIntOrNull() ?: 30
                val beforeMessageId = rc.request().getParam("before_message_id")?.let { UUID.fromString(it) }

                val conversation = db.findConversationById(conversationId)
                if (conversation == null || !conversation.participants.any { it == userId }) {
                    rc.response().setStatusCode(404)
                        .end(mapOf("message" to "Conversation not found or not accessible").toJsonString())
                    return@coroutineHandler
                }

                val messages = db.getMessagesForConversation(conversationId, limit, beforeMessageId)
                val hasMore = messages.takeIf { it.isNotEmpty() }
                    ?.let { db.hasOlderMessages(conversationId, it.first().messageId) }
                    ?: false

                rc.response().setStatusCode(200)
                    .end(MessagesHistoryResponse(messages, hasMore).toJsonString())
            }

        router.post("/messages/upload").handler(BodyHandler.create().setHandleFileUploads(true))
            .coroutineHandler { rc ->
                val uploads = rc.fileUploads()
                if (uploads.isEmpty()) {
                    rc.response().setStatusCode(400).end(mapOf("message" to "No file provided").toJsonString())
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
                rc.response().setStatusCode(201).end(FileUploadResponse(fileUrl, contentType, fileSize).toJsonString())
                LOGGER.info("Dummy file uploaded: $fileName, size: $fileSize, temp path: ${upload.uploadedFileName()}")

                // Cleanup temp file (Vert.x BodyHandler deletes temp files by default after response)
            }
        return router
    }

    companion object {
        private val LOGGER = logger()
    }
}