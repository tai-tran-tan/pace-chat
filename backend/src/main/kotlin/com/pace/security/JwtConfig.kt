package com.pace.security

object JwtConfig {
    const val secret = "your_super_secret_jwt_key_for_vertx_backend_1234567890abcdef" // !!! CHANGE THIS IN PRODUCTION !!!
    const val issuer = "pace-chat-backend"
    const val audience = "account"
    const val realm = "Access to Pace Chat API"
    const val tokenExpirySeconds = 60 * 60L // 1 hour
    const val refreshTokenExpiryMinutes = 7 * 24 * 60 * 60L // 7 days (7 * 24 * 60)
}