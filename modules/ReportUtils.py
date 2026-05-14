# -*- coding: utf-8 -*-
import io, os
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import Paragraph, Image as RLImage, Table, TableStyle, Spacer, PageBreak, Flowable, KeepTogether
from reportlab.lib.enums import TA_LEFT, TA_CENTER

# =================================================================================================
# SHARED CONSTANTS
# =================================================================================================

SOFTWARE_VERSION = "3.0.0"
COMPANY_NAME = "Textile Engineering Solutions"
COMPANY_SUBTITLE = "Professional Quality Control Solutions" # Slightly generic to fit both
PAGE_SIZE = A4
MARGIN_L = 50
MARGIN_R = 50
MARGIN_T = 50
MARGIN_B = 50
DPI = 300
DEFAULT_TIMEZONE_OFFSET_HOURS = 3
FRAME_MARGIN = 9

# Colors
BLUE1 = colors.HexColor("#2980B9")
BLUE2 = colors.HexColor("#3498DB")
GREEN = colors.HexColor("#27AE60")
RED = colors.HexColor("#E74C3C")
ORANGE = colors.HexColor("#F39C12")
NEUTRAL_DARK = colors.HexColor("#2C3E50")
NEUTRAL = colors.HexColor("#7F8C8D")
NEUTRAL_L = colors.HexColor("#BDC3C7")
BG_LIGHT_RED = colors.HexColor("#FFE6E6")
BG_LIGHT_GREEN = colors.HexColor("#E6FFE6")
BG_LIGHT_BLUE = colors.HexColor("#E6E6FF")

STATUS_COLORS = {"PASS": GREEN, "FAIL": RED, "CONDITIONAL": ORANGE}

# Resolve static image paths robustly
BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_IMAGES_DIR = BASE_DIR / "static" / "images"
PRIMARY_LOGO = r"logo_square_with_name_1024x1024.png"
FALLBACK_LOGOS = [
    r"logo_square_with_name_1024x1024.png",
    r"logo_square_no_name_1024x1024.png"
]

# =================================================================================================
# HELPERS
# =================================================================================================

def setup_fonts():
    """Setup fonts with full Turkish character support (İ, Ö, Ü, Ş, Ç, Ğ, ı, ş, ğ)."""
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    
    # Try Arial first - excellent Turkish character support on Windows
    try:
        if os.path.exists(r"C:\Windows\Fonts\arial.ttf"):
            pdfmetrics.registerFont(TTFont('Arial', r"C:\Windows\Fonts\arial.ttf"))
            pdfmetrics.registerFont(TTFont('Arial-Bold', r"C:\Windows\Fonts\arialbd.ttf"))
            return "Arial", "Arial-Bold"
    except:
        pass
    
    # Try Segoe UI - modern Windows font with full Turkish support
    try:
        if os.path.exists(r"C:\Windows\Fonts\segoeui.ttf"):
            pdfmetrics.registerFont(TTFont('SegoeUI', r"C:\Windows\Fonts\segoeui.ttf"))
            pdfmetrics.registerFont(TTFont('SegoeUI-Bold', r"C:\Windows\Fonts\segoeuib.ttf"))
            return "SegoeUI", "SegoeUI-Bold"
    except:
        pass
    
    # Try Tahoma - good Turkish support
    try:
        if os.path.exists(r"C:\Windows\Fonts\tahoma.ttf"):
            pdfmetrics.registerFont(TTFont('Tahoma', r"C:\Windows\Fonts\tahoma.ttf"))
            pdfmetrics.registerFont(TTFont('Tahoma-Bold', r"C:\Windows\Fonts\tahomabd.ttf"))
            return "Tahoma", "Tahoma-Bold"
    except:
        pass
    
    # Fallback to Helvetica (may not support all Turkish chars)
    return "Helvetica", "Helvetica-Bold"

PDF_FONT_REGULAR, PDF_FONT_BOLD = setup_fonts()

