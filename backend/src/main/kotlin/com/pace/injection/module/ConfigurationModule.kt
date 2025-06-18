package com.pace.injection.module

import com.google.inject.AbstractModule
import com.pace.config.Configuration

class ConfigurationModule(private val conf: Configuration): AbstractModule() {
    override fun configure() {
        bind(Configuration::class.java).toInstance(conf)
    }
}