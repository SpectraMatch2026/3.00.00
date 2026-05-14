# -*- coding: utf-8 -*-
import os
from datetime import datetime
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, inch
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Image as RLImage, Table, TableStyle, Spacer, Frame, PageTemplate
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from modules.ReportUtils import StyleH1
from modules.ReportTranslations import (
    get_translator,
    translate_decision,
    format_color_method_label,
    format_pattern_method_label,
)

# Configuration
PAGE_WIDTH, PAGE_HEIGHT = A4
MARGIN_H = 8 * mm
MARGIN_V = 6 * mm
COLUMN_GAP = 4 * mm

def setup_fonts():
    """Setup fonts with full Turkish character support (İ, Ö, Ü, Ş, Ç, Ğ, ı, ş, ğ)."""
    # Try Arial - excellent Turkish character support on Windows
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
    
    # Fallback to Helvetica (limited Turkish support)
    return "Helvetica", "Helvetica-Bold"

# Setup fonts with Turkish support
PDF_FONT, PDF_FONT_BOLD = setup_fonts()

# Styles with Turkish-compatible fonts
styles = getSampleStyleSheet()
style_title = ParagraphStyle('ReceiptTitle', parent=styles['Heading1'], fontName=PDF_FONT_BOLD, fontSize=12, alignment=TA_CENTER, spaceAfter=1*mm, spaceBefore=0)
style_company = ParagraphStyle('ReceiptCompany', parent=styles['Normal'], fontName=PDF_FONT_BOLD, fontSize=9, alignment=TA_CENTER, spaceAfter=0)
style_header_info = ParagraphStyle('ReceiptHeaderInfo', parent=styles['Normal'], fontName=PDF_FONT, fontSize=7, alignment=TA_CENTER)
style_section_head = ParagraphStyle('ReceiptSectionHead', parent=styles['Normal'], fontName=PDF_FONT_BOLD, fontSize=8, spaceBefore=2*mm, spaceAfter=0.5*mm, alignment=TA_CENTER)
style_section_head_boxed = ParagraphStyle('ReceiptSectionHeadBoxed', parent=styles['Normal'], fontName=PDF_FONT_BOLD, fontSize=8, spaceBefore=2*mm, spaceAfter=0.5*mm, borderPadding=2, borderWidth=1, borderColor=colors.black, backColor=colors.white, alignment=TA_CENTER)

style_item = ParagraphStyle('ReceiptItem', parent=styles['Normal'], fontName=PDF_FONT, fontSize=6.5, leading=7.5)
style_item_bold = ParagraphStyle('ReceiptItemBold', parent=styles['Normal'], fontName=PDF_FONT_BOLD, fontSize=6.5, leading=7.5)
style_footer = ParagraphStyle('ReceiptFooter', parent=styles['Normal'], fontName=PDF_FONT, fontSize=6, alignment=TA_CENTER)

# Analysis Box Styles
style_box_label = ParagraphStyle('BoxLabel', parent=styles['Normal'], fontName=PDF_FONT_BOLD, fontSize=7, alignment=TA_CENTER, textColor=colors.gray)
style_box_value = ParagraphStyle('BoxValue', parent=styles['Normal'], fontName=PDF_FONT_BOLD, fontSize=10, alignment=TA_CENTER)
style_box_note = ParagraphStyle('BoxNote', parent=styles['Normal'], fontName=PDF_FONT, fontSize=6, leading=7, alignment=TA_CENTER, textColor=colors.gray)

def draw_header_footer(canvas, doc, report_lang='tr'):
    canvas.saveState()
    # Footer - use Turkish-compatible font
    canvas.setFont(PDF_FONT, 6)
    page_num = canvas.getPageNumber()
    if report_lang == 'tr':
        footer_text = f"Sayfa {page_num} | Rapor Kimliği: {doc.report_id}"
    else:
        footer_text = f"Page {page_num} | Report ID: {doc.report_id}"
    canvas.drawCentredString(PAGE_WIDTH/2, MARGIN_V, footer_text)
    canvas.restoreState()

