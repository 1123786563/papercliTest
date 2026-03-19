package com.prismera.app.utils

import android.content.Context
import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.google.gson.reflect.TypeToken
import java.util.concurrent.TimeUnit

class CacheManager private constructor() {
    companion object {
        private const val PREFS_NAME = "cache_prefs"
        private const val DEFAULT_EXPIRY = 24 * 60 * 60 * 1000L // 24 hours in millis
        
        @Volatile
        private var instance: CacheManager? = null
        
        fun init(context: Context) {
            instance = CacheManager(context)
        }
        
        fun getInstance(): CacheManager {
            return instance ?: throw IllegalStateException("CacheManager not initialized")
        }
    }
    
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    private val gson = GsonBuilder().setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z").create()
    
    fun <T> set(value: T, key: String, expiry: Long = DEFAULT_EXPIRY) {
        val wrapper = CacheWrapper(
            value = gson.toJson(value),
            cachedAt = System.currentTimeMillis(),
            expiresAt = System.currentTimeMillis() + expiry
        )
        prefs.edit().putString(key, gson.toJson(wrapper)).apply()
    }
    
    fun <T> get(key: String, typeToken: TypeToken<T>): T? {
        val json = prefs.getString(key, null) ?: return null
        val wrapper = gson.fromJson(json, CacheWrapper::class.java)
        
        if (wrapper.isExpired) {
            remove(key)
            return null
        }
        
        return gson.fromJson(wrapper.value, typeToken)
    }
    
    fun remove(key: String) {
        prefs.edit().remove(key).apply()
    }
    
    fun clearAll() {
        prefs.edit().clear().apply()
    }
    
    fun clearExpired() {
        val allKeys = prefs.all.keys()
        for (key in allKeys) {
            val json = prefs.getString(key, null) ?: continue
            val wrapper = gson.fromJson(json, CacheWrapper::class.java)
            if (wrapper.isExpired) {
                remove(key)
            }
        }
    }
    
    private data class CacheWrapper(
        val value: String,
        val cachedAt: Long,
        val expiresAt: Long
    ) {
        val isExpired: Boolean
            get() = System.currentTimeMillis() >= expiresAt
    }
}
