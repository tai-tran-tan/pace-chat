package com.pace.config

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.annotation.JsonIgnoreProperties
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming

@JsonIgnoreProperties(ignoreUnknown = true)
@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class Configuration @JsonCreator constructor(
    val database: DatabaseConfiguration,
    val application: ApplicationConfiguration,
    val authService: AuthService,
)

@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class DatabaseConfiguration @JsonCreator constructor(
    val dataSourceClass: String,
    val baseUrl: String,
)

@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class ApplicationConfiguration @JsonCreator constructor(
    val host: String,
    val port: Int
)

@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class AuthService @JsonCreator constructor(
    val baseUrl: String,
    val realmName: String,
    val clientId: String,
    val clientSecret: String,
)