import re
import sys
import json


def convert_timestamp_to_ms(timestr):
    parts = timestr.split(":")
    if len(parts) == 2:
        mm, ss = parts
        hh = 0
    else:
        hh, mm, ss = parts
    hh = int(hh)
    mm = int(mm)
    ss = int(ss)
    return (hh * 3600 + mm * 60 + ss) * 1000


def parse_transcript(text):
    pattern = re.compile(
        r"^(?P<speaker>[^\n]+?)\s+"
        r"(?P<timestamp>\d{1,2}:\d{2}(?::\d{2})?)\n"
        r"(?P<text>.*?)"
        r"(?=^(?:[^\n]+\s+\d{1,2}:\d{2}(?::\d{2})?)|$)",
        re.MULTILINE | re.DOTALL,
    )

    blocks = list(pattern.finditer(text))
    results = []

    for i, match in enumerate(blocks):
        speaker = match.group("speaker").strip()
        tstamp = match.group("timestamp").strip()
        body = match.group("text").strip()

        start_ms = convert_timestamp_to_ms(tstamp)
        end_ms = start_ms

        if i < len(blocks) - 1:
            next_ts = blocks[i + 1].group("timestamp").strip()
            end_ms = convert_timestamp_to_ms(next_ts)

        results.append(
            {"speaker": speaker, "start": start_ms, "end": end_ms, "text": body}
        )

    return results


if __name__ == "__main__":
    text = sys.stdin.read()
    data = parse_transcript(text)
    print(json.dumps({"conversation": data}, ensure_ascii=False, indent=4))
