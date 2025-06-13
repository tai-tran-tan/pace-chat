package com.pace.config

import io.vertx.config.ConfigRetriever
import io.vertx.config.ConfigRetrieverOptions
import io.vertx.config.ConfigStoreOptions
import io.vertx.core.Future
import io.vertx.core.Vertx
import io.vertx.core.json.JsonObject


object ConfigurationService {
    fun getConfig(vertx: Vertx): Future<JsonObject> {
//        val httpStore = ConfigStoreOptions()
//            .setType("http")
//            .setConfig(
//                JsonObject()
//                    .put("host", "localhost").put("port", 8080).put("path", "/conf")
//            )

        val fileStore = ConfigStoreOptions()
            .setType("file")
            .setType("file")
            .setFormat("hocon")
            .setConfig(JsonObject().put("path", "application.conf"))

        val sysPropsStore = ConfigStoreOptions().setType("sys")


        val options = ConfigRetrieverOptions()
            .addStore(fileStore)
//            .addStore(sysPropsStore)

        return ConfigRetriever.create(vertx, options).config
    }
}