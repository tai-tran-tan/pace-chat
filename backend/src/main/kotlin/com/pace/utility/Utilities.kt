package com.pace.utility

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.vertx.core.json.JsonObject

val OBJECT_MAPPER: ObjectMapper = createObjectMapper()

inline fun <reified T : Any> JsonObject.deserialize(): T {
    return OBJECT_MAPPER.readValue(this.toString(), object: TypeReference<T>(){})
}

fun Any.toJsonString(): String {
    return OBJECT_MAPPER.writeValueAsString(this)
}

fun createObjectMapper(): ObjectMapper =
    jacksonObjectMapper()
        .configure(JsonParser.Feature.INCLUDE_SOURCE_IN_LOCATION, true)