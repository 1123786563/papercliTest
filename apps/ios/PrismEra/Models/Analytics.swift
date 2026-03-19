import Foundation

struct OverviewStats {
    var totalViews: Int
    var viewsTrend: Double
    var engagement: Int
    var engagementTrend: Double
    var shares: Int
    var sharesTrend: Double

    static func mock() -> OverviewStats {
        OverviewStats(
            totalViews: 12580,
            viewsTrend: 12.5,
            engagement: 3420,
            engagementTrend: 8.3,
            shares: 156,
            sharesTrend: -2.1
        )
    }
}

struct ContentPerformance: Identifiable {
    let id = UUID()
    let date: Date
    let views: Int
    let engagement: Int

    static func mockData() -> [ContentPerformance] {
        let calendar = Calendar.current
        let today = Date()

        return (0..<7).reversed().map { offset in
            let date = calendar.date(byAdding: .day, value: -offset, to: today)!
            return ContentPerformance(
                date: date,
                views: Int.random(in: 500...3000),
                engagement: Int.random(in: 50...500)
            )
        }
    }
}

struct PlatformDistribution: Identifiable {
    let id = UUID()
    let platform: String
    let percentage: Double

    static func mockData() -> [PlatformDistribution] {
        [
            PlatformDistribution(platform: "微信", percentage: 35),
            PlatformDistribution(platform: "小红书", percentage: 28),
            PlatformDistribution(platform: "微博", percentage: 20),
            PlatformDistribution(platform: "知乎", percentage: 12),
            PlatformDistribution(platform: "其他", percentage: 5)
        ]
    }
}

struct TopContent: Identifiable {
    let id = UUID()
    let title: String
    let views: Int
    let growth: Double

    static func mockData() -> [TopContent] {
        [
            TopContent(title: "AI 内容创作完全指南", views: 3520, growth: 25.3),
            TopContent(title: "2026 营销趋势预测", views: 2890, growth: 18.7),
            TopContent(title: "新手入门教程", views: 2150, growth: 12.1),
            TopContent(title: "效率提升秘籍", views: 1890, growth: 8.5)
        ]
    }
}
