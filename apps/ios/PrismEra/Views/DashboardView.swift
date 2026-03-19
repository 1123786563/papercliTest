import SwiftUI

struct DashboardView: View {
    @StateObject private var viewModel = DashboardViewModel()

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Quick Stats
                    HStack(spacing: 12) {
                        StatCard(
                            title: "内容数",
                            value: "\(viewModel.contentCount)",
                            icon: "doc.text.fill",
                            color: .blue
                        )

                        StatCard(
                            title: "发布中",
                            value: "\(viewModel.publishedCount)",
                            icon: "paperplane.fill",
                            color: .green
                        )

                        StatCard(
                            title: "草稿",
                            value: "\(viewModel.draftCount)",
                            icon: "pencil",
                            color: .orange
                        )
                    }
                    .padding(.horizontal)

                    // Recent Content
                    VStack(alignment: .leading, spacing: 12) {
                        Text("最近内容")
                            .font(.headline)
                            .padding(.horizontal)

                        ForEach(viewModel.recentContent) { content in
                            ContentRowView(content: content)
                        }
                    }

                    // Quick Actions
                    VStack(alignment: .leading, spacing: 12) {
                        Text("快捷操作")
                            .font(.headline)
                            .padding(.horizontal)

                        LazyVGrid(columns: [
                            GridItem(.flexible()),
                            GridItem(.flexible())
                        ], spacing: 12) {
                            QuickActionButton(
                                title: "新建内容",
                                icon: "plus.circle.fill",
                                color: .blue
                            ) {
                                // TODO: Navigate to content creation
                            }

                            QuickActionButton(
                                title: "定时发布",
                                icon: "clock.fill",
                                color: .purple
                            ) {
                                // TODO: Navigate to scheduler
                            }

                            QuickActionButton(
                                title: "数据分析",
                                icon: "chart.line.uptrend.xyaxis",
                                color: .green
                            ) {
                                // TODO: Navigate to analytics
                            }

                            QuickActionButton(
                                title: "AI 助手",
                                icon: "brain.head.profile",
                                color: .pink
                            ) {
                                // TODO: Navigate to AI assistant
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("首页")
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadData()
            }
        }
    }
}

// MARK: - Stat Card
struct StatCard: View {
    let title: String
    let value: String
    let icon: String
    let color: Color

    var body: some View {
        VStack(spacing: 8) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(color)

            Text(value)
                .font(.title)
                .fontWeight(.bold)

            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
    }
}

// MARK: - Quick Action Button
struct QuickActionButton: View {
    let title: String
    let icon: String
    let color: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 8) {
                Image(systemName: icon)
                    .font(.title2)
                    .foregroundStyle(color)

                Text(title)
                    .font(.subheadline)
                    .foregroundStyle(.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 5, x: 0, y: 2)
        }
    }
}

#Preview {
    DashboardView()
}
