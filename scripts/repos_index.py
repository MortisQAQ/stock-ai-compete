"""Build a markdown index by scanning D:\\work\\stock-ai-compete\\repos (source of truth = disk)."""
import os, subprocess, time, json

BASE = r"D:\work\stock-ai-compete\repos"
OUT = r"D:\work\stock-ai-compete\竞品仓库-本地索引.md"
STARS = r"D:\work\stock-ai-compete\scripts\repos_stars.json"

TIER_NAME = {
    "A": "A · 通用 AI 投研 / 交易框架（巨头样本）",
    "B": "B · A股主战场（生态衍生 + 模拟盘）",
    "C": "C · 美股 / crypto 自动交易（竞技形态参考）",
}
NOTE = {
    "TauricResearch__TradingAgents": "多智能体 LLM 交易框架的开山之作；有回测、无模拟盘。issue #805 正在吐槽 LLM 回测的未来函数污染 —— 是我们立论的最佳社区证据",
    "virattt__ai-hedge-fund": "AI 对冲基金 Demo；issue #667 实锤 README 夸大 paper trading，是「用户冲着模拟盘进来却发现没有」的直接证据",
    "OpenBB-finance__OpenBB": "开放金融数据平台 + AI 接口；纯数据、不做交易模拟，代表 L0 层",
    "microsoft__Qlib": "微软量化平台，Pipeline + 模型训练 + 回测最完整，参考其数据 / 因子工程",
    "hsliuping__TradingAgents-CN": "中文金融多智能体最高星；有「模拟交易」但 bug 成堆、两个月未更新 —— 反面教材",
    "AI4Finance-Foundation__FinRL": "强化学习金融事实标准；唯一有真正 RL 训练闭环的代表",
    "microsoft__RD-Agent": "微软数据科学 Agent；有跑分但评的是 Agent 工程能力，不是炒股",
    "OpenByteInc__QuantDinger": "开源标杆：crypto-first 量化 OS，A股标注 Data only；参考其商业化 / 多租户 / Agent Gateway 基建",
    "simonlin1212__TradingAgents-astock": "A股衍生最高星：7 位分析师按 A股规则辩论",
    "TNT-Likely__PanWatch": "盯盘侠：与 P0「盯盘 + 推送 + 三市场」高度重叠的真实竞品，仍在活跃更新（调研时 1.1k，两天涨到 1.76k）",
    "HammerGPT__Hyper-Alpha-Arena": "crypto 合约 AI 自动交易最高星，看持仓 / 风控 / 执行形态",
    "HephaestLab__TraderHarness": "★星数最低但最重要：A股五年数据 + 抗污染 + 时点掩码 + 分钟级撮合 + 多 Agent 同场排名；主动声明不做排行榜与托管 —— 评测内核的最佳接手对象",
}


def git(dest, *args):
    try:
        p = subprocess.run(["git", "-C", dest, *args], capture_output=True,
                           text=True, timeout=30, errors="replace")
        return p.stdout.strip()
    except Exception:
        return ""


def dirsize(path):
    total = 0
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d != ".git"]
        for f in files:
            try:
                total += os.path.getsize(os.path.join(root, f))
            except OSError:
                pass
    return total


def count_files(path):
    n = 0
    for root, dirs, files in os.walk(path):
        dirs[:] = [d for d in dirs if d != ".git"]
        n += len(files)
    return n


def mb(b):
    return f"{b/1048576:.0f} MB" if b >= 1048576 else f"{b/1024:.0f} KB"


