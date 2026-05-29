#!/usr/bin/env python3
"""
fetch_soros_fred.py — Soros AI Reflexivity OS · FRED Data Fetcher
============================================================
从 FRED API 抓取实时经济数据，生成 soros-data.js 供 dashboard 加载。

使用方法:
    1. 申请免费 API key: https://fred.stlouisfed.org/docs/api/api_key.html
    2. 设置环境变量: export FRED_API_KEY="your_key_here"
    3. 运行: python fetch_soros_fred.py
    4. 刷新 soros-reflexivity.html

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

    # 构建 payload
    payload = {
        "updated_at": now.strftime("%Y-%m-%d %H:%M UTC"),
        "flipped_count": flipped_core,
        "flipped_total": TOTAL_CORE_SIGNALS,
        "signals": results,
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
