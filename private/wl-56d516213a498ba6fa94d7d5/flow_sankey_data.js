// 资金/利润流向桑基图数据 · ⛔Action层自用 · © 黑森船长
// 口径=全球AI净利润流向(公开数据快照, 亿美元) = "水当前淤积的位置"
// 叠加 gate(产业闸 seq)→ 由 gate_diagnosis 的 verdict 上色 = "运动方向"
// 数据时间: 2026-06 公开整理, 待核校; 国家节点值=其公司链路之和(内部自洽)
window.SANKEY_DATA = {
  title: "全球 AI 净利润流向 — 资金当前淤积位置(桑基) × 产业闸运动方向(上色)",
  unit: "亿美元 · 利润(已实现, 向后看) · 公开数据快照/未校核",
  source: { id: "pool", name: "全球AI净利润池 6370" },
  // col1 国家大池 (color=区域)
  countries: [
    { id: "US", name: "美国", color: "#3d7fc0" },
    { id: "KR", name: "韩国", color: "#8b6ad6" },
    { id: "TW", name: "中国台湾", color: "#36a0bf" },
    { id: "CN", name: "中国大陆", color: "#b15fb8" },
    { id: "JP", name: "日本", color: "#5566c4" },
    { id: "EU", name: "欧洲", color: "#6f7f97" },
  ],
  // col2 公司/标的; gate=对应产业闸 seq(用于取 verdict 颜色); 投入主体备注
  companies: [
    { id: "NVDA", name: "英伟达 2070", country: "US", v: 2070, gate: 1, who: "市场/超大厂买方" },
    { id: "USMU", name: "美光 370", country: "US", v: 370, gate: 2, who: "市场" },
    { id: "AVGO", name: "博通 230", country: "US", v: 230, gate: 3, who: "市场" },
    { id: "USrest", name: "其余美国 470", country: "US", v: 470, gate: 0, who: "市场" },
    { id: "SKH", name: "SK海力士 1130", country: "KR", v: 1130, gate: 2, who: "财阀龙头·财政中枢" },
    { id: "SS", name: "三星(存储) 1090", country: "KR", v: 1090, gate: 2, who: "财阀龙头·财政中枢" },
    { id: "TSMC", name: "台积电 330", country: "TW", v: 330, gate: 1, who: "市场/代工" },
    { id: "TWrest", name: "其余台湾 140", country: "TW", v: 140, gate: 0, who: "市场" },
    { id: "CNcore", name: "华为+长鑫+长存(估) 80", country: "CN", v: 80, gate: 2, who: "国家队·国产替代" },
    { id: "CNrest", name: "其余中国 180", country: "CN", v: 180, gate: 0, who: "国家队" },
    { id: "KIOXIA", name: "铠侠 51", country: "JP", v: 51, gate: 2, who: "财团" },
    { id: "JPrest", name: "其余日本 91", country: "JP", v: 91, gate: 0, who: "—" },
    { id: "ASML", name: "ASML 73", country: "EU", v: 73, gate: 1, who: "市场/设备制程" },
    { id: "EUML", name: "欧洲ML 64", country: "EU", v: 64, gate: 1, who: "市场" },
  ],
  gateNames: { 1: "算力/GPU", 2: "存储/HBM", 3: "高速互联", 0: "其余/混合" },
};
