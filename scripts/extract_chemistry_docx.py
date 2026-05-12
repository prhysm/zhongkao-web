#!/usr/bin/env python3
"""Parse 初中化学知识点合集.docx → lib/chem-knowledge.json

规则（与产品约定一致）：
- title：仅二级标题（Word outlineLvl=2，或「一、…」），保留原文中文序号，不用阿拉伯数字替换。
- content：小标题用 ###；说明性文字为普通段落；并列子项用 - **术语**：正文。
- 阿拉伯数字小节（如「1. 水的物理性质…」）留在正文，用 ### 输出，不单独拆卡片。
"""

from __future__ import annotations

import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
M_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
NS = {"w": W_NS, "m": M_NS}

# ilvl=1 且释义较长时，从小标题误标成的列表项提升为 ### + 段落（如「化学变化的特征」）
_PROMOTE_LVL1_MIN_TERM = 5
_PROMOTE_LVL1_MIN_REST = 55


def local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def get_text_runs(paragraph: ET.Element) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []

    def walk(el: ET.Element) -> None:
        t = local(el.tag)
        if t == "r":
            om = el.find("m:oMath", NS)
            if om is not None:
                out.append(("math", omml_to_latex(om)))
                return
            wt = el.find("w:t", NS)
            if wt is not None and wt.text:
                out.append(("text", wt.text))
            return
        if t == "oMath":
            out.append(("math", omml_to_latex(el)))
            return
        for c in el:
            walk(c)

    walk(paragraph)
    return out


def omml_to_latex(el: ET.Element) -> str:
    t = local(el.tag)
    if t == "oMath":
        return "".join(omml_to_latex(c) for c in el)
    if t == "r":
        te = el.find("m:t", NS)
        if te is not None and te.text:
            return te.text
        return ""
    if t == "t":
        return el.text or ""
    if t == "sSub":
        base = el.find("m:e", NS)
        sub = el.find("m:sub", NS)
        b = omml_to_latex(base) if base is not None else ""
        s = omml_to_latex(sub) if sub is not None else ""
        return f"{b}_{{{s}}}"
    if t == "sSup":
        base = el.find("m:e", NS)
        sup = el.find("m:sup", NS)
        b = omml_to_latex(base) if base is not None else ""
        s = omml_to_latex(sup) if sup is not None else ""
        return f"{b}^{{{s}}}"
    if t == "sSubSup":
        base = el.find("m:e", NS)
        sub = el.find("m:sub", NS)
        sup = el.find("m:sup", NS)
        b = omml_to_latex(base) if base is not None else ""
        sb = omml_to_latex(sub) if sub is not None else ""
        sp = omml_to_latex(sup) if sup is not None else ""
        return f"{b}_{{{sb}}}^{{{sp}}}"
    if t == "box":
        inner = el.find("m:e", NS)
        return omml_to_latex(inner) if inner is not None else ""
    if t == "groupChr":
        chr_el = el.find("m:groupChrPr/m:chr", NS)
        char = chr_el.get(f"{{{M_NS}}}val") if chr_el is not None else None
        inner_el = el.find("m:e", NS)
        inner = omml_to_latex(inner_el) if inner_el is not None else ""
        if char in ("→", "\u2192"):
            cond = inner.strip() or " "
            return f"\\xrightarrow{{\\text{{{cond}}}}}"
        return inner
    if t == "d":
        return "".join(omml_to_latex(c) for c in el)
    if t == "e":
        return "".join(omml_to_latex(c) for c in el)
    if t == "sub" or t == "sup":
        return "".join(omml_to_latex(c) for c in el)
    if t == "num":
        return "".join(omml_to_latex(c) for c in el)
    if t == "den":
        return "".join(omml_to_latex(c) for c in el)
    if t == "f":
        num = el.find("m:num", NS)
        den = el.find("m:den", NS)
        n = omml_to_latex(num) if num is not None else ""
        d = omml_to_latex(den) if den is not None else ""
        return f"\\frac{{{n}}}{{{d}}}"
    return "".join(omml_to_latex(c) for c in el)


