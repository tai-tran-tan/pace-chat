// src/main/kotlin/com/pacechat/router/AuthRouter.kt
package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.AuthLoginRequest
import com.pace.data.model.AuthLoginResponse
import com.pace.data.model.AuthRegisterRequest
import com.pace.data.model.AuthRegisterResponse
import com.pace.data.model.RefreshTokenRequest
import com.pace.data.model.RefreshTokenResponse
import com.pace.data.model.User
import com.pace.security.JwtService
import com.pace.utility.toJsonString
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler

class AuthRouter(private val router: Router, private val jwtService: JwtService, private val db: DbAccessible) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.post("/v1/auth/register").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.bodyAsPojo<AuthRegisterRequest>()

            if (db.findUserByUsername(request.username) != null) {
                rc.response().setStatusCode(400).end(mapOf("message" to "Username already exists").toJsonString())
                return@coroutineHandler
            }
            if (db.findUserByEmail(request.email) != null) {
                rc.response().setStatusCode(400).end(mapOf("message" to "Email already exists").toJsonString())
                return@coroutineHandler
            }
            val newUser = User(
                username = request.username,
                email = request.email,
                password = request.password,
                status = "offline",
                avatarUrl = "https://placehold.co/50x50/${
                    (0..0xFFFFFF).random().toString(16).padStart(6, '0')
                }/ffffff?text=${request.username.first().uppercase()}",
                lastSeen = null
            )

            db.registerUser(newUser)
            rc.response().setStatusCode(201).end(
                AuthRegisterResponse(
                    newUser.userId,
                    newUser.username,
                    "User registered successfully"
                ).toJsonString()
            )
            logger.info("User registered: ${newUser.username}")
        }

        router.post("/v1/auth/login").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.bodyAsPojo<AuthLoginRequest>()
            val user = db.authenticateUser(request.username, request.password)

            if (user != null) {
                val token = jwtService.generateToken(user.userId, user.username)
                val refreshToken = jwtService.generateRefreshToken(user.userId, user.username)
                rc.response().setStatusCode(200)
                    .end(AuthLoginResponse(user.userId, user.username, token, refreshToken).toJsonString())
                logger.info("User logged in: ${user.username}")
            } else {
                rc.response().setStatusCode(401).end(mapOf("message" to "Invalid credentials").toJsonString())
            }
        }

        router.post("/v1/auth/refresh-token").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.bodyAsPojo<RefreshTokenRequest>()
            try {
                val decoded = jwtService.verifyRefreshToken(request.refreshToken)
                val newAccessToken = jwtService.generateToken(decoded.userId, decoded.username)
                rc.response().setStatusCode(200).end(RefreshTokenResponse(newAccessToken).toJsonString())
                logger.info("Token refreshed for user: ${decoded.username}.toJsonString()")
            } catch (e: Exception) {
                rc.response().setStatusCode(401)
                    .end(mapOf("message" to "Invalid or expired refresh token").toJsonString())
                logger.warn("Refresh token failed: ${e.message}")
            }
        }
    }
}