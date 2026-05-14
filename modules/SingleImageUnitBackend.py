# -*- coding: utf-8 -*-
import os, random
import numpy as np
import cv2
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Table, TableStyle, Spacer, PageBreak, Image as RLImage, KeepTogether
from reportlab.lib.enums import TA_CENTER
from modules import ReportUtils as RU
from modules.ReportUtils import (
    PDF_FONT_BOLD, PDF_FONT_REGULAR, BLUE1, BLUE2, GREEN, RED, ORANGE,
    NEUTRAL, NEUTRAL_DARK, NEUTRAL_L, StyleTitle, StyleH1, StyleH2, StyleBody, StyleSmall,
    MARGIN_L, MARGIN_R, MARGIN_T, MARGIN_B, DPI,
    BG_LIGHT_RED, BG_LIGHT_GREEN, BG_LIGHT_BLUE
)
from modules.ColorUnitBackend import (
    rgb_to_cmyk, srgb_to_xyz, xyz_to_lab, adapt_to_illuminant, WHITE_POINTS,
    badge, COMPANY_NAME, COMPANY_SUBTITLE, BLUE1, plot_rgb_histogram
)
from modules.ReportTranslations import get_translator
from modules.PatternUnitBackend import fourier_domain_analysis, plot_fft_spectrum
import matplotlib.pyplot as plt

# =================================================================================================
# CONFIGURATION
# =================================================================================================

REPORT_TITLE = "Single Image Analysis Report"

# =================================================================================================
# LOGIC
# =================================================================================================

def is_point_valid(x, y, region, img_w, img_h):
    """
    Validate if a point (x, y) in GLOBAL coordinates is within the region and image bounds.
    Reuse logic from ColorUnitBackend (could be moved to shared, but simple enough to duplicate for isolation if needed).
    Actually, let's keep it self-contained here or import if we strictly want to avoid dupe. 
    User requested isolation. Duplicating small logic is safer than importing from ColorUnitBackend which might fail if dependencies change.
    """
    if not (0 <= x < img_w and 0 <= y < img_h):
        return False
    
    if not region: 
        return True 
        
    rtype = region.get('type', 'rect')
    
    if rtype == 'circle':
        cx = region.get('cx')
        cy = region.get('cy')
        r = region.get('r')
        if cx is None or cy is None or r is None: return False
        return (x - cx)**2 + (y - cy)**2 <= r**2
    else:
        rx = region.get('x')
        ry = region.get('y')
        w = region.get('w')
        h = region.get('h')
        if rx is None or ry is None or w is None or h is None: return False
        return rx <= x <= rx + w and ry <= y <= ry + h

def make_points_strict(region, n, img_w, img_h):
    """
    Generate exactly n random points uniformly distributed INSIDE the region.
    """
    points = []
    if n <= 0: return points
    
    # Bbox
    if not region:
        min_x, max_x = 0, img_w
        min_y, max_y = 0, img_h
    else:
        rtype = region.get('type', 'rect')
        if rtype == 'circle':
            cx, cy, r = region['cx'], region['cy'], region['r']
            min_x, max_x = cx - r, cx + r
            min_y, max_y = cy - r, cy + r
        else:
            min_x, max_x = region['x'], region['x'] + region['w']
            min_y, max_y = region['y'], region['y'] + region['h']
            
    min_x = max(0, min_x)
    max_x = min(img_w, max_x)
    min_y = max(0, min_y)
    max_y = min(img_h, max_y)
    
    attempts = 0
    max_attempts = n * 200
    
    while len(points) < n and attempts < max_attempts:
        attempts += 1
        px = random.randint(int(min_x), int(max_x - 1) if max_x > min_x else int(min_x))
        py = random.randint(int(min_y), int(max_y - 1) if max_y > min_y else int(min_y))
        
        if is_point_valid(px, py, region, img_w, img_h):
            if (px, py) not in points:
                points.append((px, py))
                
    return points

