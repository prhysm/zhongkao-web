#!/usr/bin/env python3
"""Parse 初中物理知识点合集.docx → lib/physics-knowledge.json + public/images/knowledge/*

- 结构与前端 `StructuredKnowledgeItem[]` 一致；正文为 Markdown，内嵌 `![](/images/knowledge/...)`。
- 从 Word 中提取嵌入图片，按文件内容 hash 命名写入 `public/images/knowledge/`，避免重复。
- 依赖同目录下的 `extract_math_docx.py`（复用 OMML、列表与段落清洗逻辑）。

用法:
  python3 scripts/extract_physics_docx.py
  python3 scripts/extract_physics_docx.py /path/to/初中物理知识点合集.docx
  python3 scripts/extract_physics_docx.py input.docx out.json
"""

from __future__ import annotations

import hashlib
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path

# 与 extract_math_docx 同目录，便于 import
_SCRIPTS = Path(__file__).resolve().parent
if str(_SCRIPTS) not in sys.path:
    sys.path.insert(0, str(_SCRIPTS))

import extract_math_docx as mx  # noqa: E402

W_NS = mx.W_NS
NS = mx.NS
A_NS = "http://schemas.openxmlformats.org/drawingml/2006/main"
R_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
V_NS = "urn:schemas-microsoft-com:vml"
PKG_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"

PHYSICS_DOC_TITLE = "初中物理知识点合集"


def mx_local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def paragraph_style_val(paragraph: ET.Element) -> str | None:
    ps = paragraph.find("w:pPr/w:pStyle", NS)
    if ps is None:
        return None
    return ps.get(f"{{{W_NS}}}val")


def is_physics_chapter_heading(paragraph: ET.Element, text: str) -> bool:
    if text.strip() == PHYSICS_DOC_TITLE:
        return False
    if mx.parse_chapter_heading(text) is None:
        return False
    ol = mx.outline_level(paragraph)
    if ol == 2:
        return True
    st = paragraph_style_val(paragraph)
    # 物理原稿里绝大多数章标题是样式 2，个别双位数章节被标成了样式 3。
    if st in {"2", "3"}:
        return True
    return False


def load_document_rels(zf: zipfile.ZipFile) -> dict[str, str]:
    data = zf.read("word/_rels/document.xml.rels")
    root = ET.fromstring(data)
    out: dict[str, str] = {}
    for rel in root.findall(f"{{{PKG_REL_NS}}}Relationship"):
        rid = rel.get("Id")
        target = rel.get("Target")
        if rid and target:
            out[rid] = target
    return out


def zf_inner_path_for_target(target: str) -> str:
    target = target.replace("\\", "/").lstrip("/")
    if target.startswith("word/"):
        return target
    return "word/" + target