# Styles
styles = getSampleStyleSheet()
StyleTitle = ParagraphStyle("Title", parent=styles["Heading1"], fontName=PDF_FONT_BOLD, fontSize=20, textColor=NEUTRAL_DARK, leading=24, alignment=TA_LEFT)
StyleH1 = ParagraphStyle("H1", parent=styles["Heading2"], fontName=PDF_FONT_BOLD, fontSize=15, textColor=BLUE1, leading=18, spaceAfter=8, keepWithNext=1)
StyleH2 = ParagraphStyle("H2", parent=styles["Heading3"], fontName=PDF_FONT_BOLD, fontSize=12.5, textColor=BLUE2, leading=16, spaceAfter=6, keepWithNext=1)
StyleBody = ParagraphStyle("Body", parent=styles["BodyText"], fontName=PDF_FONT_REGULAR, fontSize=10, leading=14)
StyleSmall = ParagraphStyle("Small", parent=styles["BodyText"], fontName=PDF_FONT_REGULAR, fontSize=9, leading=12, textColor=NEUTRAL)

def get_local_time(offset=None):
    o = DEFAULT_TIMEZONE_OFFSET_HOURS if offset is None else offset
    return datetime.utcnow() + timedelta(hours=o)

def ensure_dir(path):
    if not os.path.exists(path):
        os.makedirs(path)
    return path

def pick_logo():
    # Look in current directory or a specific static folder
    if os.path.exists(PRIMARY_LOGO): return PRIMARY_LOGO
    for p in FALLBACK_LOGOS:
        if os.path.exists(p): return p
    # Fallback to checking static folder if needed
    static_logo = (STATIC_IMAGES_DIR / PRIMARY_LOGO)
    if static_logo.exists():
        return str(static_logo)
    return None

def numpy_to_rl(img_array, max_w=5*inch, max_h=4*inch, assume_bgr=True):
    # Handle BGRA/RGBA - Composite over BLACK background
    if img_array.ndim == 3 and img_array.shape[2] == 4:
        b, g, r, a = cv2.split(img_array)
        alpha_f = a.astype(float) / 255.0
        b = (b * alpha_f).astype(np.uint8)
        g = (g * alpha_f).astype(np.uint8)
        r = (r * alpha_f).astype(np.uint8)
        
        rgb = cv2.merge([r, g, b])
        pil = Image.fromarray(rgb)
    elif img_array.ndim == 3:
        arr = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB) if assume_bgr else img_array
        pil = Image.fromarray(arr)
    else:
        pil = Image.fromarray(img_array)
    
    iw, ih = pil.size
    # Avoid division by zero
    if iw == 0 or ih == 0: return None
    
    s = min(max_w/iw, max_h/ih)
    buf = io.BytesIO()
    pil.save(buf, format="PNG")
    buf.seek(0)
    return RLImage(buf, width=iw*s, height=ih*s)

def make_table(data, colWidths=None, hAlign="CENTER", font_size=8.6):
    t = Table(data, colWidths=colWidths, hAlign=hAlign, repeatRows=1)
    cmds = [
        ("BACKGROUND",(0,0),(-1,0), BLUE2), 
        ("TEXTCOLOR",(0,0),(-1,0), colors.white),
        ("FONTNAME",(0,0),(-1,0), PDF_FONT_BOLD),
        ("FONTNAME",(0,1),(-1,-1), PDF_FONT_REGULAR),
        ("FONTSIZE",(0,0),(-1,-1), font_size),
        ("ALIGN",(0,0),(-1,0), "CENTER"), 
        ("VALIGN",(0,0),(-1,-1), "MIDDLE"),
        ("GRID",(0,0),(-1,-1), 0.4, NEUTRAL_L),
        ("LEFTPADDING",(0,0),(-1,-1), 4),
        ("RIGHTPADDING",(0,0),(-1,-1), 4),
        ("TOPPADDING",(0,0),(-1,-1), 3),
        ("BOTTOMPADDING",(0,0),(-1,-1), 3),
    ]
    for r in range(1, len(data), 2):
        cmds.append(("BACKGROUND",(0,r),(-1,r), colors.whitesmoke))
    t.setStyle(TableStyle(cmds))
    return t

def badge(text, back_color=NEUTRAL):
    class _B(Flowable):
        def __init__(self, t, bg):
            super().__init__()
            self.t, self.bg = t, bg
            self.w = max(70, 8 * len(t))
            self.h = 16
        def draw(self):
            self.canv.setFillColor(self.bg)
            self.canv.roundRect(0, 0, self.w, self.h, 3, fill=1, stroke=0)
            self.canv.setFillColor(colors.white)
            self.canv.setFont(PDF_FONT_BOLD, 9)
            self.canv.drawCentredString(self.w/2, 3, self.t)
        def wrap(self, availW, availH):
            return (self.w, self.h)
    return _B(text, back_color)