def make_draw_header_footer(report_lang='tr'):
    """Factory function to create header/footer with language support."""
    def _draw(canvas, doc):
        draw_header_footer(canvas, doc, report_lang)
    return _draw


def _normalize_processed_image_item(item):
    if isinstance(item, dict):
        return {
            'label': str(item.get('label', '')),
            'image': item.get('image'),
            'compact': bool(item.get('compact', False)),
        }
    if isinstance(item, (list, tuple)) and len(item) >= 2:
        return {
            'label': str(item[0]),
            'image': item[1],
            'compact': False,
        }
    return {'label': '', 'image': None, 'compact': False}

def generate_receipt(pdf_path, settings, processed_images, report_id, operator_name, date_str, time_str, 
                     color_score=0, pattern_score=0, overall_score=0, decision="PENDING",
                     color_points=None, pattern_points=None, software_version="3.0.0", mode="dual",
                     color_method_key=None, pattern_method_key=None):
    doc = SimpleDocTemplate(pdf_path, pagesize=A4, 
                            leftMargin=MARGIN_H, rightMargin=MARGIN_H, 
                            topMargin=MARGIN_V, bottomMargin=MARGIN_V)
    doc.report_id = report_id
    
    # Get report language and translator
    report_lang = settings.get('report_lang', 'tr')
    tr = get_translator(report_lang)
    
    elements = []
    
    # 1. HEADER
    logo_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'images', 'logo_square_with_name_1024x1024.png')
    if os.path.exists(logo_path):
        im = RLImage(logo_path, width=15*mm, height=15*mm)
        elements.append(im)
    
    company_name = 'TEKSTİL MÜHENDİSLİK ÇÖZÜMLERİ' if report_lang == 'tr' else 'TEXTILE ENGINEERING SOLUTIONS'
    elements.append(Paragraph(company_name, style_company))
    elements.append(Paragraph(tr('config_report_title'), style_title))
    elements.append(Paragraph("="*60, style_header_info))
    
    # Top Block Info
    if report_lang == 'tr':
        header_data = [
            [f"Operatör: {operator_name}", f"Kimlik: {report_id}"],
            [f"Tarih: {date_str} {time_str}", f"Sürüm: {software_version}"]
        ]
    else:
        header_data = [
            [f"Operator: {operator_name}", f"ID: {report_id}"],
            [f"Date: {date_str} {time_str}", f"Version: {software_version}"]
        ]
    t_header = Table(header_data, colWidths=[90*mm, 90*mm])
    t_header.setStyle(TableStyle([
        ('FONTNAME', (0,0), (-1,-1), PDF_FONT),
        ('FONTSIZE', (0,0), (-1,-1), 8),
        ('ALIGN', (0,0), (0,-1), 'LEFT'),
        ('ALIGN', (1,0), (1,-1), 'RIGHT'),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ('TOPPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(t_header)
    elements.append(Paragraph("="*60, style_header_info))
    elements.append(Spacer(1, 1.5*mm))


    # 2. CONFIGURATION CONTENT
    
    if mode == "single":
        # SINGLE IMAGE MODE LAYOUT
        # General Settings
        gen_content = []
        gen_content.append(Paragraph(f"[ {tr('general_settings')} ]", style_section_head))
        gen_content.append(Paragraph(f"{tr('primary_illuminant')}: {settings.get('primary_illuminant', 'D65')}", style_item))
        gen_content.append(Paragraph(f"{tr('timezone_offset')}: UTC{'+' if settings.get('timezone_offset', 3) >= 0 else ''}{settings.get('timezone_offset', 3)}", style_item))
        report_lang_display = 'Türkçe' if report_lang == 'tr' else 'English'
        gen_content.append(Paragraph(f"{tr('report_language')}: {report_lang_display}", style_item))

        # Single Image Unit Settings
        single_content = []
        single_title = f"[ {tr('single_image_unit_settings')} ]"
        single_content.append(Paragraph(single_title, style_section_head))
        sampling_mode_val = settings.get('sampling_mode', 'random')
        sampling_mode_translated = tr(sampling_mode_val, sampling_mode_val)
        single_content.append(Paragraph(f"{tr('sampling_mode')}: {sampling_mode_translated}", style_item))
        single_content.append(Paragraph(f"{tr('sampling_count')}: {settings.get('region_count', 5)}", style_item))
        
        t_config = Table([[gen_content, single_content]], colWidths=[90*mm, 90*mm])
        t_config.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 1*mm),
            ('RIGHTPADDING', (0,0), (-1,-1), 1*mm),
            ('LINEAFTER', (0,0), (0,-1), 0.5, colors.black),
        ]))
        elements.append(t_config)
        elements.append(Spacer(1, 5*mm))

    else:
        # DUAL MODE LAYOUT
        # LEFT CONTENT (Color Unit + General Settings)
        left_content = []
        
        # General Settings block
        left_content.append(Paragraph(f"[ {tr('general_settings')} ]", style_section_head))
        left_content.append(Paragraph(f"{tr('primary_illuminant')}: {settings.get('primary_illuminant', 'D65')}", style_item))
        test_ills = settings.get('test_illuminants', [])
        if isinstance(test_ills, list) and test_ills:
            left_content.append(Paragraph(f"{tr('test_illuminants')}: {', '.join(test_ills)}", style_item))
        left_content.append(Paragraph(f"{tr('timezone_offset')}: UTC{'+' if settings.get('timezone_offset', 3) >= 0 else ''}{settings.get('timezone_offset', 3)}", style_item))
        report_lang_display = 'T\u00fcrk\u00e7e' if report_lang == 'tr' else 'English'
        left_content.append(Paragraph(f"{tr('report_language')}: {report_lang_display}", style_item))
        if settings.get('receipt_alignment_applied'):
            alignment_name = settings.get('receipt_alignment_name') or settings.get('alignment_mode', 'direct')
            left_content.append(Paragraph(f"{tr('alignment_technique')}: {alignment_name}", style_item))
        
        # Color Unit Settings block
        color_title = f"[ {tr('color_unit_settings')} ]"
        left_content.append(Paragraph(color_title, style_section_head))
        scoring_method = settings.get('color_scoring_method', 'delta_e')
        scoring_display = format_color_method_label(scoring_method, report_lang)
        left_content.append(Paragraph(f"{tr('color_scoring_method')}: {scoring_display}", style_item_bold))
        c_thresh = settings.get('thresholds', {})
        sampling_mode_val = settings.get('sampling_mode', 'random')
        sampling_mode_translated = tr(sampling_mode_val, sampling_mode_val)
        left_content.append(Paragraph(f"{tr('pass_threshold')}: {c_thresh.get('pass', 2.0)}", style_item))
        left_content.append(Paragraph(f"{tr('cond_threshold')}: {c_thresh.get('conditional', 5.0)}", style_item))
        left_content.append(Paragraph(f"{tr('global_thresh')}: {settings.get('global_threshold', 5.0)}", style_item))
        left_content.append(Paragraph(f"{tr('sampling_mode')}: {sampling_mode_translated}", style_item))
        left_content.append(Paragraph(f"{tr('sampling_count')}: {settings.get('region_count', 5)}", style_item))
        
        # RIGHT CONTENT (Pattern Unit)
        right_content = []
        pattern_title = f"[ {tr('pattern_unit_settings')} ]"
        right_content.append(Paragraph(pattern_title, style_section_head))
        
        # Pattern Scoring Method
        pat_method = settings.get('pattern_scoring_method', 'all')
        pat_display = format_pattern_method_label(pat_method, report_lang)
        right_content.append(Paragraph(f"{tr('pattern_scoring_method')}: {pat_display}", style_item_bold))
        
        # Extract Pattern Settings
        p_sets = settings.get('pattern_settings', {}) 
        if 'pattern_settings' in settings:
             p_sets = settings['pattern_settings']
        else:
             p_sets = settings 
             
        right_content.append(Paragraph(f"{tr('ssim_pass')}: {p_sets.get('ssim_pass', 0.85)}", style_item))
        right_content.append(Paragraph(f"{tr('ssim_cond')}: {p_sets.get('ssim_cond', 0.70)}", style_item))
        right_content.append(Paragraph("-", style_item))
        right_content.append(Paragraph(f"{tr('grad_pass')}: {p_sets.get('grad_pass', 85.0)}%", style_item))
        right_content.append(Paragraph(f"{tr('grad_cond')}: {p_sets.get('grad_cond', 70.0)}%", style_item))
        right_content.append(Paragraph("-", style_item))
    
        right_content.append(Paragraph(f"{tr('phase_pass')}: {p_sets.get('phase_pass', 85.0)}%", style_item))
        right_content.append(Paragraph(f"{tr('phase_cond')}: {p_sets.get('phase_cond', 70.0)}%", style_item))
        right_content.append(Paragraph("-", style_item))
        right_content.append(Paragraph(f"{tr('structural_pass')}: {p_sets.get('structural_pass', 85.0)}%", style_item))
        right_content.append(Paragraph(f"{tr('structural_cond')}: {p_sets.get('structural_cond', 70.0)}%", style_item))
        right_content.append(Paragraph("-", style_item))
        right_content.append(Paragraph(f"{tr('pattern_global_threshold')}: {settings.get('global_threshold', 75.0)}%", style_item))
        right_content.append(Paragraph("-", style_item))
        right_content.append(Paragraph(f"{tr('grad_diff_sensitivity')}: {settings.get('gradient_diff_sensitivity', 7)}", style_item))
        right_content.append(Paragraph(f"{tr('phase_diff_sensitivity')}: {settings.get('phase_diff_sensitivity', 7)}", style_item))
        right_content.append(Paragraph(f"{tr('grad_bound_sensitivity')}: {settings.get('gradient_boundary_sensitivity', 4)}", style_item))
        right_content.append(Paragraph(f"{tr('phase_bound_sensitivity')}: {settings.get('phase_boundary_sensitivity', 8)}", style_item))
        right_content.append(Paragraph(f"{tr('structural_sensitivity')}: {settings.get('structural_sensitivity', 10)}", style_item))
    
        # Merge Top Configuration
        t_config = Table([
            [left_content, right_content]
        ], colWidths=[90*mm, 90*mm])
        
        t_config.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('LEFTPADDING', (0,0), (-1,-1), 1*mm),
            ('RIGHTPADDING', (0,0), (-1,-1), 1*mm),
            ('LINEAFTER', (0,0), (0,-1), 0.5, colors.black),
        ]))
        elements.append(t_config)
        elements.append(Spacer(1, 2*mm))

    # 3. CENTERED "REPORT SECTIONS" WITH SPLIT LAYOUT
    report_sections_title = tr('report_sections')
    elements.append(Paragraph(report_sections_title, style_section_head))
    elements.append(Spacer(1, 1*mm))

    # Prepare logic for checklists
    sections = settings.get('sections', {})

    # Define lists with translation keys
    color_sections_list = [
        ('color_spaces', 'color_spaces'), ('exec_summary', 'exec_summary'), ('visual_comparison', 'visual_comparison'),
        ('rgb', 'rgb'), ('lab', 'lab'), 
        ('xyz', 'xyz'), ('cmyk', 'cmyk'), ('diff_metrics', 'diff_metrics'), 
        ('stats', 'stats'), ('detailed_lab', 'detailed_lab'), 
        ('visualizations', 'visualizations'), ('spectral', 'spectral'), 
        ('histograms', 'histograms'), ('visual_diff', 'visual_diff'),
        ('illuminant_analysis', 'illuminant_analysis'),
        ('csi_under_heatmap', 'csi_under_heatmap'),
        ('recommendations_color', 'recommendations_color')
    ]
    pattern_sections_list = [
        ('ssim', 'ssim'), ('gradient', 'gradient'),
        ('phase', 'phase'), ('structural', 'structural'),
        ('fourier', 'fourier'), ('glcm', 'glcm'),
        ('gradient_boundary', 'gradient_boundary'), ('phase_boundary', 'phase_boundary'), 
        ('summary', 'summary'), ('conclusion', 'conclusion'),
        ('recommendations_pattern', 'recommendations_pattern')
    ]

    def build_checklist(items_list):
        content = []
        for key, label_key in items_list:
            # Check key in sections dict (default True matches backend behavior)
            is_checked = sections.get(key, True)
            mark = "☑" if is_checked else "☐"
            label = tr(label_key)
            content.append(Paragraph(f"{mark} {label}", style_item))
        return content

    # Lists
    if mode == "single":
         single_sections_list = [
             ('rgb', 'rgb'),
             ('lab', 'lab'),
             ('xyz', 'xyz'),
             ('cmyk', 'cmyk'),
             ('visualizations', 'visualizations'),
             ('spectral', 'spectral'),
             ('histograms', 'histograms'),
             ('fourier', 'fourier'),
             ('recommendations_color', 'recommendations_color'),
         ]

         single_head = [Paragraph(tr('single_image_unit'), style_item_bold)]
         single_content = build_checklist(single_sections_list)
         
         t_sections = Table([
            [single_head],
            [single_content]
         ], colWidths=[180*mm])
         
         t_sections.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (0,0), (-1,0), 'CENTER'),
            ('FONTNAME', (0,0), (-1,0), PDF_FONT_BOLD),
         ]))
    else:
        col_list = build_checklist(color_sections_list)
        pat_list = build_checklist(pattern_sections_list)
    
        # Combine into table
        # | Color Unit | Pattern Unit |
        # | (list)     | (list)       |
        
        col_unit_head = Paragraph(tr('color_unit'), style_item_bold)
        pat_unit_head = Paragraph(tr('pattern_unit'), style_item_bold)
        
        t_sections = Table([
            [col_unit_head, pat_unit_head],
            [col_list, pat_list]
        ], colWidths=[90*mm, 90*mm])
        
        t_sections.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (0,0), (-1,0), 'CENTER'), # Center headers "Color Unit" / "Pattern Unit"
            ('FONTNAME', (0,0), (-1,0), PDF_FONT_BOLD),
            ('LEFTPADDING', (0,0), (-1,-1), 10*mm), # Indent check lists slightly
            ('RIGHTPADDING', (0,0), (-1,-1), 1*mm),
        ]))
    elements.append(t_sections)
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph("="*60, style_header_info))

    # 4. PROCESSED IMAGES (Last section before footer)
    elements.append(Spacer(1, 1*mm))
    elements.append(Paragraph(tr('processed_images_log'), style_section_head))
    if settings.get('receipt_alignment_applied') and settings.get('receipt_alignment_name'):
        elements.append(Paragraph(f"{tr('alignment_technique')}: {settings.get('receipt_alignment_name')}", style_item))
    
    img_row = []
    col_widths = []
    safe_images = processed_images if processed_images else []
    normalized_images = [_normalize_processed_image_item(item) for item in safe_images]
    visible_images = [item for item in normalized_images if hasattr(item.get('image'), 'draw')]

    for item in visible_images:
        img_obj = item['image']
        aspect = img_obj.imageWidth / img_obj.imageHeight
        if len(visible_images) >= 3 and item.get('compact'):
            thumb_w = 28 * mm
            col_w = 42 * mm
        elif len(visible_images) == 3:
            thumb_w = 42 * mm
            col_w = 62 * mm
        else:
            thumb_w = 32 * mm
            col_w = 50 * mm
        thumb_h = thumb_w / aspect
        img_obj.drawWidth = thumb_w
        img_obj.drawHeight = thumb_h
        img_row.append([
            Paragraph(item['label'], style_item_bold),
            img_obj
        ])
        col_widths.append(col_w)

    if img_row:
        t_imgs = Table([img_row], colWidths=col_widths)
        t_imgs.setStyle(TableStyle([
            ('VALIGN', (0,0), (-1,-1), 'TOP'),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ]))
        elements.append(t_imgs)
    else:
        elements.append(Paragraph(tr('no_images_recorded'), style_item))

    # 5. ANALYSIS RESULTS FOOTER (New Design)
    elements.append(Spacer(1, 2*mm))
    elements.append(Paragraph(tr('analysis_results'), style_section_head))
    elements.append(Spacer(1, 1*mm))

    # Helper to create a scorecard cell
    def create_score_cell(label, value, value_color=colors.black, bg_color=None):
        content = [
            Paragraph(label, style_box_label),
            Spacer(1, 1*mm),
            Paragraph(value, ParagraphStyle('Val', parent=style_box_value, textColor=value_color))
        ]
        return content

    # Determine Decision Color
    decision_color = colors.black
    decision_text = str(decision).upper()
    decision_display = translate_decision(decision_text, report_lang)
    if decision_text == 'ACCEPT':
        decision_color = colors.green
    elif decision_text == 'REJECT' or decision_text == 'FAIL':
        decision_color = colors.red
    elif 'CONDITIONAL' in decision_text:
        decision_color = colors.orange

    # Score Box Content
    # 4 Columns: Decision | Color Score | Pattern Score | Overall
    
    # Decisions Cell
    cell_decision = create_score_cell(tr('decision'), decision_display, decision_color)
    
    # Color Score Cell
    cell_color = create_score_cell(
        tr('color_score'),
        f"{float(color_score):.4f}" if mode != "single" else f"{float(color_score):.1f}"
    )
    
    # Pattern Score Cell
    cell_pattern = create_score_cell(tr('pattern_score'), f"{pattern_score:.1f}")
    
    # Overall Score Cell
    overall_method = format_color_method_label(color_method_key or settings.get('color_scoring_method', 'delta_e'), report_lang)
    overall_big = f"{float(pattern_score):.1f} / {float(color_score):.4f}"
    overall_note = f"{tr('overall_score_note')} ({overall_method})"
    cell_overall = [
        Paragraph(tr('overall_score'), style_box_label),
        Spacer(1, 1*mm),
        Paragraph(overall_big, ParagraphStyle('OverallVal', parent=style_box_value, fontSize=9.5)),
        Spacer(1, 0.5*mm),
        Paragraph(f"{overall_note}<br/>{tr('overall_score_explainer')}", style_box_note),
    ]
    
    # Table for Results
    if mode == "single":
        t_results = Table([
             [Paragraph(tr('status_label'), style_box_label)],
             [Paragraph(tr('complete'), StyleH1)]
        ], colWidths=[180*mm])
    else:
        t_results = Table([
            [cell_decision, cell_color, cell_pattern, cell_overall]
        ], colWidths=[34*mm, 34*mm, 34*mm, 66*mm])
    
    t_results.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.grey), # Border around whole table
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.lightgrey), # Grid lines
        ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
        ('ALIGN', (0,0), (-1,-1), 'CENTER'),
        ('TOPPADDING', (0,0), (-1,-1), 2*mm),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2*mm),
        ('BACKGROUND', (0,0), (-1,-1), colors.whitesmoke),
    ]))
    
    elements.append(t_results)

    # Build
    doc.build(elements, onFirstPage=make_draw_header_footer(report_lang), onLaterPages=make_draw_header_footer(report_lang))
