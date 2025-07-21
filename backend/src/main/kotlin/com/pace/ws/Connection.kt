// src/main/kotlin/com/pacechat/websocket/Connection.kt
package com.pace.ws

import io.vertx.core.http.ServerWebSocket
import java.util.UUID

// Represents an authenticated WebSocket connection
data class Connection(val session: ServerWebSocket, val userId: UUID, val username: String)