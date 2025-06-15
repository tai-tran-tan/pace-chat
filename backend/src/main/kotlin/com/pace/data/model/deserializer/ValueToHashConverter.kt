package com.pace.data.model.deserializer

import com.fasterxml.jackson.databind.util.StdConverter
import com.google.common.hash.Hashing

class ValueToHashConverter : StdConverter<String, String>() {
    private val hashFunction = Hashing.sha256()
    override fun convert(value: String?): String? {
        return value?.let { hashFunction.hashString(it, Charsets.UTF_8).toString() }
    }
}