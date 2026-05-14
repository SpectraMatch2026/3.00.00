# -*- coding: utf-8 -*-
"""
ProcessingReportBackend.py - SpectraMatch v3.0.0
Dedicated Processing & Calibration Report for Image Alignment

Generates a professional PDF report documenting all image registration
techniques tested, their parameters, and what changes/cropping were applied.
Each technique gets a separate page with full details and branding.

This report combines settings context with alignment processing results,
focused on clarity and useful calibration details.
"""

import os
import io
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Image as RLImage, Table, TableStyle,
    Spacer, PageBreak, Flowable, KeepTogether
)

from modules.ReportUtils import (
    SOFTWARE_VERSION, PAGE_SIZE, MARGIN_L, MARGIN_R, MARGIN_T, MARGIN_B,
    BLUE1, BLUE2, GREEN, RED, ORANGE, NEUTRAL_DARK, NEUTRAL, NEUTRAL_L,
    PDF_FONT_REGULAR, PDF_FONT_BOLD,
    StyleTitle, StyleH1, StyleH2, StyleBody, StyleSmall,
    pick_logo, make_header_footer, make_table, badge, get_local_time,
    STATIC_IMAGES_DIR
)
from modules.ImageAlignmentBackend import ALIGNMENT_MODES


# ═══════════════════════════════════════════════════════════════════
# Report-Specific Styles
# ═══════════════════════════════════════════════════════════════════

styles = getSampleStyleSheet()

StyleReportTitle = ParagraphStyle(
    "ProcReportTitle", parent=styles["Heading1"],
    fontName=PDF_FONT_BOLD, fontSize=22, textColor=NEUTRAL_DARK,
    leading=26, alignment=TA_CENTER, spaceAfter=6
)

StyleTechTitle = ParagraphStyle(
    "TechTitle", parent=styles["Heading1"],
    fontName=PDF_FONT_BOLD, fontSize=16, textColor=BLUE1,
    leading=20, spaceAfter=8
)

StyleTechSubtitle = ParagraphStyle(
    "TechSubtitle", parent=styles["BodyText"],
    fontName=PDF_FONT_REGULAR, fontSize=10, textColor=NEUTRAL,
    leading=14, spaceAfter=12
)

StyleMetricLabel = ParagraphStyle(
    "MetricLabel", parent=styles["BodyText"],
    fontName=PDF_FONT_BOLD, fontSize=9, textColor=NEUTRAL_DARK,
    leading=12
)

StyleMetricValue = ParagraphStyle(
    "MetricValue", parent=styles["BodyText"],
    fontName=PDF_FONT_REGULAR, fontSize=9, textColor=colors.black,
    leading=12
)

StyleSectionBanner = ParagraphStyle(
    "SectionBanner", parent=styles["Heading2"],
    fontName=PDF_FONT_BOLD, fontSize=12, textColor=colors.white,
    leading=16, alignment=TA_CENTER, spaceAfter=0
)


# ═══════════════════════════════════════════════════════════════════
# Custom Flowables
# ═══════════════════════════════════════════════════════════════════

class TechBanner(Flowable):
    """Colored banner header for a technique section."""
    def __init__(self, text, bg_color=BLUE1, width=None):
        super().__init__()
        self.text = text
        self.bg = bg_color
        self.box_width = width or (A4[0] - MARGIN_L - MARGIN_R)
        self.box_height = 30

    def draw(self):
        self.canv.setFillColor(self.bg)
        self.canv.roundRect(0, 0, self.box_width, self.box_height, 4, fill=1, stroke=0)
        self.canv.setFillColor(colors.white)
        self.canv.setFont(PDF_FONT_BOLD, 12)
        self.canv.drawCentredString(self.box_width / 2, 9, self.text)

    def wrap(self, availW, availH):
        return (self.box_width, self.box_height)


class StatusBadge(Flowable):
    """Inline status badge (Applied/Not Applied/Low Similarity)."""
    def __init__(self, text, bg_color=GREEN):
        super().__init__()
        self.text = text
        self.bg = bg_color
        self.w = max(80, 7 * len(text))
        self.h = 18

    def draw(self):
        self.canv.setFillColor(self.bg)
        self.canv.roundRect(0, 0, self.w, self.h, 4, fill=1, stroke=0)
        self.canv.setFillColor(colors.white)
        self.canv.setFont(PDF_FONT_BOLD, 8.5)
        self.canv.drawCentredString(self.w / 2, 4, self.text)

    def wrap(self, availW, availH):
        return (self.w, self.h)


