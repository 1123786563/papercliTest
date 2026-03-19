package com.prismera.app.ui.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.prismera.app.data.model.Content
import com.prismera.app.data.model.ContentStatus
import com.prismera.app.network.ContentService
import com.prismera.app.utils.CacheManager
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.flow.combine
import kotlinx.coroutines.launch

data class DashboardUiState(
    val contentCount: Int = 0,
    val publishedCount: Int = 0,
    val draftCount: Int = 0,
    val recentContent: List<Content> = emptyList(),
    val isLoading: Boolean = false
)

class DashboardViewModel : ViewModel() {
    private val _uiState = MutableStateFlow(DashboardUiState(isLoading = true))
    val uiState = _uiState.asStateFlow()
    
    init {
        loadCachedData()
        loadData()
    }
    
    fun refresh() {
        loadData()
    }
    
    private fun loadCachedData() {
        viewModelScope.launch {
            val cached: List<Content>? = CacheManager.getInstance().get("recent_content", Content::class.java)
            if (cached != null) {
                _uiState.update { state ->
                    state.copy(
                        recentContent = cached.take(5),
                        contentCount = cached.size,
                        publishedCount = cached.count { it.status == ContentStatus.PUBLISHED },
                        draftCount = cached.count { it.status == ContentStatus.DRAFT },
                        isLoading = false
                    )
                }
            }
        }
    }
    
    private fun loadData() {
        viewModelScope.launch {
            try {
                val result = ContentService.getInstance().fetchContent()
                result.onSuccess { content ->
                    _uiState.update { state ->
                        state.copy(
                            recentContent = content.take(5),
                            contentCount = content.size,
                            publishedCount = content.count { it.status == ContentStatus.PUBLISHED },
                            draftCount = content.count { it.status == ContentStatus.DRAFT },
                            isLoading = false
                        )
                    }
                    CacheManager.getInstance().set(content, "recent_content")
                }.onError { error ->
                    // Load sample data on error
                    loadSampleData()
                }
            } catch (e: Exception) {
                loadSampleData()
            }
        }
    }
    
    private fun loadSampleData() {
        val sample = Content.sampleData
        _uiState.update { state ->
            state.copy(
                recentContent = sample,
                contentCount = sample.size,
                publishedCount = sample.count { it.status == ContentStatus.PUBLISHED },
                draftCount = sample.count { it.status == ContentStatus.DRAFT },
                isLoading = false
            )
        }
    }
}
