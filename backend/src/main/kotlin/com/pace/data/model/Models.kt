// src/main/kotlin/com/pacechat/data/model/Models.kt
package com.pace.data.model

import com.fasterxml.jackson.annotation.JsonCreator
import kotlinx.datetime.Instant
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

// Using @Serializable for kotlinx.serialization

// --- User Models ---
@Serializable
data class User(
    @SerialName("user_id") val userId: String,
    var username: String,
    var email: String,
    val password: String, // In a real app, this should be hashed and not returned
    var status: String, // online, offline, away
    @SerialName("avatar_url") var avatarUrl: String?,
    @SerialName("last_seen") var lastSeen: Instant?
) {
    fun toUserPublic() = UserPublic(userId, username, avatarUrl)
    fun toUserResponse() = UserResponse(userId, username, email, status, avatarUrl, lastSeen)
}

@Serializable
data class UserPublic(
    @SerialName("user_id") val userId: String,
    val username: String,
    @SerialName("avatar_url") val avatarUrl: String?
)

@Serializable
data class UserResponse(
    @SerialName("user_id") val userId: String,
    val username: String,
    val email: String,
    val status: String,
    @SerialName("avatar_url") val avatarUrl: String?,
    val lastSeen: Instant?
)

@Serializable
data class ProfileUpdate(
    val username: String? = null,
    val email: String? = null,
    @SerialName("avatar_url") val avatarUrl: String? = null
)

// --- Auth Models ---
@Serializable
data class AuthRegisterRequest(val username: String, val email: String, val password: String)

@Serializable
@SerialName("user_id")
data class AuthRegisterResponse(val userId: String, val username: String, val message: String)

@Serializable
data class AuthLoginRequest @JsonCreator constructor(val username: String, val password: String)

@Serializable
data class AuthLoginResponse(
    @SerialName("user_id") val userId: String,
    @SerialName("username") val username: String,
    @SerialName("token") val token: String,
    @SerialName("refresh_token") val refreshToken: String
)

@Serializable
data class RefreshTokenRequest(@SerialName("refresh_token") val refreshToken: String)

@Serializable
data class RefreshTokenResponse(val token: String)

// --- Conversation Models ---
@Serializable
data class Conversation(
    @SerialName("conversation_id") val conversationId: String,
    val type: String, // "private" or "group"
    var name: String?, // For group chats, null for private
    var participants: List<UserPublic>, // List of participants with public info
    @SerialName("last_message_preview") var lastMessagePreview: String?,
    @SerialName("last_message_timestamp") var lastMessageTimestamp: Instant?,
    @SerialName("unread_count") var unreadCount: Int // Simplified, backend might not actually calculate this
)

@Serializable
data class ConversationPrivateRequest @JsonCreator constructor(
    @SerialName("target_username") val targetUsername: String
)

@Serializable
data class ConversationGroupCreateRequest(
    val name: String,
    @SerialName("participant_ids") val participantIds: List<String>
)

@Serializable
data class ConversationGroupParticipantsUpdate(
    @SerialName("add_ids") val addIds: List<String> = emptyList(),
    @SerialName("remove_ids") val removeIds: List<String> = emptyList()
)

// --- Message Models ---
@Serializable
data class Message(
    @SerialName("message_id") val messageId: String,
    @SerialName("conversation_id") val conversationId: String,
    @SerialName("sender_id") val senderId: String,
    val content: String,
    @SerialName("message_type") val messageType: String, // "text", "image", "video", "file"
    val timestamp: Instant,
    @SerialName("read_by") val readBy: MutableList<String> = mutableListOf(), // User IDs who have read this message
    @SerialName("client_message_id") val clientMessageId: String? = null // Optional: for client-side tracking before server ACK
)

@Serializable
data class MessagesHistoryResponse(
    val messages: List<Message>,
    @SerialName("has_more") val hasMore: Boolean,
    @SerialName("next_before_message_id") val nextBeforeMessageId: String?
)

@Serializable
data class FileUploadResponse(
    @SerialName("file_url") val fileUrl: String,
    @SerialName("file_type") val fileType: String,
    @SerialName("file_size") val fileSize: Long
)

// --- Device Token for Push Notifications ---
@Serializable
data class DeviceToken(
    @SerialName("user_id") val userId: String,
    @SerialName("device_token") val deviceToken: String,
    @SerialName("platform") val platform: String, // "android", "ios"
    @SerialName("registered_at") val registeredAt: Instant
)

