/**
 * 日语说话引擎 — 可调用版
 * generate_japanese_speech(input) → 自动生成自然日语
 */

// ═══════════════════════════════════════════════════════════
// 组件库
// ═══════════════════════════════════════════════════════════

const COMPONENTS = {

  // ── 启动缓冲 ──
  buffers: [
    { id: "なんか",     weight: 3, condition: (i) => i.social_risk >= 4 && i.social_risk <= 7, desc: "降低发言分量，暗示'别太当真'" },
    { id: "あのさ",     weight: 4, condition: (i) => i.urgency >= 4 && i.intimacy >= 6, desc: "征用注意力，'我要说个事'" },
    { id: "ていうか",   weight: 5, condition: (i) => i.has_prior_context && i.intent_type === "correct", desc: "修正前文方向" },
    { id: "いや",       weight: 2, condition: (i) => i.intent_type === "disagree" || i.intent_type === "correct", desc: "否定型启动" },
    { id: "えー",       weight: 1, condition: (i) => i.intent_type === "disagree" && i.social_risk <= 5, desc: "轻度惊讶" },
    { id: "まあ",       weight: 3, condition: (i) => i.intent_type === "accept_reluctant" || i.social_risk >= 6, desc: "态度压平" },
    { id: "えっと",     weight: 1, condition: (i) => i.certainty <= 4, desc: "需要时间组织语言" },
    { id: "正直に言うと", weight: 7, condition: (i) => i.intent_type === "honest" && i.social_risk >= 5, desc: "诚实模式宣告" },
    { id: "ねえ",       weight: 5, condition: (i) => i.intimacy >= 7 && i.urgency >= 5, desc: "亲密注意力征用" },
  ],

  // ── 力度压缩 ──
  compressors: [
    { id: "ちょっと",   weight: 3, condition: (i) => i.social_risk >= 4, desc: "通用力度压缩" },
    { id: "そんなに",   weight: 4, condition: (i) => i.intent_type === "disagree" && i.social_risk >= 5, desc: "程度否定：'没那么严重'" },
    { id: "別に",       weight: 5, condition: (i) => i.intent_type === "deny_caring", desc: "假装不在意" },
    { id: "なんとなく", weight: 3, condition: (i) => i.certainty <= 5, desc: "回避理由追问" },
    { id: "たぶん",     weight: 2, condition: (i) => i.certainty <= 7 && i.certainty >= 4, desc: "确信度折扣" },
    { id: "一応",       weight: 3, condition: (i) => i.intent_type === "report" && i.certainty <= 6, desc: "降低期望值" },
  ],

  // ── 语义载体 ──
  payloads: {
    disagree: [
      { id: "違う",         weight: 5, min_certainty: 6, max_social_risk: 6 },
      { id: "おかしい",     weight: 7, min_certainty: 7, max_social_risk: 4 },
      { id: "間違ってる",   weight: 9, min_certainty: 9, max_social_risk: 2 },
      { id: "ずれてる",     weight: 4, min_certainty: 5, max_social_risk: 7 },
      { id: "合ってない",   weight: 6, min_certainty: 7, max_social_risk: 5 },
    ],
    negative_mild: [
      { id: "微妙",         weight: 3, min_certainty: 4, max_social_risk: 8 },
      { id: "悪くない",     weight: 2, min_certainty: 3, max_social_risk: 9 },
      { id: "なんとも言えない", weight: 1, min_certainty: 0, max_social_risk: 10 },
    ],
    positive_mild: [
      { id: "悪くない",     weight: 2, min_certainty: 5, max_social_risk: 6 },
      { id: "いい",         weight: 4, min_certainty: 6, max_social_risk: 4 },
      { id: "好き",         weight: 6, min_certainty: 7, max_social_risk: 3 },
    ],
    state: [
      { id: "疲れた",       weight: 3, min_certainty: 7, max_social_risk: 3 },
      { id: "寂しい",       weight: 5, min_certainty: 5, max_social_risk: 6 },
      { id: "無理",         weight: 6, min_certainty: 8, max_social_risk: 4 },
      { id: "分かんない",   weight: 2, min_certainty: 0, max_social_risk: 3 },
      { id: "面倒くさい",   weight: 4, min_certainty: 7, max_social_risk: 4 },
    ],
    correct: [
      { id: "そうじゃなくて",   weight: 5, min_certainty: 7, max_social_risk: 5 },
      { id: "違うんだよ",       weight: 7, min_certainty: 8, max_social_risk: 3 },
      { id: "そうかな",         weight: 2, min_certainty: 4, max_social_risk: 8 },
    ],
    report: [
      { id: "行ってきた",   weight: 3, min_certainty: 9, max_social_risk: 2 },
      { id: "やってみた",   weight: 3, min_certainty: 8, max_social_risk: 2 },
    ],
    feeling: [
      { id: "嫌",           weight: 6, min_certainty: 7, max_social_risk: 4 },
      { id: "嫌いじゃない", weight: 2, min_certainty: 4, max_social_risk: 8 },
      { id: "好きかも",     weight: 3, min_certainty: 5, max_social_risk: 5 },
    ],
    uncertain: [
      { id: "分かんない",   weight: 2, min_certainty: 0, max_social_risk: 3 },
      { id: "どうだろ",     weight: 3, min_certainty: 3, max_social_risk: 5 },
    ],
    observation: [
      { id: "変わった",     weight: 4, min_certainty: 5, max_social_risk: 5 },
      { id: "寒い",         weight: 3, min_certainty: 6, max_social_risk: 2 },
      { id: "暑い",         weight: 3, min_certainty: 6, max_social_risk: 2 },
      { id: "混んでる",     weight: 3, min_certainty: 7, max_social_risk: 2 },
    ],
  },

  // ── 降级包装 ──
  downgraders: [
    { id: "気がする",       weight: 5, condition: (i) => i.certainty <= 7 || i.social_risk >= 5, desc: "事实→感觉" },
    { id: "かも",           weight: 3, condition: (i) => i.certainty <= 7, desc: "可能性降级" },
    { id: "かな",           weight: 2, condition: (i) => i.certainty <= 6 || i.intent_type === "self_talk", desc: "思考中/软化" },
    { id: "っぽい",         weight: 2, condition: (i) => i.certainty <= 5 && i.intimacy >= 5, desc: "印象级降级" },
    { id: "感じする",       weight: 4, condition: (i) => i.certainty <= 6 && i.social_risk >= 4, desc: "氛围化" },
    { id: "なんとも言えない", weight: 8, condition: (i) => i.social_risk >= 7, desc: "判断封印" },
    { id: "好み分かれる",   weight: 6, condition: (i) => i.social_risk >= 6 && i.intent_type === "negative_mild", desc: "责任转移" },
  ],

  // ── 出口策略 ──
  exits: [
    { id: "んだけど",   weight: 4, condition: (i) => i.social_risk >= 4, desc: "未完成连接，让对方接" },
    { id: "よね",       weight: 3, condition: (i) => i.intent_type === "seek_agreement" || (i.social_risk >= 3 && i.social_risk <= 6), desc: "寻求共识" },
    { id: "じゃない？", weight: 5, condition: (i) => i.certainty >= 6 && i.social_risk <= 5, desc: "反问型断言" },
    { id: "けど",       weight: 2, condition: (i) => i.social_risk >= 3, desc: "轻量悬挂" },
    { id: "けどな",     weight: 3, condition: (i) => i.intent_type === "disagree" && i.intimacy >= 5, desc: "带遗憾的悬挂" },
    { id: "し",         weight: 2, condition: (i) => i.intent_type === "justify", desc: "理由追加" },
    { id: "知らんけど", weight: 4, condition: (i) => i.certainty <= 5 && i.intimacy >= 5, desc: "事后免责" },
    { id: "でしょ",     weight: 7, condition: (i) => i.certainty >= 8 && i.social_risk <= 3, desc: "强确信断言" },
    { id: "かなって",   weight: 3, condition: (i) => i.certainty <= 5 && i.social_risk >= 5, desc: "内向犹豫" },
  ],

  // ── 修正标记 ──
  corrections: [
    { id: "いや",             trigger: "too_direct", desc: "最快中断" },
    { id: "ていうか",         trigger: "wrong_direction", desc: "方向修正" },
    { id: "そうじゃなくて",   trigger: "misunderstood", desc: "理解修正" },
    { id: "ごめん",           trigger: "hurt_feelings", desc: "关系修复" },
    { id: "あ、やっぱ",       trigger: "change_mind", desc: "改主意" },
    { id: "今のなしで",       trigger: "full_retract", desc: "完全撤回" },
    { id: "言い方悪かった",   trigger: "bad_wording", desc: "措辞认错" },
  ],

  // ── 社交追加 ──
  social_extras: [
    { id: "私だけ？",             condition: (i) => i.intent_type === "seek_agreement" && i.social_risk >= 5, desc: "确认不孤立" },
    { id: "怒んないでね",         condition: (i) => i.social_risk >= 7, desc: "情绪预保险" },
    { id: "好みの問題かもね",     condition: (i) => i.intent_type === "disagree" && i.social_risk >= 6, desc: "分歧归因于主观" },
    { id: "日によるのかも",       condition: (i) => i.intent_type === "disagree" && i.social_risk >= 5 && i.context_food, desc: "分歧归因于客观" },
    { id: "人によるかな",         condition: (i) => i.social_risk >= 6, desc: "立场消除" },
  ],
};