def main():
    meta = {}
    if os.path.exists(STARS):
        with open(STARS, encoding="utf-8") as f:
            for row in json.load(f):
                meta[row["repo"]] = row

    lines = ["# 开源竞品仓库 · 本地索引", "",
             "> 浅克隆（`--depth 1`，不含历史与 submodule），仅用于代码级拆解与取证。",
             f"> 落地目录：`repos/<tier>/<owner>__<name>` ｜ stars / forks / issues 为 GitHub API 实时抓取 ｜ "
             f"生成时间：{time.strftime('%Y-%m-%d %H:%M')}",
             "",
             "挑选原则：每个方向取星数最高 / 形态最有代表性的一个，共 12 个。",
             ""]
    tot_size = tot_files = tot = 0
    for tier in ["A", "B", "C"]:
        tdir = os.path.join(BASE, tier)
        if not os.path.isdir(tdir):
            continue
        dirs = sorted(d for d in os.listdir(tdir)
                      if os.path.isdir(os.path.join(tdir, d))
                      and os.path.exists(os.path.join(tdir, d, ".git")))
        if not dirs:
            continue
        # sort by stars desc within tier
        dirs.sort(key=lambda d: -(meta.get(d.replace("__", "/", 1), {}).get("stars") or 0))
        lines.append(f"## {TIER_NAME[tier]}　（{len(dirs)} 个）")
        lines.append("")
        lines.append("| Stars | Forks | Open issues | 仓库 | 本地路径 | 大小 | 文件 | 最后推送 | 协议 | 为什么选它 |")
        lines.append("|---|---|---|---|---|---|---|---|---|---|")
        for d in dirs:
            dest = os.path.join(tdir, d)
            size = dirsize(dest)
            nf = count_files(dest)
            tot_size += size
            tot_files += nf
            tot += 1
            repo = d.replace("__", "/", 1)
            m = meta.get(repo, {})
            stars = f'{m.get("stars"):,}' if m.get("stars") is not None else "-"
            forks = f'{m.get("forks"):,}' if m.get("forks") is not None else "-"
            iss = m.get("issues") if m.get("issues") is not None else "-"
            pushed = m.get("pushed") or git(dest, "log", "-1", "--format=%ad", "--date=short") or "-"
            lic = (m.get("license") or "-").replace("NOASSERTION", "见 LICENSE")
            note = NOTE.get(d, "")
            lines.append(f"| **{stars}** | {forks} | {iss} | `{repo}` | `{tier}/{d}` | {mb(size)} | {nf} "
                         f"| {pushed} | {lic} | {note} |")
        lines.append("")
    lines.append(f"**合计 {tot} 个仓库 / {tot_files} 个文件 / {mb(tot_size)}**（不含 .git）")
    lines.append("")
    lines.append("## 建议拆解顺序")
    lines.append("")
    lines.append("1. **`B/HephaestLab__TraderHarness`** —— 评测内核候选。重点看：时点掩码与实体匿名化怎么做、分钟级撮合怎样保证确定性、多 Agent 同场如何隔离、训练轨迹（JSONL）导出格式")
    lines.append("2. **`B/TNT-Likely__PanWatch`** —— 与 P0 直接重叠。重点看：前端信息密度、推送通道与去重策略、如何把 TradingAgents 改造成实时盯盘")
    lines.append("3. **`A/OpenByteInc__QuantDinger`** —— 商业化与工程基建。重点看：多租户 / 计费 / 结算、Agent Gateway 的 scoped token、Celery durable worker 与 fencing token")
    lines.append("4. **`A/hsliuping__TradingAgents-CN`** —— 反面教材。重点看模拟交易模块的现金扣减 bug（对应其 issue #667 / #668）长什么样，确认我们的设计要避开哪些坑")
    lines.append("5. **`C/HammerGPT__Hyper-Alpha-Arena`** —— 竞技形态。看仓位管理、风控止损、以及「AI 托管资金」的产品叙事")
    lines.append("")
    lines.append("## 复制即用（clone 命令存档）")
    lines.append("")
    lines.append("```bash")
    for tier in ["A", "B", "C"]:
        tdir = os.path.join(BASE, tier)
        if not os.path.isdir(tdir):
            continue
        for d in sorted(os.listdir(tdir)):
            repo = d.replace("__", "/", 1)
            lines.append(f"git clone --depth 1 --no-tags --no-recurse-submodules "
                         f"https://github.com/{repo}.git repos/{tier}/{d}")
    lines.append("```")
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print("written:", OUT)
    print(f"{tot} repos, {tot_files} files, {mb(tot_size)}")


if __name__ == "__main__":
    main()
