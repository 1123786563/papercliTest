# ADR-001: 数据库架构设计

## 状态

已批准 (2026-03-19)

## 背景

棱镜纪元是一个内容营销自动化产品，需要一个可扩展的数据库架构来支持：

- 多租户（多组织）使用场景
- 内容创作和管理
- 营销活动自动化
- 受众细分和定向
- 分析和追踪

## 决策

采用 PostgreSQL + Drizzle ORM 的关系型数据库架构，包含以下核心表：

### 用户与组织模块

| 表名 | 描述 | 索引 |
|------|------|------|
| `users` | 用户账户，与 Clerk 认证集成 | clerk_id (unique), email (unique) |
| `organizations` | 多租户组织/团队 | slug (unique) |
| `organization_members` | 用户-组织成员关系 | org_id + user_id (unique) |

### 内容管理模块

| 表名 | 描述 | 索引 |
|------|------|------|
| `content` | 营销内容（文章、帖子、邮件等） | org_id + status, author_id, published_at |

内容类型支持：
- `article` - 长篇文章
- `social_post` - 社交媒体帖子
- `email` - 邮件内容
- `landing_page` - 落地页
- `ad_copy` - 广告文案
- `video_script` - 视频脚本

### 营销自动化模块

| 表名 | 描述 | 索引 |
|------|------|------|
| `campaigns` | 营销活动 | org_id + status, scheduled_start |
| `campaign_steps` | 活动工作流步骤 | - |
| `campaign_content` | 活动-内容关联 | campaign_id + content_id (unique) |

活动类型支持：
- `drip` - 滴灌式自动序列
- `broadcast` - 一次性广播
- `nurture` - 线索培育序列
- `onboarding` - 用户引导流程
- `re_engagement` - 用户召回
- `promotional` - 促销活动
- `newsletter` - 定期通讯

### 受众管理模块

| 表名 | 描述 | 索引 |
|------|------|------|
| `audiences` | 目标受众细分 | org_id |
| `campaign_audiences` | 活动-受众关联 | campaign_id + audience_id (unique) |

支持动态分段规则，使用 JSON 格式的条件表达式。

### 分析模块

| 表名 | 描述 | 索引 |
|------|------|------|
| `analytics_events` | 所有追踪事件 | org_id + occurred_at, event_type, content_id, campaign_id |

事件类型包括：
- 内容事件：viewed, shared, liked
- 活动事件：sent, delivered, opened, clicked, bounced, unsubscribed
- 转化事件：lead_captured, form_submitted, purchase_completed
- 参与事件：session_started, session_ended, page_viewed

## 技术选择理由

1. **PostgreSQL**: 成熟、稳定、支持 JSONB 灵活存储
2. **Drizzle ORM**: 类型安全、轻量、SQL-like 语法
3. **UUID 主键**: 便于分布式系统和迁移
4. **JSONB 元数据**: 灵活存储不固定结构的配置和条件

## 扩展性考虑

- 使用 `organization_id` 支持多租户数据隔离
- JSONB 字段允许灵活扩展而不频繁修改 schema
- 分析事件表使用索引优化时间序列查询
- 预留了缓存和分片的可能性

## 后续工作

- [ ] 配置 Supabase/Neon 数据库实例
- [ ] 生成初始迁移文件
- [ ] 设置数据库备份策略
- [ ] 实现连接池配置

## 相关文件

- `/packages/db/schema/` - Schema 定义文件
- `/packages/db/drizzle.config.ts` - Drizzle 配置
- `/docs/tech-stack.md` - 技术栈说明