# ═══════════════════════════════════════════════════════════════════
# Main Report Generator
# ═══════════════════════════════════════════════════════════════════

def _base64_to_pil(b64_str):
    """Convert a base64 PNG string to a PIL Image."""
    import base64
    from PIL import Image as PILImage
    try:
        raw = base64.b64decode(b64_str)
        buf = io.BytesIO(raw)
        return PILImage.open(buf).convert('RGB')
    except Exception:
        return None


def _pil_to_rl(pil_img, max_w=2.4 * inch, max_h=1.8 * inch):
    """Convert a PIL Image to a ReportLab Image flowable."""
    if pil_img is None:
        return None
    iw, ih = pil_img.size
    if iw == 0 or ih == 0:
        return None
    s = min(max_w / iw, max_h / ih)
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    buf.seek(0)
    return RLImage(buf, width=iw * s, height=ih * s)


def _base64_to_rl(b64_str, max_w=2.4 * inch, max_h=1.8 * inch):
    """Convert a base64 PNG string to a ReportLab Image flowable."""
    return _pil_to_rl(_base64_to_pil(b64_str), max_w, max_h)


def _annotate_image(pil_img, metrics, is_tr=False):
    """
    Draw professional annotations on a processed image to highlight
    rotation, translation, and cropping changes.
    Returns annotated PIL image.
    """
    import cv2
    import numpy as np
    from PIL import ImageDraw, ImageFont

    if pil_img is None:
        return None

    img = pil_img.copy()
    w, h = img.size

    # Convert to OpenCV for drawing
    cv_img = np.array(img)
    cv_img = cv2.cvtColor(cv_img, cv2.COLOR_RGB2BGR)

    applied = metrics.get('applied', False)
    if not applied:
        return img

    annotations = []
    font_scale = max(0.35, min(w, h) / 800.0)
    thickness = max(1, int(font_scale * 2))
    color_arrow = (0, 180, 255)      # Orange for translation
    color_rot = (255, 100, 50)        # Blue-ish for rotation
    color_crop = (50, 200, 50)        # Green for crop

    # ── Translation arrows ──
    try:
        tx = float(metrics.get('translation_x', 0) or 0)
        ty = float(metrics.get('translation_y', 0) or 0)
    except (TypeError, ValueError):
        tx, ty = 0.0, 0.0
    if (abs(tx) > 0.5 or abs(ty) > 0.5):
        cx, cy = w // 2, h // 2
        # Scale arrow length proportionally (capped)
        arrow_scale = min(w, h) / 4.0
        mag = (tx**2 + ty**2) ** 0.5
        if mag > 0:
            nx, ny = tx / mag, ty / mag
            arrow_len = min(arrow_scale, mag * 2)
            ex = int(cx + nx * arrow_len)
            ey = int(cy + ny * arrow_len)
            cv2.arrowedLine(cv_img, (cx, cy), (ex, ey), color_arrow, thickness + 1, tipLength=0.25)
            label = f"dx={tx:.1f}, dy={ty:.1f}"
            lbl_tr = f"dx={tx:.1f}, dy={ty:.1f}"
            annotations.append(('shift', label if not is_tr else lbl_tr, color_arrow))

    # ── Rotation indicator ──
    try:
        rot = float(metrics.get('rotation_deg', 0) or 0)
    except (TypeError, ValueError):
        rot = 0.0
    if abs(rot) > 0.05:
        cx, cy = w // 2, h // 2
        radius = int(min(w, h) * 0.18)
        start_angle = 0
        end_angle = int(rot * 2)  # amplify for visibility, capped
        end_angle = max(-90, min(90, end_angle))
        cv2.ellipse(cv_img, (cx, cy), (radius, radius), 0,
                     start_angle, end_angle, color_rot, thickness + 1)
        # Arrow tip at end of arc
        import math
        rad = math.radians(end_angle)
        tip_x = int(cx + radius * math.cos(rad))
        tip_y = int(cy + radius * math.sin(rad))
        cv2.circle(cv_img, (tip_x, tip_y), thickness + 2, color_rot, -1)
        label = f"rot={rot:.2f}" + chr(176)  # degree sign
        annotations.append(('rotation', label, color_rot))

    # ── Crop border indicator ──
    crop_size = metrics.get('crop_size')
    area_pct = metrics.get('area_percent')
    if crop_size and area_pct and float(area_pct) < 100:
        pad = max(3, int(min(w, h) * 0.015))
        cv2.rectangle(cv_img, (pad, pad), (w - pad, h - pad), color_crop, thickness + 1)
        # Corner marks
        mark_len = int(min(w, h) * 0.08)
        for (sx, sy) in [(pad, pad), (w - pad, pad), (pad, h - pad), (w - pad, h - pad)]:
            dx = mark_len if sx == pad else -mark_len
            dy = mark_len if sy == pad else -mark_len
            cv2.line(cv_img, (sx, sy), (sx + dx, sy), color_crop, thickness + 1)
            cv2.line(cv_img, (sx, sy), (sx, sy + dy), color_crop, thickness + 1)
        lbl_en = f"Crop: {area_pct}%"
        lbl_tr = f"Kirpma: {area_pct}%"
        annotations.append(('crop', lbl_tr if is_tr else lbl_en, color_crop))

    # ── Draw annotation legend at bottom ──
    if annotations:
        y_pos = h - int(18 * font_scale) - 4
        for _type, text, clr in reversed(annotations):
            text_size = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, font_scale * 0.7, 1)[0]
            tx_pos = w - text_size[0] - 8
            # Semi-transparent background
            overlay = cv_img.copy()
            cv2.rectangle(overlay, (tx_pos - 4, y_pos - text_size[1] - 4),
                          (w - 2, y_pos + 4), (30, 30, 30), -1)
            cv2.addWeighted(overlay, 0.6, cv_img, 0.4, 0, cv_img)
            cv2.putText(cv_img, text, (tx_pos, y_pos),
                        cv2.FONT_HERSHEY_SIMPLEX, font_scale * 0.7, clr, 1, cv2.LINE_AA)
            y_pos -= int(22 * font_scale)

    # Convert back to PIL
    cv_img = cv2.cvtColor(cv_img, cv2.COLOR_BGR2RGB)
    from PIL import Image as PILImage
    return PILImage.fromarray(cv_img)


