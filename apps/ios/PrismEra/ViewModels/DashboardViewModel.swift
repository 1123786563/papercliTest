import Foundation

@MainActor
class DashboardViewModel: ObservableObject {
    @Published var contentCount: Int = 0
    @Published var publishedCount: Int = 0
    @Published var draftCount: Int = 0
    @Published var recentContent: [Content] = []
    @Published var isLoading = false

    private let contentService = ContentService.shared

    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        // Load from cache first (offline support)
        loadCachedData()

        // Fetch fresh data from API
        do {
            let content = try await contentService.fetchContent()

            await MainActor.run {
                self.recentContent = Array(content.prefix(5))
                self.contentCount = content.count
                self.publishedCount = content.filter { $0.status == .published }.count
                self.draftCount = content.filter { $0.status == .draft }.count
            }

            // Cache for offline use
            cacheData(content)
        } catch {
            // Keep cached data if API fails
            print("Failed to load dashboard data: \(error)")
        }
    }

    func refresh() async {
        await loadData()
    }

    private func loadCachedData() {
        // Load from local cache
        if let cached: [Content] = CacheManager.shared.get(forKey: "recent_content") {
            recentContent = Array(cached.prefix(5))
            contentCount = cached.count
            publishedCount = cached.filter { $0.status == .published }.count
            draftCount = cached.filter { $0.status == .draft }.count
        } else {
            // Use sample data for demo
            let sample = Content.sampleData()
            recentContent = sample
            contentCount = sample.count
            publishedCount = sample.filter { $0.status == .published }.count
            draftCount = sample.filter { $0.status == .draft }.count
        }
    }

    private func cacheData(_ content: [Content]) {
        CacheManager.shared.set(content, forKey: "recent_content")
    }
}
