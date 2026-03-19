import Foundation

class ContentService {
    static let shared = ContentService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Content CRUD

    func fetchContent() async throws -> [Content] {
        do {
            let content: [Content] = try await apiClient.get("/content")
            return content
        } catch {
            // Return sample data for demo/offline
            return Content.sampleData()
        }
    }

    func fetchContent(id: UUID) async throws -> Content {
        return try await apiClient.get("/content/\(id)")
    }

    func createContent(_ content: Content) async throws -> Content {
        return try await apiClient.post("/content", body: content)
    }

    func updateContent(_ content: Content) async throws -> Content {
        return try await apiClient.patch("/content/\(content.id)", body: content)
    }

    func deleteContent(id: UUID) async throws {
        try await apiClient.delete("/content/\(id)")
    }

    // MARK: - Content Publishing

    func publishContent(id: UUID) async throws -> Content {
        return try await apiClient.post("/content/\(id)/publish", body: EmptyBody())
    }

    func scheduleContent(id: UUID, at date: Date) async throws -> Content {
        let body = ScheduleBody(scheduledAt: date)
        return try await apiClient.post("/content/\(id)/schedule", body: body)
    }

    // MARK: - AI Assistance

    func generateContentSuggestion(prompt: String) async throws -> ContentSuggestion {
        let body = PromptBody(prompt: prompt)
        return try await apiClient.post("/ai/generate", body: body)
    }

    func optimizeContent(_ content: Content) async throws -> Content {
        return try await apiClient.post("/ai/optimize", body: content)
    }
}

// MARK: - Request/Response Models

struct EmptyBody: Encodable {}

struct ScheduleBody: Encodable {
    let scheduledAt: Date
}

struct PromptBody: Encodable {
    let prompt: String
}

struct ContentSuggestion: Codable {
    let title: String
    let body: String
    let tags: [String]
    let platform: Platform
}
