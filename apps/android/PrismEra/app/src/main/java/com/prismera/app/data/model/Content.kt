package com.prismera.app.data.model

import com.google.gson.annotations.SerializedName
import java.util.*

data class Content(
    val id: String = UUID.randomUUID().toString(),
    val title: String,
    val body: String,
    val status: ContentStatus = ContentStatus.DRAFT,
    val platform: Platform = Platform.ALL,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val publishedAt: Long? = null,
    val tags: List<String> = emptyList(),
    val metrics: ContentMetrics? = null
)

enum class ContentStatus(val displayName: String, val icon: String) {
    DRAFT("草稿", "edit"),
    SCHEDULED("定时", "schedule"),
    PUBLISHED("已发布", "check_circle"),
    ARCHIVED("已归档", "archive");
}

enum class Platform(val displayName: String, val icon: String) {
    ALL("全平台", "public"),
    WECHAT("微信公众号", "chat"),
    WEIBO("微博", "rss_feed"),
    XIAOHONGSHU("小红书", "book"),
    DOUYIN("抖音", "video_library"),
    ZHIHU("知乎", "help")
}

data class ContentMetrics(
    val views: Int = 0,
    val likes: Int = 0,
    val comments: Int = 0,
    val shares: Int = 0
)

// Sample data for demo
object ContentSample {
    val sampleData = listOf(
        Content(
            title = "如何利用 AI 提升内容创作效率",
            body = "在当今数字时代，AI 工具正在革新内容创作的方式...",
            status = ContentStatus.PUBLISHED,
            platform = Platform.WECHAT,
            tags = listOf("AI", "效率", "内容创作"),
            metrics = ContentMetrics(views = 3520, likes = 280, comments = 45, shares = 32)
        ),
        Content(
            title = "2026 年社交媒体营销趋势",
            body = "了解最新的社交媒体营销趋势...",
            status = ContentStatus.SCHEDULED,
            platform = Platform.XIAOHONGSHU,
            tags = listOf("营销", "趋势")
        ),
        Content(
            title = "新手指南：从零开始做内容营销",
            body = "内容营销是现代企业不可或缺的一部分...",
            status = ContentStatus.DRAFT,
            platform = Platform.ZHIHU,
            tags = listOf("指南", "入门")
        )
    )
}
