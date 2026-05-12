export type EnglishKnowledgeContentLabel = "核心内容提要" | "核心知识点" | "知识点" | "答题方法";

export type EnglishKnowledgeBranchNode = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  children: EnglishKnowledgeNode[];
};

export type EnglishKnowledgeLeafNode = {
  id: string;
  title: string;
  level: 3 | 4;
  pathIds: string[];
  pathTitles: string[];
  coreContent: string;
  warning: string;
  contentLabels: EnglishKnowledgeContentLabel[];
};

export type EnglishKnowledgeNode = EnglishKnowledgeBranchNode | EnglishKnowledgeLeafNode;

type DraftBranchNode = {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  children: DraftNode[];
};

type DraftLeafNode = {
  id: string;
  title: string;
  level: 3 | 4;
  contentBlocks: { label: EnglishKnowledgeContentLabel; parts: string[] }[];
  warningParts: string[];
};

type DraftNode = DraftBranchNode | DraftLeafNode;

const englishKnowledgeSource = `
内功心法
词汇：
专题1：基础释义
核心内容提要：熟练掌握上海中考大纲要求的核心词汇，做到“音、形、义”三位一体。不仅要认识单词，还要能准确拼写出常考词汇，并了解其最基本的中文释义和词性。
高频易错预警：考试中容易因为相似字母或发音导致拼写错误（如 quiet 和 quite，weather 和 whether）；警惕部分含有不发音字母的单词（如 knowledge, listen）在听力和拼写中的陷阱。
专题2：一词多义
核心内容提要：英语中有很多“熟词生义”的现象。同一个单词在不同的语境下会有截然不同的意思。重点积累在阅读理解和完形填空中常考的次要含义（例如：book 作名词是“书”，作动词是“预订”；water 作名词是“水”，作动词是“浇水”；capital 可以指“首都”、“大写字母”或“资金”）。
高频易错预警：做阅读理解时，切忌将自己最熟悉的那一个意思生搬硬套。一定要结合上下文语境（Context）去推断该词在当前句子中的准确含义。
专题3：词组搭配
核心内容提要：英语学习不能只背孤立的单词，必须建立“词块（Chunk）”意识。重点攻克动词与介词/副词的搭配（如 depend on, give up）、形容词与介词的搭配（如 be strict with, be famous for）以及常见的固定表达。
高频易错预警：很多同学在单项选择和首字母填空中失分，是因为没有记住固定的介词尾巴。千万要注意，同一个动词跟不同的介词，意思往往千差万别（比如 look for 寻找，look after 照顾，look forward to 期待）。
专题4：词组辨析
核心内容提要：针对长相相似或中文翻译相近的词组进行精准区分。搞清楚它们在词性、用法习惯以及所接宾语类型上的细微差别。
高频易错预警：
中文意思相近但用法不同：比如 take part in（强调参加某项活动或运动并在其中起作用）和 join（强调加入某个组织或团体并成为其中一员）。
接词属性不同：重点区分后面接句子还是接名词/动名词。比如 because（连词，后接完整的句子）和 because of（介词短语，后接名词、代词或动名词）；类似还有 instead 和 instead of。
词法：
【名词板块】
专题5：可数名词与不可数名词
核心知识点：准确区分可数与不可数名词；熟练掌握可数名词单数变复数的规则变化与不规则变化（如man-men, foot-feet等）；掌握不可数名词的量化表达方式（如a piece of...）。
专题6：名词所有格
核心知识点：掌握 's 所有格（多用于有生命的事物）和 of 所有格（多用于无生命的事物）的构成和使用场景，以及双重所有格的用法。
【代词板块】
专题7：人称代词、物主代词、反身代词及it的用法
核心知识点：掌握人称代词主格与宾格的转换；区分形容词性物主代词与名词性物主代词；熟记反身代词的固定搭配；重点攻克 "it" 作为形式主语、形式宾语，以及指代天气、时间、距离的特殊用法。
专题8：指示代词、疑问代词和相互代词
核心知识点：正确区分和使用 this/that/these/those；熟练运用 who/whom/whose/which/what 等疑问代词引导特殊疑问句；了解 each other / one another 的基本用法。
专题9：不定代词
核心知识点：中考高频易错点。重点辨析 some 与 any, many 与 much, a few / few / a little / little, 以及 other / another / the other / others 等易混淆不定代词的区别与具体语境应用。
【数词板块】
专题10：基数词与序数词
核心知识点：掌握1-100及以上数字的基数词正确拼写；牢记基数词变序数词的规律法则及特殊词汇（如 first, second, third, fifth, twelfth, twentieth等）。
专题11：数词的用法
核心知识点：掌握时间、日期、年份、年龄、分数的基本表达方式；重点掌握 hundred, thousand, million 等词在表示确切数字与模糊数字（如 hundreds of）时的不同用法。
【冠词板块】
专题12：冠词的用法
核心知识点：掌握不定冠词 a/an 的区分（重点：根据单词首音素是否为元音判断，如 an honest boy）；熟练运用定冠词 the 的特指用法及固定搭配；牢记不用冠词（零冠词）的常见情况（如三餐、球类、学科名称前）。
【形容词与副词板块】
专题13：形容词及其用法
核心知识点：掌握形容词作定语和表语的基本位置；攻克高频考点：区分 -ed 结尾（修饰人，表示人的感受）与 -ing 结尾（修饰物，表示事物的特征）的形容词（如 interested / interesting）。
专题14：副词的种类及用法
核心知识点：了解时间、地点、方式及程度副词的用法；重点掌握频度副词（always, usually, often, sometimes, never 等）在句中的绝对位置（be 动词、情态动词之后，实义动词之前）。
专题15：形容词与副词的比较等级
核心知识点：熟记原级、比较级、最高级的规则变化与常见的不规则变化（如 good/well - better - best）；掌握同级比较 (as...as)、比较级专属修饰语 (much, even, a little) 以及“the+比较级，the+比较级”等句型。
【介词板块】
专题16：表示时间的介词
核心知识点：精准区分 in, on, at 的时间范围（如 at + 具体时刻，on + 具体某一天，in + 年/月/季节）；掌握 since, for 在完成时态中的用法区别。
专题17：表示地点的介词
核心知识点：辨析 in, on, at 表示位置的层级区别；理清 over, under, above, below, between, among 等方位介词的具体空间逻辑关联。
专题18：其他常用介词
核心知识点：掌握 with/without, by, for, about 等介词在表示方式、原因、目的等不同语境下的灵活运用。
专题19：常见介词搭配
核心知识点：中考失分重灾区。重点背诵和积累动词+介词（如 look forward to）、形容词+介词（如 be proud of）的固定搭配组合。
【连词板块】
专题20：并列连词
核心知识点：掌握 and, but, or, so 的逻辑转折关系；重点攻克 both...and, either...or, neither...nor, not only...but also 的用法，并牢记它们在作主语时遵循的“就近原则”。
专题21：从属连词
核心知识点：掌握引导各类状语从句的连词，如时间（when, while, until）、原因（because, since）、条件（if, unless）、让步（although/though，注意不能与 but 连用），理清主从句的逻辑脉络。
【动词板块】
专题22：连系动词
核心知识点：掌握 be 动词的基本用法；熟记常见的感官动词（look, sound, smell, taste, feel）及状态变化动词（become, get, turn），并牢记连系动词后必须接形容词作表语，不能接副词。
专题23：情态动词
核心知识点：掌握 can, may, must, need, should 的基本语气区别；重点突破 must 与 have to 的区别，以及 must/can 表推测时的肯定与否定用法（如 must be 一定是，can't be 不可能是）。
【时态板块】
专题24：一般现在时
核心知识点：理解一般现在时表示客观真理、经常性动作或状态的场景；高频易错点：当主语为第三人称单数时，动词词尾需做规则或不规则变化。
专题25：一般过去时
核心知识点：牢记动词过去式的规则变化与不规则变化表；能够敏锐识别带有明确过去时间状语（如 yesterday, just now, in 1990）的句子并准确填空。
专题26：一般将来时
核心知识点：掌握 will + 动词原形 与 be going to + 动词原形 的区别与互换；了解“主将从现”原则（在条件和时间状语从句中用一般现在时表将来）。
专题27：现在进行时
核心知识点：熟练掌握 be (am/is/are) + doing 的基础结构；熟记动词现在分词（-ing）的构成规则（如双写尾字母加 ing 等）；学会抓取 look!, listen!, now 等进行时标志词。
专题28：现在完成时
核心知识点：熟练掌握结构 have/has + 过去分词；理解其表示“过去发生动作对现在造成影响”或“动作从过去持续到现在”的含义；熟记搭配的时间状语（already, yet, ever, never, since, for 等）。
高频易错预警：极易混淆 have been to（去过已回）、have gone to（去了未回）与 have been in（待在某地）的区别；瞬间动词（如 borrow, buy, die）在现在完成时中不能与表示一段时间的状语（for.../since...）连用，需转换为延续性动词（如 keep, have, be dead）。
专题29：过去完成时
核心知识点：掌握结构 had + 过去分词；深刻理解“过去的过去”这一概念，通常在句子中会有一个一般过去时的动作作为时间参照物。
专题30：过去进行时 & 过去将来时
核心知识点：过去进行时结构为 was/were + doing，常搭配 at this time yesterday 等时间状语；过去将来时结构为 would + 动词原形 或 was/were going to + 动词原形，常用于宾语从句的主从时态呼应中。
专题31：时态综合运用
核心知识点：在没有明确时间提示词的长句或语篇中，通过上下文语境、主从句逻辑关系来推断和选择正确的时态。
【语态板块】
专题32：一般现在时、一般过去时和现在完成时的被动语态
核心知识点：牢记被动语态的核心公式 be + 过去分词 (done)；掌握这三种最常见时态下的 be 动词变形（am/is/are done; was/were done; have/has been done）。
专题33：一般将来时的被动语态以及含有情态动词的被动语态
核心知识点：掌握一般将来时被动结构 will be done；情态动词被动结构 情态动词 + be + done。
专题34：主动语态和被动语态综合运用
高频易错预警：不及物动词（如 happen, take place, break out）没有被动语态；某些感官动词和使役动词（如 see, hear, make）在主动句中省略 to，但在变为被动语态时，必须把 to 还原（如 be made to do sth.）。
【非谓语动词板块】
专题35：非谓语动词的用法
核心知识点：明确动词不定式 (to do)、动名词 (doing) 和分词在句中不能作谓语。
高频易错预警：必须死记硬背只接 doing 作宾语的动词（如 enjoy, finish, mind, practice 等）和只接 to do 作宾语的动词（如 decide, hope, wish, agree 等）；区分意义不同的搭配，如 stop to do（停下来去做另一件事）与 stop doing（停止正在做的事）。
句法：
【句子种类】
专题36：陈述句与一般疑问句
核心知识点：掌握肯定句变否定句的规则（be动词/情态动词后加not，实义动词借助don't/doesn't/didn't）；熟练进行陈述句与一般疑问句的相互转换。
专题37：特殊疑问句
核心知识点：掌握“疑问词 + 一般疑问句”的语序结构；精准选择相应的疑问词（如 how long 问时长，how often 问频率，how soon 问多久之后）。
专题38：反意疑问句、祈使句与感叹句
核心知识点：牢记反意疑问句“前肯后否，前否后肯”的原则；感叹句掌握 What (a/an) + adj. + n. + 主谓! 和 How + adj./adv. + 主谓! 的句型转换。
高频易错预警：当反意疑问句前半句含有 never, hardly, few, little 等否定或半否定词时，后半句必须用肯定形式。
【句子成分】
专题39：句子的成分
核心知识点：识别句子的主、谓、宾、定、状、表、补等基本成分，理清句子的基本骨架，这对于分析长难句和做好阅读理解至关重要。
【句子类型】
专题40：简单句
核心知识点：掌握英语的五种基本句型（主谓、主谓宾、主谓双宾、主谓宾宾补、主系表）。
专题41：并列句
核心知识点：理解由 and, but, or, so 等并列连词连接的两个或多个简单句的逻辑关系。
专题42-46：状语从句综合（时间、条件、目的、结果、原因、让步）
核心知识点：熟练掌握各类状语从句的引导词。时间（when, while, until）；条件（if, unless）；目的与结果（so that, so...that, such...that）；原因（because, since, as）；让步（although, though）。
高频易错预警：
“主将从现”原则：在 if、unless 引导的条件状语从句，以及 when、until 引导的时间状语从句中，主句用将来时，从句必须用一般现在时表将来。
连词互斥：although/though 绝对不能和 but 连用；because 绝对不能和 so 连用（中英表达习惯差异）。
专题47：宾语从句
核心知识点：攻克宾语从句的三大关卡：引导词（that, if/whether, 或特殊疑问词）、语序（必须是陈述语序）、时态呼应（主句是一般过去时，从句必须降级为相应的过去时态；但如果从句是客观真理，时态保持一般现在时不变）。
高频易错预警：当引导词是特殊疑问词（如 what, where, how）时，后面的从句极易忘记转换为陈述语序（如误写成 I don't know where does he live，应为 where he lives）。
专题48：定语从句
核心知识点：准确找出“先行词”，并据此选择正确的“关系代词”（指人修饰语用 who/whom/that，指物修饰语用 which/that，表所属关系用 whose）。
高频易错预警：关系代词在定语从句中充当宾语时可以省略，但充当主语时绝对不能省略。
【主谓一致板块】
专题50：主谓一致的用法
核心知识点：掌握主谓一致的三大原则：语法一致、意义一致、就近原则。
高频易错预警：
就近原则：There be 句型，以及 either...or...、neither...nor...、not only...but also... 连接两个主语时，谓语动词的单复数由最靠近它的那个主语决定。
就远原则：当主语后面跟有 with, together with, as well as 等词组时，谓语动词的单复数要和最前面的主语保持一致，不要被中间插入的词组干扰。
整体概念：表示时间、距离、金钱、重量的复数名词作主语时，通常被看作一个整体，谓语动词要用单数（如 Two months is a long time）。
外功招式
一、 阅读选择
1、审题技巧
知识点：拿到题目先看题干，圈出核心关键词（如人名、地名、时间、特殊事件）。判断题目类型：是细节题（问what/when/where）、推理题（包含infer/suggest/imply）、还是词义猜测题（The word "..." means...）。
高频易错预警： 切忌看错题干中的否定词，如 NOT true, EXCEPT，这些往往是出题人设下的陷阱。
2、文意理解
知识点：遇到生词不要慌，利用上下文语境（Context）、同义词替换或句子前后的逻辑连词（but, however, because）来猜词。注意明确代词（it, they, this）在文中的具体指代对象。
高频易错预警：选项中出现与原文一模一样的句子不一定是正确答案，很多时候是“偷换概念”；真正正确的选项往往是对原文的同义替换。
3、主旨判断
知识点：寻找文章的“文眼”。重点阅读首段（通常引出话题）、尾段（通常总结升华）以及每一段的首句（Topic Sentence）。
高频易错预警：排除干扰选项时，注意三个“太”：太泛（范围超出了文章）、太窄（只是文章的一个小细节，不能概括全文）、太偏（文章根本没提到）。最佳标题通常既能涵盖全文，又足够精炼。
二、 首字母填空
步骤 1：抓大放小
答题方法：拿到题目，绝对不要看一个空填一个词。第一遍必须带着空格把全文读完，弄懂文章的体裁（记叙文、说明文还是议论文）和整体情感基调（积极还是消极）。
步骤 2：词性判断
答题方法： 根据空格前后的词，推断该填什么词性：
缺名词（n.）：空格在冠词（a/an/the）、形容词、介词或物主代词（my/his）之后；或者在句首作主语。
缺动词（v.）：空格在主语之后作谓语；在 to 之后作不定式；在情态动词（can/must/should）之后填原形。
缺形容词（adj.）：空格在名词之前起修饰作用；在系动词（be, look, feel, become）之后作表语。
缺副词（adv.）：空格修饰实义动词、形容词或整个句子。
步骤3：词形变化
答题方法： 确定了词性和首字母，把单词想出来后，必须进行变形检查（这也是错题本最该记录的地方）：
名词 -> 看单复数： 前面有 many, some, two，或者所在句子的谓语是 are/were，名词必须加 -s 或 -es。
动词 -> 看时态与语态： 文章整体是过去时，动词要变过去式；有 by 或逻辑上是被动，要变过去分词；主语是第三人称单数且为一般现在时，动词要加 -s。
形容词/副词 -> 看比较级： 句子里有 than 要用比较级，有 in the class/of all 要用最高级。
步骤4：逻辑连词&固定搭配
答题方法：留意句与句之间的逻辑转折。如果前后句意相反，且首字母是 b 或 h，极大可能是 but 或 however；如果是因果关系，可能是 because (b) 或 so (s)。同时，调动词汇大纲里的固定搭配记忆（如 make a decision, take pride in）。
三、 写作
1、内容（切题与充实）
知识点：审题是第一要务。必须全面覆盖题目要求的所有要点，缺一个要点直接扣分。内容要积极向上，符合中学生认知。
答题方法：下笔前先列一个简短的中英文提纲，确保每一点都在文中有所对应。
2、语言（准确与升华）
知识点：保证基础语法的绝对正确（主谓一致、时态统一、拼写无误），这是保底分。在此基础上，使用高级词汇和复合句（定语从句、宾语从句、状语从句）来争取高分。
高频易错预警：避免通篇使用 I think... I like... I went... 这样的单调句型。尝试用 It is + adj. + for sb. to do sth. 或 What impressed me most was... 来丰富句式。
3、结构（清晰的逻辑脉络）
知识点： 采用经典的“三段论”结构：
开头（总）：开门见山，直接点题。
中间（分）：给出具体的细节、理由或例子。必须使用过渡词（如 First of all, What's more, Besides, However）让行文连贯。
结尾（总）：总结全文，升华主题或表达期望。
高频易错预警： 阅卷老师看卷速度很快，段落不清晰、字迹潦草、没有连接词的文章极容易被归入低档文。保持卷面整洁，段首缩进。
`.trim();

