package com.pace.extensions

import io.vertx.core.MultiMap
import io.vertx.core.buffer.Buffer
import io.vertx.ext.web.client.HttpRequest
import io.vertx.kotlin.coroutines.coAwait
import org.apache.logging.log4j.kotlin.logger

suspend fun HttpRequest<*>.sendWithLog(body: Any? = null): Buffer? {
    val req = this
    LOGGER.info { "Request body: $body" }
    val res = when (body) {
        null -> send()
        is MultiMap -> sendForm(body)
        else -> sendJson(body)
    }
    return res.onComplete { ar ->
        LOGGER.info {
            val response = ar.result()
            "${response?.statusCode()} ${req.method()} ${req.uri()} " +
                    (response?.bodyAsString() ?: "<empty response>")
        }
    }
        .onFailure {
            LOGGER.error(it) {
                "${req.method()} ${req.uri()} FAILED"
            }
        }.coAwait()
        .takeIf { it.statusCode() < 400 }
        ?.runCatching { this.bodyAsBuffer() }
        ?.getOrElse { err ->
            LOGGER.error(err) { "Deserialization problem" }
            null
        }
}

private val LOGGER = logger("web-client")