package com.pace.extensions

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.convertValue
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.vertx.core.buffer.Buffer
import io.vertx.core.json.JsonObject

val OBJECT_MAPPER: ObjectMapper = createObjectMapper()

inline fun <reified T : Any> JsonObject.deserialize(): T {
    return this.toString().deserialize<T>()
}

inline fun <reified T : Any> Buffer.deserialize(): T {
    val json = OBJECT_MAPPER.readTree(this.bytes)
    return OBJECT_MAPPER.convertValue(json)
}

inline fun <reified T : Any> String.deserialize(): T {
    return OBJECT_MAPPER.readValue(this, object: TypeReference<T>(){})
}

fun Any.toJsonString(): String {
    return OBJECT_MAPPER.writeValueAsString(this)
}

fun createObjectMapper(): ObjectMapper =
    jacksonObjectMapper()
        .registerModule(JavaTimeModule())
        .configure(JsonParser.Feature.INCLUDE_SOURCE_IN_LOCATION, true)
        .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false)