import SwiftUI

struct ContentDetailView: View {
    let content: Content
    @State private var isEditing = false

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(content.status.rawValue)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(statusBackgroundColor)
                            .foregroundStyle(.white)
                            .clipShape(Capsule())

                        Spacer()

                        Text(content.platform.rawValue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    Text(content.title)
                        .font(.title)
                        .fontWeight(.bold)
                }

                Divider()

                // Content body
                Text(content.body)
                    .font(.body)

                // Tags
                if !content.tags.isEmpty {
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(content.tags, id: \.self) { tag in
                                Text("#\(tag)")
                                    .font(.subheadline)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundStyle(.blue)
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                // Metrics
                if let metrics = content.metrics {
                    VStack(alignment: .leading, spacing: 12) {
                        Text("数据统计")
                            .font(.headline)

                        HStack(spacing: 24) {
                            MetricItem(icon: "eye", value: "\(metrics.views)", label: "浏览")
                            MetricItem(icon: "heart", value: "\(metrics.likes)", label: "点赞")
                            MetricItem(icon: "bubble.right", value: "\(metrics.comments)", label: "评论")
                            MetricItem(icon: "square.and.arrow.up", value: "\(metrics.shares)", label: "分享")
                        }
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }

                // Timestamps
                VStack(alignment: .leading, spacing: 8) {
                    Text("时间信息")
                        .font(.headline)

                    LabeledContent("创建时间", value: content.createdAt.formatted(date: .long, time: .shortened))
                    LabeledContent("更新时间", value: content.updatedAt.formatted(date: .long, time: .shortened))

                    if let publishedAt = content.publishedAt {
                        LabeledContent("发布时间", value: publishedAt.formatted(date: .long, time: .shortened))
                    }
                }
                .font(.subheadline)
                .foregroundStyle(.secondary)
            }
            .padding()
        }
        .navigationTitle("内容详情")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Menu {
                    Button {
                        isEditing = true
                    } label: {
                        Label("编辑", systemImage: "pencil")
                    }

                    Button {
                        // TODO: Publish
                    } label: {
                        Label("发布", systemImage: "paperplane")
                    }

                    Button {
                        // TODO: Schedule
                    } label: {
                        Label("定时发布", systemImage: "clock")
                    }

                    Divider()

                    Button(role: .destructive) {
                        // TODO: Delete
                    } label: {
                        Label("删除", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .sheet(isPresented: $isEditing) {
            // TODO: Edit view
            Text("编辑内容")
        }
    }

    private var statusBackgroundColor: Color {
        switch content.status {
        case .draft: return .orange
        case .scheduled: return .blue
        case .published: return .green
        case .archived: return .gray
        }
    }
}

struct MetricItem: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(.blue)

            Text(value)
                .font(.headline)

            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    NavigationStack {
        ContentDetailView(content: Content.sampleData()[0])
    }
}
