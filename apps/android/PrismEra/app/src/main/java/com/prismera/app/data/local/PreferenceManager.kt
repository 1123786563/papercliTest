package com.prismera.app.data.local

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import com.prismera.app.data.model.AuthToken
import com.prismera.app.data.model.User
import com.google.gson.Gson

class PreferenceManager private constructor() {
    companion object {
        private const val PREFS_NAME = "encrypted_prefs"
        private const val KEY_AUTH_TOKEN = "auth_token"
        private const val KEY_CURRENT_USER = "current_user"
        
        @Volatile
        private var instance: PreferenceManager? = null
        
        fun init(context: Context) {
            instance = PreferenceManager(context)
        }
        
        fun getInstance(): PreferenceManager {
            return instance ?: throw IllegalStateException("PreferenceManager not initialized")
        }
    }
    
    private val masterKey = MasterKey.Builder(context)
        .setKeyScheme(MasterKey.KeyScheme.AES256_GCM_SPEC)
        .build()
    
    private val sharedPreferences = EncryptedSharedPreferences.create(
        context, PREFS_NAME, masterKey,
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV
    )
    
    private val gson = Gson()
    
    // Auth Token
    fun saveAuthToken(token: AuthToken) {
        sharedPreferences.edit().putString(KEY_AUTH_TOKEN, gson.toJson(token)).apply()
    }
    
    fun getAuthToken(): AuthToken? {
        val json = sharedPreferences.getString(KEY_AUTH_TOKEN, null)
        return if (json != null) gson.fromJson(json, AuthToken::class.java) else null
    }
    
    fun clearAuthToken() {
        sharedPreferences.edit().remove(KEY_AUTH_TOKEN).apply()
    }
    
    // User
    fun saveCurrentUser(user: User) {
        sharedPreferences.edit().putString(KEY_CURRENT_USER, gson.toJson(user)).apply()
    }
    
    fun getCurrentUser(): User? {
        val json = sharedPreferences.getString(KEY_CURRENT_USER, null)
        return if (json != null) gson.fromJson(json, User::class.java) else null
    }
    
    fun clearCurrentUser() {
        sharedPreferences.edit().remove(KEY_CURRENT_USER).apply()
    }
    
    // Clear all
    fun clearAll() {
        sharedPreferences.edit().clear().apply()
    }
}
