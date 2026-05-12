import physicsKnowledgeJson from "./physics-knowledge.json";
import mathKnowledgeJson from "./math-knowledge.json";
import polKnowledgeJson from "./pol-knowledge.json";
import chemKnowledgeJson from "./chem-knowledge.json";
import crossKnowledgeJson from "./cross-knowledge.json";
import historyKnowledgeJson from "./history-knowledge.json";
import { ENGLISH_KNOWLEDGE_LEAVES, ENGLISH_SKILL_LEAVES } from "./english-knowledge";

export const SUBJECTS = ["语文", "数学", "英语", "物理", "化学", "跨学科", "历史", "道法"] as const;

export type Subject = (typeof SUBJECTS)[number];

/** 按章节、小节组织的知识点正文（Markdown），物理 / 数学等科目共用 */
export type StructuredKnowledgeItem = {
  id: string;
  chapter: string;
  book?: string;
  title: string;
  content: string;
  imagePlaceholder?: boolean;
};

/** @deprecated 请使用 StructuredKnowledgeItem */
export type PhysicsKnowledgeItem = StructuredKnowledgeItem;

const unicodeSubscriptMap: Record<string, string> = {
  "₀": "0",
  "₁": "1",
  "₂": "2",
  "₃": "3",
  "₄": "4",
  "₅": "5",
  "₆": "6",
  "₇": "7",
  "₈": "8",
  "₉": "9",
  "₊": "+",
  "₋": "-",
  "₌": "=",
  "₍": "(",
  "₎": ")",
};

function normalizeInlineLatex(text: string): string {
  return text.replace(/\$([^$]+)\$/g, (_match, body: string) => {
    const normalizedBody = body
      .trim()
      .replace(/([A-Za-z\)\]])([₀₁₂₃₄₅₆₇₈₉₊₋₌₍₎]+)/g, (_subMatch, base: string, subscript: string) => {
        const normalizedSubscript = Array.from(subscript)
          .map((char) => unicodeSubscriptMap[char] ?? char)
          .join("");
        return `${base}_{${normalizedSubscript}}`;
      });

    return `$${normalizedBody}$`;
  });
}

function sanitizeChemistryKnowledgeItem(item: StructuredKnowledgeItem): StructuredKnowledgeItem {
  return {
    ...item,
    chapter: normalizeInlineLatex(item.chapter),
    title: normalizeInlineLatex(item.title),
    content: normalizeInlineLatex(item.content),
  };
}

/** 初中物理、数学、道法、化学、跨学科等：文档导入的结构化知识点 */
export const KNOWLEDGE_POINTS: {
  物理: StructuredKnowledgeItem[];
  数学: StructuredKnowledgeItem[];
  道法: StructuredKnowledgeItem[];
  化学: StructuredKnowledgeItem[];
  跨学科: StructuredKnowledgeItem[];
  历史: StructuredKnowledgeItem[];
} = {
  物理: physicsKnowledgeJson as StructuredKnowledgeItem[],
  数学: mathKnowledgeJson as StructuredKnowledgeItem[],
  道法: polKnowledgeJson as StructuredKnowledgeItem[],
  化学: (chemKnowledgeJson as StructuredKnowledgeItem[]).map(sanitizeChemistryKnowledgeItem),
  跨学科: crossKnowledgeJson as StructuredKnowledgeItem[],
  历史: historyKnowledgeJson as StructuredKnowledgeItem[],
};

export const STRUCTURED_KNOWLEDGE_SUBJECTS = ["物理", "数学", "道法", "化学", "跨学科", "历史"] as const satisfies readonly Subject[];

export function getStructuredKnowledge(subject: Subject): StructuredKnowledgeItem[] | null {
  if (subject === "物理") return KNOWLEDGE_POINTS.物理;
  if (subject === "数学") return KNOWLEDGE_POINTS.数学;
  if (subject === "道法") return KNOWLEDGE_POINTS.道法;
  if (subject === "化学") return KNOWLEDGE_POINTS.化学;
  if (subject === "跨学科") return KNOWLEDGE_POINTS.跨学科;
  if (subject === "历史") return KNOWLEDGE_POINTS.历史;
  return null;
}

