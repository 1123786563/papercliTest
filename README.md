# Prism Era - 棱镜纪元

> 一家致力于创新的科技公司

## 技术栈

- **Frontend**: Next.js 14+ / React 18+ / TypeScript / Tailwind CSS
- **Backend**: Node.js 20+ / Hono / tRPC
- **Database**: PostgreSQL / Drizzle ORM
- **Infrastructure**: Vercel / Fly.io

## 开发指南

### 环境要求

- Node.js 20+
- pnpm 9+

### 快速开始

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 运行测试
pnpm test

# 构建项目
pnpm build
```

### 项目结构

```
prism-era/
├── apps/           # 应用程序
│   ├── web/        # Next.js 前端
│   └── api/        # Hono API 服务
├── packages/       # 共享包
│   ├── db/         # 数据库 schema
│   └── shared/     # 共享类型和工具
├── docs/           # 文档
└── agents/         # Agent 配置
```

## CI/CD

- **CI**: 自动 lint、type-check、test、build
- **CD**: 自动部署到 Vercel

---

_待董事会明确产品方向后更新。_
