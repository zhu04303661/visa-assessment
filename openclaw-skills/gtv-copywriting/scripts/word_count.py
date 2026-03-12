#!/usr/bin/env python3
"""中英文混合字数统计工具。

支持按段落统计、总计。中文按字计，英文按词计。

用法:
  python3 scripts/word_count.py document.txt
  python3 scripts/word_count.py document.txt --by-paragraph
  cat document.txt | python3 scripts/word_count.py -
"""
import argparse
import re
import sys
from pathlib import Path


def count_chars(text: str) -> dict:
    """中英文混合字数统计。中文按字计，英文按词计。"""
    text_clean = text.replace("\n", " ").strip()
    chinese_chars = re.findall(r"[\u4e00-\u9fff]", text_clean)
    english_part = re.sub(r"[\u4e00-\u9fff]", " ", text_clean)
    english_words = [w for w in re.split(r"\s+", english_part) if w]
    return {
        "chinese": len(chinese_chars),
        "english_words": len(english_words),
        "total": len(chinese_chars) + len(english_words),
        "raw_chars": len(text_clean.replace(" ", "")),
    }


def read_input(filepath: str) -> str:
    """从文件或 stdin 读取内容。"""
    if filepath == "-":
        return sys.stdin.read()
    p = Path(filepath)
    if not p.exists():
        raise FileNotFoundError(f"文件不存在: {filepath}")
    return p.read_text(encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description="中英文混合字数统计")
    parser.add_argument("file", nargs="?", default="-", help="文件路径，- 表示从 stdin 读取")
    parser.add_argument("--by-paragraph", "-p", action="store_true", help="按段落统计")
    args = parser.parse_args()

    try:
        text = read_input(args.file)
    except FileNotFoundError as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)

    if args.by_paragraph:
        paragraphs = [p.strip() for p in text.split("\n\n") if p.strip()]
        total_chinese = 0
        total_english = 0
        print("段落字数统计：")
        print("-" * 50)
        for i, para in enumerate(paragraphs):
            counts = count_chars(para)
            total_chinese += counts["chinese"]
            total_english += counts["english_words"]
            print(f"  段落 {i + 1}: 中文 {counts['chinese']} 字, 英文约 {counts['english_words']} 词, 合计约 {counts['total']} 字")
        print("-" * 50)
        total = total_chinese + total_english
        print(f"  总计: 中文 {total_chinese} 字, 英文约 {total_english} 词, 合计约 {total} 字")
    else:
        counts = count_chars(text)
        print(f"中文: {counts['chinese']} 字")
        print(f"英文: 约 {counts['english_words']} 词")
        print(f"合计: 约 {counts['total']} 字")
        print(f"原始字符数: {counts['raw_chars']}")


if __name__ == "__main__":
    main()