def generate_processing_report(output_path, tested_techniques, saved_technique='direct',
                                ref_img=None, sample_img=None, region_data=None,
                                report_lang='tr', timezone_offset=3,
                                preview_images=None):
    """
    Generate a processing/calibration PDF report.

    Args:
        output_path: Path for the output PDF file
        tested_techniques: dict of {technique_id: metrics_dict}
        saved_technique: The technique the user selected/saved
        ref_img: Reference image (numpy array, optional for thumbnails)
        sample_img: Sample image (numpy array, optional for thumbnails)
        region_data: Region selection data dict
        report_lang: 'en' or 'tr'
        timezone_offset: UTC offset hours
        preview_images: dict of {technique_id: base64_png_string} for aligned previews
    """
    if preview_images is None:
        preview_images = {}

    ts = get_local_time(timezone_offset)
    report_id = f"CAL_{ts.strftime('%y%m%d_%H%M%S')}"

    is_tr = report_lang == 'tr'

    hf = make_header_footer(
        report_timestamp=ts,
        sub_title='Calibration Report' if not is_tr else 'Kalibrasyon Raporu',
        report_lang=report_lang
    )

    doc = SimpleDocTemplate(
        output_path, pagesize=A4,
        leftMargin=MARGIN_L, rightMargin=MARGIN_R,
        topMargin=MARGIN_T, bottomMargin=MARGIN_B
    )

    elements = []
    page_width = A4[0] - MARGIN_L - MARGIN_R

    # ── Cover Page ──
    elements.extend(_build_cover_page(
        ts, report_id, saved_technique, tested_techniques,
        ref_img, sample_img, page_width, is_tr
    ))

    # ── One page per tested technique ──
    all_technique_ids = list(ALIGNMENT_MODES.keys())
    for tech_id in all_technique_ids:
        metrics = tested_techniques.get(tech_id)
        if metrics is None:
            continue

        elements.append(PageBreak())
        elements.extend(_build_technique_page(
            tech_id, metrics, saved_technique, page_width, is_tr,
            ref_img=ref_img, sample_img=sample_img,
            aligned_b64=preview_images.get(tech_id),
            ref_cropped_b64=preview_images.get(tech_id + '_ref_cropped'),
        ))

    # ── Summary Page ──
    if len(tested_techniques) > 1:
        elements.append(PageBreak())
        elements.extend(_build_summary_page(
            tested_techniques, saved_technique, page_width, is_tr
        ))

    doc.build(elements, onFirstPage=hf, onLaterPages=hf)
    return output_path


