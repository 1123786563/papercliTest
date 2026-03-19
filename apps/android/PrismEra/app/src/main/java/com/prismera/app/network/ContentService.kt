package com.prismera.app.network

import com.prismera.app.data.model.Content
import com.prismera.app.data.model.ContentMetrics
import com.prismera.app.data.model.ContentStatus
import com.prismera.app.data.model.Platform

class ContentService private constructor() {
    companion object {
        val instance: ContentService by lazy { ContentService() }
        fun getInstance(): ContentService = instance
    }
    
    suspend fun fetchContent(): Result<List<Content>, ApiException> {
        return try {
            ApiClient.getInstance().get<List<Content>>("/content")
        } catch (e: Exception) {
            // Return sample data for demo/offline
            Result.success(Content.sampleData)
        }
    }
    
    suspend fun fetchContent(id: String): Result<Content, ApiException> {
        return ApiClient.getInstance().get("/content/\$id")
    }
    
    suspend fun createContent(content: Content): Result<Content, ApiException> {
        return ApiClient.getInstance().post("/content", content)
    }
    
    suspend fun updateContent(content: Content): Result<Content, ApiException> {
        return ApiClient.getInstance().patch("/content/\${content.id}", content)
    }
    
    suspend fun deleteContent(id: String): Result<Unit, ApiException> {
        return ApiClient.getInstance().delete("/content/\$id")
    }
    
    suspend fun publishContent(id: String): Result<Content, ApiException> {
        return ApiClient.getInstance().post("/content/\$id/publish", EmptyBody())
    }
    
    suspend fun scheduleContent(id: String, scheduledAt: Long): Result<Content, ApiException> {
        return ApiClient.getInstance().post("/content/\$id/schedule", ScheduleBody(scheduledAt))
    }
}

data class ScheduleBody(val scheduledAt: Long)
data class ContentSuggestion(
    val title: String,
    val body: String,
    val tags: List<String>,
    val platform: Platform
)
