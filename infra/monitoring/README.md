# 监控告警系统配置指南

## 概述

本文档描述了棱镜纪元项目的监控和告警配置。

## 监控组件

### 1. Sentry - 错误追踪

**用途**: 实时错误追踪和性能监控

**配置文件**:

- `infra/monitoring/sentry.client.config.ts` - 前端配置
- `infra/monitoring/sentry.server.config.ts` - 服务端配置
- `infra/monitoring/sentry.edge.config.ts` - Edge 运行时配置
- `infra/monitoring/sentry-api.ts` - Hono API 集成

**环境变量**:

```bash
SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/xxx
NEXT_PUBLIC_APP_VERSION=1.0.0
```

**安装依赖**:

```bash
pnpm add @sentry/nextjs @sentry/node @sentry/profiling-node
```

### 2. Vercel Analytics - 性能分析

**用途**: Web 性能监控和用户分析

**配置文件**:

- `infra/monitoring/analytics.ts` - 分析工具配置

**安装依赖**:

```bash
pnpm add @vercel/analytics
```

**使用方式**:

```tsx
// 在 layout.tsx 中
import { Analytics } from "@vercel/analytics/react";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### 3. 健康检查端点

**用途**: 服务健康状态检测

**配置文件**:

- `infra/monitoring/health-web.ts` - Next.js 健康检查
- `infra/monitoring/health-api.ts` - Hono API 健康检查

**端点**:

- `/api/health` - 完整健康检查
- `/api/health/live` - 存活探针
- `/api/health/ready` - 就绪探针

### 4. Prometheus + Grafana - 指标监控

**用途**: 系统指标收集和可视化

**配置文件**:

- `infra/monitoring/prometheus-alerts.yml` - 告警规则
- `infra/monitoring/alertmanager.yml` - 告警通知
- `infra/monitoring/grafana-dashboard.json` - 监控仪表盘

## 告警规则

### 严重告警 (Critical)

- 错误率 > 5%
- Pod 状态异常
- 数据库复制延迟 > 10秒

### 警告告警 (Warning)

- P95 延迟 > 2秒
- CPU 使用率 > 80%
- 内存使用率 > 85%
- Pod 频繁重启

### 信息告警 (Info)

- 活跃用户数量低
- 错误数量异常增加

## 通知渠道

### Slack 集成

设置环境变量:

```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx
```

通知频道:

- `#prism-era-critical` - 严重告警
- `#prism-era-alerts` - 警告告警
- `#prism-era-info` - 信息告警

## 部署步骤

### 1. 配置 Sentry

1. 创建 Sentry 项目
2. 获取 DSN
3. 设置环境变量
4. 复制配置文件到应用目录

### 2. 配置 Vercel Analytics

1. 在 Vercel 项目设置中启用 Analytics
2. 安装依赖并添加到 layout

### 3. 部署 Prometheus/Grafana

```bash
# 使用 Helm 部署
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm install prometheus prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace

# 导入 Grafana 仪表盘
# 使用 grafana-dashboard.json 文件
```

### 4. 配置 AlertManager

```bash
# 创建 Secret
kubectl create secret generic alertmanager-slack \
  --from-literal=SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx \
  -n monitoring

# 应用配置
kubectl apply -f infra/monitoring/alertmanager.yml
kubectl apply -f infra/monitoring/prometheus-alerts.yml
```

## 监控仪表盘

访问 Grafana 仪表盘查看:

- 请求速率和错误率
- 响应时间分布
- CPU/内存使用情况
- Pod 状态和重启次数

## 成本估算

| 服务               | 免费层            | 付费层 |
| ------------------ | ----------------- | ------ |
| Sentry             | 5K events/月      | $26/月 |
| Vercel Analytics   | 包含在 Vercel Pro | -      |
| Prometheus/Grafana | 自托管            | -      |

## 相关链接

- [Sentry Dashboard](https://sentry.io)
- [Vercel Analytics](https://vercel.com/analytics)
- [Prometheus 文档](https://prometheus.io/docs)
- [Grafana 文档](https://grafana.com/docs)
