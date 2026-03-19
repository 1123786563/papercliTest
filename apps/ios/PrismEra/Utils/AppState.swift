import Foundation
import Network

/// Global app state management
@MainActor
class AppState: ObservableObject {
    @Published var isConnected: Bool = true
    @Published var isOfflineMode: Bool = false
    @Published var hasPendingSync: Bool = false

    private let monitor = NWPathMonitor()
    private let queue = DispatchQueue(label: "NetworkMonitor")

    init() {
        setupNetworkMonitoring()
    }

    private func setupNetworkMonitoring() {
        monitor.pathUpdateHandler = { [weak self] path in
            Task { @MainActor in
                let isConnected = path.status == .satisfied
                self?.isConnected = isConnected

                if isConnected && self?.isOfflineMode == true {
                    // Connection restored, trigger sync
                    self?.syncPendingData()
                }
            }
        }

        monitor.start(queue: queue)
    }

    func enableOfflineMode() {
        isOfflineMode = true
    }

    func disableOfflineMode() {
        isOfflineMode = false
        syncPendingData()
    }

    private func syncPendingData() {
        guard hasPendingSync else { return }

        Task {
            // Sync any pending changes to server
            do {
                // TODO: Implement sync logic
                try await Task.sleep(nanoseconds: 1_000_000_000)
                hasPendingSync = false
            } catch {
                print("Sync failed: \(error)")
            }
        }
    }

    deinit {
        monitor.cancel()
    }
}
