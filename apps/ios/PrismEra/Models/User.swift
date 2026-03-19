import Foundation

struct User: Identifiable, Codable {
    let id: UUID
    var email: String
    var name: String
    var avatarUrl: String?
    var createdAt: Date
    var preferences: UserPreferences

    init(
        id: UUID = UUID(),
        email: String,
        name: String,
        avatarUrl: String? = nil
    ) {
        self.id = id
        self.email = email
        self.name = name
        self.avatarUrl = avatarUrl
        self.createdAt = Date()
        self.preferences = UserPreferences()
    }

    var initials: String {
        let nameParts = name.split(separator: " ")
        if nameParts.count >= 2 {
            return String(nameParts[0].prefix(1) + nameParts[1].prefix(1))
        }
        return String(name.prefix(2))
    }
}

struct UserPreferences: Codable {
    var offlineMode: Bool
    var notificationsEnabled: Bool
    var darkMode: Bool?
    var language: String

    init(
        offlineMode: Bool = false,
        notificationsEnabled: Bool = true,
        darkMode: Bool? = nil,
        language: String = "zh-CN"
    ) {
        self.offlineMode = offlineMode
        self.notificationsEnabled = notificationsEnabled
        self.darkMode = darkMode
        self.language = language
    }
}

// MARK: - Auth Token
struct AuthToken: Codable {
    let accessToken: String
    let refreshToken: String
    let expiresAt: Date

    var isExpired: Bool {
        Date() >= expiresAt
    }
}

// MARK: - Auth Response
struct AuthResponse: Codable {
    let user: User
    let token: AuthToken
}
