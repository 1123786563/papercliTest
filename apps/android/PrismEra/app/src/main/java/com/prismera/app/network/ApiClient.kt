package com.prismera.app.network

import com.google.gson.Gson
import com.google.gson.GsonBuilder
import com.prismera.app.data.local.PreferenceManager
import com.prismera.app.data.model.AuthToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.logging.HttpLoggingInterceptor
import java.io.IOException

class ApiClient private constructor() {
    companion object {
        private const val BASE_URL_DEBUG = "http://10.0.2.2:3000/api"
        private const val BASE_URL_RELEASE = "https://api.prismera.com/api"
        
        private var instance: ApiClient? = null
        
        fun init() {
            instance = ApiClient()
        }
        
        fun getInstance(): ApiClient {
            return instance ?: throw IllegalStateException("ApiClient not initialized")
        }
    }
    
    private val client: OkHttpClient
    private val gson: Gson
    private val baseUrl: String
    
    private constructor() {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, java.util.concurrent.TimeUnit.SECONDS)
            .readTimeout(60, java.util.concurrent.TimeUnit.SECONDS)
            .retryOnConnectionFailure(true)
        
        // Add logging for debug builds
        if (BuildConfig.DEBUG) {
            builder.addInterceptor(HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            })
        }
        
        client = builder.build()
        gson = GsonBuilder()
            .setDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z")
            .create()
        
        baseUrl = if (BuildConfig.DEBUG) BASE_URL_DEBUG else BASE_URL_RELEASE
    }
    
    // Generic GET request
    inline suspend fun <re : Any> get(endpoint: String): Result<re, ApiException> {
        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("\$baseUrl/\$endpoint")
                .addHeader("Content-Type", "application/json")
                .applyAuthHeader()
                .get()
                .build()
            
            executeRequest<re>(request)
        }
    }
    
    // Generic POST request
    inline suspend fun <re : Any, req : Any> post(endpoint: String, body: req): Result<re, ApiException> {
        return withContext(Dispatchers.IO) {
            val json = gson.toJson(body)
            val request = Request.Builder()
                .url("\$baseUrl/\$endpoint")
                .addHeader("Content-Type", "application/json")
                .applyAuthHeader()
                .post(json.toRequestBody("application/json"))
                .build()
            
            executeRequest<re>(request)
        }
    }
    
    // Generic PATCH request
    inline suspend fun <re : Any, req : Any> patch(endpoint: String, body: req): Result<re, ApiException> {
        return withContext(Dispatchers.IO) {
            val json = gson.toJson(body)
            val request = Request.Builder()
                .url("\$baseUrl/\$endpoint")
                .addHeader("Content-Type", "application/json")
                .applyAuthHeader()
                .patch(json.toRequestBody("application/json"))
                .build()
            
            executeRequest<re>(request)
        }
    }
    
    // Generic DELETE request
    inline suspend fun delete(endpoint: String): Result<Unit, ApiException> {
        return withContext(Dispatchers.IO) {
            val request = Request.Builder()
                .url("\$baseUrl/\$endpoint")
                .applyAuthHeader()
                .delete()
                .build()
            
            val response = client.newCall(request)
            
            if (!response.isSuccessful) {
                throw ApiException.HttpError(response.code, response.body?.string())
            }
            
            Result.success(Unit)
        }
    }
    
    private suspend inline fun <re : Any> executeRequest(request: Request): Result<re, ApiException> {
        val response = client.newCall(request)
        
        if (!response.isSuccessful) {
            val errorBody = response.body?.string()
            throw when (response.code) {
                401 -> ApiException.Unauthorized
                else -> {
                    val message = try {
                        gson.fromJson(errorBody, ErrorResponse::class.java).message
                    } catch (e: Exception) {
                        "HTTP \${response.code}"
                    }
                    ApiException.HttpError(response.code, message)
                }
            }
        }
        
        try {
            return Result.success(gson.fromJson(response.body?.string(), re::class.java))
        } catch (e: Exception) {
            throw ApiException.DecodingError(e)
        }
    }
    
    private fun Request.Builder.applyAuthHeader(): Request.Builder {
        PreferenceManager.getInstance().getAuthToken()?.let { token ->
            addHeader("Authorization", "Bearer \$token")
        }
        return this
    }
}

// Request/Response models
data class EmptyBody(val unit: Unit = Unit)

data class ErrorResponse(val message: String, val code: String? = null)

// API Exceptions
sealed class ApiException : Exception {
    data class HttpError(override val message: String, val statusCode: Int, val body: String?) : ApiException()
    data object Unauthorized : ApiException() : ApiException("未授权，请重新登录")
    data class NetworkError(override val message: String) : ApiException()
    data class DecodingError(val cause: Throwable) : ApiException("数据解析错误")
}
