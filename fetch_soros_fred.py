#!/usr/bin/env python3
"""
fetch_soros_fred.py — Soros AI Reflexivity OS · 全信号数据抓取
============================================================
从 FRED API + Vast.ai + SEC EDGAR 抓取数据，生成 soros-data.js。

数据源:
    - FRED: TIPS/HY OAS/VIX/DXY/10Y/BEI (每日)
    - Vast.ai: GPU 租赁价格 H100/H200/B200 (每日)
    - SEC EDGAR: Form 4 内部人交易 (每日)
    - FRED TIPS: 日波动检测 >8bp 事件告警

依赖: requests (pip install requests)
输出: soros-data.js (与 HTML 同目录)
"""

import os
import sys
import json
import requests
from datetime import datetime, timezone
from pathlib import Path

# ============================================================
# 配置区
# ============================================================

# 从 s2-dev/.env 加载 FRED_API_KEY（launchd 环境无 shell profile）
for _env_path in [
    Path(__file__).resolve().parent.parent.parent / "s2-dev" / ".env",  # basealpha-core/s2-dev/.env
    Path.home() / "s2" / ".env",  # ~/s2/.env
]:
    if _env_path.exists():
        for _line in _env_path.read_text().splitlines():
            if "=" in _line and not _line.strip().startswith("#"):
                _k, _, _v = _line.partition("=")
                os.environ.setdefault(_k.strip(), _v.strip().strip('"').strip("'"))
        break

FRED_API_KEY = os.environ.get("FRED_API_KEY", "")
FRED_BASE = "https://api.stlouisfed.org/fred/series/observations"
OUTPUT_FILE = Path(__file__).parent / "soros-data.js"

# 信号映射: FRED series ID → 信号元数据
# multiplier: FRED返回值 × multiplier = 显示值 (HY OAS 用百分比，需 ×100 转 bp)
# thresholds: 翻转阈值
SERIES = {
    "DFII10": {
        "name": "10Y TIPS Real Yield",
        "signal_id": "S1",
        "unit": "%",
        "thresholds": {"yellow": 2.0, "red": 2.2},
        "lookback_days": 30,
        "is_core": True,
    },
    "BAMLH0A0HYM2": {
        "name": "ICE BofA US HY OAS",
        "signal_id": "S2",
        "unit": "bp",
        "multiplier": 100,
        "thresholds": {"trigger": 450},
        "lookback_days": 30,
        "is_core": True,
    },
    # 辅助指标 (不影响翻转计数)
    "T10YIE": {
        "name": "10Y Breakeven Inflation",
        "signal_id": "AUX_BEI",
        "unit": "%",
        "lookback_days": 30,
        "is_core": False,
    },
    "DTWEXBGS": {
        "name": "Broad Dollar Index",
        "signal_id": "AUX_DXY",
        "unit": "index",
        "lookback_days": 30,
        "is_core": False,
    },
    "DGS10": {
        "name": "10Y Treasury Yield",
        "signal_id": "AUX_DGS10",
        "unit": "%",
        "lookback_days": 30,
        "is_core": False,
    },
    "VIXCLS": {
        "name": "CBOE VIX",
        "signal_id": "AUX_VIX",
        "unit": "index",
        "lookback_days": 30,
        "is_core": False,
    },
}

# 总信号数 (用于翻转分母显示)
TOTAL_CORE_SIGNALS = 7  # 七大领先信号 (目前自动化2个, 其他5个等数据源接入)


# ============================================================
# 抓取函数
# ============================================================

def fetch_series(series_id, limit=60):
    """抓取单个FRED series最近N条观测值。"""
    if not FRED_API_KEY:
        sys.exit("✗ Error: 请先设置环境变量 FRED_API_KEY")

    params = {
        "series_id": series_id,
        "api_key": FRED_API_KEY,
        "file_type": "json",
        "sort_order": "desc",
        "limit": limit,
    }

    try:
        r = requests.get(FRED_BASE, params=params, timeout=15)
        r.raise_for_status()
        return r.json().get("observations", [])
    except requests.RequestException as e:
        print(f"  ✗ {series_id} fetch failed: {e}")
        return []


def parse_observations(observations):
    """解析观测值,过滤缺失值('.'),按日期降序返回。"""
    parsed = []
    for obs in observations:
        if obs["value"] in (".", "", None):
            continue
        try:
            parsed.append({
                "date": obs["date"],
                "value": float(obs["value"]),
            })
        except (ValueError, KeyError):
            continue
    return parsed


def compute_status(value, thresholds):
    """根据阈值计算信号状态。"""
    if not thresholds:
        return ("正常", "pill-green")

    if "red" in thresholds and value >= thresholds["red"]:
        return ("红色", "pill-red")
    if "yellow" in thresholds and value >= thresholds["yellow"]:
        return ("观察", "pill-warn")
    if "trigger" in thresholds and value >= thresholds["trigger"]:
        return ("观察", "pill-warn")
    return ("正常", "pill-green")


def format_value(value, unit):
    """格式化数值显示。"""
    if unit == "%":
        return f"{value:.2f}%"
    if unit == "bp":
        return f"{value:.0f}bp"
    if unit == "index":
        return f"{value:.2f}"
    return f"{value:.2f}"


