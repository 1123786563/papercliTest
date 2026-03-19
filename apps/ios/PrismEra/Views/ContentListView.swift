import SwiftUI

struct ContentListView: View {
    @StateObject private var viewModel = ContentListViewModel()
    @State private var showingCreateContent = false

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.content.isEmpty {
                    ProgressView("加载中...")
                } else if viewModel.content.isEmpty {
                    ContentEmptyState {
                        showingCreateContent = true
                    }
                } else {
                    contentView
                }
            }
            .navigationTitle("内容管理")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingCreateContent = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $showingCreateContent) {
                // TODO: Create content view
                Text("创建内容")
            }
            .task {
                await viewModel.loadContent()
            }
            .refreshable {
                await viewModel.loadContent()
            }
        }
    }

    private var contentView: some View {
        List {
            ForEach(viewModel.filteredContent) { content in
                NavigationLink(value: content) {
                    ContentRowView(content: content)
                }
            }
            .onDelete { indexSet in
                viewModel.deleteContent(at: indexSet)
            }
        }
        .navigationDestination(for: Content.self) { content in
            ContentDetailView(content: content)
        }
        .searchable(text: $viewModel.searchText, prompt: "搜索内容")
    }
}

// MARK: - Empty State
struct ContentEmptyState: View {
    let onCreateTapped: () -> Void

    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 60))
                .foregroundStyle(.secondary)

            Text("暂无内容")
                .font(.headline)

            Text("点击下方按钮创建您的第一篇内容")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Button("创建内容", action: onCreateTapped)
                .buttonStyle(.borderedProminent)
        }
        .padding()
    }
}

#Preview {
    ContentListView()
}
