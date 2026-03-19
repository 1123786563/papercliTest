import SwiftUI

struct ContentRowView: View {
    let content: Content

    var body: some View {
        HStack(spacing: 12) {
            // Status indicator
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)

            VStack(alignment: .leading, spacing: 4) {
                Text(content.title)
                    .font(.headline)
                    .lineLimit(1)

                HStack(spacing: 8) {
                    Label(content.status.rawValue, systemImage: content.status.icon)
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Text("•")
                        .foregroundStyle(.tertiary)

                    Text(content.platform.rawValue)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let metrics = content.metrics {
                    HStack(spacing: 12) {
                        Label("\(metrics.views)", systemImage: "eye")
                        Label("\(metrics.likes)", systemImage: "heart")
                        Label("\(metrics.comments)", systemImage: "bubble.right")
                    }
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.tertiary)
        }
        .padding(.vertical, 4)
    }

    private var statusColor: Color {
        switch content.status {
        case .draft: return .orange
        case .scheduled: return .blue
        case .published: return .green
        case .archived: return .gray
        }
    }
}

#Preview {
    ContentRowView(content: Content.sampleData()[0])
        .padding()
}
