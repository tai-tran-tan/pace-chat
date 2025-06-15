package com.pace.data.model.deserializer

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.DeserializationContext
import com.fasterxml.jackson.databind.deser.std.StdDeserializer
import java.time.Instant

class InstantWithNanoSecondDeserializer: StdDeserializer<Instant>(Instant::class.java) {
    override fun deserialize(
        p: JsonParser,
        ctxt: DeserializationContext?
    ): Instant? {
        return Instant.parse(p.valueAsString)
    }
}