# sleep-checkin

用 GitHub Issues + GitHub Actions 记录睡觉/起床时间。

- 每个人在本仓库创建 **一个固定 Issue**（每人一个表格）
- 在自己的 Issue 下评论 `/sleep`、`/wake` 打卡
- Actions 会：
  1) 自动回一条“回执评论”
  2) 自动更新该 Issue 正文里的表格
- 仓库会自动生成汇总面板：[`docs/dashboard.md`](docs/dashboard.md)

## 快速开始（每个人都要做）
1. 在仓库 **Issues** 新建一个 Issue  
   标题建议：`Sleep Log - <your-username>`
2. 给该 Issue 添加标签：`sleep-log`
3. 在该 Issue 下评论命令：

### 主命令
- 睡觉：`/sleep`
- 起床：`/wake`

### 可选：同一天手滑/忘记（补录/修正）
仅允许最近 7 天，并且只能把时间改得更晚（不能改早），且会被标记为 backfill：

- `/sleep YYYY-MM-DD HH:MM backfill`
- `/wake  YYYY-MM-DD HH:MM backfill`

例子：
- `/sleep 2026-01-03 23:40 backfill`
- `/wake  2026-01-04 07:10 backfill`

## 规则说明（重要）
- **只响应带 `sleep-log` 标签的 Issue**
- **只允许 Issue 作者本人**在自己的 Issue 下使用 `/sleep` `/wake`
- **cutoff=04:00（UTC+8）**：凌晨 04:00 前的 `/sleep` 会归属到“昨晚”（表格 Date 列为前一天）
- `/wake` 会优先填入“最近一次 sleep 已记录但 wake 为空”的那一行（保证“一次睡眠一行”）
- **wake 记录为真实日期时间**（避免跨天时长计算出错）
- 同一天的 Sleep/Wake **各只允许记录一次**；如需修正请使用 backfill 命令

## Dashboard
Dashboard 会定时扫描所有带 `sleep-log` 标签的固定 Issue，生成：
- 今天（按 sleep dateKey）的所有人记录
- 最近 7 天平均睡眠时长

见：[`docs/dashboard.md`](docs/dashboard.md)
