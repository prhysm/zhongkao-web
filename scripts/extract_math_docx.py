#!/usr/bin/env python3
"""Parse 初中数学知识点合集.docx -> lib/math-knowledge.json

目标：
- 尽量直接从 Word 的 Office Math（OMML）恢复为 KaTeX 友好的 LaTeX。
- 产出结构与现有前端 `StructuredKnowledgeItem[]` 一致。
- 只依赖 Python 标准库，避免额外环境配置。

用法：
  python3 scripts/extract_math_docx.py
  python3 scripts/extract_math_docx.py /path/to/input.docx
  python3 scripts/extract_math_docx.py /path/to/input.docx /path/to/output.json
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

FUNC_NAMES = {"sin", "cos", "tan", "cot", "sec", "csc", "log", "ln"}
COMMANDS_REQUIRING_SEPARATOR = sorted(
    {
        *FUNC_NAMES,
        "angle",
        "approx",
        "because",
        "cap",
        "cdot",
        "cdots",
        "circ",
        "cot",
        "csc",
        "Delta",
        "div",
        "ge",
        "in",
        "infty",
        "le",
        "ln",
        "log",
        "mp",
        "ne",
        "notin",
        "Omega",
        "parallel",
        "perp",
        "pi",
        "pm",
        "sec",
        "sin",
        "sqrt",
        "tan",
        "text",
        "therefore",
        "times",
        "triangle",
        "varphi",
        "xrightarrow",
    },
    key=len,
    reverse=True,
)
KNOWN_LATEX_COMMANDS = {
    *COMMANDS_REQUIRING_SEPARATOR,
    "bar",
    "frac",
    "hat",
    "left",
    "right",
    "vec",
}
COMMAND_FOLLOWED_BY_LETTER_RE = re.compile(
    rf"(?P<cmd>\\(?:{'|'.join(COMMANDS_REQUIRING_SEPARATOR)}))(?P<next>[A-Za-z])"
)
ACCENT_COMMANDS = {
    "⃗": r"\vec",
    "̂": r"\hat",
    "¯": r"\bar",
    "ˉ": r"\bar",
}
DELIM_COMMANDS = {
    "(": "(",
    ")": ")",
    "[": "[",
    "]": "]",
    "{": r"\{",
    "}": r"\}",
    "|": "|",
    "‖": r"\|",
    "〈": r"\langle",
    "〉": r"\rangle",
    "〈": r"\langle",
    "〉": r"\rangle",
}
CHAR_REPLACEMENTS = {
    "π": r"\pi",
    "Δ": r"\Delta",
    "α": r"\alpha",
    "β": r"\beta",
    "γ": r"\gamma",
    "θ": r"\theta",
    "λ": r"\lambda",
    "μ": r"\mu",
    "ρ": r"\rho",
    "σ": r"\sigma",
    "φ": r"\varphi",
    "ω": r"\omega",
    "Γ": r"\Gamma",
    "Ω": r"\Omega",
    "×": r"\times",
    "÷": r"\div",
    "±": r"\pm",
    "∓": r"\mp",
    "≤": r"\le",
    "≥": r"\ge",
    "≠": r"\ne",
    "≈": r"\approx",
    "∥": r"\parallel",
    "⊥": r"\perp",
    "∞": r"\infty",
    "∵": r"\because",
    "∴": r"\therefore",
    "∠": r"\angle",
    "△": r"\triangle",
    "∈": r"\in",
    "∉": r"\notin",
    "∪": r"\cup",
    "∩": r"\cap",
    "°": r"^\circ",
    "∘": r"\circ",
    "⋅": r"\cdot",
    "·": r"\cdot",
    "…": r"\cdots",
    "%": r"\%",
}


def local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def contains_cjk(text: str) -> bool:
    return any("\u4e00" <= ch <= "\u9fff" for ch in text)


def escape_latex_text(text: str) -> str:
    escaped = text.replace("\\", r"\\")
    escaped = escaped.replace("{", r"\{").replace("}", r"\}")
    return escaped


def normalize_math_text(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"[\u2000-\u200a\u202f\u205f\u3000]", " ", text)
    if not text:
        return ""
    if contains_cjk(text):
        return rf"\text{{{escape_latex_text(text)}}}"

    out: list[str] = []
    for ch in text:
        if ch in CHAR_REPLACEMENTS:
            out.append(CHAR_REPLACEMENTS[ch])
        else:
            out.append(ch)
    return "".join(out)


def plain_text_from_math(el: ET.Element) -> str:
    parts: list[str] = []
    for node in el.iter():
        tag = local(node.tag)
        if tag in {"t"} and node.text:
            parts.append(node.text)
    return "".join(parts).strip()


def latex_delimiter(ch: str | None) -> str:
    if not ch:
        return "."
    return DELIM_COMMANDS.get(ch, ch)


def wrap_math_if_needed(expr: str) -> str:
    expr = expr.strip()
    if not expr:
        return ""
    if re.fullmatch(r"[A-Za-z0-9\\]+", expr):
        return expr
    if expr.startswith(r"\left") or expr.startswith("{"):
        return expr
    return f"{{{expr}}}"


def sanitize_latex_math(expr: str) -> str:
    expr = expr.replace("\xa0", " ").strip()
    if not expr or "在此处键入公式" in expr:
        return ""

    expr = expr.replace("；", "; ").replace("，", ", ").replace("：", ": ")
    previous = None
    while expr != previous:
        previous = expr
        expr = COMMAND_FOLLOWED_BY_LETTER_RE.sub(separate_command_and_variable, expr)

    expr = re.sub(r"\s{2,}", " ", expr)
    return expr.strip()


def separate_command_and_variable(match: re.Match[str]) -> str:
    cmd = match.group("cmd")
    next_char = match.group("next")
    bare = cmd[1:]
    candidate = bare + next_char
    if any(name.startswith(candidate) and len(name) > len(bare) for name in KNOWN_LATEX_COMMANDS):
        return match.group(0)
    return f"{cmd} {next_char}"


def omml_to_latex(el: ET.Element | None) -> str:
    if el is None:
        return ""

    tag = local(el.tag)
    if tag in {"oMath", "oMathPara", "e", "num", "den", "sub", "sup", "deg", "fName"}:
        return "".join(omml_to_latex(child) for child in el)

    if tag == "r":
        te = el.find("m:t", NS)
        if te is not None and te.text:
            return normalize_math_text(te.text)
        return "".join(omml_to_latex(child) for child in el)

    if tag == "t":
        return normalize_math_text(el.text or "")

    if tag == "f":
        num = omml_to_latex(el.find("m:num", NS))
        den = omml_to_latex(el.find("m:den", NS))
        return rf"\frac{{{num}}}{{{den}}}"

    if tag == "rad":
        deg = omml_to_latex(el.find("m:deg", NS))
        expr = omml_to_latex(el.find("m:e", NS))
        hidden = el.find("m:radPr/m:degHide", NS)
        if hidden is not None and hidden.get(f"{{{M_NS}}}val") == "1":
            deg = ""
        return rf"\sqrt[{deg}]{{{expr}}}" if deg else rf"\sqrt{{{expr}}}"

    if tag == "sSub":
        base = omml_to_latex(el.find("m:e", NS))
        sub = omml_to_latex(el.find("m:sub", NS))
        return f"{base}_{{{sub}}}"

    if tag == "sSup":
        base = omml_to_latex(el.find("m:e", NS))
        sup = omml_to_latex(el.find("m:sup", NS))
        return f"{base}^{{{sup}}}"

    if tag == "sSubSup":
        base = omml_to_latex(el.find("m:e", NS))
        sub = omml_to_latex(el.find("m:sub", NS))
        sup = omml_to_latex(el.find("m:sup", NS))
        return f"{base}_{{{sub}}}^{{{sup}}}"

    if tag == "func":
        name = omml_to_latex(el.find("m:fName", NS)).strip()
        expr = omml_to_latex(el.find("m:e", NS)).strip()
        bare_name = name.lstrip("\\")
        if bare_name in FUNC_NAMES:
            name = rf"\{bare_name}"
        return f"{name} {wrap_math_if_needed(expr)}".strip()

    if tag == "acc":
        expr = omml_to_latex(el.find("m:e", NS))
        chr_el = el.find("m:accPr/m:chr", NS)
        char = chr_el.get(f"{{{M_NS}}}val") if chr_el is not None else None
        command = ACCENT_COMMANDS.get(char or "")
        if command:
            return rf"{command}{{{expr}}}"
        return expr

    if tag == "d":
        expr = omml_to_latex(el.find("m:e", NS))
        beg = el.find("m:dPr/m:begChr", NS)
        end = el.find("m:dPr/m:endChr", NS)
        left_raw = beg.get(f"{{{M_NS}}}val") if beg is not None else None
        right_raw = end.get(f"{{{M_NS}}}val") if end is not None else None
        if not left_raw and not right_raw:
            return f"({expr})" if expr else ""
        left = latex_delimiter(left_raw)
        right = latex_delimiter(right_raw)
        return rf"\left{left}{expr}\right{right}"

    if tag == "groupChr":
        chr_el = el.find("m:groupChrPr/m:chr", NS)
        char = chr_el.get(f"{{{M_NS}}}val") if chr_el is not None else None
        label = plain_text_from_math(el.find("m:e", NS) or el)
        if char in ("→", "\u2192") and label:
            return rf"\xrightarrow{{\text{{{escape_latex_text(label)}}}}}"
        return omml_to_latex(el.find("m:e", NS))

    if tag == "box":
        return omml_to_latex(el.find("m:e", NS))

    if tag in {"ctrlPr", "rPr", "fPr", "radPr", "sSubPr", "sSupPr", "funcPr", "accPr", "dPr", "groupChrPr"}:
        return ""

    return "".join(omml_to_latex(child) for child in el)


def get_text_runs(paragraph: ET.Element) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []

    def walk(el: ET.Element) -> None:
        tag = local(el.tag)
        if tag == "r":
            om = el.find("m:oMath", NS)
            if om is not None:
                chunk = sanitize_latex_math(omml_to_latex(om))
                if chunk:
                    out.append(("math", chunk))
                return
            wt = el.find("w:t", NS)
            if wt is not None and wt.text:
                out.append(("text", wt.text))
            return
        if tag == "oMath":
            chunk = sanitize_latex_math(omml_to_latex(el))
            if chunk:
                out.append(("math", chunk))
            return
        if tag == "oMathPara":
            chunk = sanitize_latex_math(omml_to_latex(el))
            if chunk:
                out.append(("display_math", chunk))
            return
        for child in el:
            walk(child)

    walk(paragraph)
    return out


def paragraph_plain_text(paragraph: ET.Element) -> str:
    runs = get_text_runs(paragraph)
    if not runs:
        return ""
    if all(kind == "display_math" for kind, _ in runs):
        expr = "\n".join(chunk for _, chunk in runs if chunk.strip())
        return f"$$\n{expr}\n$$" if expr else ""

    parts: list[str] = []
    for kind, chunk in runs:
        if kind == "text":
            parts.append(chunk)
        elif kind == "math":
            parts.append(f"${chunk}$")
        else:
            parts.append(f"$$\n{chunk}\n$$")
    return "".join(parts).strip()


def outline_level(paragraph: ET.Element) -> int | None:
    ol = paragraph.find("w:pPr/w:outlineLvl", NS)
    if ol is None:
        return None
    value = ol.get(f"{{{W_NS}}}val")
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def num_id_level(paragraph: ET.Element) -> tuple[int | None, int | None]:
    np = paragraph.find("w:pPr/w:numPr", NS)
    if np is None:
        return None, None
    ilvl = np.find("w:ilvl", NS)
    nid = np.find("w:numId", NS)
    level = int(ilvl.get(f"{{{W_NS}}}val", "0")) if ilvl is not None else 0
    num_id = int(nid.get(f"{{{W_NS}}}val", "0")) if nid is not None else None
    return num_id, level


def chinese_numeral_to_int(text: str) -> int | None:
    if text.isdigit():
        return int(text)
    numerals = {"零": 0, "〇": 0, "一": 1, "二": 2, "两": 2, "三": 3, "四": 4, "五": 5, "六": 6, "七": 7, "八": 8, "九": 9}
    units = {"十": 10, "百": 100}
    total = 0
    current = 0
    for ch in text:
        if ch in numerals:
            current = numerals[ch]
            continue
        unit = units.get(ch)
        if unit is None:
            return None
        total += (current or 1) * unit
        current = 0
    return total + current


def parse_chapter_heading(text: str) -> tuple[int, str] | None:
    m = re.match(r"^第([零〇一二两三四五六七八九十百\d]+)章[：:\s]*(.+)$", text.strip())
    if not m:
        return None
    number = chinese_numeral_to_int(m.group(1))
    if number is None:
        return None
    title = re.sub(r"\s+", " ", m.group(2)).strip()
    return number, f"第{number}章 {title}"


def is_chapter_heading(paragraph: ET.Element, text: str) -> bool:
    if outline_level(paragraph) != 2:
        return False
    if text.strip() == "初中数学知识点合集":
        return False
    return parse_chapter_heading(text) is not None


def is_card_title(text: str) -> bool:
    return bool(re.match(r"^\d{1,2}[.．]\s*\S", text.strip()))


def normalize_card_title(text: str) -> str:
    return re.sub(r"^\d{1,2}[.．]\s*", "", text.strip())


def normalize_title_math_spacing(text: str) -> str:
    text = re.sub(r"([\u4e00-\u9fff])\$", r"\1 $", text)
    text = re.sub(r"\$([\u4e00-\u9fff])", r"$ \1", text)
    return re.sub(r"\s{2,}", " ", text).strip()


def extract_title_lead(title: str) -> tuple[str, str | None]:
    title = normalize_title_math_spacing(title)
    if title.startswith("锐角三角比的定义 在 Rt$\\triangle ABC$ 中，$\\angle C=90^{\\circ}$，设"):
        return (
            "锐角三角比的定义",
            "在 Rt$\\triangle ABC$ 中，$\\angle C=90^{\\circ}$，设$\\angle A$ 的对边为 $a$，邻边为 $b$，斜边为 $c$：",
        )
    return title, None


def flush_pending_bullets(pending: list[str], out: list[str]) -> None:
    if not pending:
        return
    out.append("\n".join(pending))
    pending.clear()


def append_body_paragraph(
    paragraph: ET.Element,
    text: str,
    pending_bullets: list[str],
    out: list[str],
) -> None:
    _, ilvl_raw = num_id_level(paragraph)
    ilvl = int(ilvl_raw) if ilvl_raw is not None else -1
    text = text.strip()
    if not text:
        return

    if ilvl < 0:
        flush_pending_bullets(pending_bullets, out)
        if is_card_title(text):
            out.append(f"### {normalize_card_title(text)}")
        else:
            out.append(text)
        return

    if ilvl == 0:
        flush_pending_bullets(pending_bullets, out)
        m = re.match(r"^(.+?)([：:])(.*)$", text)
        if m:
            term, rest = m.group(1).strip(), m.group(3).strip()
            if rest:
                out.append(f"### {term}\n\n{rest}")
            else:
                out.append(f"### {term}")
        else:
            out.append(text)
        return

    if ilvl == 1:
        m = re.match(r"^(.+?)([：:])(.*)$", text)
        if not m:
            pending_bullets.append(f"- {text}")
            return
        term, rest = m.group(1).strip(), m.group(3).strip()
        pending_bullets.append(f"- **{term}**：{rest}" if rest else f"- **{term}**")
        return

    flush_pending_bullets(pending_bullets, out)
    indent = "  " * max(0, ilvl - 1)
    pending = text if text.startswith("- ") else f"- {text}"
    out.append(f"{indent}{pending}")


def normalize_math_markdown(markdown: str) -> str:
    markdown = markdown.replace("$$\n\n", "$$\n").replace("\n\n$$", "\n$$")
    markdown = re.sub(r"[ \t]+\n", "\n", markdown)
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    markdown = markdown.replace("$\\text{π}$", "$\\pi$")
    markdown = markdown.replace("$\\text{Δ}$", "$\\Delta$")
    markdown = markdown.replace("∘", r"\circ")
    markdown = markdown.replace("⋅", r"\cdot ")
    markdown = markdown.replace("·", r"\cdot ")
    markdown = markdown.replace("…", r"\cdots ")
    markdown = re.sub(r"\\pi(?=[A-Za-z0-9])", r"\\pi ", markdown)
    markdown = re.sub(r"\\Delta(?=[A-Za-z0-9])", r"\\Delta ", markdown)
    markdown = re.sub(r"\$([^$\n]+?)\s+\\ge0", r"$\1 \\ge 0", markdown)
    markdown = re.sub(r"\$([^$\n]+?)\s+\\ne0", r"$\1 \\ne 0", markdown)
    markdown = markdown.replace(r"\sqrt{ }", r"\sqrt{\phantom{a}}")
    markdown = markdown.replace(r"\sqrt{  }", r"\sqrt{\phantom{a}}")
    markdown = markdown.replace(r"\sqrt{ }", r"\sqrt{\phantom{a}}")
    markdown = markdown.replace("记作 $\\sqrt{a}$", "记作 $\\sqrt[3]{a}$")
    markdown = markdown.replace(
        "平方差公式 $\\sqrt{a}+\\sqrt{b}\\sqrt{a}-\\sqrt{b}=a-b$",
        "平方差公式 $(\\sqrt{a}+\\sqrt{b})(\\sqrt{a}-\\sqrt{b})=a-b$",
    )
    return markdown.strip()


def main() -> int:
    default_docx = Path.home() / "Downloads" / "中考知识点" / "初中数学知识点合集.docx"
    docx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_docx
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "lib" / "math-knowledge.json"

    if not docx_path.is_file():
        print(f"Missing file: {docx_path}", file=sys.stderr)
        return 1

    with zipfile.ZipFile(docx_path) as zf:
        xml = zf.read("word/document.xml")

    root = ET.fromstring(xml)
    body = root.find("w:body", NS)
    if body is None:
        print("No body found in document.xml", file=sys.stderr)
        return 1

    chapter_number = 0
    chapter_title = ""
    section_index = 0
    current_title = ""
    content_lines: list[str] = []
    pending_bullets: list[str] = []
    items: list[dict[str, object]] = []

    def flush() -> None:
        nonlocal content_lines, current_title, section_index
        flush_pending_bullets(pending_bullets, content_lines)
        if not chapter_title or not current_title:
            content_lines = []
            return
        title, lead = extract_title_lead(current_title)
        body_md = "\n\n".join(line for line in content_lines if line.strip())
        if lead:
            body_md = f"{lead}\n\n{body_md}" if body_md else lead
        if not body_md.strip():
            content_lines = []
            return
        section_index += 1
        items.append(
            {
                "id": f"math_{chapter_number}_{section_index}",
                "chapter": chapter_title,
                "title": title,
                "content": normalize_math_markdown(body_md),
            }
        )
        content_lines = []

    for child in body:
        if local(child.tag) != "p":
            continue
        paragraph = child
        text = paragraph_plain_text(paragraph)
        if not text:
            continue

        if is_chapter_heading(paragraph, text):
            flush()
            parsed = parse_chapter_heading(text)
            if parsed is None:
                continue
            chapter_number, chapter_title = parsed
            current_title = ""
            section_index = 0
            content_lines = []
            pending_bullets.clear()
            continue

        if chapter_title and is_card_title(text):
            flush()
            current_title = normalize_card_title(text)
            pending_bullets.clear()
            continue

        if not chapter_title:
            continue

        if not current_title:
            continue

        append_body_paragraph(paragraph, text, pending_bullets, content_lines)

    flush()

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
