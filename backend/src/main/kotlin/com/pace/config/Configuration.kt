package com.pace.config

import com.fasterxml.jackson.annotation.JsonCreator
import com.fasterxml.jackson.databind.PropertyNamingStrategies
import com.fasterxml.jackson.databind.annotation.JsonNaming

@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class Configuration @JsonCreator constructor(
    val database: DatabaseConfiguration,
    val application: ApplicationConfiguration
)

@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class DatabaseConfiguration @JsonCreator constructor(
    val dataSourceClass: String,
    val sgBaseUrl: String,
    val sgAuthToken: String
)

@JsonNaming(PropertyNamingStrategies.KebabCaseStrategy::class)
data class ApplicationConfiguration @JsonCreator constructor(
    val host: String,
    val port: Int
) {
//    constructor() : this("0.0.0.0", 8080) // for google Guice
}
