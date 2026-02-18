# sleep-checkin

用 GitHub Issues + GitHub Actions 记录睡觉/起床时间。

每个人用一个固定 Issue 作为“睡眠日志”，通过评论命令 `/sleep`、`/wake` 来打卡。机器人会把结果写回到 Issue 正文表格中（展示层），并在评论区写入可信事件日志（数据源，可防篡改/可追溯）。

---

## PWA 快速入口（推荐）
- Sleep Check-in App（GitHub Pages）：https://jinyong-li.github.io/sleep-checkin/

首次使用流程：
1. 打开上面的链接，点击 **Login with GitHub**
2. 如果你还没有 Sleep Log Issue，页面会提供 **Create Issue** 一键创建（并自动 `/rebuild` 启用）
3. 之后即可在 App 里一键发送命令，并查看 bot 回复与表格

---

## 安装到主屏幕/桌面（把网页变成“App”）
### iPhone / iPad（Safari）
1. 用 Safari 打开：https://jinyong-li.github.io/sleep-checkin/
2. 点击底部 **分享**按钮
3. 选择 **添加到主屏幕**
4. 添加后从桌面图标打开即可（App 模式）

> iOS 必须用 Safari 才能“添加到主屏幕”。

### Android（Chrome）
1. 用 Chrome 打开：https://jinyong-li.github.io/sleep-checkin/
2. 右上角菜单 → **安装应用 / Install app**（或“添加到主屏幕”）
3. 安装后从桌面图标打开即可

### Windows / macOS（Chrome / Edge）
1. 打开：https://jinyong-li.github.io/sleep-checkin/
2. 地址栏右侧出现 **安装**图标（Install）
3. 点击安装后会以独立窗口运行（桌面 App）

---

<!-- LEADERBOARD_START -->
## 昨日榜单（2026-02-17）
> 仅统计 open 的 `sleep-log` issue 用户；只统计完整记录（Sleep/Wake/Duration 都存在）；cutoff=04:00 (UTC+8)。
- 最早睡：暂无
- 最晚睡：暂无
- 最早起：暂无
- 最晚起：暂无
- 睡得最长：暂无
- 睡得最短：暂无
完整榜单见：https://jinyong-li.github.io/sleep-checkin/
<!-- LEADERBOARD_END -->

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
你可以任选一种方式：

### 方式 A：使用 App（推荐）
1. 打开：https://jinyong-li.github.io/sleep-checkin/
2. 登录后如果没有日志 Issue，点击 **Create Issue** 一键创建
3. 在 App 里点击按钮打卡/回看结果

### 方式 B：纯 GitHub Issue
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
这个项目会由 `github-actions[bot]` 在你的 Issue 下追加评论（事件日志），如果你订阅了该 issue 或 watch 了仓库，可能会收到很多通知。

建议（直达链接）：
- 仓库 Watch 设置（右上角 Watch）：https://github.com/Jinyong-Li/sleep-checkin  
  - 推荐选择 `Participating and @mentions` 或 `Ignore`
- GitHub 全局通知设置页：https://github.com/settings/notifications  
  - 可以关闭“自动订阅我参与的对话”（避免每条 bot 评论都给你发通知）
