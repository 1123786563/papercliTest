# 棱镜纪元 iOS App

> 内容营销自动化平台 iOS 客户端应用

## 项目结构

```
PrismEra/
├── PrismEraApp.swift          # 应用入口
├── ContentView.swift           # 主视图
├── MainTabView.swift           # 标签导航
├── Models/                     # 数据模型
│   ├── Content.swift
│   ├── User.swift
│   └── Analytics.swift
├── ViewModels/               # 视图模型
│   ├── DashboardViewModel.swift
│   ├── ContentListViewModel.swift
│   ├── AnalyticsViewModel.swift
│   ├── ProfileViewModel.swift
│   └── AuthManager.swift
├── Views/                    # 视图层
│   ├── LoginView.swift
│   ├── DashboardView.swift
│   ├── ContentListView.swift
│   ├── AnalyticsView.swift
│   ├── ProfileView.swift
│   ├── Components/
│   └── Settings/
├── Services/                  # 服务层
│   ├── APIClient.swift
│   ├── AuthService.swift
│   ├── ContentService.swift
│   ├── AnalyticsService.swift
│   └── UserService.swift
├── Utils/                     # 工具类
│   ├── AppState.swift
│   ├── CacheManager.swift
│   └── KeychainManager.swift
└── Resources/
    ├── Assets.xcassets
    └── Info.plist
```

## 技术栈

- **UI 框架**: SwiftUI
- **最低支持版本**: iOS 17.0
- **架构模式**: MVVM
- **网络层**: URLSession + async/await
- **本地缓存**: UserDefaults + 自定义缓存管理
- **安全存储**: Keychain

## 主要功能
- 用户认证（登录/注册）
- 内容管理（CRUD）
- 数据分析仪表盘
- 离线模式支持
- 多平台内容发布

## 构建要求
- Xcode 15.0+
- iOS 17.0+ SDK
- Swift 5.9+

## 配置
1. 在 Xcode 中打开 `PrismEra.xcodeproj`
2. 选择目标设备运行
3. 确保 API 服务器地址配置正确 (Debug: localhost:3000)

## App Store 发布准备
- 配置 Bundle Identifier: `com.prismera.app`
- 配置签名证书
- 配置 App Store Connect
- 准备截图和预览视频