# ═══════════════════════════════════════════════════════════════════
# Cover Page
# ═══════════════════════════════════════════════════════════════════

def _build_cover_page(ts, report_id, saved_technique, tested_techniques,
                       ref_img, sample_img, page_width, is_tr):
    elements = []

    elements.append(Spacer(1, 0.4 * inch))

    # Logo
    logo_path = pick_logo()
    if logo_path:
        elements.append(RLImage(logo_path, width=1.8 * inch, height=1.8 * inch))
        elements.append(Spacer(1, 0.25 * inch))

    # Title
    title = 'Görüntü İşleme ve Kalibrasyon Raporu' if is_tr else 'Image Processing & Calibration Report'
    elements.append(Paragraph(title, StyleReportTitle))
    elements.append(Spacer(1, 0.1 * inch))

    subtitle = ('SpectraMatch SPACTRA Studio Sonuçları' if is_tr
                else 'SpectraMatch SPACTRA Studio Results')
    elements.append(Paragraph(f"<i>{subtitle}</i>", StyleTechSubtitle))
    elements.append(Spacer(1, 0.3 * inch))

    # Meta information table
    saved_name = _get_tech_display_name(saved_technique, is_tr)
    num_tested = len(tested_techniques)

    lbl = lambda en, tr: tr if is_tr else en

    meta_rows = [
        [lbl('Report Details', 'Rapor Detayları'), ''],
        [lbl('Generated', 'Oluşturulma'), ts.strftime("%Y-%m-%d %H:%M:%S")],
        [lbl('Report ID', 'Rapor Kimliği'), report_id],
        [lbl('Software Version', 'Yazılım Sürümü'), f'SpectraMatch v{SOFTWARE_VERSION}'],
        [lbl('Techniques Tested', 'Test Edilen Teknikler'), str(num_tested)],
        [lbl('Selected Technique', 'Seçilen Teknik'), saved_name],
    ]

    meta_table = Table(meta_rows, colWidths=[2.2 * inch, 3.3 * inch], hAlign="CENTER")
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), BLUE1),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), PDF_FONT_BOLD),
        ("FONTNAME", (0, 1), (0, -1), PDF_FONT_BOLD),
        ("FONTNAME", (1, 1), (-1, -1), PDF_FONT_REGULAR),
        ("FONTSIZE", (0, 0), (-1, -1), 9.5),
        ("GRID", (0, 0), (-1, -1), 0.3, NEUTRAL_L),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("BACKGROUND", (0, 2), (-1, 2), colors.whitesmoke),
        ("BACKGROUND", (0, 4), (-1, 4), colors.whitesmoke),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.3 * inch))

    # Image thumbnails if available
    if ref_img is not None and sample_img is not None:
        from modules.ReportUtils import numpy_to_rl
        elements.append(Paragraph(
            lbl('Input Images', 'Giriş Görüntüleri'), StyleH2
        ))
        elements.append(Spacer(1, 0.1 * inch))

        ref_rl = numpy_to_rl(ref_img, max_w=2.5 * inch, max_h=2.0 * inch)
        sam_rl = numpy_to_rl(sample_img, max_w=2.5 * inch, max_h=2.0 * inch)

        if ref_rl and sam_rl:
            img_table = Table(
                [[ref_rl, sam_rl]],
                colWidths=[page_width / 2, page_width / 2],
                hAlign="CENTER"
            )
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]))
            elements.append(img_table)

            label_style = ParagraphStyle(
                'ImgLabel', parent=StyleSmall, fontSize=8,
                alignment=TA_CENTER, textColor=NEUTRAL
            )
            labels = Table(
                [[Paragraph(lbl('Reference', 'Referans'), label_style),
                  Paragraph(lbl('Sample', 'Numune'), label_style)]],
                colWidths=[page_width / 2, page_width / 2]
            )
            labels.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]))
            elements.append(labels)

    # Techniques overview table
    elements.append(Spacer(1, 0.25 * inch))
    elements.append(Paragraph(
        lbl('Techniques Overview', 'Teknikler Genel Bakış'), StyleH2
    ))
    elements.append(Spacer(1, 0.08 * inch))

    overview_header = [
        lbl('Technique', 'Teknik'),
        lbl('Status', 'Durum'),
        lbl('Key Metric', 'Ana Metrik'),
    ]
    overview_rows = [overview_header]

    for tech_id, metrics in tested_techniques.items():
        name = _get_tech_display_name(tech_id, is_tr)
        applied = metrics.get('applied', False)
        status_text = (lbl('Applied', 'Uygulandı') if applied
                       else lbl('Not Applied', 'Uygulanmadı'))

        key_metric = _extract_key_metric(metrics)
        is_selected = (tech_id == saved_technique)
        name_display = f"{'[>] ' if is_selected else ''}{name}"

        overview_rows.append([name_display, status_text, key_metric])

    overview_table = make_table(overview_rows, colWidths=[2.5 * inch, 1.2 * inch, 2.0 * inch])
    elements.append(overview_table)

    return elements


