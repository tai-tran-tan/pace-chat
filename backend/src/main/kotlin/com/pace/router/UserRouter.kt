// src/main/kotlin/com/pacechat/router/UserRouter.kt
package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.DeviceToken
import com.pace.data.model.ProfileUpdate
import com.pace.utility.toJsonString
import io.klogging.java.LoggerFactory
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler

class UserRouter(private val router: Router, private val db: DbAccessible) {

    private val logger = LoggerFactory.getLogger(this::class.java)

    fun setupRoutes() {
        router.get("/users/me").handler(BodyHandler.create()).coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val user = db.findUserById(userId)
            if (user != null) {
                rc.response().setStatusCode(200)
                    .end(user.toUserResponse().toJsonString())
            } else {
                rc.response().setStatusCode(404)
                    .end(mapOf("message" to "User not found").toJsonString())
            }
        }

        router.put("/users/me").handler(BodyHandler.create()).coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.bodyAsPojo<ProfileUpdate>()
            val updatedUser = db.updateUserProfile(
                userId,
                request.username,
                request.email,
                request.avatarUrl
            )
            if (updatedUser != null) {
                rc.response().setStatusCode(200).end(mapOf("message" to "Profile updated successfully").toJsonString())
                logger.info("User $userId updated profile.")
            } else {
                rc.response().setStatusCode(404).end(mapOf("message" to "User not found").toJsonString())
            }
        }.failureHandler { ctx ->
            logger.error(ctx.failure()) { "Update profile failed" }
        }

        router.get("/users/search").coroutineHandler { rc ->
            val query = rc.request().getParam("query") ?: ""
            if (query.isBlank()) {
                rc.response().setStatusCode(400).end(mapOf("message" to "Query parameter is required").toJsonString())
                return@coroutineHandler
            }
            val users = db.searchUsers(query)
            rc.response().setStatusCode(200).end(users.map { it.toUserPublic() }.toJsonString())
        }

        router.post("/users/me/device-token").handler(BodyHandler.create()).coroutineHandler { rc ->
            val userId = rc.get<String>("userId")
            val request = rc.bodyAsPojo<DeviceToken>()
            db.addDeviceToken(userId, request.deviceToken, request.platform)
            rc.response().setStatusCode(200).end(mapOf("message" to "Device token registered.").toJsonString())
            logger.info("Device token registered for user: $userId")
        }
    }
}