// src/main/kotlin/com/pacechat/router/AuthRouter.kt
package com.pace.router

import com.pace.data.InMemoryDatabase
import com.pace.data.model.AuthLoginRequest
import com.pace.data.model.AuthLoginResponse
import com.pace.data.model.AuthRegisterRequest
import com.pace.data.model.AuthRegisterResponse
import com.pace.data.model.RefreshTokenRequest
import com.pace.data.model.RefreshTokenResponse
import com.pace.security.JwtService
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class AuthRouter(private val router: Router, private val jwtService: JwtService) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.post("/v1/auth/register").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.bodyAsPojo<AuthRegisterRequest>()

            if (InMemoryDatabase.findUserByUsername(request.username) != null) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "Username already exists")))
                return@coroutineHandler
            }
            if (InMemoryDatabase.findUserByEmail(request.email) != null) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "Email already exists")))
                return@coroutineHandler
            }

            val newUser = InMemoryDatabase.registerUser(request.username, request.email, request.password)
            rc.response().setStatusCode(201).end(Json.encodeToString(AuthRegisterResponse(newUser.userId, newUser.username, "User registered successfully")))
            logger.info("User registered: ${newUser.username}")
        }

        router.post("/v1/auth/login").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.bodyAsPojo<AuthLoginRequest>()
            val user = InMemoryDatabase.authenticateUser(request.username, request.password)

            if (user != null) {
                val token = jwtService.generateToken(user.userId, user.username)
                val refreshToken = jwtService.generateRefreshToken(user.userId, user.username)
                rc.response().setStatusCode(200).end(Json.encodeToString(AuthLoginResponse(user.userId, user.username, token, refreshToken)))
                logger.info("User logged in: ${user.username}")
            } else {
                rc.response().setStatusCode(401).end(Json.encodeToString(mapOf("message" to "Invalid credentials")))
            }
        }

        router.post("/v1/auth/refresh-token").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.body().asPojo(RefreshTokenRequest::class.java)
            try {
                val decoded = jwtService.verifyRefreshToken(request.refreshToken)
                val newAccessToken = jwtService.generateToken(decoded.userId, decoded.username)
                rc.response().setStatusCode(200).end(Json.encodeToString(RefreshTokenResponse(newAccessToken)))
                logger.info("Token refreshed for user: ${decoded.username}")
            } catch (e: Exception) {
                rc.response().setStatusCode(401).end(Json.encodeToString(mapOf("message" to "Invalid or expired refresh token")))
                logger.warn("Refresh token failed: ${e.message}")
            }
        }
    }
}