# ═══════════════════════════════════════════════════════════════════
# Individual Technique Page
# ═══════════════════════════════════════════════════════════════════

def _build_technique_page(tech_id, metrics, saved_technique, page_width, is_tr,
                           ref_img=None, sample_img=None,
                           aligned_b64=None, ref_cropped_b64=None):
    """Concise technique page: banner, status line, images, parameters."""
    elements = []
    lbl = lambda en, tr: tr if is_tr else en
    from modules.ReportUtils import numpy_to_rl

    mode_info = ALIGNMENT_MODES.get(tech_id, {})
    name = mode_info.get('name_tr' if is_tr else 'name', tech_id)

    is_selected = (tech_id == saved_technique)
    applied = metrics.get('applied', False)

    # ── Banner ──
    banner_color = GREEN if (applied and is_selected) else (BLUE1 if applied else NEUTRAL)
    sel_mark = '[>] ' if is_selected else ''
    elements.append(TechBanner(f"{sel_mark}{name}", bg_color=banner_color, width=page_width))
    elements.append(Spacer(1, 0.08 * inch))

    # ── Single-line status + processing time ──
    status_parts = []
    if is_selected:
        status_parts.append(lbl('Selected', 'Se\u00e7ili'))
    if applied:
        status_parts.append(lbl('Applied', 'Uyguland\u0131'))
    else:
        reason = metrics.get('reason', lbl('No correction needed', 'D\u00fczeltme gerekmedi'))
        status_parts.append(lbl('Not Applied', 'Uygulanmad\u0131') + f" - {reason}")
    proc_time = metrics.get('processing_time_ms')
    if proc_time is not None:
        time_str = f"{proc_time / 1000:.2f}s" if proc_time >= 1000 else f"{proc_time}ms"
        status_parts.append(time_str)

    status_style = ParagraphStyle(
        'StatusLine', parent=StyleBody, fontSize=9,
        textColor=NEUTRAL_DARK, fontName=PDF_FONT_BOLD
    )
    elements.append(Paragraph(' | '.join(status_parts), status_style))
    elements.append(Spacer(1, 0.12 * inch))

    half_w = page_width / 2
    thumb_w = 2.3 * inch
    thumb_h = 1.7 * inch
    img_label_style = ParagraphStyle(
        'ImgLbl_' + tech_id, parent=StyleSmall, fontSize=7.5,
        alignment=TA_CENTER, textColor=NEUTRAL
    )

    # ── Original Images ──
    _has_originals = ref_img is not None and sample_img is not None
    if _has_originals:
        elements.append(Paragraph(
            lbl('Original Images', 'Orijinal G\u00f6r\u00fcnt\u00fcler'), StyleH2
        ))
        elements.append(Spacer(1, 0.04 * inch))
        ref_rl = numpy_to_rl(ref_img, max_w=thumb_w, max_h=thumb_h)
        sam_rl = numpy_to_rl(sample_img, max_w=thumb_w, max_h=thumb_h)
        if ref_rl and sam_rl:
            img_table = Table(
                [[ref_rl, sam_rl],
                 [Paragraph(lbl('Reference', 'Referans'), img_label_style),
                  Paragraph(lbl('Sample', 'Numune'), img_label_style)]],
                colWidths=[half_w, half_w], hAlign="CENTER"
            )
            img_table.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 2),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
            ]))
            elements.append(img_table)
            elements.append(Spacer(1, 0.08 * inch))

    # ── Processed / Aligned Images (with annotations) ──
    if aligned_b64 and applied:
        elements.append(Paragraph(
            lbl('Processed Result', '\u0130\u015flenmi\u015f Sonu\u00e7'), StyleH2
        ))
        elements.append(Spacer(1, 0.04 * inch))

        aligned_pil = _base64_to_pil(aligned_b64)
        annotated_pil = _annotate_image(aligned_pil, metrics, is_tr)
        aligned_rl = _pil_to_rl(annotated_pil, max_w=thumb_w, max_h=thumb_h)

        if ref_cropped_b64:
            ref_c_pil = _base64_to_pil(ref_cropped_b64)
            ref_c_annotated = _annotate_image(ref_c_pil, metrics, is_tr)
            ref_c_rl = _pil_to_rl(ref_c_annotated, max_w=thumb_w, max_h=thumb_h)
            if ref_c_rl and aligned_rl:
                proc_table = Table(
                    [[ref_c_rl, aligned_rl],
                     [Paragraph(lbl('Cropped Ref.', 'K\u0131rp\u0131lm\u0131\u015f Ref.'), img_label_style),
                      Paragraph(lbl('Cropped Sample', 'K\u0131rp\u0131lm\u0131\u015f Numune'), img_label_style)]],
                    colWidths=[half_w, half_w], hAlign="CENTER"
                )
                proc_table.setStyle(TableStyle([
                    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]))
                elements.append(proc_table)
        elif aligned_rl:
            if _has_originals:
                ref_rl2 = numpy_to_rl(ref_img, max_w=thumb_w, max_h=thumb_h)
                if ref_rl2:
                    proc_table = Table(
                        [[ref_rl2, aligned_rl],
                         [Paragraph(lbl('Reference', 'Referans'), img_label_style),
                          Paragraph(lbl('Aligned Sample', 'Hizalanm\u0131\u015f Numune'), img_label_style)]],
                        colWidths=[half_w, half_w], hAlign="CENTER"
                    )
                    proc_table.setStyle(TableStyle([
                        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                        ("TOPPADDING", (0, 0), (-1, -1), 2),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                    ]))
                    elements.append(proc_table)
            else:
                elements.append(aligned_rl)
        elements.append(Spacer(1, 0.08 * inch))

    # ── Parameters Table (only if applied and has data) ──
    if applied and metrics:
        param_rows = [[
            lbl('Parameter', 'Parametre'),
            lbl('Value', 'De\u011fer')
        ]]

        metric_display_map = _get_metric_display_map(is_tr)
        skip_keys = {'applied', 'reason', 'description', 'low_similarity',
                      'ref_crop', 'sample_crop', 'method'}
        for key, display_name in metric_display_map.items():
            val = metrics.get(key)
            if val is not None and key not in skip_keys:
                if isinstance(val, float):
                    val_str = f"{val:.4f}" if abs(val) < 1 else f"{val:.2f}"
                elif isinstance(val, dict):
                    val_str = ', '.join([f"{k}={v}" for k, v in val.items()])
                else:
                    val_str = str(val)
                param_rows.append([display_name, val_str])

        if len(param_rows) > 1:
            elements.append(Paragraph(
                lbl('Parameters', 'Parametreler'), StyleH2
            ))
            elements.append(Spacer(1, 0.04 * inch))
            param_table = make_table(param_rows, colWidths=[2.8 * inch, 2.8 * inch])
            elements.append(param_table)

    return elements


