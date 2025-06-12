// src/main/kotlin/com/pacechat/router/RoutingContextExtensions.kt
package com.pace.router

import com.fasterxml.jackson.core.JsonParser
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.module.kotlin.jacksonObjectMapper
import io.vertx.ext.web.Route
import io.vertx.ext.web.RoutingContext
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch

val OBJECT_MAPPER: ObjectMapper = createObjectMapper()

// Extension function to simplify getting body as a Kotlinx Serialization POJO
inline fun <reified T : Any> RoutingContext.bodyAsPojo(): T =
    // Vert.x uses Jackson for JSON by default with its `asPojo`
    // Ensure kotlinx.serialization.json.Json.Default is registered with Jackson
    // This setup uses DatabindCodec directly for serialization/deserialization.
    OBJECT_MAPPER.readValue(this.body().asString(), T::class.java)

fun createObjectMapper() =
    jacksonObjectMapper().configure(JsonParser.Feature.INCLUDE_SOURCE_IN_LOCATION, true)

// Another extension for coroutine handling on Router, if needed, though MainVerticle directly defines it.
// This is an alternative way to define if not using the Router.coroutineHandler extension directly
// This one is used in router files
fun Route.coroutineHandler(fn: suspend (RoutingContext) -> Unit): Route =
    this.handler { ctx ->
        CoroutineScope(ctx.vertx().dispatcher()).launch {
            try {
                fn(ctx)
            } catch (e: Exception) {
                ctx.fail(e)
            }
        }
    }