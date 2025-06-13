package com.pace.utility

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.core.type.TypeReference
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper

val OBJECT_MAPPER: ObjectMapper = createObjectMapper()

inline fun <reified T : Any> Any.convertTo(): T {
    return OBJECT_MAPPER.convertValue(this, object : TypeReference<T>(){})
}

fun createObjectMapper(): ObjectMapper =
    jacksonObjectMapper().configure(JsonParser.Feature.INCLUDE_SOURCE_IN_LOCATION, true)