import SwiftUI

@main
struct PrismEraApp: App {
    @StateObject private var appState = AppState()
    @StateObject private var authManager = AuthManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .environmentObject(authManager)
                .onAppear {
                    setupApp()
                }
        }
    }

    private func setupApp() {
        // Initialize app configuration
        #if DEBUG
        print("Prism Era iOS App - Debug Mode")
        #endif
    }
}
