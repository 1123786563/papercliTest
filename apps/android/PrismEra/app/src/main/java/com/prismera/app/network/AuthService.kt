package com.prismera.app.network

import com.prismera.app.data.model.AuthResponse
import com.prismera.app.data.model.AuthToken
import com.prismera.app.data.model.User
import com.prismera.app.data.local.PreferenceManager

class AuthService private constructor() {
    companion object {
        val instance: AuthService by lazy { AuthService() }
        fun getInstance(): AuthService = instance
    }
    
    suspend fun login(email: String, password: String): Result<AuthResponse, ApiException> {
        val response = ApiClient.getInstance().post<AuthResponse, LoginRequest>(
            "/auth/login",
            LoginRequest(email, password)
        )
        // Store token securely
        PreferenceManager.getInstance().saveAuthToken(response.token)
        // Cache user for offline access
        CacheManager.getInstance().set(response.user, "current_user")
        
        return Result.success(response)
    }
    
    suspend fun register(name: String, email: String, password: String): Result<AuthResponse, ApiException> {
        val response = ApiClient.getInstance().post<AuthResponse, RegisterRequest>(
            "/auth/register",
            RegisterRequest(name, email, password)
        )
        PreferenceManager.getInstance().saveAuthToken(response.token)
        CacheManager.getInstance().set(response.user, "current_user")
        return Result.success(response)
    }
    
    suspend fun logout(): Result<Unit, ApiException> {
        try {
            ApiClient.getInstance().post<Unit, EmptyBody>("/auth/logout", EmptyBody())
        } finally {
            PreferenceManager.getInstance().clearAuthToken()
            CacheManager.getInstance().remove("current_user")
        }
        return Result.success(Unit)
    }
    
    suspend fun validateSession(): Result<User?, ApiException> {
        return try {
            val user = ApiClient.getInstance().get<User>("/auth/me")
            Result.success(user)
        } catch (e: ApiException.Unauthorized) {
            Result.success(null)
        }
    }
    
    suspend fun refreshToken(): Result<AuthToken?, ApiException> {
        return try {
            val token = ApiClient.getInstance().post<AuthToken, EmptyBody>("/auth/refresh", EmptyBody())
            PreferenceManager.getInstance().saveAuthToken(token)
            Result.success(token)
        } catch (e: Exception) {
            Result.success(null)
        }
    }
}

// Request models
data class LoginRequest(val email: String, val password: String)
data class RegisterRequest(val name: String, val email: String, val password: String)
