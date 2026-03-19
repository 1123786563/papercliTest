import Foundation

@MainActor
class ContentListViewModel: ObservableObject {
    @Published var content: [Content] = []
    @Published var filteredContent: [Content] = []
    @Published var searchText = ""
    @Published var isLoading = false

    private let contentService = ContentService.shared

    init() {
        setupSearch()
    }

    func loadContent() async {
        isLoading = true
        defer { isLoading = false }

        do {
            let fetchedContent = try await contentService.fetchContent()
            content = fetchedContent
            filterContent()
        } catch {
            // Load cached data on failure
            if let cached: [Content] = CacheManager.shared.get(forKey: "all_content") {
                content = cached
            } else {
                content = Content.sampleData()
            }
            filterContent()
        }
    }

    func deleteContent(at offsets: IndexSet) {
        let itemsToDelete = offsets.map { filteredContent[$0] }
        for item in itemsToDelete {
            content.removeAll { $0.id == item.id }
        }
        filterContent()

        // Sync deletion with backend
        Task {
            for item in itemsToDelete {
                try? await contentService.deleteContent(id: item.id)
            }
        }
    }

    private func setupSearch() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.filterContent()
            }
            .store(in: &cancellables)
    }

    private func filterContent() {
        if searchText.isEmpty {
            filteredContent = content
        } else {
            filteredContent = content.filter {
                $0.title.localizedCaseInsensitiveContains(searchText) ||
                $0.tags.contains { $0.localizedCaseInsensitiveContains(searchText) }
            }
        }
    }

    private var cancellables = Set<AnyCancellable>()
}

import Combine
