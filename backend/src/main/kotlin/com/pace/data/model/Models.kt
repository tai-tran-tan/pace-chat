// src/main/kotlin/com/pacechat/data/model/Models.kt
package com.pace.data.model

//import kotlinx.serialization.SerialName
import com.datastax.oss.driver.api.core.uuid.Uuids
import com.datastax.oss.driver.api.mapper.annotations.ClusteringColumn
import com.datastax.oss.driver.api.mapper.annotations.CqlName
import com.datastax.oss.driver.api.mapper.annotations.Entity
import com.datastax.oss.driver.api.mapper.annotations.PartitionKey
import com.datastax.oss.driver.api.mapper.annotations.Transient
import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonInclude
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonDeserialize
import com.fasterxml.jackson.databind.annotation.JsonNaming
import com.pace.data.db.impl.KeycloakCredential
import com.pace.data.db.impl.KeycloakUser
import com.pace.data.model.deserializer.InstantWithNanoSecondDeserializer
import java.time.Instant
import java.util.UUID

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
@JsonIgnoreProperties(ignoreUnknown = true)
data class User(
    @JsonProperty("sub")
    val userId: UUID = UUID.randomUUID(),
    @JsonProperty("preferred_username")
    var username: String?,
    val firstName: String?,
    val lastName: String?,
    var email: String?,
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    val password: String?, // In a real app, this should be hashed and not returned
    var status: String?, // online, offline, away
    var avatarUrl: String?,
    @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
    var lastSeen: Instant?
) {
    fun toUserPublic() = UserPublic(userId, requireNotNull(username), avatarUrl)
    fun toUserResponse() = UserResponse(userId, requireNotNull(username), email, status, avatarUrl, lastSeen)

    fun toKeycloakUser() = KeycloakUser(
        id = userId,
        username = username,
        firstName = firstName,
        lastName = lastName,
        email = email,
        emailVerified = null,
        attributes = mapOf(
            "avatar_url" to avatarUrl?.let { listOf(it) },
            "status" to status?.let { listOf(it) },
            "last_seen" to lastSeen?.let { listOf(it.toString()) }
        ).filter { (_, v) -> v != null && v.isNotEmpty() }
            .takeIf { it.isNotEmpty() },
        credentials = password?.let { listOf(KeycloakCredential(value = it)) }
    )
}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class UserPublic(
    val userId: UUID,
    val username: String,
    val avatarUrl: String?
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class UserResponse(
    val userId: UUID,
    val username: String,
    val email: String?,
    val status: String?,
    val avatarUrl: String?,
    @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
    val lastSeen: Instant?
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
@JsonInclude(JsonInclude.Include.NON_NULL)
data class ProfileUpdate(
    val firstName: String? = null,
    val lastName: String? = null,
    val email: String? = null,
    val avatarUrl: String? = null
)

// --- Auth Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthRegisterRequest @JsonCreator constructor(
    val username: String,
    val email: String?,
    val password: String,
    val firstName: String,
    val lastName: String,
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthRegisterResponse(
    val userId: UUID,
    val username: String,
    val message: String
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthLoginRequest(
    val username: String,
    val password: String
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class AuthLoginResponse(
    val userId: UUID,
    val username: String,
    val accessToken: String,
    val expiresIn: Long,
    val refreshToken: String,
    val refreshExpiresIn: Long
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class RefreshTokenRequest(val refreshToken: String)

// --- Conversation Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
@Entity // Maps to a Cassandra table
@CqlName("conversations_by_user")
data class Conversation @JvmOverloads constructor(
    @PartitionKey
    @CqlName("user_id")
    val userId: UUID,
    @CqlName("conv_id")
    @ClusteringColumn(1)
    @JsonProperty("conversation_id")
    val convId: UUID = Uuids.timeBased(),
    val type: String, // "private" or "group"
    val exitedTime: Instant? = null,
    var title: String?, // For group chats, null for private
    @Transient
    var participants: MutableSet<UUID> = mutableSetOf(),
    @Transient
    var lastMessageTimestamp: Instant? = null,
    @Transient
    var lastMessagePreview: String? = null,
) {
    fun toConversationResponse(p: List<UserPublic> = emptyList()) =
        ConversationResponse(convId, type, title, p, lastMessagePreview, lastMessageTimestamp)

}

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationResponse(
    val conversationId: UUID,
    val type: String, // "private" or "group"
    var title: String?, // For group chats, null for private
    var participants: List<UserPublic>, // List of participants with public info
    var lastMessagePreview: String?,
    @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
    var lastMessageTimestamp: Instant?,
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationPrivateRequest @JsonCreator constructor(
    val targetUserId: UUID
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationGroupCreateRequest(
    val title: String,
    val participantIds: List<UUID>
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class ConversationGroupParticipantsUpdate(
    val addIds: List<UUID> = emptyList(),
    val removeIds: List<UUID> = emptyList()
)

// --- Message Models ---
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
@Entity
@CqlName("messages_by_conversation")
data class Message @JvmOverloads constructor(
    @PartitionKey(1)
    @JsonProperty("conversation_id")
    val convId: UUID,
    @ClusteringColumn(1)
    val messageId: UUID,
    @ClusteringColumn(2)
    val senderId: UUID,
    val content: String,
    val readBy: MutableList<UUID> = mutableListOf(), // User IDs who have read this message
    @Transient
    val timestamp: Instant = Instant.ofEpochMilli(Uuids.unixTimestamp(messageId) ),
)

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
data class MessagesHistoryResponse(
    val messages: List<Message>,
    val hasMore: Boolean,
    val nextBeforeMessageId: UUID?
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
    val userId: UUID,
    val deviceToken: String,
    val platform: String, // "android", "ios"
    @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
    val registeredAt: Instant
)

// --- WebSocket Message Models ---
// Using Sealed Class for WebSocket messages for clear distinction and type safety
@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
sealed class WsMessage {
    abstract val type: EventType // Common property for all WebSocket messages

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class WsPingMessage(
        override val type: EventType = EventType.PING,
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class WsAuthMessage(
        override val type: EventType = EventType.AUTH,
        val token: String
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class WsAuthSuccess(
        override val type: EventType = EventType.AUTH_SUCCESS,
        val userId: UUID
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class WsAuthFailure(
        override val type: EventType = EventType.AUTH_FAILURE,
        val reason: String
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class SendMessage(
        override val type: EventType = EventType.SEND_MESSAGE,
        val conversationId: UUID,
        val content: String,
        val clientMessageId: UUID // Client-generated ID for ACK
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class MessageDelivered(
        override val type: EventType = EventType.MESSAGE_DELIVERED,
        val serverMessageId: UUID?, // Server's actual message ID
        @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
        val timestamp: Instant,
        val status: String // "success" or "failure"
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class MessageReceived(
        override val type: EventType = EventType.MESSAGE_RECEIVED,
        val message: Message // The full message object
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class TypingIndicator(
        override val type: EventType = EventType.TYPING_INDICATOR,
        val conversationId: UUID,
        val userId: UUID,
        val isTyping: Boolean
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class ReadReceipt(
        override val type: EventType = EventType.READ_RECEIPT,
        val conversationId: UUID,
        val lastReadMessageId: UUID
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class WsMessageReadStatus(
        override val type: EventType = EventType.MESSAGE_READ_STATUS,
        val conversationId: UUID,
        val messageId: UUID, // The specific message ID that was read (or up to which was read)
        val readerId: UUID,
        @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
        val readAt: Instant
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class WsPresenceUpdate(
        override val type: EventType = EventType.PRESENCE_UPDATE,
        val userId: UUID,
        val status: UserStatus, // "online", "offline", "away"
        @JsonDeserialize(using = InstantWithNanoSecondDeserializer::class)
        val lastSeen: Instant?
    ) : WsMessage()

    @JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
    data class ConversationUpdate(
        override val type: EventType = EventType.CONVERSATION_UPDATE,
        val conversationId: UUID,
        val changeType: String, // e.g., "name_changed", "participant_added", "participant_removed"
        val newName: String? = null, // if changeType is "name_changed"
        val participantId: UUID? = null // if changeType is "participant_added" or "participant_removed"
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
        AUTH,
        PING,
        PONG
    }

    enum class UserStatus {
        ONLINE, OFFLINE, AWAY
    }
}