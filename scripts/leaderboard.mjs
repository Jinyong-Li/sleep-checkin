import fs from "node:fs";
import path from "node:path";

const TOP_N = Number(process.env.TOP_N || "5");
const CUTOFF_HOUR_BJ = Number(process.env.CUTOFF_HOUR_BJ || "4"); // 04:00 UTC+8
const REPO = process.env.REPO; // "owner/repo"
const TOKEN = process.env.GITHUB_TOKEN;
const PWA_URL = process.env.PWA_URL || "";

if (!REPO) throw new Error("Missing env REPO (owner/repo)");
if (!TOKEN) throw new Error("Missing env GITHUB_TOKEN");

const [OWNER, NAME] = REPO.split("/");
if (!OWNER || !NAME) throw new Error(`Invalid REPO: ${REPO}`);

const outLatest = "docs/leaderboard-latest.json";
const outHistory = "docs/leaderboard-history.ndjson";
const readmePath = "README.md";

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Convert Date.now() to "Beijing wall clock" by shifting +8h and then using UTC getters.
function nowBeijingParts() {
  const bj = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return {
    y: bj.getUTCFullYear(),
    m: bj.getUTCMonth() + 1,
    d: bj.getUTCDate(),
    hh: bj.getUTCHours(),
    mm: bj.getUTCMinutes(),
    ss: bj.getUTCSeconds(),
  };
}

// Yesterday date string (YYYY-MM-DD) by cutoff hour in Beijing.
// If now < cutoff, "yesterday" is actually 2 days ago; else it's previous day.
function beijingYesterdayYmdByCutoff(cutoffHour) {
  const p = nowBeijingParts();
  const offsetDays = p.hh < cutoffHour ? 2 : 1;
  const date = new Date(Date.UTC(p.y, p.m - 1, p.d - offsetDays, 0, 0, 0));
  return `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
}

function beijingNowIsoLike() {
  const p = nowBeijingParts();
  return `${p.y}-${pad2(p.m)}-${pad2(p.d)} ${pad2(p.hh)}:${pad2(p.mm)}:${pad2(p.ss)} (UTC+8)`;
}

async function gh(pathname, { method = "GET", body, headers = {} } = {}) {
  const res = await fetch(`https://api.github.com${pathname}`, {
    method,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...headers,
    },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GitHub API ${method} ${pathname} failed: ${res.status} ${t}`);
  }
  return res.json();
}

// Fetch all open issues with label sleep-log (we will only use issue author as user identity).
async function listOpenSleepLogIssues() {
  // Prefer /issues endpoint with label filter (supports pagination).
  const perPage = 100;
  let page = 1;
  const items = [];

  while (true) {
    const data = await gh(
      `/repos/${OWNER}/${NAME}/issues?state=open&labels=${encodeURIComponent("sleep-log")}&per_page=${perPage}&page=${page}`,
    );

    // /issues returns PRs too; exclude items with pull_request field
    const issues = (data || []).filter((it) => !it.pull_request);
    items.push(...issues);

    if (!data || data.length < perPage) break;
    page++;
    if (page > 50) break; // safety
  }
  return items;
}

function extractSleepLogRowFromIssueBody(issueBody, ymd) {
  if (!issueBody) return null;

  // Try to locate the table region between markers first.
  const startMark = "<!-- SLEEP_LOG_TABLE_START -->";
  const endMark = "<!-- SLEEP_LOG_TABLE_END -->";
  const s = issueBody.indexOf(startMark);
  const e = issueBody.indexOf(endMark);

  let region = issueBody;
  if (s !== -1 && e !== -1 && e > s) {
    region = issueBody.slice(s + startMark.length, e);
  }

  const lines = region
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // find header row
  const headerIdx = lines.findIndex((l) => l.startsWith("| Date |") && l.includes("Sleep (UTC+8)") && l.includes("Wake (UTC+8)"));
  if (headerIdx === -1) return null;

  // rows after header+separator
  const rows = lines.slice(headerIdx + 2);

  for (const line of rows) {
    if (!line.startsWith("|")) continue;
    // naive split by |, trim cells
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());

    if (cells.length < 5) continue;

    const [date, sleepAt, wakeAt, duration, source] = cells;

    if (date !== ymd) continue;

    // only complete records
    if (!sleepAt || !wakeAt || !duration) return null;

    // duration like "0h19m"
    const m = duration.match(/^(\d+)h(\d+)m$/);
    if (!m) return null;
    const minutes = Number(m[1]) * 60 + Number(m[2]);
    if (!Number.isFinite(minutes) || minutes <= 0) return null;

    return { date, sleepAt, wakeAt, duration, minutes, source };
  }

  return null;
}

function toEntry(issue, row) {
  const user = issue.user?.login || "";
  return {
    user,
    user_url: user ? `https://github.com/${user}` : "",
    issue_number: issue.number,
    issue_url: issue.html_url,
    // keep as strings for display
    sleep: row.sleepAt,
    wake: row.wakeAt,
    duration: row.duration,
    minutes: row.minutes,
  };
}

