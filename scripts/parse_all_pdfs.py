#!/usr/bin/env python3
"""解析 pdfs/ 目录下道德与法治教材 PDF，输出 daofa_chunks.json。

用法：
  pip install pypdf
  python3 scripts/parse_all_pdfs.py

输出：项目根目录 daofa_chunks.json
"""

from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader

# 每本书的标题与页码偏移（印刷第 1 页 ≈ PDF 第 offset+1 页）。
# offset 为预估值，可按实际 PDF 对照印刷页码后微调。
PDF_CONFIG: dict[str, dict[str, str | int]] = {
    "1.pdf": {"book_title": "道德与法治七年级上册", "offset": 5},
    "2.pdf": {"book_title": "道德与法治七年级下册", "offset": 5},
    "3.pdf": {"book_title": "道德与法治八年级上册", "offset": 6},
    "4.pdf": {"book_title": "道德与法治八年级下册", "offset": 6},
    "5.pdf": {"book_title": "道德与法治九年级上册", "offset": 5},
    "6.pdf": {"book_title": "道德与法治九年级下册", "offset": 5},
}

CHUNK_MIN = 300
CHUNK_MAX = 400
CHUNK_WHOLE_PAGE_MAX = 400


def normalize_text(text: str) -> str:
    """合并多余空白，保留段落换行。"""
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    lines = [re.sub(r"[ \t]+", " ", line).strip() for line in text.split("\n")]
    return "\n".join(line for line in lines if line).strip()


def split_page_lines(text: str) -> tuple[str, str]:
    """返回 (第一行作为章节名候选, 剩余正文)。"""
    lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
    if not lines:
        return "", ""
    if len(lines) == 1:
        return lines[0], ""
    return lines[0], "\n".join(lines[1:]).strip()


def find_split_index(text: str, start: int) -> int:
    """在 [start+CHUNK_MIN, start+CHUNK_MAX] 内寻找合适断点。"""
    remaining = len(text) - start
    if remaining <= CHUNK_MAX:
        return len(text)

    lo = start + CHUNK_MIN
    hi = start + CHUNK_MAX
    window = text[lo:hi]

    for sep in ("\n\n", "\n", "。", "；", "！", "？", " ", ""):
        if not sep:
            return hi
        pos = window.rfind(sep)
        if pos != -1:
            return lo + pos + len(sep)
    return hi


def chunk_page_text(body: str) -> list[str]:
    """按约 300–400 字切分；不足 400 字则整页一片。"""
    body = normalize_text(body)
    if not body:
        return []
    if len(body) < CHUNK_WHOLE_PAGE_MAX:
        return [body]

    chunks: list[str] = []
    start = 0
    while start < len(body):
        if len(body) - start <= CHUNK_MAX:
            tail = body[start:].strip()
            if tail:
                chunks.append(tail)
            break
        end = find_split_index(body, start)
        piece = body[start:end].strip()
        if piece:
            chunks.append(piece)
        start = end
    return chunks


def parse_pdf(
    pdf_path: Path,
    book_title: str,
    offset: int,
    last_chapter: str,
) -> tuple[list[dict], str]:
    """解析单本 PDF，返回 (切片列表, 更新后的章节名)。"""
    reader = PdfReader(str(pdf_path))
    chunks: list[dict] = []

    for pdf_idx, page in enumerate(reader.pages):
        pdf_page_num = pdf_idx + 1  # PDF 页码（从 1 起）
        print_page = pdf_page_num - offset
        if print_page <= 0:
            continue

        raw = page.extract_text() or ""
        raw = normalize_text(raw)
        if not raw:
            continue

        header_line, body = split_page_lines(raw)
        if header_line:
            last_chapter = header_line
        chapter_name = last_chapter

        # 无正文时仍用整页文本切片（避免只有页眉的页丢失）
        slice_source = body if body else raw
        for content in chunk_page_text(slice_source):
            chunks.append(
                {
                    "book_title": book_title,
                    "chapter_name": chapter_name,
                    "page_number": print_page,
                    "content": content,
                }
            )

    return chunks, last_chapter


def main() -> None:
    root = Path(__file__).resolve().parent.parent
    pdfs_dir = root / "pdfs"
    output_path = root / "daofa_chunks.json"

    all_chunks: list[dict] = []
    last_chapter = ""

    for filename in sorted(PDF_CONFIG.keys(), key=lambda name: int(name.split(".")[0])):
        cfg = PDF_CONFIG[filename]
        book_title = str(cfg["book_title"])
        offset = int(cfg["offset"])
        pdf_path = pdfs_dir / filename
        if not pdf_path.is_file():
            print(f"跳过：未找到 {pdf_path}")
            continue

        print(f"正在解析 {filename}（{book_title}，offset={offset}）…")
        book_chunks, last_chapter = parse_pdf(
            pdf_path, book_title, offset, last_chapter
        )
        all_chunks.extend(book_chunks)
        print(f"  -> {len(book_chunks)} 条切片")

    with output_path.open("w", encoding="utf-8") as f:
        json.dump(all_chunks, f, ensure_ascii=False, indent=2)

    print(f"\n完成：共 {len(all_chunks)} 条切片，已写入 {output_path}")


if __name__ == "__main__":
    main()
