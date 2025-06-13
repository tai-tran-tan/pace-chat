package com.pace.config

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class Configuration(val database: DatabaseConfiguration)

@Serializable
data class DatabaseConfiguration(
    @SerialName("data-source-class")
    val dataSourceClass: String
)
