package com.pace.security.token

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming
import com.pace.config.AuthService
import com.pace.extensions.deserialize
import io.vertx.core.Vertx
import io.vertx.core.http.impl.headers.HeadersMultiMap
import io.vertx.ext.web.client.WebClient
import io.vertx.ext.web.client.WebClientOptions
import io.vertx.kotlin.coroutines.coAwait
import java.util.concurrent.atomic.AtomicReference

@JsonNaming(PropertyNamingStrategies.SnakeCaseStrategy::class)
@JsonIgnoreProperties(ignoreUnknown = true)
data class KeycloakToken(
    val accessToken: String,
    val expiresIn: Long,
    val tokenType: String
) {
    val expiryTimeMillis: Long = System.currentTimeMillis() + (expiresIn * 1000)

    fun isExpired(): Boolean {
        // Refresh token a bit before actual expiry to avoid race conditions
        return System.currentTimeMillis() >= expiryTimeMillis - 60_000 // 60 seconds buffer
    }
}

class KeycloakTokenManager(
    vertx: Vertx,
    private val config: AuthService
) {
    private val webClient: WebClient = WebClient.create(vertx, WebClientOptions().apply {
        // Configure options like timeouts, SSL, etc., if needed
    })

    // AtomicReference to safely store and update the token
    private val cachedToken = AtomicReference<KeycloakToken?>(null)

    private val tokenEndpoint: String = "${config.baseUrl}/realms/${config.realmName}/protocol/openid-connect/token"

    suspend fun getAccessToken(): String {
        val cache = cachedToken.get()

        // Check if token exists and is not expired
        val token = if (cache != null && !cache.isExpired()) {
            cache
        } else fetchNewToken()

        // Token is expired or not present, fetch a new one
        return token.accessToken
    }

    private suspend fun fetchNewToken(): KeycloakToken {
        val form = HeadersMultiMap.httpHeaders()
            .add("grant_type", "client_credentials")
            .add("client_id", config.clientId)
            .add("client_secret", config.clientSecret)
            .add("scope", "openid profile_full")

        val token = webClient.postAbs(tokenEndpoint)
                .sendForm(form)
                .coAwait()
                .takeIf { it.statusCode() == 200}
                ?.bodyAsJsonObject()
                ?.deserialize<KeycloakToken>()

        cachedToken.set(token)
        return requireNotNull(token) {
            "Can not get client's access_token"
        }
    }
}