/** 知识点目录是否按「教材册数」二次分组（chapter 形如「七年级上册 - 第一单元 …」） */
export function usesVolumeGroupedKnowledgeDirectory(subject: Subject): boolean {
  return subject === "道法";
}

/** 化学 / 历史：按分组标题展示卡片网格，详情按条目 id 选中 */
export function usesItemIdKnowledgeDirectory(subject: Subject): boolean {
  return subject === "化学" || subject === "历史";
}

function summarizeForPicker(content: string): string {
  const first = content
    .replace(/\*\*/g, "")
    .split("\n")
    .find((line) => line.trim().length > 0);
  if (!first) return "";
  return first.length > 140 ? `${first.slice(0, 140)}…` : first;
}

function buildEnglishSolvingSkills(): Record<string, SolvingSkill[]> {
  const grouped = new Map<string, SolvingSkill[]>();

  for (const item of ENGLISH_SKILL_LEAVES) {
    const category = item.pathTitles[0] ?? "英语解题技巧";
    const detailSource = item.coreContent || item.warning;
    const next = grouped.get(category) ?? [];
    next.push({
      id: item.id,
      label: item.title,
      detail: summarizeForPicker(detailSource),
    });
    grouped.set(category, next);
  }

  return Object.fromEntries(grouped);
}

export type KnowledgePoint = {
  id: string;
  title: string;
  summary: string;
};

export type SolvingSkill = {
  id: string;
  label: string;
  detail: string;
};

export const knowledgePoints: Record<Subject, KnowledgePoint[]> = {
  语文: [
    { id: "cn-modern-reading", title: "现代文阅读主旨提炼", summary: "先分层再归纳中心句，避免只摘抄原文。"},
    { id: "cn-classic-words", title: "文言实词语境推断", summary: "结合上下句关系与常见义项进行排除。"},
  ],
  数学: KNOWLEDGE_POINTS.数学.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  英语: ENGLISH_KNOWLEDGE_LEAVES.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.coreContent),
  })),
  物理: KNOWLEDGE_POINTS.物理.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  化学: KNOWLEDGE_POINTS.化学.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  跨学科: KNOWLEDGE_POINTS.跨学科.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  历史: KNOWLEDGE_POINTS.历史.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
  道法: KNOWLEDGE_POINTS.道法.map((item) => ({
    id: item.id,
    title: item.title,
    summary: summarizeForPicker(item.content),
  })),
};

