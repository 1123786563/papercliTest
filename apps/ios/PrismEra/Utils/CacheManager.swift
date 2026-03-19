import Foundation

/// Manages local caching for offline support
class CacheManager {
    static let shared = CacheManager()

    private let userDefaults: UserDefaults
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()

    private init() {
        userDefaults = .standard
        encoder.dateEncodingStrategy = .iso8601
        decoder.dateDecodingStrategy = .iso8601
    }

    // MARK: - Generic Cache Operations

    func set<T: Codable>(_ value: T, forKey key: String, expiration: TimeInterval = 86400) {
        let wrapper = CacheWrapper(
            value: value,
            cachedAt: Date(),
            expiresAt: Date().addingTimeInterval(expiration)
        )

        guard let data = try? encoder.encode(wrapper) else { return }
        userDefaults.set(data, forKey: key)
    }

    func get<T: Codable>(forKey key: String) -> T? {
        guard let data = userDefaults.data(forKey: key),
              let wrapper = try? decoder.decode(CacheWrapper<T>.self, from: data) else {
            return nil
        }

        // Check expiration
        if wrapper.isExpired {
            remove(forKey: key)
            return nil
        }

        return wrapper.value
    }

    func remove(forKey key: String) {
        userDefaults.removeObject(forKey: key)
    }

    func clearAll() {
        // Only clear app-specific cache keys
        let cachePrefixes = ["content_", "user_", "analytics_", "recent_", "all_"]
        let allKeys = userDefaults.dictionaryRepresentation().keys

        for key in allKeys {
            for prefix in cachePrefixes {
                if key.hasPrefix(prefix) {
                    userDefaults.removeObject(forKey: key)
                    break
                }
            }
        }
    }

    func clearExpired() {
        let allKeys = userDefaults.dictionaryRepresentation().keys

        for key in allKeys {
            guard let data = userDefaults.data(forKey: key),
                  let wrapper = try? decoder.decode(CacheWrapper<Data>.self, from: data) else {
                continue
            }

            if wrapper.isExpired {
                userDefaults.removeObject(forKey: key)
            }
        }
    }

    // MARK: - Cache Statistics

    var cacheSize: Int {
        let allKeys = userDefaults.dictionaryRepresentation().keys
        var totalSize = 0

        for key in allKeys {
            if let data = userDefaults.data(forKey: key) {
                totalSize += data.count
            }
        }

        return totalSize
    }

    var formattedCacheSize: String {
        let bytes = Double(cacheSize)
        if bytes < 1024 {
            return "\(Int(bytes)) B"
        } else if bytes < 1024 * 1024 {
            return String(format: "%.1f KB", bytes / 1024)
        } else {
            return String(format: "%.1f MB", bytes / (1024 * 1024))
        }
    }
}

// MARK: - Cache Wrapper

struct CacheWrapper<T: Codable>: Codable {
    let value: T
    let cachedAt: Date
    let expiresAt: Date

    var isExpired: Bool {
        Date() >= expiresAt
    }
}