def save_embed_media(
    zf: zipfile.ZipFile,
    rels: dict[str, str],
    embed_id: str,
    dest_dir: Path,
    written: dict[str, str],
) -> str | None:
    target = rels.get(embed_id)
    if not target:
        return None
    inner = zf_inner_path_for_target(target)
    try:
        data = zf.read(inner)
    except KeyError:
        return None
    digest = hashlib.sha256(data).hexdigest()[:16]
    ext = Path(target).suffix.lower()
    if ext not in {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"}:
        ext = ".bin"
    fname = f"{digest}{ext}"
    url = f"/images/knowledge/{fname}"
    if fname not in written:
        dest_dir.mkdir(parents=True, exist_ok=True)
        (dest_dir / fname).write_bytes(data)
        written[fname] = url
    return written[fname]


def extract_blip_embed_ids(container: ET.Element) -> list[str]:
    ids: list[str] = []
    for blip in container.findall(f".//{{{A_NS}}}blip"):
        emb = blip.get(f"{{{R_NS}}}embed")
        if emb:
            ids.append(emb)
    return ids


def extract_vml_embed_ids(container: ET.Element) -> list[str]:
    ids: list[str] = []
    for node in container.findall(f".//{{{V_NS}}}imagedata"):
        iid = node.get(f"{{{R_NS}}}id") or node.get(f"{{{R_NS}}}embed")
        if iid:
            ids.append(iid)
    return ids


def walk_paragraph_runs(paragraph: ET.Element):
    for child in paragraph:
        tag = mx_local(child.tag)
        if tag == "r":
            yield child
        elif tag == "hyperlink":
            for sub in child:
                if mx_local(sub.tag) == "r":
                    yield sub
        elif tag == "sdt":
            content = child.find("w:sdtContent", NS)
            if content is None:
                continue
            for sub in content:
                if mx_local(sub.tag) == "r":
                    yield sub
                elif mx_local(sub.tag) == "hyperlink":
                    for ss in sub:
                        if mx_local(ss.tag) == "r":
                            yield ss


def run_segments(run: ET.Element) -> list[tuple[str, str]]:
    segs: list[tuple[str, str]] = []
    for rc in run:
        rt = mx_local(rc.tag)
        if rt == "t":
            tx = rc.text or ""
            if tx:
                segs.append(("text", tx))
            if rc.tail:
                segs.append(("text", rc.tail))
        elif rt == "drawing":
            for rid in extract_blip_embed_ids(rc):
                segs.append(("embed", rid))
        elif rt == "pict":
            for rid in extract_vml_embed_ids(rc):
                segs.append(("embed", rid))
        elif rt == "br":
            segs.append(("text", "\n"))
        elif rt == "tab":
            segs.append(("text", "\t"))
    return segs


def paragraph_ordered_segments(paragraph: ET.Element) -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for run in walk_paragraph_runs(paragraph):
        out.extend(run_segments(run))
    return out


def paragraph_has_embed(paragraph: ET.Element) -> bool:
    return any(k == "embed" for k, _ in paragraph_ordered_segments(paragraph))


def segments_to_markdown_with_images(
    segments: list[tuple[str, str]],
    zf: zipfile.ZipFile,
    rels: dict[str, str],
    image_dir: Path,
    written: dict[str, str],
) -> str:
    parts: list[str] = []
    buf: list[str] = []

    def flush_buf() -> None:
        nonlocal buf
        if buf:
            parts.append("".join(buf))
            buf.clear()

    for kind, val in segments:
        if kind == "text":
            buf.append(val)
        else:
            flush_buf()
            url = save_embed_media(zf, rels, val, image_dir, written)
            if url:
                parts.append(f"\n\n![知识点配图]({url})\n\n")
    flush_buf()
    return "".join(parts)


def normalize_physics_markdown(markdown: str) -> str:
    markdown = mx.normalize_math_markdown(markdown)

    exact_replacements = [
        ("v固$>$v液$>$v气", r"$v_{\text{固}} > v_{\text{液}} > v_{\text{气}}$"),
        ("- **超声波**：$>$20000 Hz；次声波：$<$20 Hz 。", r"- **超声波**：$f > 20000\,\text{Hz}$；次声波：$f < 20\,\text{Hz}$。"),
        ("- **公式**：G=mg（g$\\approx$9.8N/kg）。", r"- **公式**：$G = mg$（$g \approx 9.8\,\text{N/kg}$）。"),
        ("国际单位是千克/米³ (kg/m3 )，常用单位是克/厘米³ (g/cm3 )。换算：1 g/cm3 = 1×103 kg/m3", r"国际单位是千克/米³（$\,\text{kg/m}^3$），常用单位是克/厘米³（$\,\text{g/cm}^3$）。换算：$1\,\text{g/cm}^3 = 1 \times 10^3\,\text{kg/m}^3$。"),
        ("帕斯卡 ( Pa )，1Pa=1N/m2", r"帕斯卡（Pa），$1\,\text{Pa} = 1\,\text{N/m}^2$。"),
        ("p=ρgh（h为深度）", r"$p = \rho gh$（$h$ 为深度）。"),
        ("托里拆利实验，标准大气压约为 1.01$\\times$105 Pa", r"托里拆利实验，标准大气压约为 $1.01 \times 10^5\,\text{Pa}$。"),
        ("F浮 =ρ液V排g", r"$F_{\text{浮}} = \rho_{\text{液}} V_{\text{排}} g$"),
        ("支点(O)、动力(F1)、阻力(F2)、动力臂(l1)、阻力臂(l2)。", r"支点（O）、动力（$F_1$）、阻力（$F_2$）、动力臂（$l_1$）、阻力臂（$l_2$）。"),
        ("动力×动力臂=阻力×阻力臂，即 F1l1 = F2l2", r"动力 × 动力臂 = 阻力 × 阻力臂，即 $F_1 l_1 = F_2 l_2$。"),
        ("W = Fs 。单位：焦耳 ( J )。", r"$W = Fs$。单位：焦耳（J）。"),
        ("η =$\\frac{W\\text{有用}}{W\\text{总}}$ ×100% 机械效率永远小于 1。", r"$\eta = \frac{W_{\text{有用}}}{W_{\text{总}}} \times 100\%$。机械效率永远小于 1。"),
        ("单位开尔文 ( K )， T = 273.15 + t", r"单位开尔文（K），$T = 273.15 + t$。"),
        ("- **公式**：Q=cm$∆$t", r"- **公式**：$Q = cm\Delta t$。"),
        ("- **单位**：焦/（千克\\cdot 摄氏度），符号 J/(kg\\cdot ℃)。", r"- **单位**：焦每（千克·摄氏度），符号 $\,\text{J}/(\text{kg}\cdot{}^\circ\text{C})$。"),
        ("燃料完全燃烧时放出的热量与燃料质量之比。公式：Q = mq", r"燃料完全燃烧时放出的热量与燃料质量之比。公式：$Q = mq$。"),
        ("总电阻等于各串联电阻之和 (R总=R1+R2)，相当于增加了导体的长度。", r"总电阻等于各串联电阻之和（$R_{\text{总}} = R_1 + R_2$），相当于增加了导体的长度。"),
        ("W=UIt", r"$W = UIt$"),
        ("焦耳 (J)，常用单位千瓦\\cdot 时 (kW\\cdot h)，1kW\\cdot h = 3.6$\\times$ 106 J", r"焦耳（J），常用单位千瓦时（kW·h），$1\,\text{kW}\cdot\text{h} = 3.6 \times 10^6\,\text{J}$。"),
        ("P = $\\frac{W}{t}$= UI", r"$P = \frac{W}{t} = UI$"),
        ("Q = I2Rt", r"$Q = I^2Rt$"),
        ("真空中传播速度约为3$\\times$108 m/s（与光速相同）。", r"真空中传播速度约为 $3 \times 10^8\,\text{m/s}$（与光速相同）。"),
        ("c = $\\lambdaf$（c：波速，$\\lambda$：波长，$f$：频率）频率越高，波长越短", r"$c = \lambda f$（$c$：波速，$\lambda$：波长，$f$：频率）。频率越高，波长越短。"),
        ("长度单位，光在真空中一年行进的距离（约9.46$\\times$1015米）。", r"长度单位，光在真空中一年行进的距离（约 $9.46 \times 10^{15}\,\text{m}$）。"),
        ("### 成像规律（u=物距，f=焦距）", r"### 成像规律（$u$=物距，$f$=焦距）"),
        ("方向相同 F合 = F1 + F2", r"方向相同时，$F_{\text{合}} = F_1 + F_2$。"),
        ("方向相反 F合=|F1 - F2|（方向同大者）。", r"方向相反时，$F_{\text{合}} = |F_1 - F_2|$（方向与较大的力相同）。"),
        ("- **省力杠杆（l1 > l2 ）**：省力但费距离（如钢丝钳）。", r"- **省力杠杆（$l_1 > l_2$）**：省力但费距离（如钢丝钳）。"),
        ("- **费力杠杆（l1 < l2 ）**：费力但省距离（如筷子、船桨）。", r"- **费力杠杆（$l_1 < l_2$）**：费力但省距离（如筷子、船桨）。"),
        ("- **等臂杠杆（l1 = l2 ）**：不省力不费力（如天平）。", r"- **等臂杠杆（$l_1 = l_2$）**：不省力不费力（如天平）。"),
        ("表示做功快慢的物理量。公式：P=$\\frac{W}{t}$ ；单位：瓦特(W)", r"表示做功快慢的物理量。公式：$P = \frac{W}{t}$；单位：瓦特（W）。"),
        ("W总 =W有用 +W额外", r"$W_{\text{总}} = W_{\text{有用}} + W_{\text{额外}}$"),
        ("物质由分子、原子构成。原子直径约为10-10米。", r"物质由分子、原子构成。原子直径约为 $10^{-10}\,\text{m}$。"),
    ]
    for old, new in exact_replacements:
        markdown = markdown.replace(old, new)

    regex_replacements: list[tuple[str, str]] = [
        (r"(?<!\$)1m/s = 3\.6km/h", r"$1\,\text{m/s} = 3.6\,\text{km/h}$"),
        (r"(?<!\$)1h = 60min = 3600s", r"$1\,\text{h} = 60\,\text{min} = 3600\,\text{s}$"),
        (r"(?<!\$)1t=1000kg，1kg=1000g", r"$1\,\text{t} = 1000\,\text{kg}$，$1\,\text{kg} = 1000\,\text{g}$"),
        (r"(?<!\$)P=\$\\frac\{F\}\{S\}\$", r"$P = \\frac{F}{S}$"),
        (r"(?<!\$)v = \$\\frac\{s\}\{t\}\$", r"$v = \\frac{s}{t}$"),
        (r"(?<!\$)R = \$\\frac\{U\}\{I\}\$", r"$R = \\frac{U}{I}$"),
        (r"(?<!\$)I = \$\\frac\{U\}\{R\}\$", r"$I = \\frac{U}{R}$"),
        (r"(?<!\$)Q = I\^2Rt", r"$Q = I^2Rt$"),
    ]
    for pattern, repl in regex_replacements:
        markdown = re.sub(pattern, repl, markdown)

    markdown = markdown.replace(",。", "。")
    markdown = markdown.replace(" ,。", "。")
    markdown = markdown.replace("，。", "。")
    markdown = re.sub(r"\n{3,}", "\n\n", markdown)
    return markdown.strip()


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    default_docx = Path.home() / "Documents" / "education" / "初中" / "初中物理" / "初中物理知识点合集.docx"
    docx_path = Path(sys.argv[1]) if len(sys.argv) > 1 else default_docx
    out_path = Path(sys.argv[2]) if len(sys.argv) > 2 else repo_root / "lib" / "physics-knowledge.json"
    image_dir = repo_root / "public" / "images" / "knowledge"

    if not docx_path.is_file():
        print(f"Missing file: {docx_path}", file=sys.stderr)
        return 1

    written: dict[str, str] = {}

    with zipfile.ZipFile(docx_path) as zf:
        rels = load_document_rels(zf)
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
            mx.flush_pending_bullets(pending_bullets, content_lines)
            if not chapter_title or not current_title:
                content_lines = []
                return
            title, lead = mx.extract_title_lead(current_title)
            body_md = "\n\n".join(line for line in content_lines if line.strip())
            if lead:
                body_md = f"{lead}\n\n{body_md}" if body_md else lead
            if not body_md.strip():
                content_lines = []
                return
            section_index += 1
            items.append(
                {
                    "id": f"phy_{chapter_number}_{section_index}",
                    "chapter": chapter_title,
                    "title": title,
                    "content": normalize_physics_markdown(body_md),
                }
            )
            content_lines = []

        for child in body:
            if mx_local(child.tag) != "p":
                continue
            paragraph = child

            if paragraph_has_embed(paragraph):
                md = segments_to_markdown_with_images(
                    paragraph_ordered_segments(paragraph),
                    zf,
                    rels,
                    image_dir,
                    written,
                ).strip()
                if md:
                    mx.flush_pending_bullets(pending_bullets, content_lines)
                    content_lines.append(md)
                continue

            text = mx.paragraph_plain_text(paragraph)
            if not text:
                continue

            if is_physics_chapter_heading(paragraph, text):
                flush()
                parsed = mx.parse_chapter_heading(text)
                if parsed is None:
                    continue
                chapter_number, chapter_title = parsed
                current_title = ""
                section_index = 0
                content_lines = []
                pending_bullets.clear()
                continue

            if chapter_title and mx.is_card_title(text):
                flush()
                current_title = mx.normalize_card_title(text)
                pending_bullets.clear()
                continue

            if not chapter_title:
                continue

            if not current_title:
                continue

            mx.append_body_paragraph(paragraph, text, pending_bullets, content_lines)

        flush()

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {len(items)} items to {out_path}")
    print(f"Extracted {len(written)} image file(s) under {image_dir}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