# ═══════════════════════════════════════════════════════════════════
# Summary Comparison Page
# ═══════════════════════════════════════════════════════════════════

def _build_summary_page(tested_techniques, saved_technique, page_width, is_tr):
    """Final summary page with compact comparison table."""
    elements = []
    lbl = lambda en, tr: tr if is_tr else en

    elements.append(TechBanner(
        lbl('Summary', '\u00d6zet'),
        bg_color=NEUTRAL_DARK, width=page_width
    ))
    elements.append(Spacer(1, 0.15 * inch))

    # Comparison table
    header = [
        lbl('Technique', 'Teknik'),
        lbl('Status', 'Durum'),
        lbl('Rotation', 'D\u00f6nd\u00fcrme'),
        lbl('Shift (px)', 'Kayd\u0131rma (px)'),
        lbl('Correlation', 'Korelasyon'),
        lbl('Time', 'S\u00fcre'),
    ]
    rows = [header]

    for tech_id, metrics in tested_techniques.items():
        name = _get_tech_short_name(tech_id, is_tr)
        is_sel = (tech_id == saved_technique)
        if is_sel:
            name = '[>] ' + name

        if metrics.get('applied'):
            status = lbl('Yes', 'Evet')
        else:
            status = lbl('No', 'Hay\u0131r')

        rot = f"{metrics.get('rotation_deg', 0):.2f}" if metrics.get('rotation_deg') is not None else '-'

        tx = metrics.get('translation_x', 0)
        ty = metrics.get('translation_y', 0)
        shift = f"({tx:.1f}, {ty:.1f})" if (tx or ty) else '-'

        cc = metrics.get('correlation_coefficient')
        if cc is None:
            cc = metrics.get('alignment_quality')
        cc_str = f"{cc:.4f}" if cc is not None else '-'

        pt = metrics.get('processing_time_ms')
        if pt is not None:
            time_str = f"{pt / 1000:.2f}s" if pt >= 1000 else f"{pt}ms"
        else:
            time_str = '-'

        rows.append([name, status, rot, shift, cc_str, time_str])

    comp_table = make_table(
        rows,
        colWidths=[1.6 * inch, 0.5 * inch, 0.7 * inch, 1.0 * inch, 0.85 * inch, 0.65 * inch],
        font_size=7.5
    )
    elements.append(comp_table)
    elements.append(Spacer(1, 0.2 * inch))

    # Selected technique
    saved_name = _get_tech_display_name(saved_technique, is_tr)
    sel_style = ParagraphStyle(
        'SelNote', parent=StyleBody, fontSize=10,
        textColor=NEUTRAL_DARK, fontName=PDF_FONT_BOLD
    )
    elements.append(Paragraph(
        lbl(f'Selected technique: {saved_name}',
            f'Se\u00e7ilen teknik: {saved_name}'),
        sel_style
    ))

    return elements


