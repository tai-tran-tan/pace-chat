package com.pace.data

import com.google.inject.Inject
import com.pace.data.db.DbAccessible
import com.pace.data.model.Conversation
import kotlinx.coroutines.runBlocking
import kotlinx.serialization.KSerializer
import kotlinx.serialization.descriptors.PrimitiveKind
import kotlinx.serialization.descriptors.PrimitiveSerialDescriptor
import kotlinx.serialization.descriptors.SerialDescriptor
import kotlinx.serialization.encoding.Decoder
import kotlinx.serialization.encoding.Encoder

object ConversationDeserializer: KSerializer<Conversation> {
    @Inject
    private lateinit var db: DbAccessible
    override val descriptor: SerialDescriptor
        get() = PrimitiveSerialDescriptor("Conversation", PrimitiveKind.STRING)

    override fun deserialize(decoder: Decoder): Conversation {
        return runBlocking {
            val id = decoder.decodeString()
            requireNotNull(db.findConversationById(id)) { "NonExist conversation_id supplied"}
        }
    }

    override fun serialize(encoder: Encoder, value: Conversation) {
        return encoder.encodeString(value.conversationId)
    }

}