export const englishKnowledgeSourceLines = englishKnowledgeSource
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

const moduleTitles = new Set(["内功心法", "外功招式"]);

function slugSegment(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\u4e00-\u9fa5a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createNodeId(pathTitles: string[]): string {
  return pathTitles.map(slugSegment).filter(Boolean).join("-");
}

function isContentLabel(value: string): value is `${EnglishKnowledgeContentLabel}：${string}` {
  return (
    value.startsWith("核心内容提要：") ||
    value.startsWith("核心知识点：") ||
    value.startsWith("知识点：") ||
    value.startsWith("答题方法：")
  );
}

function extractContentLabel(value: string): {
  label: EnglishKnowledgeContentLabel;
  content: string;
} {
  const [label, ...rest] = value.split("：");
  return {
    label: label as EnglishKnowledgeContentLabel,
    content: rest.join("：").trim(),
  };
}

function isSectionTitle(value: string): boolean {
  return /^【.+】$/.test(value);
}

function isTopicTitle(value: string): boolean {
  return /^(专题\d+(?:-\d+)?：|\d+、|步骤\s*\d+：)/.test(value);
}

function isCategoryTitle(value: string): boolean {
  return value.endsWith("：") || /^[一二三四五六七八九十]+、\s*/.test(value);
}

function createBranch(
  level: 1 | 2 | 3,
  title: string,
  parentTitles: string[]
): DraftBranchNode {
  return {
    id: createNodeId([...parentTitles, title]),
    title,
    level,
    children: [],
  };
}

function createLeaf(
  level: 3 | 4,
  title: string,
  parentTitles: string[]
): DraftLeafNode {
  return {
    id: createNodeId([...parentTitles, title]),
    title,
    level,
    contentBlocks: [],
    warningParts: [],
  };
}

function ensureBranch<T>(value: T | null, message: string): T {
  if (value === null) {
    throw new Error(message);
  }
  return value;
}

function formatMarkdownParts(parts: string[]): string {
  const trimmedParts = parts.map((part) => part.trim());
  const nonEmptyParts = trimmedParts.filter(Boolean);
  if (nonEmptyParts.length === 0) return "";
  if (nonEmptyParts.length === 1) return nonEmptyParts[0];

  const hasLeadingText = Boolean(trimmedParts[0]);
  if (!hasLeadingText) {
    return nonEmptyParts.map((part) => `- ${part}`).join("\n");
  }

  const [lead, ...rest] = nonEmptyParts;
  return `${lead}\n${rest.map((part) => `- ${part}`).join("\n")}`;
}

function buildCoreContent(
  blocks: DraftLeafNode["contentBlocks"]
): { coreContent: string; contentLabels: EnglishKnowledgeContentLabel[] } {
  const normalizedBlocks = blocks.filter((block) => block.parts.some((part) => part.trim().length > 0));
  const contentLabels = normalizedBlocks.map((block) => block.label);
  if (normalizedBlocks.length === 0) {
    return { coreContent: "", contentLabels };
  }

  if (normalizedBlocks.length === 1) {
    return {
      coreContent: formatMarkdownParts(normalizedBlocks[0].parts),
      contentLabels,
    };
  }

  return {
    coreContent: normalizedBlocks
      .map((block) => `**${block.label}**\n\n${formatMarkdownParts(block.parts)}`)
      .join("\n\n"),
    contentLabels,
  };
}

function finalizeNode(node: DraftNode, parentBranches: DraftBranchNode[]): EnglishKnowledgeNode {
  if ("children" in node) {
    return {
      id: node.id,
      title: node.title,
      level: node.level,
      children: node.children.map((child) => finalizeNode(child, [...parentBranches, node])),
    };
  }

  const { coreContent, contentLabels } = buildCoreContent(node.contentBlocks);
  return {
    id: node.id,
    title: node.title,
    level: node.level,
    pathIds: parentBranches.map((branch) => branch.id),
    pathTitles: parentBranches.map((branch) => branch.title),
    coreContent,
    warning: formatMarkdownParts(node.warningParts),
    contentLabels,
  };
}

function buildEnglishKnowledgeTree(): EnglishKnowledgeNode[] {
  const tree: DraftNode[] = [];
  let currentModule: DraftBranchNode | null = null;
  let currentCategory: DraftBranchNode | null = null;
  let currentSection: DraftBranchNode | null = null;
  let currentLeaf: DraftLeafNode | null = null;
  let currentField: { type: "content"; blockIndex: number } | { type: "warning" } | null = null;

  for (const line of englishKnowledgeSourceLines) {
    if (moduleTitles.has(line)) {
      currentModule = createBranch(1, line, []);
      tree.push(currentModule);
      currentCategory = null;
      currentSection = null;
      currentLeaf = null;
      currentField = null;
      continue;
    }

    if (isContentLabel(line)) {
      const leaf = ensureBranch(currentLeaf, `Missing topic before content: ${line}`);
      const { label, content } = extractContentLabel(line);
      leaf.contentBlocks.push({ label, parts: [content] });
      currentField = { type: "content", blockIndex: leaf.contentBlocks.length - 1 };
      continue;
    }

    if (line.startsWith("高频易错预警：")) {
      const leaf = ensureBranch(currentLeaf, `Missing topic before warning: ${line}`);
      leaf.warningParts.push(line.slice("高频易错预警：".length).trim());
      currentField = { type: "warning" };
      continue;
    }

    if (isCategoryTitle(line)) {
      const moduleNode = ensureBranch(currentModule, `Missing module before category: ${line}`);
      currentCategory = createBranch(2, line.replace(/：$/, ""), [moduleNode.title]);
      moduleNode.children.push(currentCategory);
      currentSection = null;
      currentLeaf = null;
      currentField = null;
      continue;
    }

    if (isSectionTitle(line)) {
      const categoryNode = ensureBranch(currentCategory, `Missing category before section: ${line}`);
      currentSection = createBranch(3, line, [ensureBranch(currentModule, "Missing module").title, categoryNode.title]);
      categoryNode.children.push(currentSection);
      currentLeaf = null;
      currentField = null;
      continue;
    }

    if (isTopicTitle(line)) {
      const moduleTitle = ensureBranch(currentModule, `Missing module before topic: ${line}`).title;
      const categoryNode = ensureBranch(currentCategory, `Missing category before topic: ${line}`);
      const parentNode = currentSection ?? categoryNode;
      const level = currentSection ? 4 : 3;
      currentLeaf = createLeaf(level, line, [moduleTitle, categoryNode.title, ...(currentSection ? [currentSection.title] : [])]);
      parentNode.children.push(currentLeaf);
      currentField = null;
      continue;
    }

    const leaf = ensureBranch(currentLeaf, `Unparsed line without topic context: ${line}`);
    if (currentField?.type === "content") {
      leaf.contentBlocks[currentField.blockIndex]?.parts.push(line);
      continue;
    }

    if (currentField?.type === "warning") {
      leaf.warningParts.push(line);
      continue;
    }

    throw new Error(`Unparsed English knowledge line: ${line}`);
  }

  return tree.map((node) => finalizeNode(node, []));
}

function collectLeafNodes(nodes: EnglishKnowledgeNode[]): EnglishKnowledgeLeafNode[] {
  const leaves: EnglishKnowledgeLeafNode[] = [];

  for (const node of nodes) {
    if ("children" in node) {
      leaves.push(...collectLeafNodes(node.children));
      continue;
    }
    leaves.push(node);
  }

  return leaves;
}

function trimModulePathFromNode(
  node: EnglishKnowledgeNode,
  moduleId: string,
  moduleTitle: string
): EnglishKnowledgeNode {
  if ("children" in node) {
    return {
      ...node,
      children: node.children.map((child) => trimModulePathFromNode(child, moduleId, moduleTitle)),
    };
  }

  return {
    ...node,
    pathIds: node.pathIds[0] === moduleId ? node.pathIds.slice(1) : node.pathIds,
    pathTitles: node.pathTitles[0] === moduleTitle ? node.pathTitles.slice(1) : node.pathTitles,
  };
}

function extractModuleChildren(nodes: EnglishKnowledgeNode[], title: string): EnglishKnowledgeNode[] {
  const moduleNode = nodes.find(
    (node): node is EnglishKnowledgeBranchNode => "children" in node && node.title === title
  );
  if (!moduleNode) return [];

  return moduleNode.children.map((child) => trimModulePathFromNode(child, moduleNode.id, moduleNode.title));
}

export function isEnglishKnowledgeLeaf(node: EnglishKnowledgeNode): node is EnglishKnowledgeLeafNode {
  return !("children" in node);
}

const ENGLISH_FULL_TREE = buildEnglishKnowledgeTree();

export const ENGLISH_KNOWLEDGE_TREE = extractModuleChildren(ENGLISH_FULL_TREE, "内功心法");
export const ENGLISH_KNOWLEDGE_LEAVES = collectLeafNodes(ENGLISH_KNOWLEDGE_TREE);
export const ENGLISH_KNOWLEDGE_LEAF_MAP = new Map(ENGLISH_KNOWLEDGE_LEAVES.map((item) => [item.id, item]));
export const ENGLISH_SKILL_TREE = extractModuleChildren(ENGLISH_FULL_TREE, "外功招式");
export const ENGLISH_SKILL_LEAVES = collectLeafNodes(ENGLISH_SKILL_TREE);
export const ENGLISH_SKILL_LEAF_MAP = new Map(ENGLISH_SKILL_LEAVES.map((item) => [item.id, item]));

export function findEnglishKnowledgeLeafById(id: string): EnglishKnowledgeLeafNode | undefined {
  return ENGLISH_KNOWLEDGE_LEAF_MAP.get(id);
}

export function findEnglishKnowledgeLeafByTitle(title: string): EnglishKnowledgeLeafNode | undefined {
  return ENGLISH_KNOWLEDGE_LEAVES.find((item) => item.title === title);
}

export function findEnglishSkillLeafById(id: string): EnglishKnowledgeLeafNode | undefined {
  return ENGLISH_SKILL_LEAF_MAP.get(id);
}

export function findEnglishSkillLeafByTitle(title: string): EnglishKnowledgeLeafNode | undefined {
  return ENGLISH_SKILL_LEAVES.find((item) => item.title === title);
}