function compareTimeStrAsc(a, b) {
  // "YYYY-MM-DD HH:MM" lexicographically sortable
  return String(a).localeCompare(String(b));
}
function compareTimeStrDesc(a, b) {
  return -compareTimeStrAsc(a, b);
}

function topN(arr, cmp, n) {
  return arr.slice().sort(cmp).slice(0, n);
}

function updateReadmeBlock(readme, block) {
  const start = "<!-- LEADERBOARD_START -->";
  const end = "<!-- LEADERBOARD_END -->";
  const s = readme.indexOf(start);
  const e = readme.indexOf(end);
  if (s === -1 || e === -1 || e < s) {
    // If markers absent, append at top (after title) as a safe fallback.
    const insertAt = readme.indexOf("\n\n");
    if (insertAt === -1) return `${readme}\n\n${start}\n${block}\n${end}\n`;
    return `${readme.slice(0, insertAt)}\n\n${start}\n${block}\n${end}\n${readme.slice(insertAt + 2)}`;
  }
  return `${readme.slice(0, s + start.length)}\n${block}\n${readme.slice(e)}`;
}

function pickFirst(list) {
  return Array.isArray(list) && list.length ? list[0] : null;
}

function fmtEntryLine(prefix, it) {
  if (!it) return `- ${prefix}：暂无`;
  return `- ${prefix}：[@${it.user}](${it.user_url})（${it.duration}，sleep ${it.sleep} / wake ${it.wake}）`;
}

async function main() {
  const date = beijingYesterdayYmdByCutoff(CUTOFF_HOUR_BJ);
  const generatedAt = beijingNowIsoLike();

  const issues = await listOpenSleepLogIssues();

  const entries = [];
  for (const issue of issues) {
    const row = extractSleepLogRowFromIssueBody(issue.body || "", date);
    if (!row) continue;
    entries.push(toEntry(issue, row));
  }

  // Rankings (Top N)
  const latestSleep = topN(entries, (a, b) => compareTimeStrDesc(a.sleep, b.sleep), TOP_N);
  const earliestWake = topN(entries, (a, b) => compareTimeStrAsc(a.wake, b.wake), TOP_N);
  const longestSleep = topN(entries, (a, b) => b.minutes - a.minutes, TOP_N);
  const shortestSleep = topN(entries, (a, b) => a.minutes - b.minutes, TOP_N);

  const latest = {
    date,
    cutoff: `04:00 (UTC+8)`,
    generated_at: generatedAt,
    top_n: TOP_N,
    counts: {
      open_sleep_log_issues: issues.length,
      complete_records: entries.length,
    },
    latest_sleep: latestSleep,
    earliest_wake: earliestWake,
    longest_sleep: longestSleep,
    shortest_sleep: shortestSleep,
  };

  // Ensure output directories
  fs.mkdirSync(path.dirname(outLatest), { recursive: true });
  fs.writeFileSync(outLatest, JSON.stringify(latest, null, 2) + "\n", "utf8");

  // Append history line (NDJSON)
  fs.mkdirSync(path.dirname(outHistory), { recursive: true });
  fs.appendFileSync(outHistory, JSON.stringify(latest) + "\n", "utf8");

  // Update README block (Top1 summary + link)
  const readme = fs.readFileSync(readmePath, "utf8");

  const linkLine = PWA_URL ? `完整榜单见：${PWA_URL}` : "";
  const block = [
    `## 昨日榜单（${date}）`,
    "",
    "> 仅统计 open 的 `sleep-log` issue 用户；只统计完整记录（Sleep/Wake/Duration 都存在）；cutoff=04:00 (UTC+8)。",
    "",
    fmtEntryLine("最晚睡", pickFirst(latestSleep)),
    fmtEntryLine("最早起", pickFirst(earliestWake)),
    fmtEntryLine("睡得最长", pickFirst(longestSleep)),
    fmtEntryLine("睡得最短", pickFirst(shortestSleep)),
    "",
    linkLine,
    "",
  ]
    .filter((l) => l !== "")
    .join("\n");

  const updated = updateReadmeBlock(readme, block);
  fs.writeFileSync(readmePath, updated, "utf8");

  console.log(`Done. date=${date}, entries=${entries.length}, issues=${issues.length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
