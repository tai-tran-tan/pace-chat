package com.pace

import com.google.inject.Guice
import com.pace.config.Configuration
import com.pace.config.ConfigurationService
import com.pace.data.db.DbAccessible
import com.pace.data.db.impl.CommonDbService
import com.pace.data.storage.DataSource
import com.pace.injection.module.BasicGuiceModule
import com.pace.injection.module.ConfigurationModule
import com.pace.router.AuthRouter
import com.pace.router.ConversationRouter
import com.pace.router.MessageRouter
import com.pace.router.UserRouter
import com.pace.security.JwtConfig
import com.pace.security.JwtService
import com.pace.ws.ConnectionsManager
import com.pace.ws.WebSocketHandler
import io.vertx.core.AbstractVerticle
import io.vertx.core.http.HttpMethod
import io.vertx.core.http.HttpServerOptions
import io.vertx.core.json.JsonObject
import io.vertx.ext.auth.JWTOptions
import io.vertx.ext.auth.jwt.JWTAuth
import io.vertx.ext.auth.jwt.JWTAuthOptions
import io.vertx.ext.web.Router
import io.vertx.ext.web.client.WebClient
import io.vertx.ext.web.handler.BodyHandler
import io.vertx.ext.web.handler.CorsHandler
import io.vertx.ext.web.handler.JWTAuthHandler
import org.apache.logging.log4j.kotlin.logger


class MainVerticle : AbstractVerticle() {

    private var jwtService: JwtService = JwtService()
    private lateinit var db: DbAccessible

    override fun start() {
        ConfigurationService.getConfig(vertx).onSuccess { conf ->
            val injector = Guice.createInjector(BasicGuiceModule(vertx))
                .createChildInjector(ConfigurationModule(conf))
            val srcClass = conf.database.let { Class.forName(it.dataSourceClass) }
            db = CommonDbService(
                injector.getInstance(srcClass) as DataSource
            )
            bootstrap(conf)
        }
    }

    private fun bootstrap(conf: Configuration) {
        // Setup HTTP Router
        val router = Router.router(vertx)
        // CORS Handler (for Flutter Web/Mobile)
        router.route().handler(
            CorsHandler.create()
                .addOriginWithRegex(".*") // Allow all origins (for development)
                .allowedMethod(HttpMethod.GET)
                .allowedMethod(HttpMethod.POST)
                .allowedMethod(HttpMethod.PUT)
                .allowedMethod(HttpMethod.DELETE)
                .allowedMethod(HttpMethod.PATCH)
                .allowedHeader("Authorization")
                .allowedHeader("Content-Type")
                .allowCredentials(true)
        )

        router.route().handler(BodyHandler.create())
        // Public routes
        AuthRouter(router, db).setupRoutes()
        val connectionsManager = ConnectionsManager(db)
        // Protected routes using JWT authentication

        val authConf = conf.authService
        WebClient.create(vertx)
            .getAbs("${authConf.baseUrl}/realms/${authConf.realmName}/protocol/openid-connect/certs")
            .send()
            .onSuccess { res ->
                val keys = res.bodyAsJsonObject().getJsonArray("keys")
                    .map { it as JsonObject }
                    .filter { "RS256" == it.getString("alg") }

                val config = JWTAuthOptions()
                    .setJwks(keys)
                    .setJWTOptions(
                        JWTOptions()
                            .setIssuer("${authConf.baseUrl}/realms/${authConf.realmName}")
                            .setAudience(listOf(JwtConfig.audience))
                    )

                val provider = JWTAuth.create(vertx, JWTAuthOptions(config))
                router.route("/v1/*")
                    .handler(JWTAuthHandler.create(provider))
                    .handler { routingContext ->
                        if (routingContext.userContext().authenticated()) {
                            val user = routingContext.user()
                            routingContext.put("userId", user.principal().getString("userId"))
                            routingContext.put("username", user.principal().getString("username"))
                            routingContext.next()
                        } else {
                            routingContext.response().setStatusCode(401).end("Unauthorized")
                        }
                    }
                router.route("/v1/*").subRouter(UserRouter(Router.router(vertx), db).setupRoutes())
                router.route("/v1/*").subRouter(ConversationRouter(Router.router(vertx), db, connectionsManager).setupRoutes())
                router.route("/v1/*").subRouter(MessageRouter(Router.router(vertx), db).setupRoutes())
            }
            .onFailure { LOGGER.error(it) { "Failed to mount protected paths" } }
        // WebSocket Handler
        val wsHandler = WebSocketHandler(vertx, jwtService, db, connectionsManager)
        val appConf = conf.application
        // Create HTTP server that also handles WebSockets
        vertx.createHttpServer(HttpServerOptions().setPort(appConf.port).setHost(appConf.host))
            .requestHandler(router) // Handle HTTP requests
            .webSocketHandler { wsHandler.handle(it) } // Handle WebSocket connections
            .listen(appConf.port)
            .onSuccess { http ->
                LOGGER.info("HTTP and WebSocket server started on http://${appConf.host}:${appConf.port}")
            }
            .onFailure { err ->
                LOGGER.error(err) { "Failed to start HTTP/WebSocket server: ${err.message}" }
            }
    }

    companion object {
        private val LOGGER = logger()
    }
}