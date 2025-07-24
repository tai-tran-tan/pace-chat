package com.pace.storage.dao

import com.datastax.oss.driver.api.core.PagingIterable
import com.datastax.oss.driver.api.mapper.annotations.Dao
import com.datastax.oss.driver.api.mapper.annotations.DaoFactory
import com.datastax.oss.driver.api.mapper.annotations.Delete
import com.datastax.oss.driver.api.mapper.annotations.Insert
import com.datastax.oss.driver.api.mapper.annotations.Mapper
import com.datastax.oss.driver.api.mapper.annotations.Select
import com.datastax.oss.driver.api.mapper.annotations.Update
import com.pace.data.model.Conversation
import com.pace.data.model.Message
import java.util.UUID

@Dao // Marks this as a DAO interface
interface ConversationDao {
    @Insert
    fun save(conv: Conversation)

    @Select(customWhereClause = "conv_id = :id")
    fun findById(id: UUID): PagingIterable<Conversation> // Returns nullable User

    @Update //(ifExists = false)
    fun update(conv: Conversation): Boolean

    @Delete
    fun delete(conv: Conversation)

    @Select(customWhereClause = "user_id = :userId")
    fun findByUser(userId: UUID): PagingIterable<Conversation>

    @Select(customWhereClause = "user_id in :userIds")
    fun findByAnyUser(userIds: List<UUID>): PagingIterable<Conversation>
}

@Dao // Marks this as a DAO interface
interface MessageDao {
    @Insert
    fun save(message: Message)

    @Select
    fun findById(id: UUID): Message? // Returns nullable User

    @Update
    fun update(message: Message)

    @Delete
    fun delete(message: Message)

    @Select(customWhereClause = "conv_id = :convId limit :lim")
    fun findByConversation(convId: UUID, lim: Int): PagingIterable<Message>
}


@Mapper // Marks this as the main mapper interface
interface DaoMapper {
    @DaoFactory
    fun conversationDao(): ConversationDao
    @DaoFactory
    fun messageDao(): MessageDao
}