def make_header_footer(report_timestamp=None, sub_title=None, report_lang='tr'):
    # Allow overriding subtitle for different reports
    # Turkish translations for header/footer
    if report_lang == 'tr':
        company_name = 'Tekstil Mühendislik Çözümleri'
        subtitle = sub_title if sub_title else 'Profesyonel Kalite Kontrol Çözümleri'
    else:
        company_name = COMPANY_NAME
        subtitle = sub_title if sub_title else COMPANY_SUBTITLE
    
    def hf(canvas_, doc):
        canvas_.saveState()
        w, h = PAGE_SIZE
        # Frame
        canvas_.setStrokeColor(colors.HexColor("#E0E0E0"))
        canvas_.setLineWidth(0.8)
        canvas_.rect(FRAME_MARGIN, FRAME_MARGIN, w - 2*FRAME_MARGIN, h - 2*FRAME_MARGIN, stroke=1, fill=0)

        # Header
        y = h - 40
        canvas_.setStrokeColor(NEUTRAL_L)
        canvas_.setLineWidth(0.6)
        canvas_.line(MARGIN_L, y, w - MARGIN_R, y)

        canvas_.setFillColor(BLUE1)
        canvas_.setFont(PDF_FONT_BOLD, 10.5)
        canvas_.drawString(MARGIN_L, y + 10, company_name)

        cw = canvas_.stringWidth(company_name, PDF_FONT_BOLD, 10.5)
        canvas_.setFillColor(colors.black)
        canvas_.drawString(MARGIN_L + cw + 5, y + 10, " | ")

        pw = canvas_.stringWidth(" | ", PDF_FONT_BOLD, 10.5)
        canvas_.setFillColor(NEUTRAL)
        canvas_.setFont(PDF_FONT_REGULAR, 8.5)
        canvas_.drawString(MARGIN_L + cw + pw + 5, y + 10, subtitle)

        # Footer
        fy = 25
        canvas_.setStrokeColor(NEUTRAL_L)
        canvas_.setLineWidth(0.6)
        canvas_.line(MARGIN_L, fy + 10, w - MARGIN_R, fy + 10)

        canvas_.setFillColor(NEUTRAL)
        canvas_.setFont(PDF_FONT_REGULAR, 8)
        page_text = f"Sayfa {doc.page}" if report_lang == 'tr' else f"Page {doc.page}"
        canvas_.drawCentredString(w/2, fy - 3, page_text)

        if report_timestamp:
            canvas_.drawString(MARGIN_L, fy - 3, report_timestamp.strftime("%Y-%m-%d %H:%M:%S"))

        # Small logo on right
        footer_logo_path = STATIC_IMAGES_DIR / "logo_vertical_512x256.png"
        if footer_logo_path.exists():
            try:
                logo_height = 18
                logo_width = 36 
                canvas_.drawImage(str(footer_logo_path), w - MARGIN_R - logo_width, fy - 6, width=logo_width, height=logo_height, preserveAspectRatio=True, mask='auto')
            except: pass

        canvas_.restoreState()
    return hf


