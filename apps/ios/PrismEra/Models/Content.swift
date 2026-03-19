import Foundation

struct Content: Identifiable, Codable, Hashable {
    let id: UUID
    var title: String
    var body: String
    var status: ContentStatus
    var platform: Platform
    var createdAt: Date
    var updatedAt: Date
    var publishedAt: Date?
    var tags: [String]
    var metrics: ContentMetrics?

    init(
        id: UUID = UUID(),
        title: String,
        body: String,
        status: ContentStatus = .draft,
        platform: Platform = .all,
        tags: [String] = []
    ) {
        self.id = id
        self.title = title
        self.body = body
        self.status = status
        self.platform = platform
        self.createdAt = Date()
        self.updatedAt = Date()
        self.publishedAt = nil
        self.tags = tags
        self.metrics = nil
    }
}

enum ContentStatus: String, Codable, CaseIterable {
    case draft = "草稿"
    case scheduled = "定时"
    case published = "已发布"
    case archived = "已归档"

    var icon: String {
        switch self {
        case .draft: return "pencil"
        case .scheduled: return "clock"
        case .published: return "checkmark.circle"
        case .archived: return "archivebox"
        }
    }
}

enum Platform: String, Codable, CaseIterable {
    case all = "全平台"
    case wechat = "微信公众号"
    case weibo = "微博"
    case xiaohongshu = "小红书"
    case douyin = "抖音"
    case zhihu = "知乎"

    var icon: String {
        switch self {
        case .all: return "globe"
        case .wechat: return "message.fill"
        case .weibo: return "dot.radiowaves.left.and.right"
        case .xiaohongshu: return "book.fill"
        case .douyin: return "play.fill"
        case .zhihu: return "questionmark.circle.fill"
        }
    }
}

struct ContentMetrics: Codable, Hashable {
    var views: Int
    var likes: Int
    var comments: Int
    var shares: Int

    static func mock() -> ContentMetrics {
        ContentMetrics(
            views: Int.random(in: 100...10000),
            likes: Int.random(in: 10...1000),
            comments: Int.random(in: 0...100),
            shares: Int.random(in: 0...50)
        )
    }
}

// MARK: - Sample Data
extension Content {
    static func sampleData() -> [Content] {
        [
            Content(
                title: "如何利用 AI 提升内容创作效率",
                body: "在当今数字时代，AI 工具正在革新内容创作的方式...",
                status: .published,
                platform: .wechat,
                tags: ["AI", "效率", "内容创作"]
            ),
            Content(
                title: "2026 年社交媒体营销趋势",
                body: "了解最新的社交媒体营销趋势...",
                status: .scheduled,
                platform: .xiaohongshu,
                tags: ["营销", "趋势"]
            ),
            Content(
                title: "新手指南：从零开始做内容营销",
                body: "内容营销是现代企业不可或缺的一部分...",
                status: .draft,
                platform: .zhihu,
                tags: ["指南", "入门"]
            )
        ]
    }
}