// ═══════════════════════════════════════════════════════════
// 意图分类器
// ═══════════════════════════════════════════════════════════

function classifyIntent(intent) {
  const map = [
    { keywords: ["错", "不对", "wrong", "incorrect", "disagree", "反对"], type: "disagree" },
    { keywords: ["纠正", "correct", "修正", "其实"], type: "correct" },
    { keywords: ["不好", "不喜欢", "难吃", "不行", "差", "negative"], type: "negative_mild" },
    { keywords: ["好", "喜欢", "不错", "positive", "好吃"], type: "positive_mild" },
    { keywords: ["累", "疲", "无聊", "烦", "寂寞", "lonely", "tired"], type: "state" },
    { keywords: ["不确定", "不知道", "uncertain", "不清楚"], type: "uncertain" },
    { keywords: ["去了", "做了", "试了", "report", "汇报"], type: "report" },
    { keywords: ["觉得", "感觉", "feeling", "feel"], type: "feeling" },
    { keywords: ["同意", "agree", "共鸣"], type: "seek_agreement" },
    { keywords: ["算了", "无所谓", "放弃", "reluctant"], type: "accept_reluctant" },
    { keywords: ["解释", "justify", "因为", "理由"], type: "justify" },
    { keywords: ["说实话", "honest", "坦白"], type: "honest" },
    { keywords: ["观察", "注意到", "发现", "observe"], type: "observation" },
    { keywords: ["不在意", "无所谓", "deny"], type: "deny_caring" },
    { keywords: ["伤", "不想伤", "protect"], type: "disagree" }, // 不想伤人但要反驳
  ];

  const lower = intent.toLowerCase();
  for (const m of map) {
    if (m.keywords.some(k => lower.includes(k))) return m.type;
  }
  return "feeling"; // 默认
}