def plot_single_spectral_proxy(mean_rgb, path):
    """
    Plot spectral curve proxy for a single image.
    """
    wl = np.linspace(380, 700, 161)
    def gaussian(w, mu, sigma): return np.exp(-0.5*((w-mu)/sigma)**2)
    base_B = gaussian(wl, 450, 22)
    base_G = gaussian(wl, 545, 25)
    base_R = gaussian(wl, 610, 28)
    
    curve = (mean_rgb[0]*base_R + mean_rgb[1]*base_G + mean_rgb[2]*base_B)
    curve /= (curve.max() + 1e-8)
    
    plt.figure(figsize=(7,3))
    plt.plot(wl, curve, label="Sample", color="red")
    plt.xlabel("Wavelength (nm)")
    plt.ylabel("Relative Intensity")
    plt.title("Spectral Distribution (Proxy)")
    plt.grid(True, alpha=0.3)
    plt.legend()
    plt.tight_layout()
    plt.savefig(path, dpi=DPI, bbox_inches="tight")
    plt.close()

def analyze_and_generate(sample_img_bgr, settings, output_path, report_id=None, timestamp=None):
    """
    Analyze a single image and generate a PDF report.
    """
    # 1. Setup
    h, w = sample_img_bgr.shape[:2]
    
    # Global Dimensions
    global_w = settings.get('original_width', w)
    global_h = settings.get('original_height', h)
    crop_off_x = settings.get('crop_offset_x', 0)
    crop_off_y = settings.get('crop_offset_y', 0)
    region_geo = settings.get('region_geometry', None)
    
    # 2. Sampling
    n_reg = int(settings.get('region_count', 5))
    sampling_mode = settings.get('sampling_mode', 'random')
    manual_points = settings.get('sampling_points', [])
    
    points = []
    
    # Validate Manual Points
    valid_manual = []
    for p in manual_points:
        px, py = 0, 0
        is_manual = True  # Default to manual
        if isinstance(p, dict):
            px, py = int(p.get('x', 0)), int(p.get('y', 0))
            is_manual = p.get('isManual', True)
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
            px, py = int(p[0]), int(p[1])
        
        if is_point_valid(px, py, region_geo, global_w, global_h):
            valid_manual.append((px, py, is_manual))
            
    # Always start with valid manual points, then fill remaining with random
    points = valid_manual[:n_reg]
    needed = n_reg - len(points)
    if needed > 0:
        random_points = make_points_strict(region_geo, needed, global_w, global_h)
        points.extend([(px, py, False) for px, py in random_points])
    points = points[:n_reg]
    
    # 3. Measurements
    # Extract colors at points
    measurements = []
    r_vis = max(12, int(min(h, w) * 0.04)) # generic radius for vis
    
    # Handle Alpha
    if sample_img_bgr.shape[2] == 4:
        img_bgr = sample_img_bgr[:, :, :3]
        mask_alpha = sample_img_bgr[:, :, 3]
    else:
        img_bgr = sample_img_bgr
        mask_alpha = np.full((h, w), 255, dtype=np.uint8)
        
    for i, point_data in enumerate(points):
        # Handle both old format (px, py) and new format (px, py, isManual)
        if isinstance(point_data, tuple) and len(point_data) == 3:
            gx, gy, _ = point_data
        else:
            gx, gy = point_data[:2]
        
        lx = gx - crop_off_x
        ly = gy - crop_off_y
        lx = max(0, min(w - 1, lx))
        ly = max(0, min(h - 1, ly))
        
        # Local area averaging (consistent with ColorUnit region_stats)
        cx, cy = int(lx), int(ly)
        rad = r_vis
        
        y_grid, x_grid = np.ogrid[:h, :w]
        mask = (x_grid - cx)**2 + (y_grid - cy)**2 <= rad*rad
        
        if not np.any(mask):
            # Fallback to single pixel
            bgr_val = img_bgr[ly, lx]
        else:
            bgr_in_circle = img_bgr[mask]
            alpha_in_circle = mask_alpha[mask]
            valid_mask = alpha_in_circle > 0
            
            if np.any(valid_mask):
                bgr_vals = bgr_in_circle[valid_mask]
                bgr_val = bgr_vals.mean(axis=0)
            else:
                 bgr_val = img_bgr[ly, lx] # Fallback
        
        rgb_val = bgr_val[::-1]
        rgb01 = rgb_val / 255.0
        
        # Metrics
        xyz_d65 = srgb_to_xyz(rgb01) 
        
        # Adaptation
        primary_ill = settings.get('primary_illuminant', 'D65')
        xyz = adapt_to_illuminant(xyz_d65, primary_ill)
        
        # Lab
        white_point = WHITE_POINTS.get(primary_ill, WHITE_POINTS['D65'])
        lab = xyz_to_lab(xyz, white_point)
        
        cmyk = rgb_to_cmyk(tuple(rgb01))
        
        measurements.append({
            'id': i+1,
            'pos': (gx, gy),
            'rgb': rgb_val,
            'xyz': xyz,
            'lab': lab,
            'cmyk': cmyk
        })

    # Generate Spectral Plot (using mean RGB of all points)
    spectral_plot_path = None
    if measurements:
        mean_rgb = np.mean([m['rgb'] for m in measurements], axis=0) / 255.0
        # Ensure directory exists
        plot_dir = os.path.dirname(output_path)
        spectral_plot_path = os.path.join(plot_dir, f"spectral_{report_id}.png")
        plot_single_spectral_proxy(mean_rgb, spectral_plot_path)

    # 4. Generate PDF
    _generate_pdf(sample_img_bgr, measurements, points, output_path, settings, timestamp, report_id, spectral_plot_path)
    
    # Cleanup plot
    if spectral_plot_path and os.path.exists(spectral_plot_path):
        try: os.remove(spectral_plot_path)
        except: pass

    
    return {
        'output_path': output_path,
        'points': points
    }