def paragraph_plain_text(p: ET.Element) -> str:
    parts: list[str] = []
    for kind, chunk in get_text_runs(p):
        if kind == "text":
            parts.append(chunk)
        else:
            parts.append(f"${chunk}$")
    return "".join(parts).strip()


def is_theme_line(s: str) -> bool:
    s = s.strip()
    return bool(re.match(r"^主题[一二三四五六七八九十\d]+", s)) and len(s) < 80


def outline_level(p: ET.Element) -> int | None:
    ol = p.find("w:pPr/w:outlineLvl", NS)
    if ol is None:
        return None
    v = ol.get(f"{{{W_NS}}}val")
    if v is None:
        return None
    try:
        return int(v)
    except ValueError:
        return None


def num_id_level(p: ET.Element) -> tuple[int | None, int | None]:
    np = p.find("w:pPr/w:numPr", NS)
    if np is None:
        return None, None
    ilvl = np.find("w:ilvl", NS)
    nid = np.find("w:numId", NS)
    lv = int(ilvl.get(f"{{{W_NS}}}val", "0")) if ilvl is not None else 0
    n = int(nid.get(f"{{{W_NS}}}val", "0")) if nid is not None else None
    return n, lv


def is_card_level_title(p: ET.Element, text: str) -> bool:
    """二级标题（新卡片）：outline 2 级，或 Word 漏标时的「一、…」（绝非「1.」）。"""
    if outline_level(p) == 2:
        return True
    s = text.strip()
    if len(s) > 100:
        return False
    return bool(re.match(r"^[一二三四五六七八九十]+、\s*\S", s))


def flush_pending_bullets(pending: list[str], out: list[str]) -> None:
    if not pending:
        return
    out.append("\n".join(pending))
    pending.clear()


def append_body_paragraph(
    p: ET.Element,
    text: str,
    pending_bullets: list[str],
    out: list[str],
) -> None:
    _, ilvl_raw = num_id_level(p)
    ilvl = int(ilvl_raw) if ilvl_raw is not None else -1
    t = text.strip()
    if not t:
        return

    # Word 中无编号列表：普通段落或「1. …」小节标题（绝非列表项）
    if ilvl < 0:
        flush_pending_bullets(pending_bullets, out)
        if re.match(r"^\d{1,2}[.．]\s*\S", t):
            t = re.sub(r"^(\d{1,2})．", r"\1.", t)
            out.append(f"### {t}")
        else:
            out.append(t)
        return

    if ilvl == 0:
        flush_pending_bullets(pending_bullets, out)
        m = re.match(r"^(.+?)([：:])(.*)$", t)
        if m:
            term, _, rest = m.group(1).strip(), m.group(2), m.group(3).strip()
            rest_core = rest.strip(" 　\t。．")
            # 长句以「：。」收束：整段作普通文本，不拆成 ### 标题
            if not rest_core and len(term) > 30:
                out.append(t)
            elif rest_core and rest.lstrip().startswith("$"):
                # 冒号后为公式（含行内 $…$）：不要拆成「### 短标题 + 公式」
                out.append(t)
            elif rest_core:
                out.append(f"### {term}\n\n{rest}")
            else:
                out.append(f"### {term}")
        else:
            out.append(t)
        return

    if ilvl == 1:
        m = re.match(r"^(.+?)([：:])(.*)$", t)
        if not m:
            pending_bullets.append(f"- {t}")
            return
        term, _, rest = m.group(1).strip(), m.group(2), m.group(3).strip()
        if len(term) >= _PROMOTE_LVL1_MIN_TERM and len(rest) >= _PROMOTE_LVL1_MIN_REST:
            flush_pending_bullets(pending_bullets, out)
            out.append(f"### {term}\n\n{rest}")
        else:
            pending_bullets.append(f"- **{term}**：{rest}")
        return

    flush_pending_bullets(pending_bullets, out)
    indent = "  " * max(0, ilvl - 1)
    m = re.match(r"^(.+?)([：:])(.*)$", t)
    if m:
        term, _, rest = m.group(1).strip(), m.group(2), m.group(3).strip()
        if len(term) <= 45 and rest:
            out.append(f"{indent}- **{term}**：{rest}")
        else:
            out.append(f"{indent}- {t}")
    else:
        out.append(f"{indent}- {t}")


