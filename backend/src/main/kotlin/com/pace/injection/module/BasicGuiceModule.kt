package com.pace.injection.module

import com.google.inject.AbstractModule
import io.vertx.core.Vertx
import io.vertx.ext.web.client.WebClient

class BasicGuiceModule(val vertx: Vertx) : AbstractModule() {

    override fun configure() {
        bind(Vertx::class.java).toInstance(vertx)
        bind(WebClient::class.java).toInstance(
            WebClient.create(vertx)
        )
    }

}
