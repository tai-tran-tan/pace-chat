// src/main/kotlin/com/pacechat/data/model/Models.kt
package com.pace.data.model

//import kotlinx.serialization.SerialName
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming
import kotlinx.datetime.Instant
import java.util.*

// Using @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class) for kotlinx.serialization

// --- User Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class User(
    val userId: String = UUID.randomUUID().toString(),
    var username: String,
    var email: String,
    val password: String, // In a real app, this should be hashed and not returned
    var status: String, // online, offline, away
    val conversations: List<Conversation> = mutableListOf(),
    var avatarUrl: String?,
    var lastSeen: Instant?
) {
    fun toUserPublic() = UserPublic(userId, username, avatarUrl)
    fun toUserResponse() = UserResponse(userId, username, email, status, avatarUrl, lastSeen)
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class UserPublic(
    val userId: String,
    val username: String,
    val avatarUrl: String?
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class UserResponse(
    val userId: String,
    val username: String,
    val email: String,
    val status: String,
    val avatarUrl: String?,
    val lastSeen: Instant?
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ProfileUpdate(
    val username: String? = null,
    val email: String? = null,
    val avatarUrl: String? = null
)

// --- Auth Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthRegisterRequest @JsonCreator constructor(
    val username: String,
    val email: String,
    val password: String
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthRegisterResponse(
    val userId: String,
    val username: String,
    val message: String
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthLoginRequest (val username: String, val password: String)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthLoginResponse(
    val userId: String,
    val username: String,
    val token: String,
    val refreshToken: String
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class RefreshTokenRequest(val refreshToken: String)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class RefreshTokenResponse(val token: String)

// --- Conversation Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class Conversation(
    val conversationId: String,
    val type: String, // "private" or "group"
    var name: String?, // For group chats, null for private
    var participants: List<UserPublic>, // List of participants with public info
    var lastMessagePreview: String?,
    var lastMessageTimestamp: Instant?,
    var unreadCount: Int // Simplified, backend might not actually calculate this
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationPrivateRequest @JsonCreator constructor(
    val targetUserId: String
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationGroupCreateRequest(
    val name: String,
    val participantIds: List<String>
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationGroupParticipantsUpdate(
    val addIds: List<String> = emptyList(),
    val removeIds: List<String> = emptyList()
)

// --- Message Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class Message(
    val messageId: String,
    val conversationId: String,
    val senderId: String,
    val content: String,
    val messageType: String, // "text", "image", "video", "file"
    val timestamp: Instant,
    val readBy: MutableList<String> = mutableListOf(), // User IDs who have read this message
    val clientMessageId: String? = null // Optional: for client-side tracking before server ACK
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class MessagesHistoryResponse(
    val messages: List<Message>,
    val hasMore: Boolean,
    val nextBeforeMessageId: String?
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class FileUploadResponse(
    val fileUrl: String,
    val fileType: String,
    val fileSize: Long
)

// --- Device Token for Push Notifications ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class DeviceToken(
    val userId: String,
    val deviceToken: String,
    val platform: String, // "android", "ios"
    val registeredAt: Instant
)

// --- WebSocket Message Models ---
// Using Sealed Class for WebSocket messages for clear distinction and type safety
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
sealed class WsMessage {
    abstract val type: EventType // Common property for all WebSocket messages

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("AUTH")
    data class WsAuthMessage(
        override val type: EventType = EventType.AUTH,
        val token: String
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("AUTH_SUCCESS")
    data class WsAuthSuccess(
        override val type: EventType = EventType.AUTH_SUCCESS,
        val userId: String
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("AUTH_FAILURE")
    data class WsAuthFailure(
        override val type: EventType = EventType.AUTH_FAILURE,
        val reason: String
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("SEND_MESSAGE")
    data class SendMessage(
        override val type: EventType = EventType.SEND_MESSAGE,
        val conversationId: String,
        val content: String,
        val messageType: String,
        val clientMessageId: String // Client-generated ID for ACK
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("MESSAGE_DELIVERED")
    data class MessageDelivered(
        override val type: EventType = EventType.MESSAGE_DELIVERED,
        val clientMessageId: String, // Echoes client's ID
        val serverMessageId: String, // Server's actual message ID
        val timestamp: Instant,
        val status: String // "success" or "failure"
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("MESSAGE_RECEIVED")
    data class MessageReceived(
        override val type: EventType = EventType.MESSAGE_RECEIVED,
        val message: Message // The full message object
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("TYPING_INDICATOR")
    data class TypingIndicator(
        override val type: EventType = EventType.TYPING_INDICATOR,
        val conversationId: String,
        val userId: String,
        val isTyping: Boolean
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("READ_RECEIPT")
    data class ReadReceipt(
        override val type: EventType = EventType.READ_RECEIPT,
        val conversationId: String,
        val lastReadMessageId: String
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("MESSAGE_READ_STATUS")
    data class WsMessageReadStatus(
        override val type: EventType = EventType.MESSAGE_READ_STATUS,
        val conversationId: String,
        val messageId: String, // The specific message ID that was read (or up to which was read)
        val readerId: String,
        val readAt: Instant
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("PRESENCE_UPDATE")
    data class WsPresenceUpdate(
        override val type: EventType = EventType.PRESENCE_UPDATE,
        val userId: String,
        val status: UserStatus, // "online", "offline", "away"
        val lastSeen: Instant?
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
//    @SerialName("CONVERSATION_UPDATE")
    data class ConversationUpdate(
        override val type: EventType = EventType.CONVERSATION_UPDATE,
        val conversationId: String,
        val changeType: String, // e.g., "name_changed", "participant_added", "participant_removed"
        val newName: String? = null, // if changeType is "name_changed"
        val participantId: String? = null // if changeType is "participant_added" or "participant_removed"
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