def normalize_chem_markdown(md: str) -> str:
    """Unicode 下标、箭头与常见版式修正为 KaTeX 友好写法（仅用于 content）。"""
    sub_u = str.maketrans("₀₁₂₃₄₅₆₇₈₉", "0123456789")

    def repl_subscript(m: re.Match[str]) -> str:
        base = m.group(1)
        rest = m.group(2).translate(sub_u)
        return f"${base}_{{{rest}}}$"

    md = re.sub(r"(?<!\$)([A-Za-z][A-Za-z0-9()]*)([₀₁₂₃₄₅₆₇₈₉]+)(?!\$)", repl_subscript, md)
    md = md.replace("⁺", "^+").replace("⁻", "^-")
    md = re.sub(r"(?<!\$)([A-Za-z]{1,3})\^\+(?!\$)", r"$\1^+$", md)
    md = re.sub(r"(?<!\$)([A-Za-z]{1,3})\^-(?!\$)", r"$\1^-$", md)
    md = re.sub(r"\$→\$", r"$\\to$", md)
    md = re.sub(r"(?<!\$)→(?!\$)", r"$\\to$", md)
    md = md.replace(
        "高锰酸钾 $\\xrightarrow{\\text{加热}}$",
        "高锰酸钾 $\\xrightarrow{\\Delta}$",
    )
    md = md.replace(
        "（高锰酸钾 $\\xrightarrow{\\text{加热}}$",
        "（高锰酸钾 $\\xrightarrow{\\Delta}$",
    )
    md = md.replace(
        "$氢气 + 氧气 \\xrightarrow{\\text{点燃}} 水$",
        "$2H_2 + O_2 \\xrightarrow{\\text{点燃}} 2H_2O$",
    )
    md = md.replace("检验二氧化碳 O；利用", "检验二氧化碳；利用")
    for u, v in (
        ("C₆₀", "C_{60}"),
        ("H₂O", "H_2O"),
        ("CO₂", "CO_2"),
        ("O₂", "O_2"),
        ("H₂", "H_2"),
        ("N₂", "N_2"),
        ("Ca(OH)₂", "Ca(OH)_2"),
        ("Fe₂O₃", "Fe_2O_3"),
        ("FeCl₃", "FeCl_3"),
        ("CuSO₄", "CuSO_4"),
        ("FeSO₄", "FeSO_4"),
        ("MnO₂", "MnO_2"),
        ("KMnO₄", "KMnO_4"),
        ("K₂MnO₄", "K_2MnO_4"),
        ("KClO₃", "KClO_3"),
        ("NH₄⁺", "NH_4^+"),
        ("NH₄", "NH_4"),
        ("CH₄", "CH_4"),
        ("C₂H₆O", "C_2H_6O"),
        ("C₆H₁₂O₆", "C_6H_{12}O_6"),
        ("C₂H₂", "C_2H_2"),
    ):
        md = md.replace(u, v)
    md = md.replace("$H_2O + CaO $\\to$ Ca(OH)_2$。", "$H_2O + CaO \\to Ca(OH)_2$。")
    md = md.replace(
        "（红磷 + 氧气$\\xrightarrow{\\text{点燃}}$五氧化二磷）",
        "（$4P+5O_2 \\xrightarrow{\\text{点燃}} 2P_2O_5$）",
    )
    md = md.replace(
        "（碳 + 氧气$\\xrightarrow{\\text{点燃}}$二氧化碳）",
        "（$C+O_2 \\xrightarrow{\\text{点燃}} CO_2$）",
    )
    md = md.replace(
        "（铁 + 氧气$\\xrightarrow{\\text{点燃}}$四氧化三铁）",
        "（$3Fe+2O_2 \\xrightarrow{\\text{点燃}} Fe_3O_4$）",
    )
    md = re.sub(r" *\n\n *", "\n\n", md)
    # Word 导出时公式被拆成多段 $，尽量合并为可渲染形式
    md = md.replace("$C + $O_{2}$", "$C+O_2$")
    md = md.replace("$2C + $O_{2}$", "$2C+O_2$")
    md = md.replace("$C$aCO_{3}$", "$CaCO_3$")
    md = md.replace("$F$e_{2}$$O_{3}$", "$Fe_2O_3$")
    md = md.replace("$F$e_{2}$O₃$", "$Fe_2O_3$")
    md = md.replace("$N$a_{2}$CO₃$", "$Na_2CO_3$")
    md = md.replace("$N$H_{4}$^+$", "$NH_4^+$")
    md = md.replace("$N$H_{4}$Cl$", "$NH_4Cl$")
    md = md.replace("$C$H_{4}$", "$CH_4$")
    md = re.sub(r"2Cu \+ \$CO_\{2\}\$↑", r"2Cu + CO_2\\uparrow", md)
    md = md.replace("$C+$CO_{2}$", "$C+CO_2$")
    md = md.replace("$Fe + $CuSO_{4}$", "$Fe+CuSO_4$")
    md = md.replace("$NaOH + HCl $\\to$ NaCl + $H_{2}$O$", "$NaOH + HCl \\to NaCl + H_2O$")
    md = md.replace("$Fe + 2HCl $\\to$ $FeCl_{2}$ + $H_{2}$↑$", "$Fe + 2HCl \\to FeCl_2 + H_2\\uparrow$")
    return md


