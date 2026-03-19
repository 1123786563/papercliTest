package com.prismera.app.data.model

import java.util.*

data class OverviewStats(
    val totalViews: Int,
    val viewsTrend: Double,
    val engagement: Int,
    val engagementTrend: Double,
    val shares: Int,
    val sharesTrend: Double
)

data class ContentPerformance(
    val date: Long,
    val views: Int,
    val engagement: Int
) {
    companion object {
        fun mockData(): List<ContentPerformance> {
            val calendar = Calendar.getInstance()
            val today = System.currentTimeMillis()
            return (0..6).reversed().map { offset ->
                val date = calendar.apply { add(Calendar.DAY_OF_MONTH, -offset) }.timeInMillis
                ContentPerformance(
                    date = date,
                    views = (500..3000).random(),
                    engagement = (50..500).random()
                )
            }
        }
    }
}

data class PlatformDistribution(
    val platform: String,
    val percentage: Double
) {
    companion object {
        val sampleData = listOf(
            PlatformDistribution("微信", 35.0),
            PlatformDistribution("小红书", 28.0),
            PlatformDistribution("微博", 20.0),
            PlatformDistribution("知乎", 12.0),
            PlatformDistribution("其他", 5.0)
        )
    }
}

data class TopContent(
    val title: String,
    val views: Int,
    val growth: Double
) {
    companion object {
        val sampleData = listOf(
            TopContent("AI 内容创作完全指南", 3520, 25.3),
            TopContent("2026 营销趋势预测", 2890, 18.7),
            TopContent("新手入门教程", 2150, 12.1),
            TopContent("效率提升秘籍", 1890, 8.5)
        )
    }
}
