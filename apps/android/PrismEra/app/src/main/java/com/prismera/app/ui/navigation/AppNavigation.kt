package com.prismera.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.comNavController
import androidx.navigation.compose.comcomposable
import com.prismera.app.ui.screens.*

sealed class Screen(val route: String) {
    data object Dashboard : Screen("dashboard")
    data object ContentList : Screen("content")
    data object Analytics : Screen("analytics")
    data object Profile : Screen("profile")
    data object Login : Screen("login")
}

@Composable
fun AppNavigation(
    navController: NavHostController = rememberNavController(),
    startDestination: String = Screen.Dashboard.route
) {
    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Dashboard.route) { DashboardScreen() }
        composable(Screen.ContentList.route) { ContentListScreen() }
        composable(Screen.Analytics.route) { AnalyticsScreen() }
        composable(Screen.Profile.route) { ProfileScreen() }
        composable(Screen.Login.route) { LoginScreen() }
    }
}
