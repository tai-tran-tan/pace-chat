// src/main/kotlin/com/pacechat/router/UserRouter.kt
package com.pace.router

import com.pace.data.db.DbAccessible
import com.pace.data.model.DeviceToken
import com.pace.data.model.ProfileUpdate
import com.pace.extensions.bodyAsPojo
import com.pace.extensions.coroutineHandler
import com.pace.extensions.toJsonString
import io.vertx.ext.web.Router
import io.vertx.ext.web.handler.BodyHandler
import org.apache.logging.log4j.kotlin.logger
import java.util.UUID

class UserRouter(private val router: Router, private val db: DbAccessible) {

    fun setupRoutes(): Router {
        router.get("/users/me").handler(BodyHandler.create()).coroutineHandler { rc ->
            val token = rc.request().getHeader("Authorization")
            val user = db.getUserInfo(token)
            if (user != null) {
                rc.response().setStatusCode(200)
                    .end(user.toUserResponse().toJsonString())
            } else {
                rc.response().setStatusCode(404)
                    .end(mapOf("message" to "User not found").toJsonString())
            }
        }

        router.put("/users/me").handler(BodyHandler.create()).coroutineHandler { rc ->
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val update = rc.bodyAsPojo<ProfileUpdate>()
            try {
                db.updateUserProfile(userId, update)
                rc.response().setStatusCode(200)
                    .end(mapOf("message" to "Profile updated successfully").toJsonString())
                LOGGER.info("User $userId updated profile.")
            } catch (e: Throwable) {
                rc.response().setStatusCode(400).end(mapOf("message" to "Update failed").toJsonString())
                LOGGER.error(e) { "Update failed $userId" }
            }
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
            val userId = rc.user().subject().let { UUID.fromString(it) }
            val request = rc.bodyAsPojo<DeviceToken>()
            db.addDeviceToken(userId, request.deviceToken, request.platform)
            rc.response().setStatusCode(200).end(mapOf("message" to "Device token registered.").toJsonString())
            LOGGER.info("Device token registered for user: $userId")
        }
        return router
    }

    companion object {
        private val LOGGER = logger()
    }
}