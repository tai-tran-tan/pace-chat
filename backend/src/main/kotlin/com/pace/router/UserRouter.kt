// src/main/kotlin/com/pacechat/router/UserRouter.kt
package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.DeviceToken
import com.pace.data.model.ProfileUpdate
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

class UserRouter(private val router: Router, private val db: DbAccessible) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.get("/users/me").coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val user = db.findUserById(userId)
            if (user != null) {
                rc.response().setStatusCode(200).end(Json.encodeToString(user.toUserResponse()))
            } else {
                rc.response().setStatusCode(404).end(Json.encodeToString(mapOf("message" to "User not found")))
            }
        }

        router.put("/users/me").handler(BodyHandler.create()).coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.body().asPojo(ProfileUpdate::class.java)
            val updatedUser = db.updateUserProfile(
                userId,
                request.username,
                request.email,
                request.avatarUrl
            )
            if (updatedUser != null) {
                rc.response().setStatusCode(200).end(Json.encodeToString(mapOf("message" to "Profile updated successfully")))
                logger.info("User $userId updated profile.")
            } else {
                rc.response().setStatusCode(404).end(Json.encodeToString(mapOf("message" to "User not found")))
            }
        }

        router.get("/users/search").coroutineHandler { rc ->
            val query = rc.request().getParam("query") ?: ""
            if (query.isBlank()) {
                rc.response().setStatusCode(400).end(Json.encodeToString(mapOf("message" to "Query parameter is required")))
                return@coroutineHandler
            }
            val users = db.searchUsers(query)
            rc.response().setStatusCode(200).end(Json.encodeToString(users.map { it.toUserPublic() }))
        }

        router.post("/users/me/device-token").handler(BodyHandler.create()).coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.body().asPojo(DeviceToken::class.java)
            db.addDeviceToken(userId, request.deviceToken, request.platform)
            rc.response().setStatusCode(200).end(Json.encodeToString(mapOf("message" to "Device token registered.")))
            logger.info("Device token registered for user: $userId")
        }
    }
}