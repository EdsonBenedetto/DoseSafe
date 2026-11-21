#!/usr/bin/env python3
"""Sincroniza responsáveis e descrições dos itens de configuração.

Use `python3 tools/sync_ics.py --watch` para acompanhar alterações no projeto.
O arquivo XLSX é atualizado por edição do XML interno, preservando os demais
conteúdos e estilos existentes sem depender de bibliotecas externas.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import os
from pathlib import Path
import subprocess
import tempfile
import time
import zipfile
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[1]
WORKBOOK = ROOT / "docs/gc/lista_ics.xlsx"
SHEET_PATH = "xl/worksheets/sheet1.xml"
LOCK_FILE = WORKBOOK.parent / f".~lock.{WORKBOOK.name}#"
MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
XML_NS = "http://www.w3.org/XML/1998/namespace"
NS = {"m": MAIN_NS}

# IC existente -> arquivos que compõem esse item de configuração.
IC_FILES: dict[int, tuple[str, ...]] = {
    2: ("docs/requisitos/doc_requisitos.pdf",),
    3: ("docs/gerencia_projeto/plano_projeto.docx",),
    4: ("README.md",),
    5: ("tests/README.md",),
    9: ("src/js/auth.js",),
    10: ("src/js/medicamentos.js",),
    11: ("src/pages/login.html", "src/css/login.css", "src/js/pages/login.js"),
    12: ("src/pages/inicio.html", "src/css/inicio.css", "src/js/pages/inicio.js"),
    13: ("src/pages/admin-funcionarios.html", "src/css/admin-funcionarios.css", "src/js/pages/admin-funcionarios.js"),
    14: ("src/pages/central-enfermagem.html", "src/css/central-enfermagem.css", "src/js/pages/central-enfermagem.js"),
    15: ("src/pages/prescricao-medica.html", "src/css/prescricao-medica.css", "src/js/pages/prescricao-medica.js"),
    16: ("src/pages/prescricao-enfermaria.html", "src/css/prescricao-enfermaria.css", "src/js/pages/prescricao-enfermaria.js"),
    17: ("src/pages/triagem-hospitalar (2).html", "src/css/triagem-hospitalar-2.css", "src/js/pages/triagem-hospitalar-2.js"),
    18: ("src/css/base.css", "src/css/fluent.css", "src/css/theme.css"),
    19: ("src/js/theme.js",),
}

NEW_ROWS = {
    18: (
        "IC-COD-10",
        "Estilos compartilhados e temas (base.css, fluent.css, theme.css)",
        "Código-fonte — CSS",
        "Define os tokens visuais compartilhados, a estética Fluent e os estilos claro/escuro do DoseSafe.",
        "0.1",
        "Em revisão",
        "Equipe",
        "Inclui a base visual e o tema noturno inspirado no Windows 11.",
    ),
    19: (
        "IC-COD-11",
        "Controle de tema (theme.js)",
        "Código-fonte — JavaScript",
        "Aplica e persiste a preferência de tema claro ou escuro nas páginas do sistema.",
        "0.1",
        "Em revisão",
        "Equipe",
        "Preferência armazenada no navegador.",
    ),
}

DESCRIPTION_UPDATES = {
    11: "Interface de autenticação por matrícula/registro profissional e senha; importa estilos e lógica específicos da tela.",
    12: "Apresenta a página inicial e os acessos às áreas disponíveis ao usuário autenticado; importa CSS e JavaScript próprios.",
    13: "Permite administrar funcionários, áreas/setores, permissões e medicamentos; importa CSS e JavaScript próprios.",
    14: "Exibe filas de medicação/reavaliação e permite registrar administração; importa CSS e JavaScript próprios.",
    15: "Permite registrar prescrições médicas, consultar medicamentos e apresentar alertas; importa CSS e JavaScript próprios.",
    16: "Organiza medicações, doses, vias, frequências e horários de administração; importa CSS e JavaScript próprios.",
    17: "Registra dados do paciente, sinais vitais, sintomas e classificação de risco; importa CSS e JavaScript próprios.",
}


def qname(name: str) -> str:
    return f"{{{MAIN_NS}}}{name}"


def inline_string(cell: ET.Element, value: str) -> None:
    for child in list(cell):
        cell.remove(child)
    cell.set("t", "inlineStr")
    inline = ET.SubElement(cell, qname("is"))
    text = ET.SubElement(inline, qname("t"))
    if value != value.strip():
        text.set(f"{{{XML_NS}}}space", "preserve")
    text.text = value


def digest_for(paths: tuple[str, ...]) -> str:
    digest = hashlib.sha256()
    found = False
    for rel_path in sorted(paths):
        path = ROOT / rel_path
        if not path.is_file():
            continue
        found = True
        digest.update(rel_path.encode("utf-8"))
        digest.update(b"\0")
        digest.update(path.read_bytes())
        digest.update(b"\0")
    return digest.hexdigest()[:16] if found else "não encontrado"


def register_xml_namespaces(xml_bytes: bytes) -> None:
    for _, (prefix, uri) in ET.iterparse(io.BytesIO(xml_bytes), events=("start-ns",)):
        ET.register_namespace(prefix, uri)


def find_row(sheet_data: ET.Element, row_number: int) -> ET.Element:
    for row in sheet_data.findall("m:row", NS):
        if row.get("r") == str(row_number):
            return row
    row = ET.Element(qname("row"), {"r": str(row_number)})
    following = next((r for r in sheet_data.findall("m:row", NS) if int(r.get("r", "0")) > row_number), None)
    if following is None:
        sheet_data.append(row)
    else:
        sheet_data.insert(list(sheet_data).index(following), row)
    return row


def find_cell(row: ET.Element, address: str) -> ET.Element | None:
    return next((cell for cell in row.findall("m:c", NS) if cell.get("r") == address), None)


def style_for(sheet_data: ET.Element, row_number: int, column: str) -> str | None:
    source_row = find_row(sheet_data, row_number)
    source_column = "H" if column == "I" else column
    source = find_cell(source_row, f"{source_column}{row_number}")
    if source is None:
        # Use the matching cell style from the preceding populated data row.
        source = find_cell(find_row(sheet_data, 17), f"{source_column}17")
    return source.get("s") if source is not None else None


def put_cell(sheet_data: ET.Element, row_number: int, column: str, value: str) -> None:
    row = find_row(sheet_data, row_number)
    address = f"{column}{row_number}"
    cell = find_cell(row, address)
    if cell is None:
        cell = ET.Element(qname("c"), {"r": address})
        style = style_for(sheet_data, 17 if row_number >= 18 else row_number, column)
        if style:
            cell.set("s", style)
        # Cells within a row must remain in column order.
        col_number = ord(column) - ord("A")
        position = next((i for i, c in enumerate(row.findall("m:c", NS)) if ord(c.get("r", "A1")[0]) - ord("A") > col_number), None)
        if position is None:
            row.append(cell)
        else:
            row.insert(position, cell)
    inline_string(cell, value)


def lock_exists() -> bool:
    return LOCK_FILE.exists()


def cell_text(row: ET.Element, address: str, shared_strings: list[str]) -> str:
    cell = find_cell(row, address)
    if cell is None:
        return ""
    if cell.get("t") == "inlineStr":
        return "".join(node.text or "" for node in cell.findall(".//m:t", NS))
    value = cell.find("m:v", NS)
    if value is None or value.text is None:
        return ""
    if cell.get("t") == "s":
        try:
            return shared_strings[int(value.text)]
        except (ValueError, IndexError):
            return ""
    return value.text


def sheet_shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    root = ET.fromstring(archive.read("xl/sharedStrings.xml"))
    return ["".join(node.text or "" for node in item.findall(".//m:t", NS)) for item in root.findall("m:si", NS)]


def find_changed_rows(sheet_data: ET.Element, shared_strings: list[str]) -> set[int]:
    changed = set()
    for row_number, paths in IC_FILES.items():
        row = find_row(sheet_data, row_number)
        recorded = cell_text(row, f"I{row_number}", shared_strings)
        if recorded and recorded != digest_for(paths):
            changed.add(row_number)
    return changed


def remove_hash_column(sheet: ET.Element, sheet_data: ET.Element) -> None:
    for row in sheet_data.findall("m:row", NS):
        for cell in list(row.findall("m:c", NS)):
            if cell.get("r", "").startswith("I"):
                row.remove(cell)

    cols = sheet.find("m:cols", NS)
    if cols is not None:
        for col in list(cols.findall("m:col", NS)):
            start, end = int(col.get("min", "0")), int(col.get("max", "0"))
            if start <= 9 <= end:
                cols.remove(col)
                if start < 9:
                    ET.SubElement(cols, qname("col"), {**col.attrib, "max": "8"})
                if end > 9:
                    ET.SubElement(cols, qname("col"), {**col.attrib, "min": "10"})

    for element in sheet.iter():
        ref = element.get("ref")
        if ref and ":" in ref and ref.rsplit(":", 1)[1].startswith("I"):
            element.set("ref", ref.rsplit(":", 1)[0] + ":H" + "".join(c for c in ref.rsplit(":", 1)[1] if c.isdigit()))


def sync(changed_rows: set[int] | None = None) -> bool:
    if lock_exists():
        print(f"Planilha aberta/bloqueada ({LOCK_FILE.name}); vou aguardar o fechamento antes de atualizar.")
        return False
    if not WORKBOOK.exists():
        raise FileNotFoundError(f"Planilha não encontrada: {WORKBOOK}")

    with zipfile.ZipFile(WORKBOOK, "r") as source:
        if SHEET_PATH not in source.namelist():
            raise RuntimeError(f"A planilha não contém {SHEET_PATH}; não foi alterada.")
        original_sheet = source.read(SHEET_PATH)
        shared_strings = sheet_shared_strings(source)

    register_xml_namespaces(original_sheet)
    sheet = ET.fromstring(original_sheet)
    sheet_data = sheet.find("m:sheetData", NS)
    if sheet_data is None:
        raise RuntimeError("A aba 'Lista de ICs' não contém sheetData.")

    if changed_rows is None:
        changed_rows = find_changed_rows(sheet_data, shared_strings)

    has_hash_column = any(
        cell.get("r", "").startswith("I")
        for row in sheet_data.findall("m:row", NS)
        for cell in row.findall("m:c", NS)
    )
    descriptions_match = all(
        cell_text(find_row(sheet_data, row_number), f"D{row_number}", shared_strings) == description
        for row_number, description in DESCRIPTION_UPDATES.items()
    )
    new_rows_match = all(
        all(cell_text(find_row(sheet_data, row_number), f"{column}{row_number}", shared_strings) == value
            for column, value in zip("ABCDEFGH", values))
        for row_number, values in NEW_ROWS.items()
    )
    owner_updates = {
        row_number
        for row_number in changed_rows
        if cell_text(find_row(sheet_data, row_number), f"G{row_number}", shared_strings) != "Gustavo Farias"
    }
    if not owner_updates and not has_hash_column and descriptions_match and new_rows_match:
        return True

    for row_number, values in NEW_ROWS.items():
        for column, value in zip("ABCDEFGH", values):
            put_cell(sheet_data, row_number, column, value)

    for row_number, description in DESCRIPTION_UPDATES.items():
        put_cell(sheet_data, row_number, "D", description)

    for row_number in owner_updates:
        put_cell(sheet_data, row_number, "G", "Gustavo Farias")

    remove_hash_column(sheet, sheet_data)

    updated_sheet = ET.tostring(sheet, encoding="utf-8", xml_declaration=True)
    fd, temp_name = tempfile.mkstemp(prefix="lista_ics-", suffix=".xlsx", dir=WORKBOOK.parent)
    os.close(fd)
    temp_path = Path(temp_name)
    try:
        with zipfile.ZipFile(WORKBOOK, "r") as source, zipfile.ZipFile(temp_path, "w") as target:
            for info in source.infolist():
                payload = updated_sheet if info.filename == SHEET_PATH else source.read(info.filename)
                target.writestr(info, payload)
        # Re-check in case the spreadsheet was opened while the update was prepared.
        if lock_exists():
            print(f"A planilha foi aberta durante a atualização; mantive o original ({LOCK_FILE.name}).")
            return False
        os.replace(temp_path, WORKBOOK)
    finally:
        temp_path.unlink(missing_ok=True)

    if owner_updates:
        print(f"Lista de ICs atualizada; Gustavo Farias atribuído aos ICs: {', '.join(map(str, sorted(owner_updates)))}.")
    else:
        print("Lista de ICs sincronizada; coluna SHA-256 removida.")
    return True


def ic_snapshot() -> dict[int, str]:
    return {row: digest_for(paths) for row, paths in IC_FILES.items()}


def current_commit() -> str:
    result = subprocess.run(
        ["git", "rev-parse", "HEAD"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout.strip() if result.returncode == 0 else ""


def rows_in_commit(commit: str) -> set[int]:
    if not commit:
        return set()
    result = subprocess.run(
        ["git", "diff-tree", "--root", "--no-commit-id", "--name-only", "-r", commit],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    changed_paths = set(result.stdout.splitlines()) if result.returncode == 0 else set()
    return {
        row_number
        for row_number, paths in IC_FILES.items()
        if changed_paths.intersection(paths)
    }


def watch(interval: float) -> None:
    previous = ic_snapshot()
    # Na inicialização, também processa o commit mais recente caso o monitor
    # tenha sido iniciado depois dele.
    previous_commit = ""
    print("Acompanhando mudanças no DoseSafe; Ctrl+C encerra a sincronização automática.", flush=True)
    pending = not sync()
    pending_rows: set[int] = set()
    pending_auto = pending
    while True:
        time.sleep(interval)
        current = ic_snapshot()
        changed_rows = {row for row, digest in current.items() if previous.get(row) != digest}
        commit = current_commit()
        committed_rows: set[int] = set()
        if commit and commit != previous_commit:
            committed_rows = rows_in_commit(commit)
            previous_commit = commit
        if changed_rows:
            previous = current
            pending = True
            pending_rows.update(changed_rows)
        if committed_rows:
            pending = True
            pending_rows.update(committed_rows)
            print(f"Commit detectado; ICs alterados: {', '.join(map(str, sorted(committed_rows)))}.", flush=True)
        if changed_rows or committed_rows:
            # Aguarda gravações em andamento terminarem antes de recalcular os hashes.
            time.sleep(0.5)
        if pending and not lock_exists():
            pending = not sync(None if pending_auto else pending_rows)
            if not pending:
                pending_rows.clear()
                pending_auto = False


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--watch", action="store_true", help="acompanha alterações nos arquivos do projeto")
    parser.add_argument("--interval", type=float, default=1.5, help="intervalo de observação em segundos")
    args = parser.parse_args()
    if args.watch:
        try:
            watch(max(args.interval, 0.5))
        except KeyboardInterrupt:
            print("Sincronização automática encerrada.")
    else:
        sync()


if __name__ == "__main__":
    main()