// ═══════════════════════════════════════════════════════════
// 亲密度计算
// ═══════════════════════════════════════════════════════════

function calcIntimacy(relationship) {
  const map = {
    "最好的朋友": 9, "闺蜜": 9, "死党": 9, "best_friend": 9,
    "好朋友": 8, "close_friend": 8,
    "朋友": 7, "friend": 7,
    "同事": 5, "coworker": 5, "colleague": 5,
    "认识的人": 4, "acquaintance": 4,
    "不太熟": 3, "not_close": 3,
    "上级": 3, "boss": 3, "上司": 3,
    "长辈": 3, "senior": 3,
    "陌生人": 1, "stranger": 1,
    "伴侣": 9, "partner": 9, "恋人": 9,
    "家人": 8, "family": 8,
    "自己": 10, "self": 10,
  };
  return map[relationship] || 5;
}


// ═══════════════════════════════════════════════════════════
// 核心引擎
// ═══════════════════════════════════════════════════════════

function generate_japanese_speech(input) {
  // 预处理
  const i = {
    ...input,
    intent_type: classifyIntent(input.intent),
    intimacy: calcIntimacy(input.relationship),
    has_prior_context: !!(input.context && input.context.length > 0),
    context_food: input.context && /吃|店|味|料理|food|restaurant|まずい|美味/.test(input.context),
  };

  const decision_path = [];
  const component_sequence = [];
  const fragments = [];

  // ────────────────────────────
  // 阶段0：评估
  // ────────────────────────────
  decision_path.push({
    phase: "评估",
    action: `社交风险=${i.social_risk} 确信度=${i.certainty} 紧迫度=${i.urgency} 亲密度=${i.intimacy} 意图类型=${i.intent_type}`,
    result: "计算管线配置"
  });

  // 紧急模式检测
  if (i.urgency >= 9) {
    decision_path.push({ phase: "紧急模式", action: "紧迫度≥9，跳过缓冲/压缩/降级", result: "直接输出语义+出口" });
    const payload = selectPayload(i);
    if (payload) { component_sequence.push(payload.id); fragments.push(payload.id); }
    const exit = selectExit(i);
    if (exit) { component_sequence.push(exit.id); fragments.push(exit.id); }
    return buildResult(decision_path, component_sequence, fragments);
  }

  // 自言自语模式
  if (i.intimacy >= 10 || i.social_risk === 0) {
    decision_path.push({ phase: "自言自语模式", action: "社交风险=0，跳过缓冲/压缩", result: "语义+(可选降级)+(可选出口)" });
    const payload = selectPayload(i);
    if (payload) { component_sequence.push(payload.id); fragments.push(payload.id); }
    if (i.certainty <= 6) {
      const dg = selectDowngrader(i);
      if (dg) { component_sequence.push(dg.id); fragments.push(dg.id); }
    }
    return buildResult(decision_path, component_sequence, fragments);
  }

  // ────────────────────────────
  // 阶段1：启动缓冲
  // ────────────────────────────
  if (i.social_risk >= 4) {
    const candidates = COMPONENTS.buffers.filter(b => b.condition(i));
    if (candidates.length > 0) {
      // 选择策略：社交风险越高选越软的（weight越低越软）
      // 但也考虑意图匹配
      candidates.sort((a, b) => {
        const a_fit = a.weight <= i.social_risk ? 1 : 0;
        const b_fit = b.weight <= i.social_risk ? 1 : 0;
        if (a_fit !== b_fit) return b_fit - a_fit;
        return Math.abs(a.weight - i.social_risk * 0.6) - Math.abs(b.weight - i.social_risk * 0.6);
      });

      const chosen = candidates[0];
      component_sequence.push(chosen.id);
      fragments.push(chosen.id);
      decision_path.push({
        phase: "启动缓冲",
        action: `社交风险=${i.social_risk}≥4 → 需要缓冲`,
        candidates: candidates.map(c => c.id).slice(0, 4),
        result: `选择「${chosen.id}」— ${chosen.desc}`
      });

      // 高风险时可能叠加第二层缓冲
      if (i.social_risk >= 7 && candidates.length > 1) {
        const second = candidates.find(c => c.id !== chosen.id && c.id !== chosen.id);
        // 避免两个相似的缓冲叠加
        const compatible_seconds = candidates.filter(c =>
          c.id !== chosen.id &&
          !(chosen.id === "なんか" && c.id === "えっと") &&
          !(chosen.id === "いや" && c.id === "えー")
        );
        if (compatible_seconds.length > 0) {
          // 只在真正高风险时叠加
          if (i.social_risk >= 8) {
            component_sequence.push(compatible_seconds[0].id);
            fragments.push(compatible_seconds[0].id);
            decision_path.push({
              phase: "启动缓冲(叠加)",
              action: `社交风险=${i.social_risk}≥8 → 叠加第二层缓冲`,
              result: `追加「${compatible_seconds[0].id}」`
            });
          }
        }
      }
    }
  } else {
    decision_path.push({ phase: "启动缓冲", action: `社交风险=${i.social_risk}<4 → 跳过`, result: "无缓冲" });
  }

  // ────────────────────────────
  // 阶段2：力度压缩
  // ────────────────────────────
  if (i.social_risk >= 5 && i.urgency < 7) {
    const candidates = COMPONENTS.compressors.filter(c => c.condition(i));
    if (candidates.length > 0) {
      candidates.sort((a, b) => Math.abs(a.weight - i.social_risk * 0.5) - Math.abs(b.weight - i.social_risk * 0.5));
      const chosen = candidates[0];
      component_sequence.push(chosen.id);
      fragments.push(chosen.id);
      decision_path.push({
        phase: "力度压缩",
        action: `社交风险=${i.social_risk}≥5 且 紧迫度=${i.urgency}<7 → 需要压缩`,
        candidates: candidates.map(c => c.id).slice(0, 4),
        result: `选择「${chosen.id}」— ${chosen.desc}`
      });
    }
  } else {
    const reason = i.social_risk < 5 ? `社交风险=${i.social_risk}<5` : `紧迫度=${i.urgency}≥7`;
    decision_path.push({ phase: "力度压缩", action: `${reason} → 跳过`, result: "无压缩" });
  }

  // ────────────────────────────
  // 阶段3：语义载体
  // ────────────────────────────
  const payload = selectPayload(i);
  if (payload) {
    component_sequence.push(payload.id);
    fragments.push(payload.id);
    decision_path.push({
      phase: "语义载体",
      action: `意图=${i.intent_type} 确信度=${i.certainty} 社交风险=${i.social_risk}`,
      result: `选择「${payload.id}」— 社交摩擦力=${payload.weight}`
    });
  }

  // ────────────────────────────
  // 阶段4：降级包装
  // ────────────────────────────
  // 检查是否已经通过疑问形式降级（如 〜くない？）
  const last_fragment = fragments[fragments.length - 1];
  const already_question = last_fragment && (last_fragment.endsWith("ない？") || last_fragment.endsWith("じゃない？"));

  if (!already_question && (i.certainty <= 7 || i.social_risk >= 5)) {
    const candidates = COMPONENTS.downgraders.filter(d => d.condition(i));
    if (candidates.length > 0) {
      // 社交风险越高选越重的降级
      candidates.sort((a, b) => {
        if (i.social_risk >= 7) return b.weight - a.weight; // 高风险：选最强降级
        return Math.abs(a.weight - i.social_risk * 0.7) - Math.abs(b.weight - i.social_risk * 0.7);
      });
      const chosen = candidates[0];
      component_sequence.push(chosen.id);
      fragments.push(chosen.id);
      decision_path.push({
        phase: "降级包装",
        action: `确信度=${i.certainty}≤7 或 社交风险=${i.social_risk}≥5 → 需要降级`,
        candidates: candidates.map(c => c.id).slice(0, 4),
        result: `选择「${chosen.id}」— ${chosen.desc}`
      });

      // 超高风险叠加降级
      if (i.social_risk >= 8 && candidates.length > 1) {
        const second = candidates.find(c => c.id !== chosen.id);
        if (second) {
          component_sequence.push(second.id);
          fragments.push(second.id);
          decision_path.push({
            phase: "降级包装(叠加)",
            action: `社交风险=${i.social_risk}≥8 → 叠加第二层降级`,
            result: `追加「${second.id}」`
          });
        }
      }
    }
  } else if (already_question) {
    decision_path.push({ phase: "降级包装", action: "疑问形式已内含降级 → 跳过", result: "无额外降级" });
  } else {
    decision_path.push({ phase: "降级包装", action: `确信度=${i.certainty}>7 且 社交风险=${i.social_risk}<5 → 跳过`, result: "无降级" });
  }

  // ────────────────────────────
  // 阶段5：出口策略
  // ────────────────────────────
  const exit = selectExit(i);
  if (exit) {
    component_sequence.push(exit.id);
    fragments.push(exit.id);
    decision_path.push({
      phase: "出口策略",
      action: `选择句子结束方式`,
      result: `选择「${exit.id}」— ${exit.desc}`
    });
  }

  // ────────────────────────────
  // 阶段6：社交追加（可选）
  // ────────────────────────────
  const extras = COMPONENTS.social_extras.filter(e => e.condition(i));
  if (extras.length > 0 && i.social_risk >= 5) {
    // 最多加一个
    const chosen = extras[0];
    component_sequence.push(chosen.id);
    fragments.push(chosen.id);
    decision_path.push({
      phase: "社交追加",
      action: `社交风险=${i.social_risk}≥5 → 追加社交保险`,
      result: `追加「${chosen.id}」— ${chosen.desc}`
    });
  }

  return buildResult(decision_path, component_sequence, fragments);
}


