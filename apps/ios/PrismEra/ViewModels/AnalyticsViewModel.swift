import Foundation

@MainActor
class AnalyticsViewModel: ObservableObject {
    @Published var overviewStats: OverviewStats = .mock()
    @Published var contentPerformance: [ContentPerformance] = []
    @Published var platformDistribution: [PlatformDistribution] = []
    @Published var topContent: [TopContent] = []
    @Published var isLoading = false

    private let analyticsService = AnalyticsService.shared

    func loadAnalytics(timeRange: AnalyticsView.TimeRange) async {
        isLoading = true
        defer { isLoading = false }

        do {
            let data = try await analyticsService.fetchAnalytics(timeRange: timeRange)

            await MainActor.run {
                self.overviewStats = data.overview
                self.contentPerformance = data.performance
                self.platformDistribution = data.platforms
                self.topContent = data.topContent
            }
        } catch {
            // Use mock data on failure
            loadMockData()
        }
    }

    private func loadMockData() {
        overviewStats = .mock()
        contentPerformance = ContentPerformance.mockData()
        platformDistribution = PlatformDistribution.mockData()
        topContent = TopContent.mockData()
    }
}
