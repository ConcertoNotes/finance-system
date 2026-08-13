import json
from pathlib import Path

BASE = Path(__file__).resolve().parent
SRC = BASE / "xlsx-dump"
OUT = BASE / "xlsx-compact"
OUT.mkdir(parents=True, exist_ok=True)

for jf in sorted(SRC.glob("*.json")):
    data = json.loads(jf.read_text(encoding="utf-8"))
    lines = [f"# {data['file']}", ""]
    for sheet in data["sheets"]:
        f = sheet["formulas"]
        v = sheet.get("values", {})
        vrows = v.get("rows", [])
        lines.append(f"===== SHEET: {f['name']} =====")
        for r_i, row in enumerate(f["rows"], start=1):
            vrow = vrows[r_i - 1] if r_i - 1 < len(vrows) else []
            cells = []
            for c_i, cell in enumerate(row):
                val = vrow[c_i] if c_i < len(vrow) else ""
                if cell.startswith("="):
                    cells.append(f"{{{cell} => {val}}}")
                else:
                    cells.append(cell.strip())
            while cells and not cells[-1]:
                cells.pop()
            if not cells:
                continue
            text = " | ".join(cells) if len(cells) > 1 else cells[0]
            lines.append(f"{r_i}\t{text}")
        lines.append("")
    (OUT / (jf.stem + ".txt")).write_text("\n".join(lines), encoding="utf-8")
    print(jf.stem, len(lines))
