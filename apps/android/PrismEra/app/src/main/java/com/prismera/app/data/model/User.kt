package com.prismera.app.data.model

import com.google.gson.annotations.SerializedName
import java.util.*

data class User(
    val id: String = UUID.randomUUID().toString(),
    val email: String,
    val name: String,
    val avatarUrl: String? = null,
    val createdAt: Long = System.currentTimeMillis(),
    val preferences: UserPreferences = UserPreferences()
) {
    val initials: String
        get() {
            val nameParts = name.split(" ")
            return if (nameParts.size >= 2) {
                "${nameParts[0].first()}${nameParts[1].first()}"
            } else {
                name.take(2)
            }
        }
}

data class UserPreferences(
    val offlineMode: Boolean = false,
    val notificationsEnabled: Boolean = true,
    val darkMode: Boolean? = null,
    val language: String = "zh-CN"
)

data class AuthToken(
    val accessToken: String,
    val refreshToken: String,
    val expiresAt: Long
)

data class AuthResponse(
    val user: User,
    val token: AuthToken
)
