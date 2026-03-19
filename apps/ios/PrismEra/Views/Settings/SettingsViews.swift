import SwiftUI

// MARK: - Account Settings
struct AccountSettingsView: View {
    @State private var name = ""
    @State private var email = ""

    var body: some View {
        Form {
            Section("个人信息") {
                TextField("姓名", text: $name)
                TextField("邮箱", text: $email)
                    .textInputAutocapitalization(.never)
                    .keyboardType(.emailAddress)
            }

            Section {
                Button("保存更改") {
                    // TODO: Save
                }
            }
        }
        .navigationTitle("账号信息")
    }
}

// MARK: - Notification Settings
struct NotificationSettingsView: View {
    @State private var pushEnabled = true
    @State private var emailEnabled = true
    @State private var contentPublished = true
    @State private var newComments = true
    @State private var weeklyReport = true

    var body: some View {
        Form {
            Section("通知方式") {
                Toggle("推送通知", isOn: $pushEnabled)
                Toggle("邮件通知", isOn: $emailEnabled)
            }

            Section("通知内容") {
                Toggle("内容发布通知", isOn: $contentPublished)
                Toggle("新评论通知", isOn: $newComments)
                Toggle("每周数据报告", isOn: $weeklyReport)
            }
        }
        .navigationTitle("通知设置")
    }
}

// MARK: - Privacy Settings
struct PrivacySettingsView: View {
    @State private var twoFactorEnabled = false
    @State private var biometricEnabled = true

    var body: some View {
        Form {
            Section("安全") {
                Toggle("双因素认证", isOn: $twoFactorEnabled)
                Toggle("Face ID / Touch ID", isOn: $biometricEnabled)
            }

            Section {
                Button("修改密码") {
                    // TODO: Change password
                }

                Button("查看登录历史") {
                    // TODO: Login history
                }
            }

            Section {
                Button("下载我的数据") {
                    // TODO: Download data
                }

                Button("删除账号", role: .destructive) {
                    // TODO: Delete account
                }
            }
        }
        .navigationTitle("隐私与安全")
    }
}

// MARK: - Appearance Settings
struct AppearanceSettingsView: View {
    @AppStorage("colorScheme") private var colorScheme: ColorScheme = .system
    @State private var selectedScheme = 0

    var body: some View {
        Form {
            Section("外观") {
                Picker("主题", selection: $selectedScheme) {
                    Text("跟随系统").tag(0)
                    Text("浅色模式").tag(1)
                    Text("深色模式").tag(2)
                }
                .pickerStyle(.segmented)
            }

            Section("显示") {
                // Add more appearance settings
            }
        }
        .navigationTitle("外观")
    }
}

// MARK: - Cache Settings
struct CacheSettingsView: View {
    @State private var cacheSize = CacheManager.shared.formattedCacheSize

    var body: some View {
        Form {
            Section("缓存管理") {
                LabeledContent("缓存大小", value: cacheSize)

                Button("清除缓存") {
                    CacheManager.shared.clearAll()
                    cacheSize = "0 B"
                }
            }

            Section {
                Text("清除缓存不会影响您的账号数据，但可能会暂时降低离线访问体验。")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .navigationTitle("缓存管理")
    }
}

// MARK: - About View
struct AboutView: View {
    var body: some View {
        List {
            Section {
                VStack(spacing: 12) {
                    Image(systemName: "prism")
                        .font(.system(size: 60))
                        .foregroundStyle(.blue)

                    Text("棱镜纪元")
                        .font(.title)
                        .fontWeight(.bold)

                    Text("内容营销自动化平台")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
            }

            Section("版本信息") {
                LabeledContent("版本", value: "1.0.0")
                LabeledContent("Build", value: "1")
            }

            Section("法律") {
                Link("用户协议", destination: URL(string: "https://prismera.com/terms")!)
                Link("隐私政策", destination: URL(string: "https://prismera.com/privacy")!)
            }

            Section {
                Link("官方网站", destination: URL(string: "https://prismera.com")!)
            }
        }
        .navigationTitle("关于")
    }
}

#Preview {
    NavigationStack {
        AboutView()
    }
}