// ═══════════════════════════════════════════════════════════
// 语义选择
// ═══════════════════════════════════════════════════════════

function selectPayload(i) {
  const category = COMPONENTS.payloads[i.intent_type] || COMPONENTS.payloads.feeling;
  if (!category || category.length === 0) return null;

  // 过滤可用的
  const available = category.filter(p =>
    i.certainty >= p.min_certainty &&
    i.social_risk <= p.max_social_risk
  );

  if (available.length === 0) {
    // 放宽条件
    const relaxed = category.filter(p => i.social_risk <= p.max_social_risk + 2);
    if (relaxed.length > 0) {
      relaxed.sort((a, b) => a.weight - b.weight);
      return relaxed[0];
    }
    // 最后手段：选最轻的
    const sorted = [...category].sort((a, b) => a.weight - b.weight);
    return sorted[0];
  }

  // 选择逻辑：确信度高→偏重，社交风险高→偏轻
  // 目标weight = certainty * 0.8 - social_risk * 0.5
  const target = i.certainty * 0.8 - i.social_risk * 0.5;
  available.sort((a, b) => Math.abs(a.weight - target) - Math.abs(b.weight - target));
  return available[0];
}


// ═══════════════════════════════════════════════════════════
// 出口选择
// ═══════════════════════════════════════════════════════════

