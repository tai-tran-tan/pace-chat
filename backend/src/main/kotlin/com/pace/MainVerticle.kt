// src/main/kotlin/com/pacechat/MainVerticle.kt
package com.pace

import com.pace.data.db.DbAccessible
import com.pace.data.db.impl.InMemoryDatabase
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
    private val db: DbAccessible = InMemoryDatabase()
    private val connectionsManager = ConnectionsManager(db)
    private lateinit var jwtAuthProvider: JWTAuth

    override fun start() {
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
                    .setExpiresInMinutes(JwtConfig.tokenExpirySeconds.toLong().toInt())
                    .setAlgorithm("HS256")
                    .setIssuer(JwtConfig.issuer)
                    .setAudience(listOf(JwtConfig.audience))
            )
        jwtAuthProvider = JWTAuth.create(vertx, jwtAuthOptions)

        // Setup HTTP Router
        val router = Router.router(vertx)

        // CORS Handler (for Flutter Web/Mobile)
        router.route().handler(
            CorsHandler.create()
                .addOriginWithRegex(".*") // Allow all origins (for development)
                .allowedMethod(io.vertx.core.http.HttpMethod.GET)
                .allowedMethod(io.vertx.core.http.HttpMethod.POST)
                .allowedMethod(io.vertx.core.http.HttpMethod.PUT)
                .allowedMethod(io.vertx.core.http.HttpMethod.DELETE)
                .allowedMethod(io.vertx.core.http.HttpMethod.PATCH)
                .allowedHeader("Authorization")
                .allowedHeader("Content-Type")
                .allowCredentials(true)
        )

        // Body Handler to parse request bodies (JSON)
        router.route().handler(BodyHandler.create())

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

        UserRouter(protectedRouter, db).setupRoutes()
        ConversationRouter(protectedRouter, db, connectionsManager).setupRoutes()
        MessageRouter(protectedRouter, db).setupRoutes()

        router.route("/v1/*").subRouter(protectedRouter) // Mount protected routes under /v1

        // WebSocket Handler
        val wsHandler = WebSocketHandler(vertx, jwtService, db, connectionsManager)

        // Create HTTP server that also handles WebSockets
        vertx.createHttpServer(HttpServerOptions().setPort(8080).setHost("0.0.0.0"))
            .requestHandler(router) // Handle HTTP requests
            .webSocketHandler { ws ->
                // Handle WebSocket connections
                wsHandler.handle(ws)
            }
            .listen(8080)
            .onSuccess { http ->
                logger.info("HTTP and WebSocket server started on port 8080")
            }
            .onFailure { err ->
                println("Failed to start HTTP/WebSocket server: ${err.cause?.message}")
            }
    }
}