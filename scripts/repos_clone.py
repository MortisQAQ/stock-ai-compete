"""Shallow-clone the probed repos into D:\\work\\stock-ai-compete\\repos\\<tier>\\<owner>__<name>."""
import subprocess, json, os, time, sys
import concurrent.futures as cf

BASE = r"D:\work\stock-ai-compete\repos"
PROBE = r"D:\work\stock-ai-compete\scripts\repos_probe.json"


def clone(item):
    tier, repo = item["tier"], item["repo"]
    owner, name = repo.split("/", 1)
    dest = os.path.join(BASE, tier, f"{owner}__{name}")
    if os.path.exists(os.path.join(dest, ".git")):
        return {"repo": repo, "tier": tier, "dest": dest, "status": "skipped"}
    os.makedirs(dest, exist_ok=True)
    t0 = time.time()
    p = subprocess.run(
        ["git", "clone", "--depth", "1", "--no-tags", "--no-recurse-submodules",
         "--single-branch", item["url"], dest],
        capture_output=True, text=True, timeout=1800, errors="replace",
    )
    dt = round(time.time() - t0, 1)
    if p.returncode == 0:
        return {"repo": repo, "tier": tier, "dest": dest, "status": "ok", "sec": dt}
    err = (p.stderr or p.stdout or "").strip()[-300:]
    return {"repo": repo, "tier": tier, "dest": dest, "status": "fail", "sec": dt, "err": err}


def main():
    with open(PROBE, encoding="utf-8") as f:
        data = json.load(f)
    items = data["ok"]
    results = []
    with cf.ThreadPoolExecutor(max_workers=5) as ex:
        futs = {ex.submit(clone, it): it for it in items}
        for fut in cf.as_completed(futs):
            r = fut.result()
            results.append(r)
            print(f"{r['status']:8s} [{r['tier']}] {r['repo']:42s} {r.get('sec','')}s", flush=True)
            if r["status"] == "fail":
                print("   ERR:", r["err"].replace("\n", " | ")[:200], flush=True)
            # persist incrementally
            with open(os.path.join(os.path.dirname(PROBE), "repos_clone.json"), "w", encoding="utf-8") as f:
                json.dump(results, f, ensure_ascii=False, indent=2)
    ok = [r for r in results if r["status"] in ("ok", "skipped")]
    print(f"\nDONE total={len(results)} ok={len(ok)} fail={len(results)-len(ok)}")


if __name__ == "__main__":
    main()
