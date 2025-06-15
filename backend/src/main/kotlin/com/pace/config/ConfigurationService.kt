package com.pace.config

import com.pace.utility.deserialize
import io.klogging.java.LoggerFactory
import io.vertx.config.ConfigRetriever
import io.vertx.config.ConfigRetrieverOptions
import io.vertx.config.ConfigStoreOptions
import io.vertx.core.Future
import io.vertx.core.Vertx
import io.vertx.core.json.JsonObject
import java.util.concurrent.atomic.AtomicReference


object ConfigurationService {
    private val config = AtomicReference<Configuration>()
    fun getConfig(vertx: Vertx): Future<Configuration> {
//        val httpStore = ConfigStoreOptions()
//            .setType("http")
//            .setConfig(
//                JsonObject()
//                    .put("host", "localhost").put("port", 8080).put("path", "/conf")
//            )

        val c = config.get()
        if (c == null) {
            val retriever = retrieveConfig(vertx)
            return retriever.onSuccess { config.set(it) }
        } else {
            return Future.succeededFuture(c)
        }
    }

    private val logger = LoggerFactory.getLogger(this::class.java)

    private fun retrieveConfig(vertx: Vertx): Future<Configuration> {
        val fileStore = ConfigStoreOptions()
            .setType("file")
            .setFormat("json")
            .setConfig(JsonObject().put("path", "application.json"))

        val sysPropsStore = ConfigStoreOptions().setType("sys")


        val options = ConfigRetrieverOptions()
            .addStore(fileStore)
//            .addStore(sysPropsStore)

        val retriever = ConfigRetriever.create(vertx, options)
        retriever.getConfig {
            if (it.failed() || it.result() == null || it.result().isEmpty) {
                logger.error(it.cause()) { "Failed to get configuration" }
            } else logger.info { "Configuration retrieved" }
        }
        return retriever.config.map { c -> c.deserialize<Configuration>() }
            .onFailure { logger.error(it) { "Failed to deserialize configuration" } }
    }
}