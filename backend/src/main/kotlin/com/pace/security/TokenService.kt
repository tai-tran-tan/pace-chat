package com.pace.security

import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming
import com.pace.config.AuthService
import com.pace.data.db.impl.AuthenticationResponse
import com.pace.data.model.UserPublic
import com.pace.extensions.deserialize
import com.pace.extensions.sendWithLog
import io.vertx.core.http.impl.headers.HeadersMultiMap
import io.vertx.ext.web.client.WebClient
import java.time.Instant
import java.util.UUID


class TokenService private constructor(private val client: WebClient, private val authConfig: AuthService) {
    private val baseUri = authConfig.baseUrl
    private val baseUriUser = "$baseUri/realms/${authConfig.realmName}"
    suspend fun verifyIdToken(token: String): UserPublic {
        val token = client.postAbs("$baseUriUser/protocol/openid-connect/token/introspect")
            .basicAuthentication(authConfig.clientId, authConfig.clientSecret)
            .sendWithLog(
                HeadersMultiMap()
                    .add("token", token)
            )?.deserialize<KeycloakValidatedToken>()
        requireNotNull(token) { "Token validation failed!" }
        require(token.isActive) {
            "Inactive token, expired or revoked!"
        }
        require(token.authorizedParty == authConfig.clientId) {
            "Token is not authorized for chat backend!"
        }
        return UserPublic(
            userId = requireNotNull(token.userId),
            username = requireNotNull(token.username),
            displayName = "${requireNotNull(token.firstName)} ${requireNotNull(token.lastName)}"
        )
    }

    suspend fun authenticate(username: String, password: String): AuthenticationResponse? {
        return client.postAbs("$baseUriUser/protocol/openid-connect/token")
            .sendWithLog(
                HeadersMultiMap()
                    .add("grant_type", "password")
                    .add("client_id", authConfig.clientId)
                    .add("username", username)
                    .add("password", password)
                    .add("scope", "openid profile_full")
                    .add("client_secret", authConfig.clientSecret)
            )
            ?.deserialize<AuthenticationResponse>()
    }

    suspend fun refreshToken(refreshToken: String): AuthenticationResponse? {
        return client.postAbs("$baseUriUser/protocol/openid-connect/token")
            .sendWithLog(
                HeadersMultiMap()
                    .add("grant_type", "refresh_token")
                    .add("client_id", authConfig.clientId)
                    .add("refresh_token", refreshToken)
                    .add("client_secret", authConfig.clientSecret)
            )
            ?.deserialize<AuthenticationResponse>()
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    @JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
    private data class KeycloakValidatedToken(
        @JsonProperty("active")
        val isActive: Boolean,// not expired and not revoked
        @JsonProperty("exp")
        val expiredAt: Instant?,
        @JsonProperty("iat")
        val issuedAt: Instant?,
        @JsonProperty("iss")
        val issuer: String?,
        @JsonProperty("aud")
        val audience: String?,
        @JsonProperty("sub")
        val userId: UUID?,
        @JsonProperty("email_verified")
        val emailVerified: Boolean?,
        @JsonProperty("preferred_username")
        val username: String?,
        @JsonProperty("given_name")
        val firstName: String?,
        @JsonProperty("family_name")
        val lastName: String?,
        @JsonProperty("email")
        val email: String?,
        @JsonProperty("client_id")
        val clientId: String?,
        @JsonProperty("azp")
        val authorizedParty: String?,
        @JsonProperty("token_type")
        val type: String?,
    )

    companion object {
        internal fun create(client: WebClient, config: AuthService) = TokenService(client, config)
    }
}