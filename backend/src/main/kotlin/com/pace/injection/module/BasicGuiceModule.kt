package com.pace.injection.module

import com.google.inject.AbstractModule
import com.pace.config.Configuration
import com.pace.config.ConfigurationService
import io.vertx.core.Vertx
import io.vertx.ext.web.client.WebClient

class BasicGuiceModule(val vertx: Vertx) : AbstractModule() {

    override fun configure() {
        bind(Vertx::class.java).toInstance(vertx)
        bind(WebClient::class.java).toInstance(
            WebClient.create(vertx)
        )
        ConfigurationService.getConfig(vertx).result().let { c ->
            bind(Configuration::class.java).toInstance(c)
        }
    }
}
