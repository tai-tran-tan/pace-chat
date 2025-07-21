package com.pace.data.db.dao

import com.datastax.oss.driver.api.core.CqlSession
import com.pace.storage.dao.DaoMapperBuilder
import java.net.InetSocketAddress

object DaoCreator {
    private val session = CqlSession.builder()
        .addContactPoint(InetSocketAddress("127.0.0.1", 9042))
        .withLocalDatacenter("datacenter1")
        .withKeyspace("pace_chat") // Your keyspace name
        .build()
    private val builder = DaoMapperBuilder(session).build()

    fun createConversationDao() = builder.conversationDao()
    fun createMessageDao() = builder.messageDao()
}
