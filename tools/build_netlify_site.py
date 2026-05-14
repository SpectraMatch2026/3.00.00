#!/usr/bin/env python3
"""Assemble a static site folder for Netlify (no Flask required on hosting)."""
from __future__ import annotations

import os
import shutil

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "netlify_publish")

THESIS_PDF_DIR = os.path.join(ROOT, "ThesisReprots PDFs")
# Published at site root under the same filenames as in ThesisReprots PDFs/ (see _redirects for legacy short URLs).
PUBLISHED_PDF_NAMES: tuple[str, ...] = (
    "Full_Report.pdf",
    "Color_Report.pdf",
    "Pattern_Report.pdf",
    "Settings_Receipt.pdf",
)

VIEWER_SPECS: tuple[dict[str, str], ...] = (
    {
        "slug": "fullreport",
        "pdf": "Full_Report.pdf",
        "download": "Full_Report.pdf",
        "title_en": "Full report",
        "title_tr": "Tam analiz raporu",
        "meta": "SpectraMatch full PDF report — color, pattern, and summary (sample output).",
    },
    {
        "slug": "colorreport",
        "pdf": "Color_Report.pdf",
        "download": "Color_Report.pdf",
        "title_en": "Color report",
        "title_tr": "Renk analiz raporu",
        "meta": "SpectraMatch color PDF report — colorimetric metrics and tables (sample output).",
    },
    {
        "slug": "patternreport",
        "pdf": "Pattern_Report.pdf",
        "download": "Pattern_Report.pdf",
        "title_en": "Pattern report",
        "title_tr": "Desen analiz raporu",
        "meta": "SpectraMatch pattern PDF report — SSIM, texture, and structure (sample output).",
    },
    {
        "slug": "settingsreport",
        "pdf": "Settings_Receipt.pdf",
        "download": "Settings_Receipt.pdf",
        "title_en": "Settings receipt",
        "title_tr": "Ayarlar özeti (makbuz)",
        "meta": "SpectraMatch settings receipt PDF — session parameters snapshot (sample output).",
    },
)


def _render_report_viewer(template: str, spec: dict[str, str]) -> str:
    return (
        template.replace("__META_DESC__", spec["meta"])
        .replace("__TITLE_EN__", spec["title_en"])
        .replace("__TITLE_TR__", spec["title_tr"])
        .replace("__PDF_FILE__", spec["pdf"])
        .replace("__DOWNLOAD_NAME__", spec["download"])
    )


def main() -> None:
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT, exist_ok=True)
    shutil.copy2(
        os.path.join(ROOT, "templates", "index.html"),
        os.path.join(OUT, "index.html"),
    )
    # Product datasheets landing: /datasheets/ (served as index in folder)
    datasheets_dir = os.path.join(OUT, "datasheets")
    os.makedirs(datasheets_dir, exist_ok=True)
    shutil.copy2(
        os.path.join(ROOT, "templates", "datasheets.html"),
        os.path.join(datasheets_dir, "index.html"),
    )
    shutil.copytree(os.path.join(ROOT, "static"), os.path.join(OUT, "static"))
    # Short URLs: /datasheetEN.pdf and /datasheetTR.pdf
    en_pdf = os.path.join(ROOT, "static", "DataSheets", "Datasheet_EN.pdf")
    tr_pdf = os.path.join(ROOT, "static", "DataSheets", "Datasheet_TR.pdf")
    for src, name in ((en_pdf, "datasheetEN.pdf"), (tr_pdf, "datasheetTR.pdf")):
        if not os.path.isfile(src):
            raise FileNotFoundError(
                f"Build requires datasheet PDF: missing {os.path.relpath(src, ROOT)}"
            )
        shutil.copy2(src, os.path.join(OUT, name))
    # Thesis / sample reports — PDFs + viewer pages + hub
    viewer_tpl_path = os.path.join(ROOT, "templates", "report_viewer.html")
    if not os.path.isfile(viewer_tpl_path):
        raise FileNotFoundError(f"Missing template: {viewer_tpl_path}")
    with open(viewer_tpl_path, encoding="utf-8") as f:
        viewer_template = f.read()
    if not os.path.isdir(THESIS_PDF_DIR):
        raise FileNotFoundError(
            f"Build requires folder {os.path.relpath(THESIS_PDF_DIR, ROOT)} "
            "(copy sample PDFs: Full_Report, Color_Report, Pattern_Report, Settings_Receipt)."
        )
    for name in PUBLISHED_PDF_NAMES:
        src = os.path.join(THESIS_PDF_DIR, name)
        if not os.path.isfile(src):
            raise FileNotFoundError(
                f"Build requires thesis report PDF: missing {os.path.relpath(src, ROOT)}"
            )
        shutil.copy2(src, os.path.join(OUT, name))
    for spec in VIEWER_SPECS:
        slug_dir = os.path.join(OUT, spec["slug"])
        os.makedirs(slug_dir, exist_ok=True)
        html = _render_report_viewer(viewer_template, spec)
        with open(os.path.join(slug_dir, "index.html"), "w", encoding="utf-8") as out:
            out.write(html)
    reports_dir = os.path.join(OUT, "reports")
    os.makedirs(reports_dir, exist_ok=True)
    shutil.copy2(
        os.path.join(ROOT, "templates", "reports_hub.html"),
        os.path.join(reports_dir, "index.html"),
    )
    extras = os.path.join(ROOT, "netlify_extras", "_redirects")
    if os.path.isfile(extras):
        shutil.copy2(extras, os.path.join(OUT, "_redirects"))
    print("Netlify publish directory ready.")


if __name__ == "__main__":
    main()