function selectExit(i) {
  const candidates = COMPONENTS.exits.filter(e => e.condition(i));
  if (candidates.length === 0) return null;

  // 社交风险高→选更间接的（weight低）
  // 确信度高+风险低→选断言型（weight高）
  const target = i.certainty * 0.6 - i.social_risk * 0.4;
  candidates.sort((a, b) => Math.abs(a.weight - target) - Math.abs(b.weight - target));
  return candidates[0];
}


// ═══════════════════════════════════════════════════════════
// 组装输出
// ═══════════════════════════════════════════════════════════

function buildResult(decision_path, component_sequence, fragments) {
  return {
    decision_path,
    component_sequence,
    final_output: assembleJapanese(fragments),
  };
}

function assembleJapanese(fragments) {
  if (fragments.length === 0) return "";

  // 组装规则
  let result = "";
  for (let idx = 0; idx < fragments.length; idx++) {
    const f = fragments[idx];
    const prev = idx > 0 ? fragments[idx - 1] : null;
    const next = idx < fragments.length - 1 ? fragments[idx + 1] : null;

    // 缓冲后面加逗号或空格
    const isBuffer = COMPONENTS.buffers.some(b => b.id === f);
    const isCompressor = COMPONENTS.compressors.some(c => c.id === f);
    const isDowngrader = COMPONENTS.downgraders.some(d => d.id === f);
    const isExit = COMPONENTS.exits.some(e => e.id === f);
    const isSocial = COMPONENTS.social_extras.some(s => s.id === f);

    if (isBuffer) {
      if (f === "えー" || f === "いや" || f === "あのさ" || f === "ねえ" || f === "正直に言うと") {
        result += f + "、";
      } else if (f === "なんか" || f === "まあ" || f === "えっと") {
        result += f;
      } else {
        result += f + "、";
      }
    } else if (isCompressor) {
      result += f;
    } else if (isDowngrader) {
      // 降级器连接到语义后面
      if (f === "気がする" || f === "感じする") {
        result += f;
      } else if (f === "かも" || f === "かな") {
        result += f;
      } else if (f === "っぽい") {
        result += f;
      } else if (f === "なんとも言えない" || f === "好み分かれる") {
        // 这些是独立表达
        if (result.length > 0) result += "...";
        result += f;
      } else {
        result += f;
      }
    } else if (isExit) {
      if (f === "んだけど" || f === "けど" || f === "けどな" || f === "し") {
        result += f;
      } else if (f === "よね" || f === "じゃない？" || f === "でしょ") {
        result += f;
      } else if (f === "知らんけど") {
        result += "。" + f;
      } else if (f === "かなって") {
        result += f;
      } else {
        result += f;
      }
    } else if (isSocial) {
      result += "..." + f;
    } else {
      // 语义载体
      result += f;
    }
  }

  return result;
}


// ═══════════════════════════════════════════════════════════
// 导出
// ═══════════════════════════════════════════════════════════

if (typeof module !== 'undefined') {
  module.exports = { generate_japanese_speech };
}
if (typeof window !== 'undefined') {
  window.generate_japanese_speech = generate_japanese_speech;
}
