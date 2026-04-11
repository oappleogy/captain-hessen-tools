// 黑森船长 · 确定性地图 数据层
// Sprint 4: 从 UI 中拆出的 mock 数据
//
// 数据结构（逼近本体论 v0.1 的七类实体 × 五类关系）:
//   event:
//     - 基本字段：id, category, title, date
//     - HCT 评级：narrative_crowding (叙事拥挤度 0-100), hct_narrative, hct_composite
//     - signals: 观察到的叙事拥挤信号
//     - chain:
//         trigger: 触发节点（事件本身）
//         nodes:   因果链上的后续节点，每个节点带：
//                  - label, type (industry/asset/company/policy)
//                  - hct:       综合分 0-10
//                  - hct_6dim:  HCT 六维明细 { narrative, institution, technology, coordination, resources, feedback }
//                  - evidence:  附着在该节点的证据（新闻降级为节点附件 — Sprint 3 核心）
//
// 真实数据接入时，这份文件应该被 API 拉取的结果替换。

window.HESSEN_ONTOLOGY = {
  events: [
    // ═══════════════════════════════════════════════════
    // 热点 1：霍尔木兹封锁
    // ═══════════════════════════════════════════════════
    {
      id: "hormuz",
      isCold: false,
      category: "地缘",
      title: "霍尔木兹海峡封锁",
      date: "2026-04-09",
      narrative_crowding: 87,
      hct_narrative: 2.1,
      hct_composite: 4.2,
      signals: ["Google 搜索量 +340%", "雪球讨论 +220%", "新闻提及 +410%"],
      chain: {
        trigger: { label: "霍尔木兹封锁", type: "event" },
        nodes: [
          {
            label: "海运运费",
            type: "industry",
            hct: 8.2,
            hct_6dim: { narrative: 7.5, institution: 8.0, technology: 7.0, coordination: 8.5, resources: 9.5, feedback: 8.5 },
            evidence: [
              { src: "Bloomberg", time: "2026-04-09 06:15", title: "VLCC rates surge 40% in Gulf", url: null },
              { src: "Clarkson", time: "2026-04-09 04:00", title: "VLCC day rate hits $95,000, 2-year high", url: null },
            ],
          },
          {
            label: "Brent-WTI 价差",
            type: "asset",
            hct: 7.6,
            hct_6dim: { narrative: 7.0, institution: 7.5, technology: 6.5, coordination: 8.0, resources: 9.0, feedback: 7.5 },
            evidence: [
              { src: "TradingKey", time: "2026-04-08 22:10", title: "Brent breaks $95, longest streak since 2022", url: null },
              { src: "ICE", time: "2026-04-09 10:30", title: "Brent-WTI spread widens to $4.8", url: null },
            ],
          },
          {
            label: "炼化利润率",
            type: "industry",
            hct: 6.8,
            hct_6dim: { narrative: 6.5, institution: 7.0, technology: 6.0, coordination: 7.0, resources: 8.0, feedback: 6.5 },
            evidence: [
              { src: "Reuters", time: "2026-04-09 07:45", title: "Asian refining margins widen on crude supply concerns", url: null },
            ],
          },
          {
            label: "CNOOC 0883.HK",
            type: "company",
            hct: 7.1,
            hct_6dim: { narrative: 7.0, institution: 7.5, technology: 6.5, coordination: 7.5, resources: 8.0, feedback: 6.0 },
            evidence: [
              { src: "Reuters", time: "2026-04-09 08:32", title: "Iran threatens Strait closure after strike", url: null },
              { src: "HKEX", time: "2026-04-09 09:30", title: "CNOOC gaps up 4.2% at open", url: null },
            ],
          },
        ],
      },
    },

    // ═══════════════════════════════════════════════════
    // 热点 2：特斯拉人形机器人量产
    // ═══════════════════════════════════════════════════
    {
      id: "tesla-humanoid",
      isCold: false,
      category: "技术",
      title: "特斯拉人形机器人量产提速",
      date: "2026-04-08",
      narrative_crowding: 72,
      hct_narrative: 3.4,
      hct_composite: 6.1,
      signals: ["概念股涨停潮", "研报密集推送 +180%"],
      chain: {
        trigger: { label: "Tesla 月产1万台目标", type: "event" },
        nodes: [
          {
            label: "丝杠需求",
            type: "industry",
            hct: 8.6,
            hct_6dim: { narrative: 7.5, institution: 8.5, technology: 9.0, coordination: 8.5, resources: 9.0, feedback: 9.0 },
            evidence: [
              { src: "Reuters", time: "2026-04-08 21:30", title: "China humanoid supply chain races Tesla timeline", url: null },
              { src: "Nikkei", time: "2026-04-08 14:00", title: "C0-grade ball screw orders surge 3x YoY", url: null },
            ],
          },
          {
            label: "空心杯电机",
            type: "industry",
            hct: 7.9,
            hct_6dim: { narrative: 7.0, institution: 7.5, technology: 8.5, coordination: 7.5, resources: 8.5, feedback: 8.5 },
            evidence: [
              { src: "36Kr", time: "2026-04-08 16:00", title: "鸣志电器切入Optimus供应链", url: null },
            ],
          },
          {
            label: "五洲新春",
            type: "company",
            hct: 7.4,
            hct_6dim: { narrative: 6.5, institution: 7.0, technology: 8.0, coordination: 7.5, resources: 8.0, feedback: 7.5 },
            evidence: [
              { src: "公司公告", time: "2026-04-08 18:00", title: "五洲新春：投资2亿建设人形机器人丝杠产线", url: null },
            ],
          },
          {
            label: "秦川机床",
            type: "company",
            hct: 6.8,
            hct_6dim: { narrative: 6.0, institution: 7.0, technology: 7.5, coordination: 6.5, resources: 7.5, feedback: 6.5 },
            evidence: [
              { src: "Tesla Blog", time: "2026-04-08 20:00", title: "Optimus monthly output target 10,000 by Q4", url: null },
            ],
          },
        ],
      },
    },

    // ═══════════════════════════════════════════════════
    // 热点 3：美联储降息预期
    // ═══════════════════════════════════════════════════
    {
      id: "fed-cut",
      isCold: false,
      category: "货币",
      title: "美联储 5月或降息50bp",
      date: "2026-04-07",
      narrative_crowding: 91,
      hct_narrative: 1.8,
      hct_composite: 3.5,
      signals: ["CME FedWatch 定价 38%", "主流媒体头版覆盖"],
      chain: {
        trigger: { label: "Fed Funds 降息预期", type: "event" },
        nodes: [
          {
            label: "10Y 收益率",
            type: "asset",
            hct: 5.2,
            hct_6dim: { narrative: 3.5, institution: 6.0, technology: 5.5, coordination: 5.0, resources: 6.0, feedback: 5.0 },
            evidence: [
              { src: "CME FedWatch", time: "2026-04-07 15:00", title: "50bp cut odds rise to 38%", url: null },
              { src: "Bloomberg", time: "2026-04-07 16:30", title: "10Y yield breaks below 3.8%", url: null },
            ],
          },
          {
            label: "DXY 美元",
            type: "asset",
            hct: 4.8,
            hct_6dim: { narrative: 3.0, institution: 5.5, technology: 5.0, coordination: 4.5, resources: 5.5, feedback: 5.0 },
            evidence: [
              { src: "WSJ", time: "2026-04-07 09:00", title: "Powell: 'we will act if needed'", url: null },
            ],
          },
          {
            label: "长久期科技股",
            type: "industry",
            hct: 3.9,
            hct_6dim: { narrative: 2.0, institution: 4.5, technology: 5.0, coordination: 3.5, resources: 4.0, feedback: 4.5 },
            evidence: [
              { src: "MS Research", time: "2026-04-07 12:00", title: "MS: rate-sensitive tech gets mechanical bid", url: null },
            ],
          },
          {
            label: "QQQ",
            type: "asset",
            hct: 3.5,
            hct_6dim: { narrative: 2.0, institution: 4.0, technology: 4.5, coordination: 3.5, resources: 3.5, feedback: 3.5 },
            evidence: [
              { src: "TradingKey", time: "2026-04-07 13:30", title: "QQQ 期权 IV 降至年内新低", url: null },
            ],
          },
        ],
      },
    },

    // ═══════════════════════════════════════════════════
    // 冷点 1：稀土管制
    // ═══════════════════════════════════════════════════
    {
      id: "rare-earth",
      isCold: true,
      category: "政策",
      title: "中国稀土出口管制扩容",
      date: "2026-04-05",
      narrative_crowding: 23,
      hct_narrative: 8.4,
      hct_composite: 7.8,
      signals: ["仅专业媒体跟进", "多数分析师未更新模型"],
      chain: {
        trigger: { label: "钐钴磁材追加管制", type: "event" },
        nodes: [
          {
            label: "高温磁材供应",
            type: "industry",
            hct: 8.6,
            hct_6dim: { narrative: 9.0, institution: 9.5, technology: 8.5, coordination: 8.0, resources: 9.0, feedback: 7.5 },
            evidence: [
              { src: "商务部公告", time: "2026-04-05 10:00", title: "钐钴及磁材列入出口管制清单", url: null },
              { src: "Asian Metal", time: "2026-04-05 16:30", title: "Samarium prices jump 22% overnight", url: null },
            ],
          },
          {
            label: "航空发动机成本",
            type: "industry",
            hct: 7.9,
            hct_6dim: { narrative: 8.5, institution: 8.5, technology: 8.0, coordination: 7.0, resources: 8.5, feedback: 6.5 },
            evidence: [
              { src: "Flight Global", time: "2026-04-05 20:00", title: "RTX, GE face rare earth sourcing scramble", url: null },
            ],
          },
          {
            label: "精密电机替代",
            type: "industry",
            hct: 7.4,
            hct_6dim: { narrative: 8.0, institution: 7.5, technology: 7.5, coordination: 6.5, resources: 8.0, feedback: 6.5 },
            evidence: [
              { src: "Nikkei", time: "2026-04-06 08:00", title: "Japanese motor makers stockpile ferrite alternatives", url: null },
            ],
          },
          {
            label: "MP Materials",
            type: "company",
            hct: 7.1,
            hct_6dim: { narrative: 8.0, institution: 7.0, technology: 7.0, coordination: 6.5, resources: 7.5, feedback: 6.5 },
            evidence: [
              { src: "NYSE", time: "2026-04-05 21:30", title: "MP Materials +14% on supply tightening", url: null },
            ],
          },
        ],
      },
    },

    // ═══════════════════════════════════════════════════
    // 冷点 2：日本变压器瓶颈
    // ═══════════════════════════════════════════════════
    {
      id: "japan-transformer",
      isCold: true,
      category: "产业",
      title: "日本变压器产能瓶颈",
      date: "2026-04-03",
      narrative_crowding: 18,
      hct_narrative: 8.8,
      hct_composite: 8.1,
      signals: ["行业报告零星提及", "无主流财经覆盖"],
      chain: {
        trigger: { label: "AI 数据中心需求撞上交付周期", type: "event" },
        nodes: [
          {
            label: "大型变压器交期→4年",
            type: "industry",
            hct: 9.1,
            hct_6dim: { narrative: 9.5, institution: 9.0, technology: 9.0, coordination: 8.5, resources: 9.5, feedback: 9.0 },
            evidence: [
              { src: "Nikkei", time: "2026-04-03 07:00", title: "Transformer lead times extend to 48 months", url: null },
              { src: "IEA", time: "2026-04-02 15:00", title: "Grid bottleneck threatens AI buildout", url: null },
            ],
          },
          {
            label: "超导电力设备",
            type: "industry",
            hct: 8.2,
            hct_6dim: { narrative: 9.0, institution: 8.0, technology: 8.5, coordination: 7.5, resources: 8.5, feedback: 7.5 },
            evidence: [
              { src: "Reuters", time: "2026-04-03 14:00", title: "Superconducting cable pilots accelerate in US data corridors", url: null },
            ],
          },
          {
            label: "特变电工",
            type: "company",
            hct: 7.8,
            hct_6dim: { narrative: 8.5, institution: 8.0, technology: 7.5, coordination: 7.0, resources: 8.0, feedback: 7.5 },
            evidence: [
              { src: "上证报", time: "2026-04-03 18:00", title: "特变电工海外变压器订单排至2029", url: null },
            ],
          },
          {
            label: "Hitachi Energy",
            type: "company",
            hct: 7.6,
            hct_6dim: { narrative: 8.5, institution: 8.0, technology: 7.5, coordination: 7.0, resources: 8.0, feedback: 6.5 },
            evidence: [
              { src: "Bloomberg", time: "2026-04-03 19:30", title: "Hitachi Energy backlog hits record $30B", url: null },
            ],
          },
        ],
      },
    },
  ],
};