def normalize_chem_title(title: str) -> str:
    """标题中的 Unicode 化学式转为 KaTeX（不改变中文序号）。"""
    title = title.replace("$CO₂$", "$CO_2$").replace("$O₂$", "$O_2$").replace("$H₂$", "$H_2$")
    title = re.sub(r"(?<!\$)CO₂(?!\$)", r"$CO_2$", title)
    title = re.sub(r"(?<!\$)O₂(?!\$)", r"$O_2$", title)
    title = re.sub(r"(?<!\$)H₂(?!\$)", r"$H_2$", title)
    title = re.sub(r"(?<!\$)N₂(?!\$)", r"$N_2$", title)
    title = title.replace("$$CO_2$$", "$CO_2$").replace("$$O_2$$", "$O_2$")
    return title


def main() -> int:
    docx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Downloads" / "初中化学知识点合集.docx"
    if not docx_path.is_file():
        print(f"Missing file: {docx_path}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(docx_path) as z:
        xml = z.read("word/document.xml")

    root = ET.fromstring(xml)
    body = root.find("w:body", NS)
    if body is None:
        print("No body", file=sys.stderr)
        return 1

    theme_idx = 0
    section_idx = 0
    current_theme = ""
    current_title = ""
    content_lines: list[str] = []
    pending_bullets: list[str] = []
    items: list[dict] = []

    def flush() -> None:
        nonlocal content_lines, current_title, current_theme, theme_idx, section_idx, pending_bullets
        flush_pending_bullets(pending_bullets, content_lines)
        if not current_theme or not current_title:
            content_lines = []
            return
        body_md = "\n\n".join(line for line in content_lines if line.strip())
        if not body_md.strip():
            content_lines = []
            return
        section_idx += 1
        items.append(
            {
                "id": f"chem_{theme_idx}_{section_idx}",
                "chapter": current_theme,
                "title": normalize_chem_title(current_title),
                "content": normalize_chem_markdown(body_md),
            }
        )
        content_lines = []

    for child in body:
        if local(child.tag) != "p":
            continue
        p = child
        text = paragraph_plain_text(p)

        if is_theme_line(text):
            flush()
            current_theme = text.strip()
            theme_idx += 1
            section_idx = 0
            current_title = ""
            content_lines = []
            pending_bullets.clear()
            continue

        if current_theme and text and is_card_level_title(p, text):
            flush()
            current_title = text.strip()
            pending_bullets.clear()
            continue

        if not current_theme:
            continue
        if not current_title:
            if text:
                flush_pending_bullets(pending_bullets, content_lines)
                content_lines.append(text)
            continue

        append_body_paragraph(p, text, pending_bullets, content_lines)

    flush()

    out_path = Path(__file__).resolve().parent.parent / "lib" / "chem-knowledge.json"
    out_path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