def compute_delta(observations, lookback_days=30):
    """计算与N天前的变化。"""
    if len(observations) < 2:
        return None
    latest_value = observations[0]["value"]
    target_idx = min(lookback_days, len(observations) - 1)
    past_value = observations[target_idx]["value"]
    return latest_value - past_value


def format_delta(delta, unit, multiplier=1):
    """格式化变化显示。"""
    if delta is None:
        return "—"
    val = delta * multiplier
    sign = "+" if val >= 0 else ""
    if unit == "bp":
        return f"{sign}{val:.0f}bp · 30D"
    if unit == "%":
        return f"{sign}{val:.2f}% · 30D"
    return f"{sign}{val:.2f} · 30D"


# ============================================================
# GPU 租赁价格 (Vast.ai)
# ============================================================

VAST_API = "https://cloud.vast.ai/api/v0/bundles/"
# Vast.ai 实际 GPU 名称 → 显示名称
GPU_NAME_MAP = {
    "H100 SXM": "H100",
    "H100 NVL": "H100",
    "H200": "H200",
    "H200 NVL": "H200",
    "B200": "B200",
}

def fetch_gpu_prices():
    """从 Vast.ai 抓取 GPU 租赁价格（无需 API key）。"""
    print("\n→ Vast.ai GPU rental prices")
    try:
        q = json.dumps({"rentable": {"eq": True}}, separators=(",", ":"))
        r = requests.get(VAST_API, params={"q": q}, timeout=15,
                         headers={"Accept": "application/json"})
        r.raise_for_status()
        offers = r.json().get("offers", [])
    except Exception as e:
        print(f"   ✗ Vast.ai fetch failed: {e}")
        return {}

    # 按显示名称聚合
    gpu_data = {}
    buckets = {}  # display_name → [prices]
    for o in offers:
        name = o.get("gpu_name", "")
        display = GPU_NAME_MAP.get(name)
        if not display:
            continue
        price = o.get("dph_total", 0)
        if price > 0:
            buckets.setdefault(display, []).append(price)

    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    for display in ["H100", "H200", "B200"]:
        prices = buckets.get(display, [])
        if prices:
            prices.sort()
            gpu_data[display] = {
                "min_hr": f"${prices[0]:.2f}/hr",
                "median_hr": f"${prices[len(prices)//2]:.2f}/hr",
                "max_hr": f"${prices[-1]:.2f}/hr",
                "offers": len(prices),
                "date": today,
            }
            print(f"   ✓ {display}: ${prices[0]:.2f} ~ ${prices[-1]:.2f}/hr ({len(prices)} offers)")
        else:
            print(f"   - {display}: no offers")

    return gpu_data


# ============================================================
# SEC EDGAR Form 4 (内部人交易)
# ============================================================

EDGAR_BASE = "https://data.sec.gov/submissions"
# Hyperscaler CIK 号码
INSIDER_COMPANIES = {
    "NVDA": "0001045810",
    "MSFT": "0000789019",
    "GOOGL": "0001652044",
    "META": "0001326801",
    "ORCL": "0001341439",
}
EDGAR_HEADERS = {
    "User-Agent": "SorosReflexivityOS/1.0 (captain.hessen@basealpha.ai)",
    "Accept": "application/json",
}

def fetch_form4():
    """从 SEC EDGAR 抓取最近 Form 4 内部人交易申报。"""
    print("\n→ SEC EDGAR Form 4 insider filings")
    form4_data = {}
    for ticker, cik in INSIDER_COMPANIES.items():
        try:
            url = f"{EDGAR_BASE}/CIK{cik}.json"
            r = requests.get(url, headers=EDGAR_HEADERS, timeout=15)
            r.raise_for_status()
            data = r.json()

            recent = data.get("filings", {}).get("recent", {})
            forms = recent.get("form", [])
            dates = recent.get("filingDate", [])
            urls = recent.get("primaryDocument", [])

            # 统计最近 30 天 Form 4 数量
            cutoff = (datetime.now(timezone.utc) - __import__("datetime").timedelta(days=30)).strftime("%Y-%m-%d")
            count_30d = 0
            latest_date = None
            for i, (form, date) in enumerate(zip(forms, dates)):
                if form in ("4", "4/A") and date >= cutoff:
                    count_30d += 1
                    if latest_date is None:
                        latest_date = date

            form4_data[ticker] = {
                "count_30d": count_30d,
                "latest_date": latest_date or "N/A",
                "status": "正常",
                "pill": "pill-green",
            }

            # 高频减持告警
            if count_30d >= 25:
                form4_data[ticker]["status"] = "异常密集"
                form4_data[ticker]["pill"] = "pill-red"
            elif count_30d >= 15:
                form4_data[ticker]["status"] = "加速减持"
                form4_data[ticker]["pill"] = "pill-warn"

            flag = "⚠" if count_30d >= 15 else "✓"
            print(f"   {flag} {ticker}: {count_30d} filings in 30d, latest {latest_date or 'N/A'}")

        except Exception as e:
            print(f"   ✗ {ticker}: {e}")
            form4_data[ticker] = {
                "count_30d": -1,
                "latest_date": "获取失败",
                "status": "获取失败",
                "pill": "pill-warn",
            }
    return form4_data


