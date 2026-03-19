package com.prismera.app

import android.app.Application
import com.prismera.app.data.local.PreferenceManager
import com.prismera.app.network.ApiClient
import com.prismera.app.utils.CacheManager

class PrismEraApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize singletons
        PreferenceManager.init(this)
        CacheManager.init(this)
        ApiClient.init()
    }
}
