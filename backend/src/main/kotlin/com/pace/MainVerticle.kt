package com.pace

import com.google.inject.Guice
import com.pace.config.ApplicationConfiguration
import com.pace.config.ConfigurationService
import com.pace.data.db.DbAccessible
import com.pace.data.db.impl.CommonDbService
import com.pace.data.storage.DataSource
import com.pace.injection.module.BasicGuiceModule
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
import io.vertx.ext.auth.JWTOptions
import io.vertx.ext.auth.PubSecKeyOptions
import io.vertx.ext.auth.jwt.JWTAuth
import io.vertx.ext.auth.jwt.JWTAuthOptions
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import io.vertx.ext.web.handler.CorsHandler
import io.vertx.ext.web.handler.JWTAuthHandler

class MainVerticle : AbstractVerticle() {

    private val logger = LoggerFactory.getLogger(this::class.java)
    private var jwtService: JwtService = JwtService()
    private lateinit var db: DbAccessible
    private val injector by lazy { Guice.createInjector(BasicGuiceModule(vertx)) }

    override fun start() {
        ConfigurationService.getConfig(vertx).onSuccess { conf ->
            val srcClass = conf.database.let { Class.forName(it.dataSourceClass) }
            db = CommonDbService(
                injector.getInstance(srcClass) as DataSource
            )
            bootstrap(conf.application)
        }
    }

    private fun bootstrap(conf: ApplicationConfiguration) {
        // Configure JWT Auth Provider for Vert.x Web
        // In a real app, use asymmetric keys or a more robust key store.
        // For simulation, we'll use a symmetric key directly.
        val jwtAuthOptions = JWTAuthOptions()
            .addPubSecKey(
                PubSecKeyOptions()
                    .setAlgorithm("HS256")
                    .setBuffer(JwtConfig.secret)
            )
            .setJWTOptions(
                JWTOptions()
                    .setExpiresInMinutes(JwtConfig.tokenExpirySeconds.toInt())
                    .setAlgorithm("HS256")
                    .setIssuer(JwtConfig.issuer)
                    .setAudience(listOf(JwtConfig.audience))
            )
        val jwtAuthProvider = JWTAuth.create(vertx, jwtAuthOptions)

        // Setup HTTP Router
        val router = Router.router(vertx)
//        router.route().handler { LoggerHandler.create() }
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

        // Body Handler to parse request bodies (JSON)
//        router.route().handler { ctx ->
//            LoggerHandler.create()
//        }
        router.route().handler(BodyHandler.create())
//        router.route().handler(ErrorHandler.create(vertx, true))
        // Public routes
        AuthRouter(router, jwtService, db).setupRoutes()

        // Protected routes using JWT authentication
        val protectedRouter = Router.router(vertx)
        protectedRouter.route().handler(JWTAuthHandler.create(jwtAuthProvider))
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