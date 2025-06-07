// src/main/kotlin/com/pacechat/websocket/Connection.kt
package com.pace.ws

import io.vertx.core.http.ServerWebSocket

// Represents an authenticated WebSocket connection
data class Connection(val session: ServerWebSocket, val userId: String, val username: String)