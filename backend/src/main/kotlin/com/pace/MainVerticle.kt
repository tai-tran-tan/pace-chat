package com.pace

import com.google.inject.Guice
import com.pace.config.ApplicationConfiguration
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
import io.klogging.java.LoggerFactory
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
import io.vertx.kotlin.coroutines.dispatcher
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.launch


class MainVerticle : AbstractVerticle() {

    private val logger = LoggerFactory.getLogger(this::class.java)
    private var jwtService: JwtService = JwtService()
    private lateinit var db: DbAccessible

    override fun start() {
        CoroutineScope(vertx.dispatcher()).launch {
            ConfigurationService.getConfig(vertx).onSuccess { conf ->
                val injector = Guice.createInjector(BasicGuiceModule(vertx))
                    .createChildInjector(ConfigurationModule(conf))
                val srcClass = conf.database.let { Class.forName(it.dataSourceClass) }
                db = CommonDbService(
                    injector.getInstance(srcClass) as DataSource
                )
                bootstrap(conf.application)
            }
        }
    }

    private fun bootstrap(conf: ApplicationConfiguration) {
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
        AuthRouter(router, jwtService, db).setupRoutes()

        // Protected routes using JWT authentication
        val protectedRouter = Router.router(vertx)

        WebClient.create(vertx)
            .getAbs("http://localhost:8080/realms/pace_chat/protocol/openid-connect/certs")
            .send()
            .onSuccess { res ->
                val keys = res.bodyAsJsonObject().getJsonArray("keys")
                    .map { it as JsonObject }
                    .filter { "RS256" == it.getString("alg") }

                val config = JWTAuthOptions()
                    .setJwks(keys)
                    .setJWTOptions(
                        JWTOptions()
                            .setIssuer(JwtConfig.issuer)
                            .setAudience(listOf(JwtConfig.audience))
                    )

                val provider = JWTAuth.create(vertx, JWTAuthOptions(config))
                protectedRouter.route().handler(JWTAuthHandler.create(provider))
                protectedRouter.route().handler { routingContext ->
                    val user = routingContext.user()
                    if (user != null) {
                        routingContext.put("userId", user.principal().getString("userId"))
                        routingContext.put("username", user.principal().getString("username"))
                        routingContext.next()
                    } else {
                        routingContext.response().setStatusCode(401).end("Unauthorized")
                    }
                }
            }
        val connectionsManager = ConnectionsManager(db)
        UserRouter(protectedRouter, db).setupRoutes()
        ConversationRouter(protectedRouter, db, connectionsManager).setupRoutes()
        MessageRouter(protectedRouter, db).setupRoutes()

        router.route("/v1/*").subRouter(protectedRouter) // Mount protected routes under /v1

//        router.route().handler { ctx ->
//            if (ctx.failure() != null) logger.error(ctx.failure())
//        }

        // WebSocket Handler
        val wsHandler = WebSocketHandler(vertx, jwtService, db, connectionsManager)

        // Create HTTP server that also handles WebSockets
        vertx.createHttpServer(HttpServerOptions().setPort(conf.port).setHost(conf.host))
            .requestHandler(router) // Handle HTTP requests
            .webSocketHandler { wsHandler.handle(it) } // Handle WebSocket connections
            .listen(conf.port)
            .onSuccess { http ->
                logger.info("HTTP and WebSocket server started on http://${conf.host}:${conf.port}")
            }
            .onFailure { err ->
                logger.error(err) { "Failed to start HTTP/WebSocket server: ${err.message}" }
            }
    }
}