# 棱镜纪元 Android 应用

> 内容营销自动化平台 Android 客户端应用

## 项目结构

```
PrismEra/
├── app/
│   ├── src/
│   │   └── main/java/com/prismera/app/
│   │       ├── PrismEraApp.kt          # Application class
│   │       ├── MainActivity.kt       # 主 Activity
│   │       ├── ui/
│   │       │   ├── theme/
│   │       │   │   │   navigation/
│   │       │   │   │   screens/
│   │       │   └── components/
│   │       ├── data/
│   │       │   ├── model/
│   │       │   ├── repository/
│   │       │   └── local/
│   │       ├── network/
│   │       │   ├── ApiClient.kt
│   │       │   ├── AuthService.kt
│   │       │   ├── ContentService.kt
│   │       │   └── UserService.kt
│   │       └── utils/
│   │           ├── AppState.kt
│   │           ├── CacheManager.kt
│   │           └── PreferenceManager.kt
│   └── res/
│       └── values/
├── gradle/
└── build.gradle.kts
```

## 技术栈

- **UI 框**: Jetpack Compose (Material Design 3)
- **网络**: OkHttp + Retrofit + Kotlin Coroutines
- **架构**: MVVM
- **最低版本**: Android 8.0+ (API 26)

## 主要功能
- 用户认证（登录/注册)
- 内容管理 (搜索/筛选)
- 数据分析仪表盘
- 离线模式支持
- 多平台内容发布

## 构建要求
- Android Studio Hedgehog (最新版)
- Gradle 8.0+
- JDK 17

## 配置
1. 在 Android Studio 中打开 `PrismEra` 项目
2. 同步 `local.properties` 文件中的 API 地址配置 (Debug: localhost:3000, Release: https://api.prismera.com/api)
3. 运行应用