def _generate_pdf(sample_img, measurements, points, out_path, settings, timestamp, report_id, spectral_plot_path=None):
    _temp_files = []  # Collect temp files for cleanup AFTER doc.build()
    doc = SimpleDocTemplate(out_path, pagesize=A4, 
                            leftMargin=MARGIN_L, rightMargin=MARGIN_R, 
                            topMargin=MARGIN_T, bottomMargin=MARGIN_B)
    
    primary_ill = settings.get('primary_illuminant', 'D65')
    operator = settings.get('operator', 'Unknown')
    software_ver = "3.0.0"
    
    # Get report language and translator
    report_lang = settings.get('report_lang', 'tr')
    tr = get_translator(report_lang)

    sections = settings.get('sections', {}) if isinstance(settings.get('sections', {}), dict) else {}
    
    from reportlab.lib.styles import ParagraphStyle
    from reportlab.lib.enums import TA_LEFT
    
    story = []
    
    # ═══════════════════════════════════════════════════════════════
    # COVER PAGE (matches Color/Pattern Unit cover style)
    # ═══════════════════════════════════════════════════════════════
    story.append(Spacer(1, 0.5 * inch))
    logo_path = RU.pick_logo()
    if logo_path:
        story.append(RLImage(logo_path, width=2.0*inch, height=2.0*inch))
        story.append(Spacer(1, 0.3*inch))
    
    story.append(Paragraph(tr('single_image_title'), StyleTitle))
    story.append(Spacer(1, 0.15*inch))
    story.append(Paragraph(tr('cover_company'), StyleH2))
    story.append(Spacer(1, 0.08*inch))
    
    subtitle_style = ParagraphStyle('ElegantSubtitle', parent=StyleSmall, fontSize=9, textColor=NEUTRAL, fontName=PDF_FONT_REGULAR, leading=12, alignment=TA_LEFT)
    story.append(Paragraph(f"<i>{tr('cover_subtitle')}</i>", subtitle_style))
    story.append(Spacer(1, 0.2*inch))
    
    # Badge
    story.append(badge(f"{tr('primary_illuminant')}: {primary_ill}", back_color=BLUE1))
    story.append(Spacer(1, 0.4*inch))
    
    # Metadata Table (same style as Color Unit cover)
    meta_data = [
        [tr('details'), ""],
        [tr('generated_on'), timestamp.strftime("%Y-%m-%d %H:%M:%S")],
        [tr('operator'), operator],
        [tr('primary_illuminant'), primary_ill],
        [tr('report_id'), report_id],
        [tr('software_version'), software_ver],
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
    story.append(meta_table)
    story.append(PageBreak())
    
    # ═══════════════════════════════════════════════════════════════
    # COLOR SPACES — same order, design, and coloring as Color Unit
    # (RGB → Lab* with detailed stats + visualization → XYZ → CMYK)
    # ═══════════════════════════════════════════════════════════════
    if measurements:
        any_color_space = any([
            sections.get('rgb', True),
            sections.get('lab', True),
            sections.get('xyz', True),
            sections.get('cmyk', True),
        ])

        if any_color_space:
            metrics_heading = Paragraph(tr('color_metrics'), StyleH1)
            metrics_heading_used = False

        # 1. RGB Table (Color-Unit style with colored column backgrounds)
        if sections.get('rgb', True):
            pos_label = tr('point') if hasattr(tr, '__call__') else 'Pt'
            rgb_header = [tr('region'), tr('point') if report_lang != 'en' else 'Position', "R", "G", "B"]
            rgb_data = [rgb_header]
            for m in measurements:
                r_val, g_val, b_val = m['rgb']
                pos_str = f"({m['pos'][0]}, {m['pos'][1]})"
                rgb_data.append([str(m['id']), pos_str, f"{int(r_val)}", f"{int(g_val)}", f"{int(b_val)}"])

            t_rgb = RU.make_table(rgb_data, colWidths=[0.6*inch, 1.2*inch, 0.9*inch, 0.9*inch, 0.9*inch])
            t_rgb.setStyle(TableStyle([
                ('BACKGROUND', (2, 1), (2, -1), BG_LIGHT_RED),
                ('BACKGROUND', (3, 1), (3, -1), BG_LIGHT_GREEN),
                ('BACKGROUND', (4, 1), (4, -1), BG_LIGHT_BLUE),
            ]))
            kt_items = []
            if any_color_space and not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(tr('rgb_values'), StyleH2),
                t_rgb,
                Spacer(1, 0.15*inch),
            ])
            story.append(KeepTogether(kt_items))

        # 2. Lab* Color Space Analysis (enhanced — matches Color Unit)
        if sections.get('lab', True):
            lab_title = f'Lab* {tr("values")} ({primary_ill})' if report_lang != 'tr' else f'Lab* Değerleri ({primary_ill})'
            lab_header = ["Pt", "L*", "a*", "b*"]
            lab_data = [lab_header]
            lab_vals = []
            for m in measurements:
                l_val, a_val, b_val = m['lab']
                lab_data.append([str(m['id']), f"{l_val:.2f}", f"{a_val:.2f}", f"{b_val:.2f}"])
                lab_vals.append((l_val, a_val, b_val))

            t_lab = RU.make_table(lab_data, colWidths=[0.6*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            kt_items = []
            if any_color_space and not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(lab_title, StyleH2),
                t_lab,
                Spacer(1, 0.1*inch),
            ])
            story.append(KeepTogether(kt_items))

            # Lab* statistics summary
            if lab_vals:
                all_L = [v[0] for v in lab_vals]
                all_a = [v[1] for v in lab_vals]
                all_b = [v[2] for v in lab_vals]

                stat_title = tr('lab_detailed_analysis')
                stat_header = [tr('component'), tr('average'), tr('std_dev'), tr('minimum'), tr('maximum')]
                stat_rows = [stat_header]
                stat_rows.append(["L* (" + tr('lightness') + ")", f"{np.mean(all_L):.2f}", f"{np.std(all_L):.2f}", f"{np.min(all_L):.2f}", f"{np.max(all_L):.2f}"])
                stat_rows.append(["a* (" + tr('red') + "/" + tr('green') + ")", f"{np.mean(all_a):.2f}", f"{np.std(all_a):.2f}", f"{np.min(all_a):.2f}", f"{np.max(all_a):.2f}"])
                stat_rows.append(["b* (" + tr('blue') + "/" + tr('hue') + ")", f"{np.mean(all_b):.2f}", f"{np.std(all_b):.2f}", f"{np.min(all_b):.2f}", f"{np.max(all_b):.2f}"])
                t_stat = RU.make_table(stat_rows, colWidths=[1.5*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.9*inch])
                story.append(KeepTogether([
                    Paragraph(stat_title, StyleH2),
                    t_stat,
                    Spacer(1, 0.1*inch),
                ]))

                # Lab* bar chart visualization
                if sections.get('visualizations', True):
                    plot_dir = os.path.dirname(out_path)
                    bar_path = os.path.join(plot_dir, f"lab_bar_{report_id}.png")
                    labels_chart = ['L*', 'a*', 'b*']
                    means = [np.mean(all_L), np.mean(all_a), np.mean(all_b)]
                    stds = [np.std(all_L), np.std(all_a), np.std(all_b)]
                    fig, ax = plt.subplots(figsize=(5, 3))
                    x_pos = np.arange(len(labels_chart))
                    ax.bar(x_pos, means, 0.5, yerr=stds, color=['#3498DB', '#E74C3C', '#F1C40F'], edgecolor='white', linewidth=0.5, capsize=4)
                    ax.set_xticks(x_pos)
                    ax.set_xticklabels(labels_chart)
                    vis_title = tr('lab_components_mean')
                    ax.set_title(vis_title, fontsize=11, fontweight='bold')
                    ax.grid(True, alpha=0.15, axis='y')
                    plt.tight_layout()
                    plt.savefig(bar_path, dpi=150, bbox_inches="tight")
                    plt.close()

                    vis_section_title = tr('lab_visualizations')
                    story.append(KeepTogether([
                        Paragraph(vis_section_title, StyleH2),
                        RLImage(bar_path, 4.5*inch, 2.5*inch),
                        Spacer(1, 0.15*inch),
                    ]))
                    _temp_files.append(bar_path)

        # 3. XYZ Table
        if sections.get('xyz', True):
            xyz_title = f'XYZ {tr("values")} ({primary_ill})' if report_lang != 'tr' else f'XYZ Değerleri ({primary_ill})'
            xyz_header = ["Pt", "X", "Y", "Z"]
            xyz_data = [xyz_header]
            for m in measurements:
                x_val, y_val, z_val = m['xyz']
                xyz_data.append([str(m['id']), f"{x_val:.2f}", f"{y_val:.2f}", f"{z_val:.2f}"])

            t_xyz = RU.make_table(xyz_data, colWidths=[0.6*inch, 1.2*inch, 1.2*inch, 1.2*inch])
            kt_items = []
            if any_color_space and not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(xyz_title, StyleH2),
                t_xyz,
                Spacer(1, 0.15*inch),
            ])
            story.append(KeepTogether(kt_items))

        # 4. CMYK Table
        if sections.get('cmyk', True):
            cmyk_title = 'CMYK Değerleri' if report_lang == 'tr' else 'CMYK Values'
            cmyk_header = ["Pt", "C", "M", "Y", "K"]
            cmyk_data = [cmyk_header]
            for m in measurements:
                c_val, m_val, y_val, k_val = m['cmyk']
                cmyk_data.append([str(m['id']), f"{c_val:.2f}", f"{m_val:.2f}", f"{y_val:.2f}", f"{k_val:.2f}"])

            t_cmyk = RU.make_table(cmyk_data, colWidths=[0.6*inch, 1.0*inch, 1.0*inch, 1.0*inch, 1.0*inch])
            kt_items = []
            if any_color_space and not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(cmyk_title, StyleH2),
                t_cmyk,
                Spacer(1, 0.2*inch),
            ])
            story.append(KeepTogether(kt_items))

    # ═══════════════════════════════════════════════════════════════
    # VISUALS — Sample image with points, Spectral proxy, Histogram
    # ═══════════════════════════════════════════════════════════════
    vis_img = sample_img.copy()
    r_vis = max(12, int(min(vis_img.shape[0], vis_img.shape[1]) * 0.04))

    for i, point_data in enumerate(points):
        if isinstance(point_data, tuple) and len(point_data) == 3:
            gx, gy, is_manual = point_data
        else:
            gx, gy = point_data[:2]
            is_manual = True

        crop_off_x = settings.get('crop_offset_x', 0)
        crop_off_y = settings.get('crop_offset_y', 0)
        lx = gx - crop_off_x
        ly = gy - crop_off_y

        color = (94, 197, 34) if is_manual else (22, 115, 249)

        cv2.circle(vis_img, (lx, ly), r_vis + 2, color, 3)
        cv2.circle(vis_img, (lx, ly), r_vis, color, 2)
        cv2.circle(vis_img, (lx, ly), 4, color, -1)

        label_pos = (lx + 8, ly - 8)
        cv2.putText(vis_img, str(i+1), label_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 4)
        cv2.putText(vis_img, str(i+1), label_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)

    viz_heading = Paragraph(tr('visualizations'), StyleH1)
    viz_heading_used = False

    rl_img = RU.numpy_to_rl(vis_img, max_w=6*inch, max_h=4.5*inch)
    if rl_img:
        rl_img.hAlign = 'CENTER'
        sample_img_label = 'Analiz Noktaları ile Numune Görüntüsü' if report_lang == 'tr' else 'Sample Image with Analysis Points'
        kt_items = []
        if not viz_heading_used:
            kt_items.append(viz_heading)
            viz_heading_used = True
        kt_items.extend([
            rl_img,
            Paragraph(sample_img_label, StyleSmall),
            Spacer(1, 0.15*inch),
        ])
        story.append(KeepTogether(kt_items))

    # Spectral Plot
    if sections.get('spectral', True) and spectral_plot_path and os.path.exists(spectral_plot_path):
        spectral_desc = tr('spectral_analysis') + " (" + tr('spectral_proxy') + ")"
        sp_img = RLImage(spectral_plot_path, width=6*inch, height=2.5*inch)
        sp_img.hAlign = 'CENTER'
        kt_items = []
        if not viz_heading_used:
            kt_items.append(viz_heading)
            viz_heading_used = True
        kt_items.extend([
            Paragraph(spectral_desc, StyleH2),
            sp_img,
            Spacer(1, 0.15*inch),
        ])
        story.append(KeepTogether(kt_items))

    # RGB Histograms
    if sections.get('histograms', True):
        try:
            import tempfile as _tmpmod_hist
            _hist_tmp = _tmpmod_hist.mkdtemp()
            hist_path = os.path.join(_hist_tmp, "hist_single.png")
            hist_title = 'Numune RGB Histogramı' if report_lang == 'tr' else 'Sample RGB Histogram'
            plot_rgb_histogram(sample_img, hist_path, title=hist_title)
            hist_interp = tr('histogram_interpretation_single')

            kt_items = []
            if not viz_heading_used:
                kt_items.append(viz_heading)
                viz_heading_used = True
            kt_items.extend([
                Paragraph(tr('histograms_title'), StyleH2),
                RLImage(hist_path, 5.5*inch, 3.0*inch),
                Spacer(1, 0.1*inch),
                Paragraph(f"<i>{hist_interp}</i>", StyleSmall),
                Spacer(1, 0.15*inch),
            ])
            story.append(KeepTogether(kt_items))
            _temp_files.append(hist_path)
        except Exception as e:
            print(f"Error in Single Image RGB Histogram: {e}")
            import traceback
            traceback.print_exc()

    # ═══════════════════════════════════════════════════════════════
    # FOURIER DOMAIN ANALYSIS — starts on a new page
    # ═══════════════════════════════════════════════════════════════
    if sections.get('fourier', True):
        try:
            import tempfile as _tmpmod
            _fda_tmp = _tmpmod.mkdtemp()
            fda_result = fourier_domain_analysis(sample_img)
            spectrum_path = os.path.join(_fda_tmp, "fft_spectrum_single.png")
            plot_fft_spectrum(fda_result, spectrum_path, title=tr('fft_spectrum_title'))

            story.append(PageBreak())

            if os.path.exists(spectrum_path):
                story.append(KeepTogether([
                    Paragraph(tr('fourier_title'), StyleH1),
                    Spacer(1, 0.05 * inch),
                    Paragraph(f"<i>{tr('fourier_subtitle')}</i>", StyleSmall),
                    Spacer(1, 0.15 * inch),
                    Paragraph(tr('fft_spectrum_title'), StyleH2),
                    RLImage(spectrum_path, 5.0*inch, 3.8*inch),
                    Spacer(1, 0.15 * inch),
                ]))

            # Peaks Table
            fda_peaks = fda_result.get('peaks', [])
            if fda_peaks:
                peak_header = [tr('peak'), tr('radius'), tr('angle_deg'), tr('magnitude')]
                peak_data = [peak_header]
                for i, p in enumerate(fda_peaks):
                    peak_data.append([f"P{i+1}", f"{p['radius']:.2f}", f"{p['angle']:.2f}", f"{p['magnitude']:.2f}"])
                t_peaks = RU.make_table(peak_data, colWidths=[1.0*inch, 1.5*inch, 1.5*inch, 1.5*inch])
                story.append(KeepTogether([
                    Paragraph(tr('fourier_peaks_title'), StyleH2),
                    t_peaks,
                    Spacer(1, 0.2 * inch),
                ]))

            # Metrics Table
            met_header = [tr('metric'), tr('value')]
            met_data = [met_header,
                [tr('fundamental_period'), f"{fda_result['fundamental_period']:.2f}"],
                [tr('dominant_orientation'), f"{fda_result['dominant_orientation']:.2f}"],
                [tr('anisotropy_ratio'), f"{fda_result['anisotropy']:.2f}"],
            ]
            t_met = RU.make_table(met_data, colWidths=[2.5*inch, 2.0*inch])
            story.append(KeepTogether([
                Paragraph(tr('fourier_metrics_title'), StyleH2),
                t_met,
                Spacer(1, 0.2*inch),
            ]))

            _temp_files.append(spectrum_path)
        except Exception as e:
            print(f"Error in Single Image Fourier analysis: {e}")
            import traceback
            traceback.print_exc()

    # ═══════════════════════════════════════════════════════════════
    # RECOMMENDATIONS & CONCLUSIONS
    # ═══════════════════════════════════════════════════════════════
    if sections.get('recommendations_color', True) and measurements:
        from modules.RecommendationsEngine import generate_single_image_recommendations, render_findings_to_flowables

        story.append(Spacer(1, 0.3*inch))

        findings, conclusion_text, conclusion_status = generate_single_image_recommendations(
            measurements=measurements,
            lang=report_lang
        )

        rec_title = 'Analiz Özeti ve Öneriler' if report_lang == 'tr' else 'Analysis Summary & Recommendations'
        rec_flowables = render_findings_to_flowables(
            findings, conclusion_text, conclusion_status, rec_title, lang=report_lang
        )
        story.extend(rec_flowables)

    # Header/Footer
    doc.build(story, onFirstPage=RU.make_header_footer(timestamp, REPORT_TITLE, report_lang), 
              onLaterPages=RU.make_header_footer(timestamp, REPORT_TITLE, report_lang))

    # Cleanup temp files AFTER doc.build() has consumed them
    for _tf in _temp_files:
        try:
            if _tf and os.path.exists(_tf): os.remove(_tf)
        except: pass

