// src/main/kotlin/com/pacechat/security/JwtService.kt
package com.pace.security

import com.auth0.jwt.JWT
import com.auth0.jwt.algorithms.Algorithm
import java.time.Instant

class JwtService() {
    private val secret = JwtConfig.secret
    private val issuer = JwtConfig.issuer
    private val audience = JwtConfig.audience
    private val algorithm = Algorithm.HMAC256(secret)

    fun generateToken(userId: String, username: String): String {
        return JWT.create()
            .withAudience(audience)
            .withIssuer(issuer)
            .withClaim("userId", userId)
            .withClaim("username", username)
            .withExpiresAt(Instant.now().plusSeconds(JwtConfig.tokenExpirySeconds))
            .sign(algorithm)
    }

    fun generateRefreshToken(userId: String, username: String): String {
        return JWT.create()
            .withAudience(audience)
            .withIssuer(issuer)
            .withClaim("userId", userId)
            .withClaim("username", username)
            .withExpiresAt(Instant.now().plusSeconds(JwtConfig.refreshTokenExpiryMinutes))
            .sign(algorithm)
    }

    fun verifyRefreshToken(token: String): DecodedRefreshToken {
        val verifier = JWT.require(algorithm)
            .withAudience(audience)
            .withIssuer(issuer)
            .build()
        val decodedJWT = verifier.verify(token)
        return DecodedRefreshToken(
            userId = decodedJWT.getClaim("userId").asString(),
            username = decodedJWT.getClaim("username").asString()
        )
    }

    data class DecodedRefreshToken(val userId: String, val username: String)
}