# ============================================================
# TIPS 日波动检测 (事件驱动: >8bp)
# ============================================================

def check_tips_daily_change(observations):
    """检测 TIPS 最近一日变化是否超过 8bp。"""
    if len(observations) < 2:
        return None
    latest = observations[0]["value"]
    prev = observations[1]["value"]
    change_bp = (latest - prev) * 100  # 转为 bp
    return {
        "change_bp": round(change_bp, 1),
        "triggered": abs(change_bp) > 8,
        "date": observations[0]["date"],
        "level": f"{latest:.2f}%",
    }


# ============================================================
# 主流程
# ============================================================

def main():
    now = datetime.now(timezone.utc)
    print("\n" + "=" * 60)
    print(f"  Soros OS · FRED Data Fetch")
    print(f"  {now.strftime('%Y-%m-%d %H:%M UTC')}")
    print("=" * 60 + "\n")

    results = {}
    flipped_core = 0
    fetch_failures = []

    for series_id, config in SERIES.items():
        print(f"→ {series_id:15s} {config['name']}")

        raw = fetch_series(series_id)
        if not raw:
            fetch_failures.append(series_id)
            results[config["signal_id"]] = {
                "current": "N/A",
                "status": "数据缺失",
                "pill": "pill-warn",
                "delta_30d": "—",
            }
            continue

        obs = parse_observations(raw)
        if not obs:
            fetch_failures.append(series_id)
            continue

        latest = obs[0]
        value = latest["value"]
        multiplier = config.get("multiplier", 1)
        display_value = value * multiplier

        # 计算状态
        status, pill = compute_status(display_value, config.get("thresholds", {}))
        if config.get("is_core") and pill in ("pill-warn", "pill-red"):
            flipped_core += 1

        # 计算变化
        delta = compute_delta(obs, config.get("lookback_days", 30))
        delta_str = format_delta(delta, config["unit"], multiplier)

        results[config["signal_id"]] = {
            "current": format_value(display_value, config["unit"]),
            "status": status,
            "pill": pill,
            "delta_30d": delta_str,
            "date": latest["date"],
        }

        flag = "⚠" if pill != "pill-green" else "✓"
        print(f"   {flag} {format_value(display_value, config['unit']):>12s}  "
              f"{status:6s}  {delta_str:>16s}  as of {latest['date']}")

    # ── TIPS 日波动检测 ──
    tips_event = None
    tips_series = "DFII10"
    if tips_series not in [f for f in fetch_failures]:
        tips_raw = fetch_series(tips_series, limit=5)
        tips_obs = parse_observations(tips_raw)
        tips_event = check_tips_daily_change(tips_obs)
        if tips_event:
            flag = "⚠⚠" if tips_event["triggered"] else "✓"
            print(f"\n→ TIPS daily change: {tips_event['change_bp']:+.1f}bp {flag}")

    # ── GPU 租赁价格 ──
    gpu_prices = fetch_gpu_prices()

    # ── Form 4 内部人交易 ──
    form4_data = fetch_form4()

    # 构建 payload
    payload = {
        "updated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "flipped_count": flipped_core,
        "flipped_total": TOTAL_CORE_SIGNALS,
        "signals": results,
        "weekly": {
            "gpu_prices": gpu_prices,
            "form4": form4_data,
        },
        "events": {
            "tips_daily": tips_event,
        },
        "fetch_failures": fetch_failures,
    }

    # 写出 soros-data.js
    js_content = (
        "// Auto-generated by fetch_soros_fred.py · DO NOT EDIT MANUALLY\n"
        f"// Last update: {payload['updated_at']}\n"
        f"const FRED_DATA = {json.dumps(payload, ensure_ascii=False, indent=2)};\n"
    )
    OUTPUT_FILE.write_text(js_content, encoding="utf-8")

    # 总结报告
    print("\n" + "-" * 60)
    print(f"✓ Wrote: {OUTPUT_FILE}")
    print(f"✓ Flipped core signals: {flipped_core} / {TOTAL_CORE_SIGNALS}")
    if fetch_failures:
        print(f"⚠ Fetch failures: {', '.join(fetch_failures)}")

    # 触发等级提示
    print("\n触发等级:")
    if flipped_core >= 5:
        print("  ⚠⚠⚠ LEVEL 5+ → 全面切换为净空头 (反身性反转确认)")
    elif flipped_core >= 3:
        print("  ⚠⚠  LEVEL 3   → 空头变主仓 (必须执行 · 当日完成)")
    elif flipped_core >= 2:
        print("  ⚠   LEVEL 2   → 决策窗口开 (期权层加固 · 试仓加倍)")
    else:
        print("  ✓   LEVEL 0-1 → 维持当前结构 (仅观察)")

    print("\n下一步: 刷新 soros-reflexivity.html 查看更新\n")


if __name__ == "__main__":
    main()
