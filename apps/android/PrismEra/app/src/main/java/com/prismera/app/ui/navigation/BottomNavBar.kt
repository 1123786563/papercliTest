package com.prismera.app.ui.navigation

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import androidx.navigation.compose.currentBackStackEntryAsState

sealed class BottomNavItem(
    val route: String,
    val title: String,
    val icon: ImageVector
) {
    data object Dashboard : BottomNavItem("dashboard", "首页", Icons.Filled.Home)
    data object Content : BottomNavItem("content", "内容", Icons.Filled.Article)
    data object Analytics : BottomNavItem("analytics", "分析", Icons.Filled.BarChart)
    data object Profile : BottomNavItem("profile", "我的", Icons.Filled.Person)
}

val bottomNavItems = listOf(
    BottomNavItem.Dashboard,
    BottomNavItem.Content,
    BottomNavItem.Analytics,
    BottomNavItem.Profile
)

@Composable
fun BottomNavBar(
    navController: NavHostController,
    items: List<BottomNavItem> = bottomNavItems
) {
    val navBackStackEntry = currentBackStackEntryAsState(navController)
    val currentRoute = navBackStackEntry?.destination?.route

    NavigationBar {
        items.forEach { item ->
            NavigationBarItem(
                selected = currentRoute == item.route,
                onClick = {
                    if (currentRoute != item.route) {
                        navController.navigate(item.route) {
                            popUpTo(item.route) { true }
                            launchSingleTop = true
                        }
                    }
                },
                icon = { Icon(item.icon, contentDescription = item.title) },
                label = { Text(item.title) }
            )
        }
    }
}