export const solvingSkills: Record<Subject, Record<string, SolvingSkill[]>> = {
  语文: {
    阅读理解: [
      { id: "cn-skill-keyword-circle", label: "关键词圈画法", detail: "圈人物、情感词、转折词再作答。" },
      { id: "cn-skill-answer-template", label: "分点模板作答", detail: "先观点后依据，避免只写结论。" },
    ],
  },
  数学: {
    函数题: [
      { id: "math-skill-domain-first", label: "先定义域后运算", detail: "先判断取值范围可减少错算。" },
      { id: "math-skill-two-methods", label: "双方法交叉验证", detail: "代数法与图像法交叉检验结果。" },
    ],
    几何题: [
      { id: "math-skill-invariant-find", label: "找不变量", detail: "长度、角度或面积关系常是突破口。" },
    ],
  },
  英语: {
    ...buildEnglishSolvingSkills(),
  },
  物理: {
    力学计算: [
      { id: "phy-skill-formula-route", label: "公式路径图", detail: "列已知与所求，按关系推导。" },
    ],
    电学题: [
      { id: "phy-skill-node-mark", label: "节点标记法", detail: "先标电势高低，再判电流方向。" },
    ],
  },
  化学: {
    推断题: [
      { id: "chem-skill-feature-breakthrough", label: "特征现象突破", detail: "颜色、沉淀、气味优先使用。" },
    ],
    实验题: [
      { id: "chem-skill-variable-control", label: "控制变量作答", detail: "每次只改变一个实验条件。" },
    ],
  },
  跨学科: {
    地理: [
      { id: "cross-geo-map-three", label: "地图三要素先行", detail: "先判方向（一般地图/经纬网/指向标），再读比例尺与图例注记，最后落点到具体问题。" },
      { id: "cross-geo-contour", label: "等高线地形判读", detail: "闭合中心高为峰、凸低为脊、凸高为谷；密陡疏缓；鞍部在两峰之间，陡崖多条线重合。" },
      { id: "cross-geo-earth-motion", label: "自转公转分现象", detail: "自转对应昼夜与地方时差异；公转对应季节、正午太阳高度与五带，避免把现象混到同一运动上。" },
      { id: "cross-geo-climate-factors", label: "气候三因素框架", detail: "纬度定热量带，海陆定季风与降水差异，地形改局部气温与迎风坡降水。" },
      { id: "cross-geo-region-locate", label: "区域定位两步", detail: "先用经纬或大洲大洋框范围，再用海峡、河流、首都等锚点精确定位。" },
      { id: "cross-geo-china-boundary", label: "中国界线对照表", detail: "季风/非季风、秦岭—淮河、地势阶梯等界线各管一类差异，答题时先选对界线再写两侧特征。" },
      { id: "cross-geo-four-regions", label: "四大地理区域对比", detail: "北方旱作与能源、南方水田与水能、西北干旱与灌溉农业、青藏高寒与河谷，按自然—农业—民居—问题成对记忆。" },
      { id: "cross-geo-chart-read", label: "地理图表读数", detail: "柱状/折线看坐标单位与图例，曲线找极值与趋势；示意图先读箭头含义再写因果。" },
    ],
    生物: [
      { id: "cross-bio-levels", label: "结构层次串线", detail: "细胞→组织→器官→系统→个体，答题时判断考点落在哪一层，不要把“器官”写成“组织”。" },
      { id: "cross-bio-tissue-four", label: "四大组织对照", detail: "上皮保护分泌、结缔支持营养、肌肉收缩、神经传导，结合分布位置与功能关键词匹配。" },
      { id: "cross-bio-homeostasis", label: "内环境稳态归因", detail: "循环运输、呼吸气体、消化吸收、泌尿调节与排泄，按“缺什么系统会乱什么指标”反推。" },
      { id: "cross-bio-reflex-path", label: "反射弧五段填空", detail: "感受器→传入神经→神经中枢→传出神经→效应器，缺一段即反射不能完成。" },
      { id: "cross-bio-hormone-table", label: "激素腺体对照", detail: "垂体生长、甲状腺代谢与发育、胰岛降糖、肾上腺应激，把“过多/过少”与典型病症配对。" },
      { id: "cross-bio-genetics", label: "遗传题画图解", detail: "先写亲本基因型与配子，再棋盘或分支得子代；性别由精子类型决定，概率独立计算。" },
      { id: "cross-bio-infection-chain", label: "传染病三环节", detail: "传染源、传播途径、易感人群；措施对应管理传染源、切断途径、保护易感者。" },
      { id: "cross-bio-immunity-lines", label: "三道防线分层", detail: "皮肤黏膜为非特异第一道，吞噬炎症第二道，淋巴细胞与抗体为特异第三道。" },
      { id: "cross-bio-taxonomy", label: "类群特征抓关键词", detail: "有无脊柱分脊椎/无脊椎；种子植物看果皮；微生物看有无细胞核与细胞结构。" },
      { id: "cross-bio-ecosystem-flow", label: "生态系统能量与物质", detail: "能量沿食物链单向递减；物质如碳在生物与环境间循环；信息传递辅助调节种间关系。" },
      { id: "cross-bio-experiment", label: "实验变量与控制", detail: "先找自变量、因变量、无关变量；对照组只改变一个条件，结论回扣实验目的。" },
    ],
  },
  历史: {
    中国古代史: [
      { id: "his-ancient-dynasty-line", label: "朝代主线串联", detail: "先抓政权更替主线，再把制度、经济、民族关系和文化成就挂到对应朝代上。" },
      { id: "his-ancient-system-match", label: "制度归属对照", detail: "分封制、郡县制、科举制、行省制等先认准所处朝代，再写作用与影响。" },
      { id: "his-ancient-reform-cause", label: "改革因果拆解", detail: "变法题按“背景—措施—结果—影响”四步写，避免只背措施不讲成效。" },
      { id: "his-ancient-culture-classify", label: "文化成就分类记忆", detail: "科技、思想、文学艺术分栏整理，同类比较更容易区分甲骨文、造纸术、石窟、诸子百家等考点。" },
      { id: "his-ancient-unity-and-fusion", label: "统一与交融双线", detail: "遇到秦汉隋唐元清等大一统王朝，先写统一措施，再补民族交融和疆域治理。" },
    ],
    中国近代史: [
      { id: "his-near-treaty-chain", label: "条约链定位", detail: "鸦片战争到辛丑条约按“战争—条约—危害”连起来，快速判断中国半殖民地化加深过程。" },
      { id: "his-near-explore-compare", label: "近代化探索对比", detail: "洋务、戊戌、辛亥、新文化分清领导阶层、主张、结果和历史作用，横向比较最有效。" },
      { id: "his-near-revolution-stage", label: "革命阶段分段", detail: "旧民主主义革命与新民主主义革命不要混写，关键用五四运动和中共成立做分界。" },
      { id: "his-near-warfronts", label: "抗战正敌后配合", detail: "抗日战争题先分正面战场与敌后战场，再写统一战线和胜利意义。" },
      { id: "his-near-event-significance", label: "事件意义模板", detail: "重要事件按“直接影响 + 长远意义”作答，如辛亥革命、五四运动、遵义会议、抗战胜利。" },
    ],
    中国现代史: [
      { id: "his-modern-stage-divide", label: "建国后阶段划分", detail: "按新中国成立与巩固、制度建立与探索、改革开放、新时代发展几段去定位事件和政策。" },
      { id: "his-modern-policy-and-effect", label: "政策效果回扣", detail: "土地改革、一五计划、三大改造、家庭联产承包、经济特区等都要写清目标与成效。" },
      { id: "his-modern-meeting-turning", label: "会议转折点识别", detail: "政协一届、人大一届、十一届三中全会等会议题，先写决策内容，再点明历史转折意义。" },
      { id: "his-modern-unity-and-diplomacy", label: "统一外交双主题", detail: "民族团结、港澳回归、两岸关系与外交成就分主题记忆，答题时不要把内政外交混成一段。" },
      { id: "his-modern-life-change", label: "社会生活变化对照", detail: "从衣食住行用和科技文化入手，用“过去—现在”对照概括现代化成就。" },
    ],
    世界史: [
      { id: "his-world-civilization-compare", label: "文明横向比较", detail: "亚非古国、希腊罗马、封建欧洲和亚洲国家先比地理环境、制度、文化，再写共同点与差异。" },
      { id: "his-world-capitalism-path", label: "资本主义道路梳理", detail: "英国资产阶级革命、美国独立、法国大革命、俄日美改革与战争都放在“制度确立与扩展”主线上看。" },
      { id: "his-world-industrial-impact", label: "工业革命三层影响", detail: "从生产力提升、社会结构变化、世界联系加深三层概括两次工业革命影响。" },
      { id: "his-world-war-order", label: "大战与国际秩序", detail: "一战接凡尔赛—华盛顿体系，二战接联合国与冷战格局，时间线写清更不易混乱。" },
      { id: "his-world-20th-century-logic", label: "二十世纪世界逻辑", detail: "把十月革命、经济危机、二战、冷战、苏联解体、多极化放在“格局演变”框架里理解。" },
      { id: "his-world-material-keyword", label: "世界史材料抓关键词", detail: "看材料中的人物、制度名、科技名和时间点，先判断国家与时代，再组织答案。" },
    ],
  },
  道法: {
    案例分析: [
      { id: "pol-skill-rule-apply", label: "法理套用三步", detail: "定性、引用、回扣情境。" },
    ],
  },
};