def generate_unified_cover(output_path, config, color_data=None, pattern_data=None,
                           report_id=None, timestamp=None):
    """
    Generate a unified cover page PDF for the merged report.
    
    color_data: dict with keys: score, status, method_label, method_key
    pattern_data: dict with keys: score, status, method_label, method_key, scores (dict of all methods)
    
    mode is inferred: both=dual, color_data only=color-only, pattern_data only=pattern-only
    """
    from reportlab.platypus import SimpleDocTemplate
    from modules.ReportTranslations import (
        get_translator,
        translate_status,
        format_color_method_label,
        format_pattern_method_label,
    )
    
    cfg = config or {}
    report_lang = cfg.get('report_lang', 'tr')
    tr = get_translator(report_lang)
    operator = cfg.get('operator', 'Unknown')
    primary_ill = cfg.get('primary_illuminant', 'D65')
    tz_offset = cfg.get('timezone_offset', 3)
    
    ts = timestamp if timestamp else get_local_time(tz_offset)
    analysis_id = report_id if report_id else f"SPEC_{ts.strftime('%y%m%d_%H%M%S')}"
    
    has_color = color_data is not None
    has_pattern = pattern_data is not None
    
    # Determine title
    if has_color and has_pattern:
        title = tr('unified_report_title')
    elif has_color:
        title = tr('color_report_title')
    else:
        title = tr('pattern_report_title')
    
    hf = make_header_footer(report_timestamp=ts, report_lang=report_lang)
    doc = SimpleDocTemplate(output_path, pagesize=A4,
                            leftMargin=MARGIN_L, rightMargin=MARGIN_R,
                            topMargin=MARGIN_T, bottomMargin=MARGIN_B)
    elements = []
    
    # Logo
    elements.append(Spacer(1, 0.5 * inch))
    logo_path = pick_logo()
    if logo_path:
        elements.append(RLImage(logo_path, width=2.0*inch, height=2.0*inch))
        elements.append(Spacer(1, 0.3*inch))
    
    # Title
    elements.append(Paragraph(title, StyleTitle))
    elements.append(Spacer(1, 0.15*inch))
    elements.append(Paragraph(tr('cover_company'), StyleH2))
    elements.append(Spacer(1, 0.08*inch))
    
    subtitle_style = ParagraphStyle('ElegantSubtitle', parent=StyleSmall, fontSize=9,
                                     textColor=NEUTRAL, fontName=PDF_FONT_REGULAR, leading=12, alignment=TA_LEFT)
    elements.append(Paragraph(f"<i>{tr('cover_subtitle')}</i>", subtitle_style))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(badge(f"{tr('primary_illuminant')}: {primary_ill}", back_color=BLUE1))
    elements.append(Spacer(1, 0.3*inch))
    
    # Meta table
    meta_data = [
        [tr('details'), ""],
        [tr('generated_on'), ts.strftime("%Y-%m-%d %H:%M:%S")],
        [tr('operator'), operator],
        [tr('primary_illuminant'), primary_ill],
        [tr('report_id'), analysis_id],
        [tr('software_version'), SOFTWARE_VERSION],
    ]
    meta_table = Table(meta_data, colWidths=[2*inch, 3*inch], hAlign="CENTER")
    meta_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NEUTRAL_L),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.black),
        ("FONTNAME", (0, 0), (-1, 0), PDF_FONT_BOLD),
        ("FONTNAME", (0, 1), (-1, -1), PDF_FONT_REGULAR),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, 0), 6),
        ("TOPPADDING", (0, 0), (-1, 0), 6),
        ("GRID", (0, 0), (-1, -1), 0.25, colors.Color(0.8, 0.8, 0.8)),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 1), (-1, -1), 5),
        ("RIGHTPADDING", (0, 1), (-1, -1), 5),
        ("BACKGROUND", (0, 1), (-1, 1), colors.whitesmoke),
        ("BACKGROUND", (0, 3), (-1, 3), colors.whitesmoke),
        ("BACKGROUND", (0, 5), (-1, 5), colors.whitesmoke),
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.3*inch))
    
    # Determine overall decision
    if has_color and has_pattern:
        c_st = color_data['status']
        p_st = pattern_data['status']
        if c_st == 'PASS' and p_st == 'PASS':
            overall_decision = 'PASS'
        elif c_st == 'FAIL' or p_st == 'FAIL':
            overall_decision = 'FAIL'
        else:
            overall_decision = 'CONDITIONAL'
    elif has_color:
        overall_decision = color_data['status']
    else:
        overall_decision = pattern_data['status']
    
    # Executive Summary Header
    page_width = A4[0] - MARGIN_L - MARGIN_R
    
    class _ExecHeader(Flowable):
        def __init__(self, status, width):
            super().__init__()
            self.status = status
            self.box_width = width
            self.box_height = 28
        def draw(self):
            c = STATUS_COLORS.get(self.status, GREEN)
            self.canv.setFillColor(c)
            self.canv.rect(0, 0, self.box_width, self.box_height, fill=1, stroke=0)
            self.canv.setFillColor(colors.white)
            self.canv.setFont(PDF_FONT_BOLD, 12)
            text = f"{tr('executive_summary')}: {translate_status(self.status, report_lang)}"
            self.canv.drawCentredString(self.box_width / 2, 9, text)
        def wrap(self, availW, availH):
            return (self.box_width, self.box_height)
    
    elements.append(_ExecHeader(overall_decision, page_width))
    elements.append(Spacer(1, 0.2*inch))
    
    # --- Two-column score cards ---
    def _score_color(status):
        return STATUS_COLORS.get(status, NEUTRAL)
    
    score_title_style = ParagraphStyle('ScoreTitle', parent=styles['Heading3'], fontName=PDF_FONT_BOLD,
                                        fontSize=11, textColor=BLUE1, alignment=TA_CENTER, spaceAfter=4)
    
    def build_score_card(label, score, status, method_label, method_key=None, score_kind='pattern'):
        sc = _score_color(status)
        if score_kind == 'color':
            method_text = format_color_method_label(method_key or method_label, report_lang)
            score_text = f"{float(score):.4f}"
        else:
            method_text = format_pattern_method_label(method_key or method_label, report_lang)
            score_text = f"{float(score):.1f}"
        card = []
        card.append(Paragraph(f"<b>{label}</b>", score_title_style))
        score_style = ParagraphStyle('ScoreVal', parent=styles['Heading2'], fontName=PDF_FONT_BOLD,
                                      fontSize=20, textColor=sc, alignment=TA_CENTER, spaceAfter=2)
        card.append(Paragraph(score_text, score_style))
        method_style = ParagraphStyle('ScoreMethod', parent=StyleSmall, fontSize=8,
                                       alignment=TA_CENTER, textColor=NEUTRAL, spaceAfter=4)
        card.append(Paragraph(method_text, method_style))
        status_style = ParagraphStyle('ScoreStatus', parent=styles['BodyText'], fontName=PDF_FONT_BOLD,
                                       fontSize=10, textColor=sc, alignment=TA_CENTER, spaceAfter=2)
        card.append(Paragraph(translate_status(status, report_lang), status_style))
        return card
    
    if has_color and has_pattern:
        # Two columns: Left=Pattern, Right=Color
        left_card = build_score_card(
            tr('pattern_score_label'),
            pattern_data['score'],
            pattern_data['status'],
            pattern_data['method_label'],
            method_key=pattern_data.get('method_key'),
            score_kind='pattern',
        )
        right_card = build_score_card(
            tr('color_score_label'),
            color_data['score'],
            color_data['status'],
            color_data['method_label'],
            method_key=color_data.get('method_key'),
            score_kind='color',
        )
        col_w = page_width / 2
        t_scores = Table([[left_card, right_card]], colWidths=[col_w, col_w])
        t_scores.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('LINEAFTER', (0, 0), (0, -1), 0.5, NEUTRAL_L),
            ('LEFTPADDING', (0, 0), (-1, -1), 8),
            ('RIGHTPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ]))
    elif has_color:
        card = build_score_card(
            tr('color_score_label'),
            color_data['score'],
            color_data['status'],
            color_data['method_label'],
            method_key=color_data.get('method_key'),
            score_kind='color',
        )
        t_scores = Table([[card]], colWidths=[page_width])
        t_scores.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
    else:
        card = build_score_card(
            tr('pattern_score_label'),
            pattern_data['score'],
            pattern_data['status'],
            pattern_data['method_label'],
            method_key=pattern_data.get('method_key'),
            score_kind='pattern',
        )
        t_scores = Table([[card]], colWidths=[page_width])
        t_scores.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
    
    elements.append(t_scores)

    if has_color and has_pattern:
        elements.append(Spacer(1, 0.15 * inch))
        overall_title_style = ParagraphStyle(
            'OverallSummaryTitle',
            parent=styles['Heading3'],
            fontName=PDF_FONT_BOLD,
            fontSize=11,
            textColor=BLUE1,
            alignment=TA_CENTER,
            spaceAfter=4,
        )
        overall_body_style = ParagraphStyle(
            'OverallSummaryBody',
            parent=StyleBody,
            fontName=PDF_FONT_REGULAR,
            fontSize=9.5,
            leading=12,
            alignment=TA_CENTER,
            textColor=NEUTRAL_DARK,
        )
        overall_note_style = ParagraphStyle(
            'OverallSummaryNote',
            parent=StyleSmall,
            fontSize=8,
            leading=10,
            alignment=TA_CENTER,
            textColor=NEUTRAL,
        )
        combined_text = (
            f"{tr('pattern_score')}: {float(pattern_data['score']):.1f} / "
            f"{tr('color_score')}: {float(color_data['score']):.4f}"
        )
        summary_block = Table(
            [[
                Paragraph(tr('overall_score'), overall_title_style),
                Paragraph(combined_text, overall_body_style),
                Paragraph(tr('overall_score_explainer'), overall_note_style),
            ]],
            colWidths=[page_width],
        )
        summary_block.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.whitesmoke),
            ('BOX', (0, 0), (-1, -1), 0.5, NEUTRAL_L),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ]))
        elements.append(summary_block)
    
    doc.build(elements, onFirstPage=hf, onLaterPages=hf)
