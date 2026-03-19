import Foundation

class AuthService {
    static let shared = AuthService()
    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Authentication

    func login(email: String, password: String) async throws -> AuthResponse {
        let body = LoginRequest(email: email, password: password)
        return try await apiClient.post("/auth/login", body: body)
    }

    func register(name: String, email: String, password: String) async throws -> AuthResponse {
        let body = RegisterRequest(name: name, email: email, password: password)
        return try await apiClient.post("/auth/register", body: body)
    }

    func logout() async throws {
        try await apiClient.post("/auth/logout", body: EmptyBody())
    }

    func validateSession() async throws -> User? {
        do {
            let response: User = try await apiClient.get("/auth/me")
            return response
        } catch APIError.httpError(let statusCode) where statusCode == 401 {
            return nil
        }
    }

    func refreshToken() async throws -> AuthToken? {
        do {
            let response: AuthToken = try await apiClient.post("/auth/refresh", body: EmptyBody())
            return response
        } catch {
            return nil
        }
    }

    // MARK: - Password Reset

    func requestPasswordReset(email: String) async throws {
        let body = EmailRequest(email: email)
        try await apiClient.post("/auth/forgot-password", body: body)
    }

    func resetPassword(token: String, newPassword: String) async throws {
        let body = ResetPasswordRequest(token: token, newPassword: newPassword)
        try await apiClient.post("/auth/reset-password", body: body)
    }

    // MARK: - OAuth (Clerk Integration)

    func handleOAuthCallback(code: String, state: String) async throws -> AuthResponse {
        let body = OAuthCallbackRequest(code: code, state: state)
        return try await apiClient.post("/auth/oauth/callback", body: body)
    }
}

// MARK: - Request Models

struct LoginRequest: Encodable {
    let email: String
    let password: String
}

struct RegisterRequest: Encodable {
    let name: String
    let email: String
    let password: String
}

struct EmailRequest: Encodable {
    let email: String
}

struct ResetPasswordRequest: Encodable {
    let token: String
    let newPassword: String
}

struct OAuthCallbackRequest: Encodable {
    let code: String
    let state: String
}
