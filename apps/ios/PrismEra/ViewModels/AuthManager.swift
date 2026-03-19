import Foundation

@MainActor
class AuthManager: ObservableObject {
    @Published var isAuthenticated = false
    @Published var currentUser: User?
    @Published var isLoading = false

    private let authService = AuthService.shared
    private let tokenKey = "auth_token"

    init() {
        checkExistingSession()
    }

    func login(email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let response = try await authService.login(email: email, password: password)

        // Store token securely
        KeychainManager.shared.save(response.token.accessToken, forKey: tokenKey)

        currentUser = response.user
        isAuthenticated = true

        // Cache user for offline access
        CacheManager.shared.set(response.user, forKey: "current_user")
    }

    func logout() async {
        isLoading = true
        defer { isLoading = false }

        // Clear stored credentials
        KeychainManager.shared.delete(forKey: tokenKey)
        CacheManager.shared.remove(forKey: "current_user")

        currentUser = nil
        isAuthenticated = false

        // Optionally notify backend
        try? await authService.logout()
    }

    func register(name: String, email: String, password: String) async throws {
        isLoading = true
        defer { isLoading = false }

        let response = try await authService.register(name: name, email: email, password: password)

        KeychainManager.shared.save(response.token.accessToken, forKey: tokenKey)

        currentUser = response.user
        isAuthenticated = true

        CacheManager.shared.set(response.user, forKey: "current_user")
    }

    private func checkExistingSession() {
        // Check if we have a stored token
        if let token = KeychainManager.shared.get(forKey: tokenKey),
           !token.isEmpty {
            // Validate token with backend
            Task {
                do {
                    if let user = try await authService.validateSession() {
                        currentUser = user
                        isAuthenticated = true
                    }
                } catch {
                    // Token invalid, clear it
                    KeychainManager.shared.delete(forKey: tokenKey)
                }
            }
        }
    }

    func refreshToken() async throws {
        guard let newToken = try await authService.refreshToken() else { return }
        KeychainManager.shared.save(newToken.accessToken, forKey: tokenKey)
    }
}