// --- WebSocket Message Models ---
// Using Sealed Class for WebSocket messages for clear distinction and type safety
@Serializable
sealed class WsMessage {
    abstract val type: EventType // Common property for all WebSocket messages

    @Serializable
    @SerialName("AUTH")
    data class WsAuthMessage(
        override val type: EventType = EventType.AUTH,
        val token: String
    ) : WsMessage()

    @Serializable
    @SerialName("AUTH_SUCCESS")
    data class WsAuthSuccess(
        override val type: EventType = EventType.AUTH_SUCCESS,
        @SerialName("user_id") val userId: String
    ) : WsMessage()

    @Serializable
    @SerialName("AUTH_FAILURE")
    data class WsAuthFailure(
        override val type: EventType = EventType.AUTH_FAILURE,
        val reason: String
    ) : WsMessage()

    @Serializable
    @SerialName("SEND_MESSAGE")
    data class SendMessage(
        override val type: EventType = EventType.SEND_MESSAGE,
        @SerialName("conversation_id") val conversationId: String,
        val content: String,
        @SerialName("message_type") val messageType: String,
        @SerialName("client_message_id") val clientMessageId: String // Client-generated ID for ACK
    ) : WsMessage()

    @Serializable
    @SerialName("MESSAGE_DELIVERED")
    data class MessageDelivered(
        override val type: EventType = EventType.MESSAGE_DELIVERED,
        @SerialName("client_message_id") val clientMessageId: String, // Echoes client's ID
        @SerialName("server_message_id") val serverMessageId: String, // Server's actual message ID
        val timestamp: Instant,
        val status: String // "success" or "failure"
    ) : WsMessage()

    @Serializable
    @SerialName("MESSAGE_RECEIVED")
    data class MessageReceived(
        override val type: EventType = EventType.MESSAGE_RECEIVED,
        val message: Message // The full message object
    ) : WsMessage()

    @Serializable
    @SerialName("TYPING_INDICATOR")
    data class TypingIndicator(
        override val type: EventType = EventType.TYPING_INDICATOR,
        @SerialName("conversation_id") val conversationId: String,
        @SerialName("user_id") val userId: String,
        @SerialName("is_typing") val isTyping: Boolean
    ) : WsMessage()

    @Serializable
    @SerialName("READ_RECEIPT")
    data class ReadReceipt(
        override val type: EventType = EventType.READ_RECEIPT,
        @SerialName("conversation_id") val conversationId: String,
        @SerialName("last_read_message_id") val lastReadMessageId: String
    ) : WsMessage()

    @Serializable
    @SerialName("MESSAGE_READ_STATUS")
    data class WsMessageReadStatus(
        override val type: EventType = EventType.MESSAGE_READ_STATUS,
        @SerialName("conversation_id") val conversationId: String,
        @SerialName("message_id") val messageId: String, // The specific message ID that was read (or up to which was read)
        @SerialName("reader_id") val readerId: String,
        @SerialName("read_at") val readAt: Instant
    ) : WsMessage()

    @Serializable
    @SerialName("PRESENCE_UPDATE")
    data class WsPresenceUpdate(
        override val type: EventType = EventType.PRESENCE_UPDATE,
        @SerialName("user_id") val userId: String,
        val status: UserStatus, // "online", "offline", "away"
        @SerialName("last_seen")val lastSeen: Instant?
    ) : WsMessage()

    @Serializable
    @SerialName("CONVERSATION_UPDATE")
    data class ConversationUpdate(
        override val type: EventType = EventType.CONVERSATION_UPDATE,
        @SerialName("conversation_id") val conversationId: String,
        @SerialName("change_type") val changeType: String, // e.g., "name_changed", "participant_added", "participant_removed"
        @SerialName("new_name") val newName: String? = null, // if changeType is "name_changed"
        @SerialName("participant_id") val participantId: String? = null // if changeType is "participant_added" or "participant_removed"
    ) : WsMessage()

    enum class EventType {
        CONVERSATION_UPDATE,
        PRESENCE_UPDATE,
        MESSAGE_READ_STATUS,
        READ_RECEIPT,
        TYPING_INDICATOR,
        MESSAGE_RECEIVED,
        MESSAGE_DELIVERED,
        SEND_MESSAGE,
        AUTH_FAILURE,
        AUTH_SUCCESS,
        AUTH
    }

    enum class UserStatus {
        ONLINE, OFFLINE, AWAY
    }
}