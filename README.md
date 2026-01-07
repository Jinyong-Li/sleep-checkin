# sleep-checkin

用 GitHub Issues + GitHub Actions 记录睡觉/起床时间。

每个人用一个固定 Issue 作为“睡眠日志”，通过评论命令 `/sleep`、`/wake` 来打卡。机器人会把结果写回到 Issue 正文表格中（展示层），并在评论区写入可信事件日志（数据源，可防篡改/可追溯）。

---

## 工作方式（重要）
- 每个人使用 **一个固定 Issue** 作为自己的睡眠日志
- 在自己的 Issue 下评论命令：`/sleep`、`/wake`（以及 backfill、`/rebuild`、`/undo`）
- 机器人写入两类内容：
  - **事件日志（可信数据源）**：由 `github-actions[bot]` 在评论区追加（含隐藏 `SLEEP_LOG_EVENT`）
  - **表格（展示层）**：写在 Issue 正文里，可从事件日志重建

> [!IMPORTANT]
> **请先读这几条：**
> 1) **每个用户只允许 1 个 open 的 Sleep Log Issue**（避免记录分散）  
> 2) Issue 不小心关了没关系：**reopen 后继续用原来的 Issue**  
> 3) **不要手动编辑表格**：下次发命令或 `/rebuild` 会按事件日志覆盖/重建  
> 4) 只有 **Issue 作者本人** 可以在自己的 Issue 里使用命令  
> 5) 表格默认展示最近 **30 天**；展开可查看全历史

---

## 开始使用
1. 在仓库 **Issues** 使用模板创建你的 Sleep Log Issue（模板内含启用标记）
2. 在该 Issue 下评论命令开始打卡（首次会自动启用并添加 `sleep-log` 标签）

---

## 命令

### 基本打卡
- 睡觉：`/sleep`
- 起床：`/wake`

### 补录/修正（backfill）
仅允许最近 7 天，并且只能把时间改得更晚（不能改早），且不能填写未来时间：

- `/sleep YYYY-MM-DD HH:MM backfill`
- `/wake  YYYY-MM-DD HH:MM backfill`

### 撤销最近一次误操作（/undo）
- `/undo`：撤销最近一次 sleep/wake 记录（仅限最近 **10 分钟**内）
  - 可以连续撤销多次，但每次撤销的那条记录都必须在 10 分钟窗口内

### 修复表格（/rebuild）
- `/rebuild`：从事件日志重建表格（不会新增记录）

### 封存当前日志（/archive）
- `/archive`：自动封存并关闭当前 Sleep Log issue
  - 机器人会先从事件日志重建一次，确保数据最新
  - 然后把标题改为：`[Sleep Log] @user (start ~ end) [archived]`
  - 最后关闭 issue；你可以再新建一个新的 Sleep Log issue 继续记录
---

## 规则（时间归属与匹配）
> [!IMPORTANT]
> 这部分会影响你看到的 Date、以及 wake 填到哪一行。

- **cutoff = 04:00（UTC+8）**：凌晨 04:00 前的 `/sleep` 会归属到“昨晚”（表格 Date 列为前一天）
- `/wake` 会优先填入“最近一次 sleep 已记录但 wake 为空”的那一行（保证“一次睡眠一行”）
- wake 记录为真实日期时间（避免跨天时长计算出错）
- 同一天的 Sleep/Wake **各只允许记录一次**；如需修正请使用 backfill 命令或 `/undo`（限时）

---

## 关于通知（邮件太多怎么办）
这个项目会由 `github-actions[bot]` 在你的 Issue 下追加评论（事件日志），如果你订阅了该 issue 或 watch 了仓库，可能会收到很多邮件通知。

建议：
- 在仓库右上角 **Watch** 选择 `Participating and @mentions` 或 `Ignore`
- 在 GitHub 的 **Settings → Notifications** 里关闭“自动订阅我参与的对话”的选项（避免每条 bot 评论都给你发邮件）
