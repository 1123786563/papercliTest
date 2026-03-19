import Foundation

@MainActor
class ProfileViewModel: ObservableObject {
    @Published var userName: String = "用户"
    @Published var userEmail: String = "user@example.com"
    @Published var offlineMode: Bool = false

    private let userService = UserService.shared

    init() {
        loadUserProfile()
    }

    func loadUserProfile() {
        Task {
            do {
                if let user = try await userService.fetchCurrentUser() {
                    userName = user.name
                    userEmail = user.email
                    offlineMode = user.preferences.offlineMode
                }
            } catch {
                // Load cached user data
                if let cached: User = CacheManager.shared.get(forKey: "current_user") {
                    userName = cached.name
                    userEmail = cached.email
                    offlineMode = cached.preferences.offlineMode
                }
            }
        }
    }

    var userInitials: String {
        let nameParts = userName.split(separator: " ")
        if nameParts.count >= 2 {
            return String(nameParts[0].prefix(1) + nameParts[1].prefix(1))
        }
        return String(userName.prefix(2))
    }
}
