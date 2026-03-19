# 棱镜纪元 技术栈提案

> **作者:** Founding Engineer
> **日期:** 2026-03-18
> **状态:** ✅ 已批准 (CEO)

## 设计原则

1. **快速迭代优先** - 选择成熟的工具链，减少配置时间
2. **适度扩展** - 能支持 0 到 100k 用户，不过度工程化
3. **人才友好** - 选择市场人才充足的技术
4. **成本可控** - 初期低运维成本，按需扩展

---

## 推荐技术栈

### Frontend: Next.js + React + TypeScript

| 选择 | 理由 |
|------|------|
| **Next.js 14+** | SSR/SSG/ISR 全支持，App Router 成熟，Vercel 一键部署 |
| **React 18+** | 生态最大，组件库丰富，长期支持 |
| **TypeScript** | 类型安全，减少运行时错误，IDE 支持好 |
| **Tailwind CSS** | 快速开发，无 CSS-in-JS 运行时开销 |
| **Zustand** | 轻量状态管理，比 Redux 简单 10x |

**备选:** 如果需要移动端优先，可考虑 React Native + Expo 共享代码。

### Backend: Node.js + Hono + TypeScript

| 选择 | 理由 |
|------|------|
| **Node.js 20+ LTS** | 前后端统一语言，减少上下文切换 |
| **Hono** | 超轻量 (~14KB)，Edge 友好，类型安全 |
| **tRPC** | 端到端类型安全 API，无 schema 定义重复 |
| **Zod** | 运行时类型校验，与 tRPC 完美配合 |

**备选:** 如果业务逻辑复杂/需要高性能计算，可考虑 Go 或 Rust 微服务。

### Database: PostgreSQL + Drizzle ORM

| 选择 | 理由 |
|------|------|
| **PostgreSQL** | 最成熟的开源关系型数据库，JSONB 支持灵活 |
| **Drizzle ORM** | 类型安全，轻量，SQL-like 语法，无 magic |
| **Redis** (可选) | 缓存、会话、队列 |

**托管推荐:**
- 初期: Supabase / Neon (免费层 generous)
- 扩展: AWS RDS / PlanetScale

### Infrastructure: Vercel + Fly.io / Cloudflare

| 场景 | 推荐 |
|------|------|
| **Frontend + API** | Vercel (Pro Plan: $20/月) |
| **需要更长运行时间** | Fly.io (按秒计费) |
| **全球边缘 + 便宜** | Cloudflare Workers/Pages |
| **容器化服务** | Fly.io 或 Railway |

**CI/CD:**
- GitHub Actions (免费，集成好)
- 初期不需要复杂流水线

### Auth: Clerk / Auth.js

| 选择 | 理由 |
|------|------|
| **Clerk** | 开箱即用，UI 美观，支持 MFA，免费层 generous |
| **Auth.js** | 自托管，灵活，如果需要完全控制 |

### Observability: Sentry + Vercel Analytics

- **Sentry** - 错误追踪 (免费层够用)
- **Vercel Analytics** - 性能 + 用户分析
- 后期可加 Grafana + Loki 做日志聚合

---

## 项目目录结构

```
prism-era/
├── apps/
│   ├── web/                    # Next.js 前端应用
│   │   ├── src/
│   │   │   ├── app/            # App Router 路由
│   │   │   ├── components/     # React 组件
│   │   │   ├── lib/            # 工具函数
│   │   │   └── styles/         # 全局样式
│   │   ├── public/
│   │   ├── next.config.ts
│   │   └── package.json
│   │
│   └── api/                    # Hono API 服务 (可选，如果需要独立后端)
│       ├── src/
│       │   ├── routes/
│       │   ├── services/
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── db/                     # Drizzle schema + migrations
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── index.ts
│   │
│   ├── shared/                 # 共享类型和工具
│   │   ├── types/
│   │   └── utils/
│   │
│   └── ui/                     # 共享 UI 组件库 (可选)
│       └── components/
│
├── docs/                       # 文档
│   ├── tech-stack.md
│   └── adr/                    # Architecture Decision Records
│
├── agents/                     # Agent 配置 (现有)
├── infra/                      # IaC 配置 (Terraform/Pulumi，后期)
├── scripts/                    # 工具脚本
│
├── turbo.json                  # Turborepo 配置
├── pnpm-workspace.yaml         # Monorepo 配置
├── package.json
└── README.md
```

**初期简化版** (MVP 阶段可选):

```
prism-era/
├── src/
│   ├── app/                    # Next.js App Router
│   ├── components/
│   ├── lib/
│   │   ├── db/                 # Drizzle
│   │   ├── api/                # tRPC routers
│   │   └── auth/               # Clerk/Auth.js
│   └── styles/
├── public/
├── docs/
├── agents/
├── next.config.ts
├── drizzle.config.ts
└── package.json
```

---

## 成本估算 (初期)

| 服务 | 月费 |
|------|------|
| Vercel Pro | $20 |
| Supabase Pro | $25 |
| Clerk Pro | $25 |
| Sentry Team | $26 |
| Domain | ~$12/年 |
| **总计** | **~$100/月** |

免费层可支撑到有明显用户量。

---

## 风险与权衡

| 风险 | 缓解措施 |
|------|----------|
| Next.js 变化快 | 锁定版本，App Router 现已稳定 |
| 单语言栈限制 | 后期可用 Go/Rust 微服务补充 |
| Vercel 锁定 | 代码标准，可迁移到 Fly.io |

---

## 下一步行动

1. [x] CEO 审核此提案
2. [ ] 初始化 monorepo 结构
3. [ ] 配置 CI/CD (GitHub Actions)
4. [ ] 搭建基础模板 (Next.js + Drizzle + Clerk)
5. [ ] 等待产品方向后开始 MVP 开发

---

*此文档将在产品方向明确后更新具体技术选型细节。*
