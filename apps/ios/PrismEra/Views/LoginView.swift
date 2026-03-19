import SwiftUI

struct LoginView: View {
    @EnvironmentObject var authManager: AuthManager
    @State private var email = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Logo
                VStack(spacing: 8) {
                    Image(systemName: "prism")
                        .font(.system(size: 64))
                        .foregroundStyle(.blue)

                    Text("棱镜纪元")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("内容营销自动化平台")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.bottom, 32)

                // Login Form
                VStack(spacing: 16) {
                    TextField("邮箱", text: $email)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                        .keyboardType(.emailAddress)
                        .autocorrectionDisabled()

                    SecureField("密码", text: $password)
                        .textFieldStyle(.roundedBorder)

                    if let error = errorMessage {
                        Text(error)
                            .font(.caption)
                            .foregroundStyle(.red)
                    }

                    Button {
                        Task {
                            await login()
                        }
                    } label: {
                        if isLoading {
                            ProgressView()
                                .frame(maxWidth: .infinity)
                        } else {
                            Text("登录")
                                .frame(maxWidth: .infinity)
                        }
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(email.isEmpty || password.isEmpty || isLoading)
                }
                .padding(.horizontal)

                Spacer()

                // Sign up link
                VStack(spacing: 12) {
                    Button("忘记密码？") {
                        // TODO: Implement forgot password
                    }
                    .font(.footnote)

                    HStack {
                        Text("还没有账号？")
                            .foregroundStyle(.secondary)
                        Button("立即注册") {
                            // TODO: Navigate to sign up
                        }
                    }
                    .font(.footnote)
                }
            }
            .padding()
            .navigationBarHidden(true)
        }
    }

    private func login() async {
        isLoading = true
        errorMessage = nil

        do {
            try await authManager.login(email: email, password: password)
        } catch {
            errorMessage = error.localizedDescription
        }

        isLoading = false
    }
}

#Preview {
    LoginView()
        .environmentObject(AuthManager())
}
