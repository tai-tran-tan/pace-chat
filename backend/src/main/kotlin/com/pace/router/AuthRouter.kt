// src/main/kotlin/com/pacechat/router/AuthRouter.kt
package com.pace.router

import com.fasterxml.jackson.core.JsonProcessingException
import com.pace.data.db.DbAccessible
import com.pace.data.model.AuthLoginRequest
import com.pace.data.model.AuthLoginResponse
import com.pace.data.model.AuthRegisterRequest
import com.pace.data.model.AuthRegisterResponse
import com.pace.data.model.User
import com.pace.extensions.bodyAsPojo
import com.pace.extensions.coroutineHandler
import com.pace.extensions.toJsonString
import com.pace.security.TokenService
import io.vertx.core.http.Cookie
import io.vertx.core.http.CookieSameSite
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import org.apache.logging.log4j.kotlin.logger

private const val REFRESH_TOKEN = "refresh_token"

class AuthRouter(
    private val router: Router,
    private val tokenService: TokenService,
    private val db: DbAccessible
) {

    fun setupRoutes() {
        router.post("/v1/auth/register").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = runCatching { rc.bodyAsPojo<AuthRegisterRequest>() }
                .getOrElse { err ->
                    when (err) {
                        is JsonProcessingException -> {
                            LOGGER.warn(err) { "Failed to parse request!" }
                            rc.response().setStatusCode(400)
                                .end(mapOf("message" to "Invalid request body").toJsonString())
                            return@coroutineHandler
                        }
                        else -> {
                            LOGGER.error(err) { "Failed to parse request!" }
                            rc.response().setStatusCode(500)
                                .end(mapOf("message" to "unknown_problem").toJsonString())
                            return@coroutineHandler
                        }
                    }
                }

            if (db.findUserByUsername(request.username) != null) {
                rc.response().setStatusCode(409).end(mapOf("message" to "Username already exists").toJsonString())
                return@coroutineHandler
            }
            val newUser = User(
                username = request.username,
                email = request.email,
                password = request.password,
                firstName = request.firstName,
                lastName = request.lastName,
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
                    requireNotNull(newUser.username),
                    "User registered successfully"
                ).toJsonString()
            )
            LOGGER.info("User registered: ${newUser.username}")
        }

        router.post("/v1/auth/login").handler(BodyHandler.create()).coroutineHandler { rc ->
            val request = rc.bodyAsPojo<AuthLoginRequest>()
            val res = tokenService.authenticate(request.username, request.password)

            if (res != null) {
                val token = tokenService.verifyToken(res.accessToken)
                val user = AuthLoginResponse(
                    token.userId, token.username,
                    res.accessToken, res.expiresIn,
                    res.refreshToken, res.refreshExpiresIn
                )
                rc.response()
                    .addCookie(
                        Cookie.cookie(REFRESH_TOKEN, res.refreshToken)
                            .setHttpOnly(true)
                            .setPath("/")
                            .setMaxAge(res.refreshExpiresIn) // Cookie expires along with the token
                            .setSameSite(CookieSameSite.LAX)
//                            .setSecure()
                    )
                    .setStatusCode(200)
                    .end(user.toJsonString())
                LOGGER.info("User logged in: ${request.username}")
            } else {
                rc.response().setStatusCode(401).end(mapOf("message" to "Invalid credentials").toJsonString())
            }
        }

        router.post("/v1/auth/refresh-token").coroutineHandler { rc ->
            val cookie = rc.request().getCookie(REFRESH_TOKEN)
            if (cookie == null) { // TODO: check this, possible vertx's bug unable to parse this tag from cookie || !cookie.isHttpOnly) {
                rc.response().setStatusCode(400)
                    .end(mapOf("message" to "Missing http-only refresh_token in cookies").toJsonString())
                LOGGER.warn { "${rc.request().remoteAddress()} missing a valid cookie" }
                return@coroutineHandler
            }
            val token = tokenService.refreshToken(cookie.value)
            if (token != null) {
                rc.response().setStatusCode(200).end(token.toJsonString())
                LOGGER.info("Token refreshed for user: ${rc.get("userId", "")}")
            } else {
                rc.response().setStatusCode(401)
                    .end(mapOf("message" to "Invalid or expired refresh token").toJsonString())
                LOGGER.warn("Refresh token failed")
            }
        }
    }

    companion object {
        private val LOGGER = logger()
    }
}