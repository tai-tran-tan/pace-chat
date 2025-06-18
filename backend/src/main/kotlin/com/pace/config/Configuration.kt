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
    val sgAuth: SgAuth,
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
data class SgAuth @JsonCreator constructor(
    val baseUrl: String,
    val token: String,
    val username: String,
    val password: String,
)