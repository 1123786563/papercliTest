import SwiftUI

struct ProfileView: View {
    @EnvironmentObject var authManager: AuthManager
    @StateObject private var viewModel = ProfileViewModel()

    var body: some View {
        NavigationStack {
            List {
                // Profile Header
                Section {
                    HStack(spacing: 16) {
                        Circle()
                            .fill(LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .frame(width: 60, height: 60)
                            .overlay {
                                Text(viewModel.userInitials)
                                    .font(.title2)
                                    .fontWeight(.bold)
                                    .foregroundStyle(.white)
                            }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(viewModel.userName)
                                .font(.headline)

                            Text(viewModel.userEmail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 8)
                }

                // Account Settings
                Section("账号设置") {
                    NavigationLink {
                        AccountSettingsView()
                    } label: {
                        Label("账号信息", systemImage: "person.circle")
                    }

                    NavigationLink {
                        NotificationSettingsView()
                    } label: {
                        Label("通知设置", systemImage: "bell")
                    }

                    NavigationLink {
                        PrivacySettingsView()
                    } label: {
                        Label("隐私与安全", systemImage: "lock.shield")
                    }
                }

                // App Settings
                Section("应用设置") {
                    NavigationLink {
                        AppearanceSettingsView()
                    } label: {
                        Label("外观", systemImage: "paintbrush")
                    }

                    NavigationLink {
                        CacheSettingsView()
                    } label: {
                        Label("缓存管理", systemImage: "externaldrive")
                    }

                    Toggle("离线模式", isOn: $viewModel.offlineMode)
                }

                // Support
                Section("支持") {
                    Link(destination: URL(string: "https://prismera.com/help")!) {
                        Label("帮助中心", systemImage: "questionmark.circle")
                    }

                    Link(destination: URL(string: "https://prismera.com/feedback")!) {
                        Label("意见反馈", systemImage: "envelope")
                    }

                    NavigationLink {
                        AboutView()
                    } label: {
                        Label("关于棱镜纪元", systemImage: "info.circle")
                    }
                }

                // Logout
                Section {
                    Button(role: .destructive) {
                        Task {
                            await authManager.logout()
                        }
                    } label: {
                        HStack {
                            Spacer()
                            Text("退出登录")
                            Spacer()
                        }
                    }
                }

                // Version Info
                Section {
                    HStack {
                        Spacer()
                        VStack(spacing: 4) {
                            Text("棱镜纪元 v1.0.0")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                            Text("Build 1")
                                .font(.caption2)
                                .foregroundStyle(.tertiary)
                        }
                        Spacer()
                    }
                }
            }
            .navigationTitle("我的")
        }
    }
}

#Preview {
    ProfileView()
        .environmentObject(AuthManager())
}
