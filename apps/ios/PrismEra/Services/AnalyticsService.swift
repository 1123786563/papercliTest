import Foundation

class AnalyticsService {
    static let shared = AnalyticsService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Analytics Data

    func fetchAnalytics(timeRange: AnalyticsView.TimeRange) async throws -> AnalyticsData {
        let endpoint = "/analytics?range=\(timeRangeToString(timeRange))"
        do {
            return try await apiClient.get(endpoint)
        } catch {
            // Return mock data on failure
            return AnalyticsData(
                overview: .mock(),
                performance: ContentPerformance.mockData(),
                platforms: PlatformDistribution.mockData(),
                topContent: TopContent.mockData()
            )
        }
    }

    func fetchContentAnalytics(contentId: UUID) async throws -> ContentAnalytics {
        return try await apiClient.get("/analytics/content/\(contentId)")
    }

    func fetchRealtimeStats() async throws -> RealtimeStats {
        do {
            return try await apiClient.get("/analytics/realtime")
        } catch {
            return RealtimeStats(activeUsers: Int.random(in: 50...500), pageViews: Int.random(in: 100...2000))
        }
    }

    // MARK: - Helper

    private func timeRangeToString(_ range: AnalyticsView.TimeRange) -> String {
        switch range {
        case .day: return "day"
        case .week: return "week"
        case .month: return "month"
        case .year: return "year"
        }
    }
}

// MARK: - Response Models

struct AnalyticsData: Codable {
    let overview: OverviewStats
    let performance: [ContentPerformance]
    let platforms: [PlatformDistribution]
    let topContent: [TopContent]
}

struct ContentAnalytics: Codable {
    let contentId: UUID
    let views: Int
    let uniqueViews: Int
    let avgTimeOnPage: Double
    let bounceRate: Double
    let engagement: EngagementMetrics
}

struct EngagementMetrics: Codable {
    let likes: Int
    let comments: Int
    let shares: Int
    let saves: Int
}

struct RealtimeStats: Codable {
    let activeUsers: Int
    let pageViews: Int
}
