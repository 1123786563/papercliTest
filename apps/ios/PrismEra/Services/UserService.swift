import Foundation

class UserService {
    static let shared = UserService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - User Operations

    func fetchCurrentUser() async throws -> User? {
        do {
            return try await apiClient.get("/users/me")
        } catch {
            // Return cached user
            return CacheManager.shared.get(forKey: "current_user")
        }
    }

    func updateProfile(name: String? = nil, avatarUrl: String? = nil) async throws -> User {
        var body: [String: Any] = [:]
        if let name = name { body["name"] = name }
        if let avatarUrl = avatarUrl { body["avatarUrl"] = avatarUrl }

        let updateData = UpdateProfileRequest(name: name, avatarUrl: avatarUrl)
        let user: User = try await apiClient.patch("/users/me", body: updateData)

        // Update cache
        CacheManager.shared.set(user, forKey: "current_user")

        return user
    }

    func updatePreferences(_ preferences: UserPreferences) async throws -> User {
        let body = UpdatePreferencesRequest(preferences: preferences)
        let user: User = try await apiClient.patch("/users/me/preferences", body: body)

        CacheManager.shared.set(user, forKey: "current_user")

        return user
    }

    func deleteAccount() async throws {
        try await apiClient.delete("/users/me")
        CacheManager.shared.clearAll()
        KeychainManager.shared.clearAll()
    }
}

// MARK: - Request Models

struct UpdateProfileRequest: Encodable {
    let name: String?
    let avatarUrl: String?
}

struct UpdatePreferencesRequest: Encodable {
    let preferences: UserPreferences
}
