package com.pace.security

import com.auth0.jwk.Jwk
import com.auth0.jwk.JwkProviderBuilder
import com.auth0.jwt.JWT
import com.auth0.jwt.JWTVerifier
import com.auth0.jwt.algorithms.Algorithm
import com.pace.data.model.UserPublic
import java.net.URL
import java.security.interfaces.RSAPublicKey
import java.util.UUID
import java.util.concurrent.TimeUnit


class JwtService() {

    fun verifyIdToken(token: String): UserPublic {
        val decodedJWT = JWT.decode(token)
        return UserPublic(
            userId = decodedJWT.subject.let { UUID.fromString(it) },
            username = decodedJWT.getClaim("preferred_username")?.asString() ?: "",
            null
        )
    }

//    fun verifyAccessToken(token: String): DecodedJWT? {
//        return VERIFIER.verify(token)
//    }

    companion object {
        private val KEYCLOAK_REALM_URL: String = "http://localhost:8080/realms/pace_chat"
        private val CERTS_URL: String = KEYCLOAK_REALM_URL + "/protocol/openid-connect/certs"
        private val issuer = KEYCLOAK_REALM_URL

        private val audience = "pace_chat_backend"
//        private val VERIFIER = createVerifier()
        private fun createVerifier(): JWTVerifier {
            // 1. Build a JwkProvider to fetch and cache Keycloak's public keys
            // This is robust as it handles key rotation and caching.
            val jwkProvider = JwkProviderBuilder(URL(CERTS_URL))
                .cached(10, 24, TimeUnit.HOURS) // Cache keys for 24 hours
                .rateLimited(10, 1, TimeUnit.MINUTES) // Limit 10 requests per minute
                .build()


            // 3. Get the JWK (JSON Web Key) for the specific Key ID
            // The get(keyId) method automatically fetches from JWKS URL and finds the key.
            val jwk: Jwk = jwkProvider.get("iAOYhezMuSz4ucavCdjLj9q2mUOIcKx4xBpdXcbmeVo")
//
//
//            // 4. Extract the RSA Public Key from the JWK
            require(jwk.getPublicKey() is RSAPublicKey) { "Keycloak key is not an RSA public key." }
            val publicKey = jwk.getPublicKey() as RSAPublicKey

            // 5. Create the Algorithm.RSA256 instance
            val algorithm = Algorithm.RSA256(publicKey, null) // privateKey is null for verification


            // 6. Verify the JWT
            return JWT.require(algorithm)
//                .withAudience(audience)
                .withIssuer(issuer)
                .build()
        }


    }
}