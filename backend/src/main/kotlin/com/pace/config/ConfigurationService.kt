package com.pace.config

import com.pace.utility.deserialize
import io.klogging.java.LoggerFactory
import io.vertx.config.ConfigRetriever
import io.vertx.config.ConfigRetrieverOptions
import io.vertx.config.ConfigStoreOptions
import io.vertx.core.Future
import io.vertx.core.Vertx
import io.vertx.core.json.JsonObject
import io.vertx.ext.web.client.WebClient
import io.vertx.kotlin.coroutines.coAwait
import java.util.concurrent.atomic.AtomicReference


object ConfigurationService {
    private val config = AtomicReference<Configuration>()
    suspend fun getConfig(vertx: Vertx): Future<Configuration> {
        val c = config.get()
        if (c != null) return Future.succeededFuture(c)
        return retrieveConfig(vertx)
            .onSuccess { config.set(it) }
    }

    private suspend fun retrieveConfig(vertx: Vertx): Future<Configuration> {
        val fileStore = ConfigStoreOptions()
            .setType("file")
            .setFormat("hocon")
            .setConfig(JsonObject().put("path", "application.conf"))

        val options = ConfigRetrieverOptions()
            .addStore(fileStore)

        val retriever = ConfigRetriever.create(vertx, options)
        retriever.getConfig {
            if (it.failed() || it.result() == null || it.result().isEmpty) {
                logger.error(it.cause()) { "Failed to get configuration" }
            } else logger.info("Configuration retrieved ")// + it.result())
        }
        val conf = retriever.config.map { json ->
            json.deserialize<Configuration>()
        }.onFailure {
            logger.error(it) { "Failed to process configuration" }
        }.coAwait()
        val token = requireNotNull(getSgToken(vertx, conf.sgAuth)) {
            "Failed to get SG_AUTH_TOKEN"
        }
        logger.info { "Generated token $token" }
        return Future.succeededFuture(
            conf.copy(
                sgAuth = conf.sgAuth.copy(token = token) // replace SG token
            )
        )
    }

}

private suspend fun getSgToken(vertx: Vertx, sgAuth: SgAuth): String? =
    WebClient.create(vertx)
        .postAbs(sgAuth.baseUrl)
        .sendJson(
            JsonObject(
                mapOf(
                    "username" to sgAuth.username,
                    "password" to sgAuth.password
                )
            )
        ).map { json ->
            json.bodyAsJsonObject()
            .getString("authToken")
        }.coAwait()


private val logger = LoggerFactory.getLogger(ConfigurationService::class.java)