# ═══════════════════════════════════════════════════════════════════
# Helpers
# ═══════════════════════════════════════════════════════════════════

def _get_tech_display_name(tech_id, is_tr=False):
    info = ALIGNMENT_MODES.get(tech_id, {})
    return info.get('name_tr' if is_tr else 'name', tech_id)


def _get_tech_short_name(tech_id, is_tr=False):
    name = _get_tech_display_name(tech_id, is_tr)
    # Truncate long names for table columns
    if len(name) > 25:
        return name[:22] + '...'
    return name


def _extract_key_metric(metrics):
    """Extract the most meaningful single metric for overview display."""
    if not metrics or not metrics.get('applied'):
        return metrics.get('reason', '-') if metrics else '-'

    parts = []
    if metrics.get('rotation_deg') and abs(metrics['rotation_deg']) > 0.01:
        parts.append(f"rot={metrics['rotation_deg']:.2f}°")
    if metrics.get('translation_x') is not None:
        tx = metrics['translation_x']
        ty = metrics.get('translation_y', 0)
        if abs(tx) > 0.1 or abs(ty) > 0.1:
            parts.append(f"shift=({tx:.1f},{ty:.1f})")
    if metrics.get('correlation_coefficient') is not None:
        parts.append(f"cc={metrics['correlation_coefficient']:.4f}")
    elif metrics.get('alignment_quality') is not None:
        parts.append(f"q={metrics['alignment_quality']:.4f}")
    if metrics.get('similarity') is not None:
        parts.append(f"sim={metrics['similarity']}%")

    return ', '.join(parts) if parts else 'Applied'


