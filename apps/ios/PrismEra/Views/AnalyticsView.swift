import SwiftUI
import Charts

struct AnalyticsView: View {
    @StateObject private var viewModel = AnalyticsViewModel()
    @State private var selectedTimeRange: TimeRange = .week

    enum TimeRange: String, CaseIterable {
        case day = "今日"
        case week = "本周"
        case month = "本月"
        case year = "今年"
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(spacing: 20) {
                    // Time Range Picker
                    Picker("时间范围", selection: $selectedTimeRange) {
                        ForEach(TimeRange.allCases, id: \.self) { range in
                            Text(range.rawValue).tag(range)
                        }
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Overview Stats
                    OverviewStatsCard(stats: viewModel.overviewStats)

                    // Content Performance Chart
                    VStack(alignment: .leading) {
                        Text("内容表现")
                            .font(.headline)

                        Chart(viewModel.contentPerformance) { item in
                            BarMark(
                                x: .value("日期", item.date, unit: .day),
                                y: .value("浏览", item.views)
                            )
                            .foregroundStyle(.blue.gradient)
                        }
                        .frame(height: 200)
                        .chartYAxis {
                            AxisMarks(position: .leading)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)

                    // Platform Distribution
                    VStack(alignment: .leading) {
                        Text("平台分布")
                            .font(.headline)

                        Chart(viewModel.platformDistribution) { item in
                            SectorMark(
                                angle: .value("占比", item.percentage),
                                innerRadius: .ratio(0.5),
                                angularInset: 1.5
                            )
                            .cornerRadius(4)
                            .foregroundStyle(by: .value("平台", item.platform))
                        }
                        .frame(height: 200)
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)

                    // Top Performing Content
                    VStack(alignment: .leading, spacing: 12) {
                        Text("热门内容")
                            .font(.headline)

                        ForEach(viewModel.topContent) { content in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(content.title)
                                        .font(.subheadline)
                                        .lineLimit(1)

                                    Text("\(content.views) 次浏览")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }

                                Spacer()

                                Text("+\(content.growth)%")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(.green)
                            }
                            .padding(.vertical, 4)
                        }
                    }
                    .padding()
                    .background(Color(.systemBackground))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .padding(.horizontal)
                }
                .padding(.vertical)
            }
            .navigationTitle("数据分析")
            .task {
                await viewModel.loadAnalytics(timeRange: selectedTimeRange)
            }
            .onChange(of: selectedTimeRange) { _, newValue in
                Task {
                    await viewModel.loadAnalytics(timeRange: newValue)
                }
            }
        }
    }
}

// MARK: - Overview Stats Card
struct OverviewStatsCard: View {
    let stats: OverviewStats

    var body: some View {
        HStack(spacing: 16) {
            StatItem(title: "总浏览", value: "\(stats.totalViews)", trend: stats.viewsTrend)
            Divider()
            StatItem(title: "互动数", value: "\(stats.engagement)", trend: stats.engagementTrend)
            Divider()
            StatItem(title: "分享数", value: "\(stats.shares)", trend: stats.sharesTrend)
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .padding(.horizontal)
    }
}

struct StatItem: View {
    let title: String
    let value: String
    let trend: Double

    var body: some View {
        VStack(spacing: 4) {
            Text(title)
                .font(.caption)
                .foregroundStyle(.secondary)

            Text(value)
                .font(.title2)
                .fontWeight(.bold)

            HStack(spacing: 2) {
                Image(systemName: trend >= 0 ? "arrow.up.right" : "arrow.down.right")
                Text("\(abs(trend), specifier: "%.1f")%")
            }
            .font(.caption)
            .foregroundStyle(trend >= 0 ? .green : .red)
        }
        .frame(maxWidth: .infinity)
    }
}

#Preview {
    AnalyticsView()
}
