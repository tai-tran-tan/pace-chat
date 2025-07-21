package com.pace.config

import com.pace.utility.deserialize
import io.vertx.config.ConfigRetriever
import io.vertx.config.ConfigRetrieverOptions
import io.vertx.config.ConfigStoreOptions
import io.vertx.core.Future
import io.vertx.core.Vertx
import io.vertx.core.json.JsonObject
import org.apache.logging.log4j.kotlin.logger
import java.util.concurrent.atomic.AtomicReference


object ConfigurationService {
    private val config = AtomicReference<Configuration>()
    fun getConfig(vertx: Vertx): Future<Configuration> {
        val c = config.get()
        if (c != null) return Future.succeededFuture(c)
        return retrieveConfig(vertx)
            .onSuccess { config.set(it) }
    }

    private fun retrieveConfig(vertx: Vertx): Future<Configuration> {
        val fileStore = ConfigStoreOptions()
            .setType("file")
            .setFormat("hocon")
            .setConfig(JsonObject().put("path", "application.conf"))

        val options = ConfigRetrieverOptions()
            .addStore(fileStore)

        val retriever = ConfigRetriever.create(vertx, options)

        retriever.getConfig {
            if (it.failed() || it.result() == null || it.result().isEmpty) {
                LOGGER.error(it.cause()) { "Failed to get configuration" }
            } else LOGGER.info("Configuration retrieved ")// + it.result())
        }
        return retriever.config.map { json ->
            json.deserialize<Configuration>()
        }.onFailure {
            LOGGER.error(it) { "Failed to process configuration" }
        }
    }

    private val LOGGER = logger()
}