def _get_metric_display_map(is_tr=False):
    """Return ordered dict of metric keys to display names."""
    if is_tr:
        return {
            'rotation_deg': 'Döndürme (°)',
            'scale_factor': 'Ölçek Faktörü',
            'scale_x': 'Ölçek X',
            'scale_y': 'Ölçek Y',
            'translation_x': 'Öteleme X (px)',
            'translation_y': 'Öteleme Y (px)',
            'correlation_coefficient': 'Korelasyon Katsayısı',
            'alignment_quality': 'Hizalama Kalitesi',
            'phase_response': 'Faz Yanıtı',
            'ref_keypoints': 'Referans Anahtar Noktaları',
            'sample_keypoints': 'Numune Anahtar Noktaları',
            'good_matches': 'İyi Eşleşmeler',
            'inliers': 'İnlierlar',
            'motion_type': 'Hareket Tipi',
            'transform_type': 'Dönüşüm Tipi',
            'stage1_cc': 'Aşama 1 Korelasyon',
            'stage2_cc': 'Aşama 2 Korelasyon',
            'affine_refined': 'Afin İyileştirme',
            'pyramid_levels': 'Piramit Seviyeleri',
            'global_translation_x': 'Genel Öteleme X',
            'global_translation_y': 'Genel Öteleme Y',
            'local_refined': 'Yerel İyileştirme',
            'local_median_x': 'Yerel Medyan X',
            'local_median_y': 'Yerel Medyan Y',
            'tiles_used': 'Kullanılan Karolar',
            'tile_agreement': 'Karo Uyumu',
            'lighting_delta': 'Aydınlatma Farkı (%)',
            'strategy': 'Strateji',
            'ecc_refined': 'ECC İyileştirme',
            'ecc_cc': 'ECC Korelasyon',
            'similarity': 'Benzerlik (%)',
            'raw_similarity': 'Ham Benzerlik',
            'area_ratio': 'Alan Oranı',
            'area_percent': 'Alan Yüzdesi',
            'crop_size': 'Kırpma Boyutu',
            'original_size': 'Orijinal Boyut',
            'pixel_threshold': 'Piksel Eşiği',
            'processing_time_ms': 'İşlem Süresi (ms)',
        }
    else:
        return {
            'rotation_deg': 'Rotation (°)',
            'scale_factor': 'Scale Factor',
            'scale_x': 'Scale X',
            'scale_y': 'Scale Y',
            'translation_x': 'Translation X (px)',
            'translation_y': 'Translation Y (px)',
            'correlation_coefficient': 'Correlation Coefficient',
            'alignment_quality': 'Alignment Quality',
            'phase_response': 'Phase Response',
            'ref_keypoints': 'Reference Keypoints',
            'sample_keypoints': 'Sample Keypoints',
            'good_matches': 'Good Matches',
            'inliers': 'Inliers',
            'motion_type': 'Motion Type',
            'transform_type': 'Transform Type',
            'stage1_cc': 'Stage 1 Correlation',
            'stage2_cc': 'Stage 2 Correlation',
            'affine_refined': 'Affine Refined',
            'pyramid_levels': 'Pyramid Levels',
            'global_translation_x': 'Global Translation X',
            'global_translation_y': 'Global Translation Y',
            'local_refined': 'Local Refined',
            'local_median_x': 'Local Median X',
            'local_median_y': 'Local Median Y',
            'tiles_used': 'Tiles Used',
            'tile_agreement': 'Tile Agreement',
            'lighting_delta': 'Lighting Delta (%)',
            'strategy': 'Strategy',
            'ecc_refined': 'ECC Refined',
            'ecc_cc': 'ECC Correlation',
            'similarity': 'Similarity (%)',
            'raw_similarity': 'Raw Similarity',
            'area_ratio': 'Area Ratio',
            'area_percent': 'Area Percent',
            'crop_size': 'Crop Size',
            'original_size': 'Original Size',
            'pixel_threshold': 'Pixel Threshold',
            'processing_time_ms': 'Processing Time (ms)',
        }
