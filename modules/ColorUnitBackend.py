# -*- coding: utf-8 -*-
import io, os, math, random
from pathlib import Path
import numpy as np
import cv2
from PIL import Image
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
from .ReportTranslations import get_translator, translate_status

# Illuminant White Points (CIE 1931 2 degree standard observer) - Approximated
# Y is normalized to 1.0
WHITE_POINTS = {
    'D65': np.array([0.95047, 1.00000, 1.08883]),
    'D50': np.array([0.96422, 1.00000, 0.82521]),
    'A':   np.array([1.09850, 1.00000, 0.35585]),
    'C':   np.array([0.98074, 1.00000, 1.18232]),
    'F2':  np.array([0.99187, 1.00000, 0.67395]), # Cool White Fluorescent
    'CWF': np.array([0.99187, 1.00000, 0.67395]), # Often same as F2
    'TL84': np.array([1.0386, 1.0000, 0.6560]),   # Tri-band Fluorescent (Approx)
}

def adapt_to_illuminant(xyz_d65, target_illuminant):
    """Chromatic adaptation from D65 to the target illuminant using the Bradford transform."""
    if target_illuminant not in WHITE_POINTS:
        return xyz_d65
        
    src_white = WHITE_POINTS['D65']
    dst_white = WHITE_POINTS[target_illuminant]
    
    # Bradford chromatic adaptation matrix
    M_A = np.array([
        [0.8951000, 0.2664000, -0.1614000],
        [-0.7502000, 1.7135000, 0.0367000],
        [0.0389000, -0.0685000, 1.0296000]
    ])
    M_A_inv = np.linalg.inv(M_A)
    
    # Calculate source and dest cone responses
    rho_s, gam_s, bet_s = np.dot(M_A, src_white)
    rho_d, gam_d, bet_d = np.dot(M_A, dst_white)
    
    # Diagonal scaling matrix
    M_scale = np.array([
        [rho_d/rho_s, 0, 0],
        [0, gam_d/gam_s, 0],
        [0, 0, bet_d/bet_s]
    ])
    
    # Combined transform: M_total = M_inv * M_scale * M
    M_total = np.dot(M_A_inv, np.dot(M_scale, M_A))
    
    # Apply
    xyz_arr = np.asarray(xyz_d65, dtype=np.float32)
    xyz_new = np.dot(xyz_arr, M_total.T)
    return xyz_new

def xyz_to_lab(xyz, white_point):
    """
    Convert XYZ to Lab given a specific white point.
    """
    xyz_arr = np.asarray(xyz, dtype=np.float32)
    white = np.asarray(white_point, dtype=np.float32)
    xyz_scaled = xyz_arr / white
    
    def f(t):
        return np.where(t > 0.008856, np.power(t, 1.0 / 3.0), 7.787 * t + 16 / 116)
        
    fx = f(xyz_scaled[..., 0])
    fy = f(xyz_scaled[..., 1])
    fz = f(xyz_scaled[..., 2])
    L = 116 * fy - 16
    a = 500 * (fx - fy)
    b = 200 * (fy - fz)
    return np.stack([L, a, b], axis=-1).astype(np.float32)

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch

# Resolve static image paths robustly in JPaaS/mod_wsgi
BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_IMAGES_DIR = BASE_DIR / "static" / "images"
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import SimpleDocTemplate, Paragraph, Image as RLImage, Table, TableStyle, Spacer, PageBreak, Flowable, KeepTogether
from reportlab.lib.enums import TA_LEFT, TA_CENTER
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# =================================================================================================
# CONFIGURATION CONSTANTS
# =================================================================================================

SOFTWARE_VERSION = "3.0.0"
COMPANY_NAME = "Textile Engineering Solutions"
COMPANY_SUBTITLE = "Professional Color Analysis Solutions"
REPORT_TITLE = "Color Analysis Report"
PAGE_SIZE = A4
MARGIN_L = 50
MARGIN_R = 50
MARGIN_T = 50
MARGIN_B = 50
DPI = 300
DEFAULT_TIMEZONE_OFFSET_HOURS = 3
FRAME_MARGIN = 9

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

DEFAULT_CONFIG = {
    'operator': 'Unknown',
    'timezone_offset': 3,
    'region_count': 5,
    'thresholds': {'pass': 2.0, 'conditional': 5.0},
    'global_threshold': 5.0,
    'sections': {
        'color_spaces': True,
        'rgb': True, 'lab': True, 'xyz': True, 'cmyk': True,
        'diff_metrics': True,
        'stats': True,
        'detailed_lab': True,
        'visualizations': True,
        'spectral': True,
        'histograms': True,
        'visual_diff': True,
        'exec_summary': True,
        'visual_comparison': True,
        'recommendations_color': True,
        'csi_under_heatmap': False
    }
}

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
    
    # Fallback to Helvetica (may not support all Turkish chars)
    return "Helvetica", "Helvetica-Bold"

PDF_FONT_REGULAR, PDF_FONT_BOLD = setup_fonts()

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
        # Create black background
        bg = np.zeros_like(b)
        
        # Composite: Source * Alpha + Dest * (1 - Alpha)
        # Since Dest is black (0), it simplifies to Source * Alpha
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

def make_header_footer(report_timestamp=None, report_lang='tr'):
    # Turkish translations for header/footer
    if report_lang == 'tr':
        company_name = 'Tekstil Mühendislik Çözümleri'
        subtitle = 'Profesyonel Renk Analizi Çözümleri'
    else:
        company_name = COMPANY_NAME
        subtitle = COMPANY_SUBTITLE
    
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

# =================================================================================================
# METRIC CALCULATION
# =================================================================================================

def rgb_to_cmyk(rgb01):
    r, g, b = rgb01
    k = 1 - max(r, g, b)
    if k >= 0.999: return (0., 0., 0., 1.)
    c = (1 - r - k) / (1 - k)
    m = (1 - g - k) / (1 - k)
    y = (1 - b - k) / (1 - k)
    return (c, m, y, k)

def srgb_to_xyz(rgb01):
    rgb = np.array(rgb01)
    mask = rgb > 0.04045
    rgb[mask] = ((rgb[mask] + 0.055) / 1.055) ** 2.4
    rgb[~mask] = rgb[~mask] / 12.92
    M = np.array([[0.4124564, 0.3575761, 0.1804375],
                  [0.2126729, 0.7151522, 0.0721750],
                  [0.0193339, 0.1191920, 0.9503041]])
    xyz = rgb @ M.T
    return xyz * 100.0 

def deltaE76(lab1, lab2):
    return float(np.sqrt(np.sum((lab1-lab2)**2)))

def deltaE94(lab1, lab2, kL=1, kC=1, kH=1, K1=0.045, K2=0.015):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    dL = L1 - L2
    C1 = math.sqrt(a1**2 + b1**2)
    C2 = math.sqrt(a2**2 + b2**2)
    dC = C1 - C2
    da = a1 - a2
    db = b1 - b2
    dH2 = max(0.0, da**2 + db**2 - dC**2)
    SL = 1; SC = 1 + K1*C1; SH = 1 + K2*C1
    return float(math.sqrt((dL/(kL*SL))**2 + (dC/(kC*SC))**2 + (math.sqrt(dH2)/(kH*SH))**2))

def deltaE2000(lab1, lab2, kL=1, kC=1, kH=1):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    avgLp = (L1 + L2) / 2.0
    C1 = math.sqrt(a1*a1 + b1*b1)
    C2 = math.sqrt(a2*a2 + b2*b2)
    avgC = (C1 + C2) / 2.0
    G = 0.5 * (1 - math.sqrt((avgC**7) / (avgC**7 + 25**7)))
    a1p = (1 + G) * a1
    a2p = (1 + G) * a2
    C1p = math.sqrt(a1p*a1p + b1*b1)
    C2p = math.sqrt(a2p*a2p + b2*b2)
    avgCp = (C1p + C2p) / 2.0
    h1p = math.degrees(math.atan2(b1, a1p)) % 360
    h2p = math.degrees(math.atan2(b2, a2p)) % 360
    dLp = L2 - L1
    dCp = C2p - C1p
    dhp = h2p - h1p
    if C1p * C2p == 0: dhp = 0
    elif abs(dhp) > 180:
        if h2p <= h1p: dhp += 360
        else: dhp -= 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp) / 2.0)
    if C1p * C2p == 0: avgHp = h1p + h2p
    elif abs(h1p - h2p) > 180: avgHp = (h1p + h2p + 360) / 2.0
    else: avgHp = (h1p + h2p) / 2.0
    T = 1 - 0.17 * math.cos(math.radians(avgHp - 30)) + \
        0.24 * math.cos(math.radians(2 * avgHp)) + \
        0.32 * math.cos(math.radians(3 * avgHp + 6)) - \
        0.20 * math.cos(math.radians(4 * avgHp - 63))
    dRo = 30 * math.exp(-((avgHp - 275) / 25) ** 2)
    RC = 2 * math.sqrt((avgCp ** 7) / (avgCp ** 7 + 25 ** 7))
    SL = 1 + (0.015 * (avgLp - 50) ** 2) / math.sqrt(20 + (avgLp - 50) ** 2)
    SC = 1 + 0.045 * avgCp
    SH = 1 + 0.015 * avgCp * T
    RT = -math.sin(math.radians(2 * dRo)) * RC
    dE = math.sqrt((dLp / (kL * SL)) ** 2 + (dCp / (kC * SC)) ** 2 + (dHp / (kH * SH)) ** 2 + RT * (dCp / (kC * SC)) * (dHp / (kH * SH)))
    return float(dE)

def region_stats(img, cx, cy, r):
    h, w = img.shape[:2]
    
    # Handle Alpha Channel if present
    if img.shape[2] == 4:
        img_bgr = img[:, :, :3]
        mask_alpha = img[:, :, 3]
    else:
        img_bgr = img
        mask_alpha = np.full((h, w), 255, dtype=np.uint8)

    cx = int(np.clip(cx, r, w-1-r))
    cy = int(np.clip(cy, r, h-1-r))
    y, x = np.ogrid[:h, :w]
    
    # Circle mask
    m = (x - cx)**2 + (y - cy)**2 <= r*r
    
    # Extract pixels in circle
    bgr_in_circle = img_bgr[m]
    alpha_in_circle = mask_alpha[m]
    
    # Filter for VALID pixels (Alpha > 0)
    # This prevents black background from dragging down the average
    valid_mask = alpha_in_circle > 0
    bgr = bgr_in_circle[valid_mask]
    
    # Safety: if no valid pixels (e.g. circle in void), return black/safe defaults
    if len(bgr) == 0: 
        bgr = np.array([[0,0,0]], dtype=np.uint8)
        
    rgb = bgr[:, ::-1].astype(np.float32)
    rgb01 = (rgb/255.0).mean(axis=0) # Mean of VALID pixels only
    rgb255 = (rgb01*255.0)
    
    pixel = np.uint8([[rgb255[::-1]]])
    lab = cv2.cvtColor(pixel, cv2.COLOR_BGR2LAB).astype(np.float32)[0,0]
    lab_std = np.array([lab[0]*100/255.0, lab[1]-128.0, lab[2]-128.0], dtype=np.float32)
    xyz_std = srgb_to_xyz(rgb01)
    cmyk = np.array(rgb_to_cmyk(tuple(rgb01)), dtype=np.float32)
    rgb_std_dev = (rgb/255.0).std(axis=0)
    return {
        "cx": cx, "cy": cy, "r": int(r),
        "rgb01": rgb01, "rgb255": rgb255, "rgb_std": rgb_std_dev,
        "lab": lab_std, "xyz": xyz_std, "cmyk": cmyk
    }

def is_point_valid(x, y, region, img_w, img_h):
    """
    Validate if a point (x, y) in GLOBAL coordinates is within the region and image bounds.
    """
    # 1. Image Bounds
    if not (0 <= x < img_w and 0 <= y < img_h):
        return False
    
    # 2. Region Bounds
    if not region: 
        return True # Full image
        
    rtype = region.get('type', 'rect')
    
    if rtype == 'circle':
        cx = region.get('cx')
        cy = region.get('cy')
        r = region.get('r')
        if cx is None or cy is None or r is None: return False
        return (x - cx)**2 + (y - cy)**2 <= r**2
    else:
        # Square/Rectangle
        rx = region.get('x')
        ry = region.get('y')
        w = region.get('w')
        h = region.get('h')
        if rx is None or ry is None or w is None or h is None: return False
        return rx <= x <= rx + w and ry <= y <= ry + h

def make_points_strict(region, n, img_w, img_h):
    """
    Generate exactly n random points uniformly distributed INSIDE the region 
    and within image bounds using strict validation.
    """
    points = []
    if n <= 0: return points
    
    # Determine sampling bounding box
    if not region:
        min_x, max_x = 0, img_w
        min_y, max_y = 0, img_h
        rtype = 'full'
    else:
        rtype = region.get('type', 'rect')
        if rtype == 'circle':
            cx, cy, r = region['cx'], region['cy'], region['r']
            min_x, max_x = cx - r, cx + r
            min_y, max_y = cy - r, cy + r
        else:
            min_x, max_x = region['x'], region['x'] + region['w']
            min_y, max_y = region['y'], region['y'] + region['h']
            
    # Constrain bbox to image
    min_x = max(0, min_x)
    max_x = min(img_w, max_x)
    min_y = max(0, min_y)
    max_y = min(img_h, max_y)
    
    # Generate with rejection sampling
    attempts = 0
    max_attempts = n * 200  # Safety break
    
    while len(points) < n and attempts < max_attempts:
        attempts += 1
        px = random.randint(int(min_x), int(max_x - 1) if max_x > min_x else int(min_x))
        py = random.randint(int(min_y), int(max_y - 1) if max_y > min_y else int(min_y))
        
        if is_point_valid(px, py, region, img_w, img_h):
            if (px, py) not in points:
                points.append((px, py))
                
    return points

def make_points(h, w, r, n=5):
    # DEPRECATED: Kept for compatibility if called without region context
    # Use make_points_strict instead
    return make_points_strict(None, n, w, h)

def overlay_circles(img, points, r):
    out = img.copy()
    
    # Enhanced visual design with color-coding:
    # Green (34, 197, 94) for manual points
    # Orange (249, 115, 22) for random points
    
    has_alpha = len(out.shape) == 3 and out.shape[2] == 4
    
    for i, point_data in enumerate(points, 1):
        # Handle both old format (px, py) and new format (px, py, isManual)
        if isinstance(point_data, tuple) and len(point_data) == 3:
            cx, cy, is_manual = point_data
        else:
            cx, cy = point_data[:2]
            is_manual = True  # Default to manual for backward compatibility
        
        # Color selection: Green for manual, Orange for random
        if is_manual:
            color = (94, 197, 34, 255) if has_alpha else (94, 197, 34)  # BGR format: Green
            color_text = (94, 197, 34, 255) if has_alpha else (94, 197, 34)
        else:
            color = (22, 115, 249, 255) if has_alpha else (22, 115, 249)  # BGR format: Orange
            color_text = (22, 115, 249, 255) if has_alpha else (22, 115, 249)
        
        # Draw outer glow circle for better visibility
        cv2.circle(out, (cx, cy), r + 2, color, 3)
        # Draw main circle
        cv2.circle(out, (cx, cy), r, color, 2)
        # Draw center dot
        cv2.circle(out, (cx, cy), 4, color, -1)
        
        # Draw label with white outline for better readability
        label = str(i)
        label_pos = (cx + 8, cy - 8)
        # White outline (thicker)
        cv2.putText(out, label, label_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 
                   (255, 255, 255, 255) if has_alpha else (255, 255, 255), 4)
        # Colored text
        cv2.putText(out, label, label_pos, cv2.FONT_HERSHEY_SIMPLEX, 0.8, 
                   color_text, 2)
    
    return out

# =================================================================================================
# PLOTTING
# =================================================================================================

def save_fig(path):
    plt.tight_layout()
    plt.savefig(path, dpi=DPI, bbox_inches="tight")
    plt.close()

def plot_spectral_proxy(mean_rgb_ref, mean_rgb_test, path, tr=None):
    if tr is None:
        tr = lambda k, d=None: (d if d else k.replace('_', ' ').title())
    wl = np.linspace(380, 700, 161)
    def gaussian(w, mu, sigma): return np.exp(-0.5*((w-mu)/sigma)**2)
    base_B = gaussian(wl, 450, 22)
    base_G = gaussian(wl, 545, 25)
    base_R = gaussian(wl, 610, 28)
    ref_curve = (mean_rgb_ref[0]*base_R + mean_rgb_ref[1]*base_G + mean_rgb_ref[2]*base_B)
    test_curve = (mean_rgb_test[0]*base_R + mean_rgb_test[1]*base_G + mean_rgb_test[2]*base_B)
    ref_curve /= (ref_curve.max() + 1e-8)
    test_curve /= (test_curve.max() + 1e-8)
    
    plt.figure(figsize=(7,3))
    plt.plot(wl, ref_curve, label=tr('fig_reference'), color="green")
    plt.plot(wl, test_curve, label=tr('fig_sample'), color="red", linestyle="--")
    plt.xlabel(tr('fig_wavelength'))
    plt.ylabel(tr('fig_relative_intensity'))
    plt.title(tr('fig_spectral_title'))
    plt.grid(True, alpha=0.3)
    plt.legend()
    save_fig(path)

def plot_rgb_histogram(img_bgr, path, title=None, tr=None):
    """Plot RGB histogram for a single image."""
    if tr is None:
        tr = lambda k, d=None: (d if d else k.replace('_', ' ').title())
    if title is None:
        title = tr('fig_rgb_histogram')
    fig, ax = plt.subplots(figsize=(5.5, 3.2))
    for i, (color, label) in enumerate(zip(['blue', 'green', 'red'], ['B', 'G', 'R'])):
        hist = cv2.calcHist([img_bgr], [i], None, [256], [0, 256]).flatten()
        ax.bar(range(256), hist, color=color, alpha=0.45, width=1.0, label=label)
    ax.set_xlabel(tr('fig_value'), fontsize=9)
    ax.set_ylabel(tr('fig_count'), fontsize=9)
    ax.set_title(title, fontsize=11, fontweight='bold')
    ax.legend(fontsize=8)
    ax.set_xlim([0, 255])
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches='tight')
    plt.close(fig)


def plot_rgb_histograms_dual(ref_bgr, sample_bgr, path, ref_title=None, sam_title=None, tr=None):
    """Plot side-by-side RGB histograms for Reference and Sample."""
    if tr is None:
        tr = lambda k, d=None: (d if d else k.replace('_', ' ').title())
    if ref_title is None:
        ref_title = tr('fig_ref_rgb_histogram')
    if sam_title is None:
        sam_title = tr('fig_sam_rgb_histogram')
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(10, 3.5))
    for ax, img, title in [(ax1, ref_bgr, ref_title), (ax2, sample_bgr, sam_title)]:
        for i, (color, label) in enumerate(zip(['blue', 'green', 'red'], ['B', 'G', 'R'])):
            hist = cv2.calcHist([img], [i], None, [256], [0, 256]).flatten()
            ax.bar(range(256), hist, color=color, alpha=0.45, width=1.0, label=label)
        ax.set_xlabel(tr('fig_value'), fontsize=9)
        ax.set_ylabel(tr('fig_count'), fontsize=9)
        ax.set_title(title, fontsize=10, fontweight='bold')
        ax.legend(fontsize=8)
        ax.set_xlim([0, 255])
    fig.tight_layout()
    fig.savefig(path, dpi=180, bbox_inches='tight')
    plt.close(fig)


def plot_heatmap(de_map, title, path, tr=None):
    if tr is None:
        tr = lambda k, d=None: (d if d else k.replace('_', ' ').title())
    if title is None:
        title = tr('fig_de_heatmap')
    vmax = np.percentile(de_map, 99)
    plt.figure(figsize=(6, 3))
    im = plt.imshow(de_map, cmap="inferno", vmin=0, vmax=max(vmax, 5.0))
    plt.title(title)
    plt.axis("off")
    plt.colorbar(im, fraction=0.046, pad=0.04)
    save_fig(path)

def plot_lab_scatter(reg_stats, path, ref_label=None, sam_label=None, title=None, tr=None):
    """a* vs b* scatter plot with reference and sample overlay."""
    if tr is None:
        tr = lambda k, d=None: (d if d else k.replace('_', ' ').title())
    if ref_label is None:
        ref_label = tr('fig_reference')
    if sam_label is None:
        sam_label = tr('fig_sample')
    if title is None:
        title = tr('lab_scatter_title')
    fig, ax = plt.subplots(figsize=(5, 4.2))
    ref_a = [s['ref']['lab'][1] for s in reg_stats]
    ref_b = [s['ref']['lab'][2] for s in reg_stats]
    sam_a = [s['sam']['lab'][1] for s in reg_stats]
    sam_b = [s['sam']['lab'][2] for s in reg_stats]
    ax.scatter(ref_a, ref_b, c='#2980B9', marker='o', s=60, label=ref_label, edgecolors='white', linewidths=0.6, zorder=3)
    ax.scatter(sam_a, sam_b, c='#E74C3C', marker='s', s=60, label=sam_label, edgecolors='white', linewidths=0.6, zorder=3)
    for i in range(len(reg_stats)):
        ax.annotate('', xy=(sam_a[i], sam_b[i]), xytext=(ref_a[i], ref_b[i]),
                     arrowprops=dict(arrowstyle='->', color='#95A5A6', lw=0.8))
    ax.axhline(0, color='#BDC3C7', lw=0.5, ls='--')
    ax.axvline(0, color='#BDC3C7', lw=0.5, ls='--')
    ax.set_xlabel(tr('fig_a_axis'))
    ax.set_ylabel(tr('fig_b_axis'))
    ax.set_title(title, fontsize=11, fontweight='bold')
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.2)
    save_fig(path)

def plot_lab_bars(reg_stats, path, ref_label=None, sam_label=None, title=None, tr=None):
    """Grouped bar chart comparing mean L*, a*, b* between reference and sample."""
    if tr is None:
        tr = lambda k, d=None: (d if d else k.replace('_', ' ').title())
    if ref_label is None:
        ref_label = tr('fig_reference')
    if sam_label is None:
        sam_label = tr('fig_sample')
    if title is None:
        title = tr('lab_components_mean')
    ref_L = np.mean([s['ref']['lab'][0] for s in reg_stats])
    ref_a = np.mean([s['ref']['lab'][1] for s in reg_stats])
    ref_b = np.mean([s['ref']['lab'][2] for s in reg_stats])
    sam_L = np.mean([s['sam']['lab'][0] for s in reg_stats])
    sam_a = np.mean([s['sam']['lab'][1] for s in reg_stats])
    sam_b = np.mean([s['sam']['lab'][2] for s in reg_stats])
    labels = ['L*', 'a*', 'b*']
    ref_vals = [ref_L, ref_a, ref_b]
    sam_vals = [sam_L, sam_a, sam_b]
    x = np.arange(len(labels))
    w = 0.32
    fig, ax = plt.subplots(figsize=(5, 3.2))
    ax.bar(x - w/2, ref_vals, w, label=ref_label, color='#2980B9', edgecolor='white', linewidth=0.5)
    ax.bar(x + w/2, sam_vals, w, label=sam_label, color='#E74C3C', edgecolor='white', linewidth=0.5)
    ax.set_xticks(x)
    ax.set_xticklabels(labels)
    ax.set_title(title, fontsize=11, fontweight='bold')
    ax.legend(fontsize=8)
    ax.grid(True, alpha=0.15, axis='y')
    save_fig(path)

def interpret_lab_diff(value, threshold, lang='en'):
    """Return interpretation text based on value vs threshold."""
    from .ReportTranslations import get_translator
    tr = get_translator(lang)
    if abs(value) < threshold * 0.25:
        return tr('negligible')
    elif abs(value) < threshold:
        return tr('noticeable')
    elif abs(value) < threshold * 2:
        return tr('significant')
    else:
        return tr('critical')

# =================================================================================================
# ANALYZE & GENERATE
# =================================================================================================

def analyze_color(ref_img_bgr, sample_img_bgr, config=None):
    cfg = config or DEFAULT_CONFIG
    h, w = ref_img_bgr.shape[:2]
    r = max(12, int(min(h, w) * 0.04))
    n_reg = cfg.get('region_count', 5)
    
    # Get Global Image Dimensions and Crop Offset if available
    # These MUST be passed from app.py to ensure global coordinate correctness
    global_w = cfg.get('original_width', w)
    global_h = cfg.get('original_height', h)
    crop_off_x = cfg.get('crop_offset_x', 0)
    crop_off_y = cfg.get('crop_offset_y', 0)
    
    region_geo = cfg.get('region_geometry', None)
    manual_points = cfg.get('sampling_points', [])
    sampling_mode = cfg.get('sampling_mode', 'random')
    points = []
    
    valid_provided_points = []
    for p in manual_points:
        px, py = 0, 0
        is_manual = True
        if isinstance(p, dict):
            px, py = int(p.get('x', 0)), int(p.get('y', 0))
            is_manual = p.get('isManual', True)
        elif isinstance(p, (list, tuple)) and len(p) >= 2:
             px, py = int(p[0]), int(p[1])
             
        if is_point_valid(px, py, region_geo, global_w, global_h):
            valid_provided_points.append((px, py, is_manual))
        else:
            print(f"WARNING: Invalid manual point rejected: {px}, {py}")

    if sampling_mode == 'manual':
        if len(valid_provided_points) != n_reg:
            print(f"CRITICAL: Manual mode point count mismatch. Expected {n_reg}, got {len(valid_provided_points)} valid points.")
        
        points = valid_provided_points
        
    else:
        points = valid_provided_points
        needed = n_reg - len(points)
        
        if needed > 0:
             random_points = make_points_strict(region_geo, needed, global_w, global_h)
             points.extend([(px, py, False) for px, py in random_points])
    
    # Final check
    points = points[:n_reg]
    
    if len(points) == 0 and n_reg > 0:
         print("ERROR: No valid points for analysis.")
    
    if sample_img_bgr.shape != ref_img_bgr.shape:
        sample_img_bgr = cv2.resize(sample_img_bgr, (w, h))

    thresholds_cfg = cfg.get('thresholds', {})
    if not isinstance(thresholds_cfg, dict):
        thresholds_cfg = {}
    thresh_pass = float(cfg.get('color_threshold_pass', thresholds_cfg.get('pass', 2.0)))
    thresh_cond = float(cfg.get('color_threshold_conditional', thresholds_cfg.get('conditional', 5.0)))
    global_thresh = float(cfg.get('global_threshold_de', 5.0))
    
    reg_stats = []
    if points:
        for i, point_data in enumerate(points):
            # Handle both old format (px, py) and new format (px, py, isManual)
            if isinstance(point_data, tuple) and len(point_data) == 3:
                gx, gy, _ = point_data
            else:
                gx, gy = point_data[:2]
            # Transform Global to Local (Crop) Coordinates for pixel extraction
            lx = gx - crop_off_x
            ly = gy - crop_off_y
            
            # Clamp to cropped image bounds
            lx = max(0, min(w - 1, lx))
            ly = max(0, min(h - 1, ly))
            
            r_stat = region_stats(ref_img_bgr, lx, ly, r)
            s_stat = region_stats(sample_img_bgr, lx, ly, r)
            d76 = deltaE76(r_stat['lab'], s_stat['lab'])
            d94 = deltaE94(r_stat['lab'], s_stat['lab'])
            d00 = deltaE2000(r_stat['lab'], s_stat['lab'])
            
            status = "FAIL"
            if d00 < thresh_pass: status = "PASS"
            elif d00 <= thresh_cond: status = "CONDITIONAL"

            reg_stats.append({
                "id": i+1, 
                "pos": (gx, gy),
                "ref": r_stat, "sam": s_stat,
                "de76": d76, "de94": d94, "de00": d00,
                "status": status
            })

    if reg_stats:
        all_de00 = [x['de00'] for x in reg_stats]
        mean_de00 = np.mean(all_de00)
    else:
        mean_de00 = 0.0
    
    if mean_de00 < thresh_pass:
        overall_status = "PASS"
    elif mean_de00 <= global_thresh:
        overall_status = "CONDITIONAL"
    else:
        overall_status = "FAIL"
    
    csi_details = compute_csi_details(
        ref_img_bgr,
        sample_img_bgr,
        illuminant=cfg.get('primary_illuminant', 'D65')
    )
    csi_value = float(csi_details['value'])
    csi_pass_thr, csi_cond_thr, csi_legacy_thresholds = resolve_csi_thresholds(
        cfg, thresh_pass, thresh_cond
    )
    csi_status = resolve_deltae_status(csi_value, csi_pass_thr, csi_cond_thr)
    csi_details.update({
        'status': csi_status,
        'threshold_pass': float(csi_pass_thr),
        'threshold_conditional': float(csi_cond_thr),
        'legacy_threshold_migrated': bool(csi_legacy_thresholds),
    })
    color_averages = {
        'ref_lab': [float(v) for v in csi_details['ref_mean_lab']],
        'sam_lab': [float(v) for v in csi_details['sam_mean_lab']],
        'ref_rgb': [float(v) for v in csi_details['ref_mean_rgb255']],
        'sam_rgb': [float(v) for v in csi_details['sam_mean_rgb255']],
    }
     
    return {
        "reg_stats": reg_stats,
        "mean_de00": mean_de00,
        "overall_status": overall_status,
        "csi_value": csi_value,
        "csi_details": csi_details,
        "color_averages": color_averages,
        "r": r,
        "points": points, # Return GLOBAL points
        "modified_sample": sample_img_bgr,
        "config": cfg
    }

def _get_effective_bgr_pixels(img):
    if img is None or getattr(img, 'size', 0) == 0:
        return np.array([[0, 0, 0]], dtype=np.uint8)
    img_bgr = img[:, :, :3]
    pixels = img_bgr.reshape(-1, 3)
    if img.shape[2] == 4:
        valid_mask = img[:, :, 3].reshape(-1) > 0
        pixels = pixels[valid_mask]
    if len(pixels) == 0:
        pixels = np.array([[0, 0, 0]], dtype=np.uint8)
    return np.ascontiguousarray(pixels, dtype=np.uint8)

def _bgr_pixels_to_lab_std(pixels):
    lab = cv2.cvtColor(pixels.reshape(-1, 1, 3), cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
    lab[:, 0] = lab[:, 0] * 100.0 / 255.0
    lab[:, 1] = lab[:, 1] - 128.0
    lab[:, 2] = lab[:, 2] - 128.0
    return lab

def _bgr_pixels_to_lab(pixels, illuminant='D65'):
    pixels = np.ascontiguousarray(pixels, dtype=np.uint8)
    if pixels.shape[0] == 0:
        return np.zeros((0, 3), dtype=np.float32)
    rgb = pixels[:, ::-1].astype(np.float32)
    rgb01 = rgb / 255.0
    if illuminant in WHITE_POINTS and illuminant != 'D65':
        xyz = srgb_to_xyz(rgb01)
        xyz = adapt_to_illuminant(xyz, illuminant)
        return xyz_to_lab(xyz, WHITE_POINTS[illuminant]).astype(np.float32)
    return _bgr_pixels_to_lab_std(pixels)

def _prepare_paired_images(ref_img_bgr, sample_img_bgr):
    ref_aligned = ref_img_bgr
    sample_aligned = sample_img_bgr
    if sample_aligned.shape[:2] != ref_aligned.shape[:2]:
        sample_aligned = cv2.resize(
            sample_aligned,
            (ref_aligned.shape[1], ref_aligned.shape[0]),
            interpolation=cv2.INTER_LINEAR
        )
    return ref_aligned, sample_aligned

def _effective_pixel_mask(img):
    if img.ndim == 3 and img.shape[2] == 4:
        return img[:, :, 3] > 0
    return np.ones(img.shape[:2], dtype=bool)

def _get_paired_effective_bgr_pixels(ref_img_bgr, sample_img_bgr):
    ref_aligned, sample_aligned = _prepare_paired_images(ref_img_bgr, sample_img_bgr)
    paired_mask = _effective_pixel_mask(ref_aligned) & _effective_pixel_mask(sample_aligned)
    ref_pixels = np.ascontiguousarray(ref_aligned[:, :, :3][paired_mask], dtype=np.uint8)
    sample_pixels = np.ascontiguousarray(sample_aligned[:, :, :3][paired_mask], dtype=np.uint8)
    return ref_pixels, sample_pixels

def _deltaE2000_array(lab1, lab2, kL=1.0, kC=1.0, kH=1.0):
    lab1 = np.asarray(lab1, dtype=np.float32)
    lab2 = np.asarray(lab2, dtype=np.float32)
    if lab1.size == 0 or lab2.size == 0:
        return np.zeros((0,), dtype=np.float32)

    L1, a1, b1 = lab1[:, 0], lab1[:, 1], lab1[:, 2]
    L2, a2, b2 = lab2[:, 0], lab2[:, 1], lab2[:, 2]
    avgLp = (L1 + L2) / 2.0
    C1 = np.sqrt(a1 * a1 + b1 * b1)
    C2 = np.sqrt(a2 * a2 + b2 * b2)
    avgC = (C1 + C2) / 2.0
    G = 0.5 * (1.0 - np.sqrt((avgC ** 7) / ((avgC ** 7) + (25.0 ** 7))))

    a1p = (1.0 + G) * a1
    a2p = (1.0 + G) * a2
    C1p = np.sqrt(a1p * a1p + b1 * b1)
    C2p = np.sqrt(a2p * a2p + b2 * b2)
    avgCp = (C1p + C2p) / 2.0

    h1p = np.degrees(np.arctan2(b1, a1p)) % 360.0
    h2p = np.degrees(np.arctan2(b2, a2p)) % 360.0
    dLp = L2 - L1
    dCp = C2p - C1p
    dhp = h2p - h1p
    zero_chroma = (C1p * C2p) == 0
    dhp = np.where(zero_chroma, 0.0, dhp)
    dhp = np.where((~zero_chroma) & (np.abs(dhp) > 180.0) & (h2p <= h1p), dhp + 360.0, dhp)
    dhp = np.where((~zero_chroma) & (np.abs(dhp) > 180.0) & (h2p > h1p), dhp - 360.0, dhp)

    dHp = 2.0 * np.sqrt(C1p * C2p) * np.sin(np.radians(dhp) / 2.0)
    avgHp = np.where(zero_chroma, h1p + h2p, (h1p + h2p) / 2.0)
    avgHp = np.where((~zero_chroma) & (np.abs(h1p - h2p) > 180.0), (h1p + h2p + 360.0) / 2.0, avgHp)

    T = (
        1.0
        - 0.17 * np.cos(np.radians(avgHp - 30.0))
        + 0.24 * np.cos(np.radians(2.0 * avgHp))
        + 0.32 * np.cos(np.radians(3.0 * avgHp + 6.0))
        - 0.20 * np.cos(np.radians(4.0 * avgHp - 63.0))
    )
    dRo = 30.0 * np.exp(-((avgHp - 275.0) / 25.0) ** 2)
    RC = 2.0 * np.sqrt((avgCp ** 7) / ((avgCp ** 7) + (25.0 ** 7)))
    SL = 1.0 + (0.015 * (avgLp - 50.0) ** 2) / np.sqrt(20.0 + (avgLp - 50.0) ** 2)
    SC = 1.0 + 0.045 * avgCp
    SH = 1.0 + 0.015 * avgCp * T
    RT = -np.sin(np.radians(2.0 * dRo)) * RC

    dE = np.sqrt(
        (dLp / (kL * SL)) ** 2
        + (dCp / (kC * SC)) ** 2
        + (dHp / (kH * SH)) ** 2
        + RT * (dCp / (kC * SC)) * (dHp / (kH * SH))
    )
    return dE.astype(np.float32)

def compute_csi_details(ref_img_bgr, sample_img_bgr, illuminant='D65'):
    """
    CSI: full-image pixel-by-pixel Delta E2000 between the reference and sample images.
    The metric uses all valid overlapping pixels and is independent of sampling points.
    """
    ref_pixels, sample_pixels = _get_paired_effective_bgr_pixels(ref_img_bgr, sample_img_bgr)
    pixel_count = int(ref_pixels.shape[0])
    if pixel_count == 0:
        zero_lab = np.zeros(3, dtype=np.float32)
        zero_rgb = np.zeros(3, dtype=np.float32)
        return {
            'value': 0.0,
            'mean_de00': 0.0,
            'std_de00': 0.0,
            'min_de00': 0.0,
            'max_de00': 0.0,
            'pixel_count': 0,
            'ref_mean_lab': zero_lab,
            'sam_mean_lab': zero_lab,
            'ref_mean_rgb255': zero_rgb,
            'sam_mean_rgb255': zero_rgb,
            'illuminant': illuminant,
            'comparison_mode': 'full_image_pixelwise_deltae2000',
        }

    lab_ref = _bgr_pixels_to_lab(ref_pixels, illuminant=illuminant)
    lab_sam = _bgr_pixels_to_lab(sample_pixels, illuminant=illuminant)
    delta_e_values = _deltaE2000_array(lab_ref, lab_sam)
    return {
        'value': float(np.mean(delta_e_values)),
        'mean_de00': float(np.mean(delta_e_values)),
        'std_de00': float(np.std(delta_e_values)),
        'min_de00': float(np.min(delta_e_values)),
        'max_de00': float(np.max(delta_e_values)),
        'pixel_count': pixel_count,
        'ref_mean_lab': np.mean(lab_ref, axis=0).astype(np.float32),
        'sam_mean_lab': np.mean(lab_sam, axis=0).astype(np.float32),
        'ref_mean_rgb255': np.mean(ref_pixels[:, ::-1].astype(np.float32), axis=0).astype(np.float32),
        'sam_mean_rgb255': np.mean(sample_pixels[:, ::-1].astype(np.float32), axis=0).astype(np.float32),
        'illuminant': illuminant,
        'comparison_mode': 'full_image_pixelwise_deltae2000',
    }


def deltae_to_score(value):
    """Map a raw DeltaE-like metric to a 0..100 visualization score."""
    try:
        raw = float(value)
    except Exception:
        raw = 0.0
    return max(0.0, min(100.0, 100.0 - (raw * 10.0)))


def resolve_deltae_status(value, pass_thr, cond_thr):
    try:
        raw = float(value)
    except Exception:
        raw = 0.0
    if raw <= float(pass_thr):
        return "PASS"
    if raw <= float(cond_thr):
        return "CONDITIONAL"
    return "FAIL"


def resolve_csi_thresholds(cfg, fallback_pass=2.0, fallback_cond=5.0):
    """Resolve CSI thresholds in raw DeltaE units.

    Older project versions stored CSI as a similarity score (higher is better)
    using values such as 90/70. When such legacy settings are detected,
    automatically fall back to the color DeltaE thresholds.
    """
    cfg = cfg or {}
    csi_thresholds = cfg.get('csi_thresholds', {})
    if not isinstance(csi_thresholds, dict):
        csi_thresholds = {}

    pass_thr = float(cfg.get('csi_good', csi_thresholds.get('good', fallback_pass)))
    cond_thr = float(cfg.get('csi_warn', csi_thresholds.get('warn', fallback_cond)))

    legacy_mode = pass_thr > cond_thr
    if legacy_mode:
        return float(fallback_pass), float(fallback_cond), True
    return float(pass_thr), float(cond_thr), False

def generate_pdf_headless(ref_img_bgr, sample_img_bgr, analysis_data, out_path, config=None, temp_dir=None, report_id=None, timestamp=None):
    cfg = config or DEFAULT_CONFIG
    sections = cfg.get('sections', {})
    operator = cfg.get('operator', 'Unknown')
    tz_offset = cfg.get('timezone_offset', DEFAULT_TIMEZONE_OFFSET_HOURS)
    
    # Get crop offsets for coordinate conversion
    crop_off_x = cfg.get('crop_offset_x', 0)
    crop_off_y = cfg.get('crop_offset_y', 0)
    
    # Get report language and translator
    report_lang = cfg.get('report_lang', 'tr')
    tr = get_translator(report_lang)
    
    primary_ill = cfg.get('primary_illuminant', 'D65')
    test_illuminants = cfg.get('test_illuminants', ['D65'])
    if isinstance(test_illuminants, str): test_illuminants = [test_illuminants]

    ts = timestamp if timestamp else get_local_time(tz_offset)
    analysis_id = report_id if report_id else f"SPEC_{ts.strftime('%y%m%d_%H%M%S')}"

    # --- CSI from analysis_data (computed in analyze_color) ---
    csi_details = analysis_data.get('csi_details', {})
    csi_value = float(csi_details.get('value', analysis_data.get('csi_value', 0)))
    csi_pixel_count = int(csi_details.get('pixel_count', 0))
    color_pass_thr = float(cfg.get('color_threshold_pass', cfg.get('thresholds', {}).get('pass', 2.0)))
    color_cond_thr = float(cfg.get('color_threshold_conditional', cfg.get('thresholds', {}).get('conditional', 5.0)))
    csi_pass_thr, csi_cond_thr, _ = resolve_csi_thresholds(cfg, color_pass_thr, color_cond_thr)
    csi_status = str(csi_details.get('status') or resolve_deltae_status(csi_value, csi_pass_thr, csi_cond_thr))

    if csi_status == 'PASS':
        csi_color = GREEN
    elif csi_status == 'CONDITIONAL':
        csi_color = ORANGE
    else:
        csi_color = RED
    
    # Determine which scoring method the user selected
    scoring_method = cfg.get('color_scoring_method', 'delta_e')

    doc = SimpleDocTemplate(out_path, pagesize=A4, 
                            leftMargin=MARGIN_L, rightMargin=MARGIN_R, 
                            topMargin=MARGIN_T, bottomMargin=MARGIN_B)
    elements = []
    
    reg_stats = analysis_data['reg_stats']
    mean_de00 = analysis_data['mean_de00']
    overall_status = analysis_data['overall_status']
    de_score = deltae_to_score(mean_de00)
    r = analysis_data['r']
    points = analysis_data['points']
    
    # Pre-calc metrics
    if reg_stats:
        all_de76 = [x['de76'] for x in reg_stats]
        all_de94 = [x['de94'] for x in reg_stats]
        all_de00 = [x['de00'] for x in reg_stats]
        
        def get_stats_row(label, arr):
            return [label, f"{np.mean(arr):.2f}", f"{np.std(arr):.2f}", f"{np.min(arr):.2f}", f"{np.max(arr):.2f}", ""]
            
        stats_rows = [get_stats_row("ΔE76", all_de76), get_stats_row("ΔE94", all_de94)]
        row_00 = get_stats_row("ΔE00", all_de00)
        row_00[-1] = translate_status(overall_status, report_lang)
        stats_rows.append(row_00)
    else:
        stats_rows = [["ΔE76", "-", "-", "-", "-", ""], ["ΔE94", "-", "-", "-", "-", ""], ["ΔE00", "-", "-", "-", "-", translate_status(overall_status, report_lang)]]

    class ExecutiveSummaryHeader(Flowable):
        def __init__(self, status, width):
            super().__init__()
            self.status = status
            self.box_width = width
            self.box_height = 28
        def draw(self):
            self.canv.setFillColor(GREEN)
            self.canv.rect(0, 0, self.box_width, self.box_height, fill=1, stroke=0)
            self.canv.setFillColor(colors.white)
            self.canv.setFont(PDF_FONT_BOLD, 12)
            text = f"{tr('executive_summary')}: {translate_status(self.status, report_lang)}"
            self.canv.drawCentredString(self.box_width / 2, 9, text)
        def wrap(self, availW, availH):
            return (self.box_width, self.box_height)
            
    # COVER PAGE
    elements.append(Spacer(1, 0.5 * inch))
    logo_path = pick_logo()
    if logo_path:
        elements.append(RLImage(logo_path, width=2.0*inch, height=2.0*inch))
        elements.append(Spacer(1, 0.3*inch))

    elements.append(Paragraph(tr('color_report_title'), StyleTitle))
    elements.append(Spacer(1, 0.15*inch))
    elements.append(Paragraph(tr('cover_company'), StyleH2))
    elements.append(Spacer(1, 0.08*inch))
    
    subtitle_style = ParagraphStyle('ElegantSubtitle', parent=StyleSmall, fontSize=9, textColor=NEUTRAL, fontName=PDF_FONT_REGULAR, leading=12, alignment=TA_LEFT)
    elements.append(Paragraph(f"<i>{tr('cover_subtitle')}</i>", subtitle_style))
    elements.append(Spacer(1, 0.2*inch))
    elements.append(badge(f"{tr('primary_illuminant')}: {primary_ill}", back_color=BLUE1))
    elements.append(Spacer(1, 0.4*inch))

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
    ]))
    elements.append(meta_table)
    elements.append(Spacer(1, 0.4*inch))

    page_width = A4[0] - MARGIN_L - MARGIN_R
    
    # Determine cover status based on scoring method
    if scoring_method == 'csi':
        cover_status = csi_status
    elif scoring_method == 'csi2000':
        csi2000_val = (csi_value + mean_de00) / 2.0
        csi2000_pass_thr = (color_pass_thr + csi_pass_thr) / 2.0
        csi2000_cond_thr = (color_cond_thr + csi_cond_thr) / 2.0
        cover_status = resolve_deltae_status(csi2000_val, csi2000_pass_thr, csi2000_cond_thr)
    else:
        cover_status = overall_status
    
    if sections.get('exec_summary', True):
        elements.append(ExecutiveSummaryHeader(cover_status, page_width))
        elements.append(Spacer(1, 0.1*inch))
        
        # Primary score display based on scoring method
        secondary_style = ParagraphStyle('SecondaryScore', parent=StyleSmall, alignment=TA_CENTER, fontSize=9, spaceAfter=6)
        if scoring_method == 'csi':
            primary_style = ParagraphStyle('PrimaryScore', parent=styles['Heading2'], alignment=TA_CENTER, textColor=csi_color, fontSize=14, spaceAfter=4)
            elements.append(Paragraph(f"<b>{tr('color_similarity_index')}: {csi_value:.4f}</b>", primary_style))
            elements.append(Paragraph(f"{tr('pixels')}: {csi_pixel_count:,}", secondary_style))
            elements.append(Paragraph(f"ΔE00 {tr('average')}: {mean_de00:.2f}", secondary_style))
        elif scoring_method == 'csi2000':
            csi2000_val = (csi_value + mean_de00) / 2.0
            csi2000_color = GREEN if cover_status == 'PASS' else (ORANGE if cover_status == 'CONDITIONAL' else RED)
            primary_style = ParagraphStyle('PrimaryScore', parent=styles['Heading2'], alignment=TA_CENTER, textColor=csi2000_color, fontSize=14, spaceAfter=4)
            elements.append(Paragraph(f"<b>CSI2000: {csi2000_val:.4f}</b>", primary_style))
            elements.append(Paragraph(f"CSI: {csi_value:.4f} | {tr('pixels')}: {csi_pixel_count:,}", secondary_style))
            elements.append(Paragraph(f"ΔE00 {tr('average')}: {mean_de00:.2f}", secondary_style))
        else:
            de_color = GREEN if overall_status == 'PASS' else (ORANGE if overall_status == 'CONDITIONAL' else RED)
            primary_style = ParagraphStyle('PrimaryScore', parent=styles['Heading2'], alignment=TA_CENTER, textColor=de_color, fontSize=14, spaceAfter=4)
            elements.append(Paragraph(f"<b>ΔE00 {tr('average')}: {mean_de00:.2f}</b>", primary_style))
            elements.append(Paragraph(f"{tr('color_similarity_index')}: {csi_value:.4f} | {tr('pixels')}: {csi_pixel_count:,}", secondary_style))
        elements.append(Spacer(1, 0.15*inch))

    if sections.get('stats', True):
        stat_data = [[tr('metric'), tr('average'), tr('std_dev'), tr('minimum'), tr('maximum'), tr('status')]] + stats_rows
        t_stat = make_table(stat_data, colWidths=[1.2*inch, 1.0*inch, 1.0*inch, 1.0*inch, 1.0*inch, 1.5*inch])
        t_stat.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,0), NEUTRAL_L),
            ('BACKGROUND', (5,3), (5,3), STATUS_COLORS.get(overall_status, colors.black)),
            ('TEXTCOLOR', (5,3), (5,3), colors.white),
            ('FONTNAME', (5,3), (5,3), PDF_FONT_BOLD),
        ]))
        elements.append(t_stat)

    elements.append(PageBreak())
    
    # Images with overlay
    # CRITICAL: Convert global coordinates to local/cropped coordinates for visualization
    local_points = []
    for point_data in points:
        # Handle both old format (px, py) and new format (px, py, isManual)
        if isinstance(point_data, tuple) and len(point_data) == 3:
            gx, gy, is_manual = point_data
            # Convert to local coordinates
            lx = gx - crop_off_x
            ly = gy - crop_off_y
            local_points.append((lx, ly, is_manual))
        else:
            gx, gy = point_data[:2]
            lx = gx - crop_off_x
            ly = gy - crop_off_y
            local_points.append((lx, ly))
    
    if sections.get('visual_comparison', True):
        overlay_ref = overlay_circles(ref_img_bgr, local_points, r)
        overlay_sam = overlay_circles(sample_img_bgr, local_points, r)
        
        img_table_data = [
            [numpy_to_rl(overlay_ref, 3.2*inch, 2.5*inch), numpy_to_rl(overlay_sam, 3.2*inch, 2.5*inch)],
            [Paragraph(f"<b>{tr('reference')}</b>", StyleSmall), Paragraph(f"<b>{tr('sample')}</b>", StyleSmall)]
        ]
        t_imgs = Table(img_table_data, colWidths=[3.5*inch, 3.5*inch])
        t_imgs.setStyle(TableStyle([('ALIGN', (0,0), (-1,-1), 'CENTER')]))
        elements.append(KeepTogether([
            Paragraph(tr('visual_comparison'), StyleH1),
            t_imgs,
            Spacer(1, 0.2*inch),
        ]))
    
    # Regional Analysis
    if sections.get('color_spaces', True) and reg_stats:
        metrics_heading = Paragraph(tr('color_metrics'), StyleH1)
        metrics_heading_used = False
        
        if sections.get('rgb', True):
            rgb_data = [[tr('region'), tr('point'), f"{tr('reference')} R", f"{tr('sample')} R", f"{tr('reference')} G", f"{tr('sample')} G", f"{tr('reference')} B", f"{tr('sample')} B"]]
            for item in reg_stats:
                rr, rg, rb = item['ref']['rgb255']
                sr, sg, sb = item['sam']['rgb255']
                rgb_data.append([str(item['id']), str(item['pos']), f"{int(rr)}", f"{int(sr)}", f"{int(rg)}", f"{int(sg)}", f"{int(rb)}", f"{int(sb)}"])
            t_rgb = make_table(rgb_data, colWidths=[0.6*inch, 1.2*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch, 0.8*inch])
            t_rgb.setStyle(TableStyle([
                ('BACKGROUND', (2,1), (3,-1), BG_LIGHT_RED),
                ('BACKGROUND', (4,1), (5,-1), BG_LIGHT_GREEN),
                ('BACKGROUND', (6,1), (7,-1), BG_LIGHT_BLUE),
            ]))
            kt_items = []
            if not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(tr('rgb_values'), StyleH2),
                t_rgb,
                Spacer(1, 0.15*inch),
            ])
            elements.append(KeepTogether(kt_items))
        
        if sections.get('lab', True):
            # --- NEW: Full Lab* Color Space Analysis subsection ---
            lab_thresholds = cfg.get('lab_thresholds', {})
            thresh_dl = float(lab_thresholds.get('dl', 1.0))
            thresh_da = float(lab_thresholds.get('da', 1.0))
            thresh_db = float(lab_thresholds.get('db', 1.0))
            thresh_mag = float(lab_thresholds.get('magnitude', 2.0))

            # 1) Detailed Lab* Color Space Analysis table
            detail_header = [tr('component'), tr('reference'), tr('sample'), tr('difference'), tr('interpretation')]
            mean_ref_L = np.mean([s['ref']['lab'][0] for s in reg_stats])
            mean_ref_a = np.mean([s['ref']['lab'][1] for s in reg_stats])
            mean_ref_b = np.mean([s['ref']['lab'][2] for s in reg_stats])
            mean_sam_L = np.mean([s['sam']['lab'][0] for s in reg_stats])
            mean_sam_a = np.mean([s['sam']['lab'][1] for s in reg_stats])
            mean_sam_b = np.mean([s['sam']['lab'][2] for s in reg_stats])
            dL = mean_sam_L - mean_ref_L
            da = mean_sam_a - mean_ref_a
            db = mean_sam_b - mean_ref_b
            mag = math.sqrt(dL**2 + da**2 + db**2)

            detail_rows = [detail_header]
            detail_rows.append(["L* (" + tr('lightness') + ")", f"{mean_ref_L:.2f}", f"{mean_sam_L:.2f}", f"{dL:+.2f}", interpret_lab_diff(dL, thresh_dl, report_lang)])
            detail_rows.append(["a* (" + tr('red') + "/" + tr('green') + ")", f"{mean_ref_a:.2f}", f"{mean_sam_a:.2f}", f"{da:+.2f}", interpret_lab_diff(da, thresh_da, report_lang)])
            detail_rows.append(["b* (" + tr('blue') + "/" + tr('hue') + ")", f"{mean_ref_b:.2f}", f"{mean_sam_b:.2f}", f"{db:+.2f}", interpret_lab_diff(db, thresh_db, report_lang)])
            t_detail = make_table(detail_rows, colWidths=[1.5*inch, 1.2*inch, 1.2*inch, 1.0*inch, 1.5*inch])
            kt_items = []
            if not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(tr('lab_detailed_analysis'), StyleH2),
                t_detail,
                Spacer(1, 0.15*inch),
            ])
            elements.append(KeepTogether(kt_items))

            # 2) Quality Assessment (Lab* Thresholds)
            qa_header = [tr('parameter'), tr('threshold'), tr('actual_value'), tr('status')]
            dl_st = "PASS" if abs(dL) <= thresh_dl else "FAIL"
            da_st = "PASS" if abs(da) <= thresh_da else "FAIL"
            db_st = "PASS" if abs(db) <= thresh_db else "FAIL"
            mag_st = "PASS" if mag <= thresh_mag else "FAIL"
            qa_rows = [qa_header]
            qa_rows.append(["ΔL*", f"≤ {thresh_dl:.1f}", f"{abs(dL):.2f}", translate_status(dl_st, report_lang)])
            qa_rows.append(["Δa*", f"≤ {thresh_da:.1f}", f"{abs(da):.2f}", translate_status(da_st, report_lang)])
            qa_rows.append(["Δb*", f"≤ {thresh_db:.1f}", f"{abs(db):.2f}", translate_status(db_st, report_lang)])
            qa_rows.append([tr('overall_magnitude'), f"≤ {thresh_mag:.1f}", f"{mag:.2f}", translate_status(mag_st, report_lang)])
            t_qa = make_table(qa_rows, colWidths=[1.8*inch, 1.2*inch, 1.2*inch, 1.5*inch])
            qa_cmds = []
            for ri, row in enumerate(qa_rows[1:], 1):
                st_raw = "PASS" if row[3] in ("PASS", "GEÇTİ") else "FAIL"
                qa_cmds.append(('BACKGROUND', (3, ri), (3, ri), STATUS_COLORS.get(st_raw, RED)))
                qa_cmds.append(('TEXTCOLOR', (3, ri), (3, ri), colors.white))
                qa_cmds.append(('FONTNAME', (3, ri), (3, ri), PDF_FONT_BOLD))
            t_qa.setStyle(TableStyle(qa_cmds))
            elements.append(KeepTogether([
                Paragraph(tr('lab_quality_assessment'), StyleH2),
                t_qa,
                Spacer(1, 0.15*inch),
            ]))

            # 3) Lab* Recommendations
            all_pass = (dl_st == "PASS" and da_st == "PASS" and db_st == "PASS" and mag_st == "PASS")
            if all_pass:
                rec_text = tr('within_tight_tol')
            else:
                failed_params = []
                if dl_st == "FAIL": failed_params.append(f"ΔL* ({abs(dL):.2f} > {thresh_dl:.1f})")
                if da_st == "FAIL": failed_params.append(f"Δa* ({abs(da):.2f} > {thresh_da:.1f})")
                if db_st == "FAIL": failed_params.append(f"Δb* ({abs(db):.2f} > {thresh_db:.1f})")
                if mag_st == "FAIL": failed_params.append(f"{tr('overall_magnitude')} ({mag:.2f} > {thresh_mag:.1f})")
                rec_text = tr('lab_fail_prefix') + ", ".join(failed_params) + ". " + tr('lab_review_action')
            rec_color = GREEN if all_pass else RED
            elements.append(KeepTogether([
                Paragraph(tr('lab_recommendations'), StyleH2),
                Paragraph(rec_text, StyleBody),
                Spacer(1, 0.15*inch),
            ]))

            # 4) Lab* Visualizations (a*b* scatter + Lab components bar)
            if sections.get('visualizations', True):
                scatter_path = os.path.join(temp_dir, "lab_scatter.png")
                bar_path = os.path.join(temp_dir, "lab_bars.png")
                plot_lab_scatter(reg_stats, scatter_path, ref_label=tr('reference'), sam_label=tr('sample'), title=tr('lab_scatter_title'), tr=tr)
                plot_lab_bars(reg_stats, bar_path, ref_label=tr('reference'), sam_label=tr('sample'), title=tr('lab_components_mean'), tr=tr)
                elements.append(KeepTogether([
                    Paragraph(tr('lab_visualizations'), StyleH2),
                    RLImage(scatter_path, 4.5*inch, 3.5*inch),
                    Spacer(1, 0.1*inch),
                ]))
                elements.append(KeepTogether([
                    RLImage(bar_path, 4.5*inch, 2.8*inch),
                    Spacer(1, 0.15*inch),
                ]))

        if sections.get('xyz', True):
            xyz_data = [[tr('region'), f"{tr('reference')} X", f"{tr('reference')} Y", f"{tr('reference')} Z", f"{tr('sample')} X", f"{tr('sample')} Y", f"{tr('sample')} Z"]]
            for item in reg_stats:
                rx, ry, rz = item['ref']['xyz']
                sx, sy, sz = item['sam']['xyz']
                xyz_data.append([str(item['id']), f"{rx:.2f}", f"{ry:.2f}", f"{rz:.2f}", f"{sx:.2f}", f"{sy:.2f}", f"{sz:.2f}"])
            kt_items = []
            if not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(tr('xyz_values'), StyleH2),
                make_table(xyz_data, colWidths=[0.8*inch]+[1.0*inch]*6),
                Spacer(1, 0.15*inch),
            ])
            elements.append(KeepTogether(kt_items))
        
        if sections.get('cmyk', True):
            cmyk_data = [[tr('region'), f"{tr('reference')} C", f"{tr('reference')} M", f"{tr('reference')} Y", f"{tr('reference')} K", f"{tr('sample')} C", f"{tr('sample')} M", f"{tr('sample')} Y", f"{tr('sample')} K"]]
            for item in reg_stats:
                rc, rm, ry, rk = item['ref']['cmyk'] * 100
                sc, sm, sy, sk = item['sam']['cmyk'] * 100
                cmyk_data.append([str(item['id']), f"{rc:.1f}", f"{rm:.1f}", f"{ry:.1f}", f"{rk:.1f}", f"{sc:.1f}", f"{sm:.1f}", f"{sy:.1f}", f"{sk:.1f}"])
            kt_items = []
            if not metrics_heading_used:
                kt_items.append(metrics_heading)
                metrics_heading_used = True
            kt_items.extend([
                Paragraph(tr('cmyk_values'), StyleH2),
                make_table(cmyk_data, colWidths=[0.6*inch]+[0.8*inch]*8),
                Spacer(1, 0.2*inch),
            ])
            elements.append(KeepTogether(kt_items))
    
    # Comparison Metrics
    if sections.get('diff_metrics', True) and reg_stats:
        de_data = [[tr('region'), "ΔE76", "ΔE94", "ΔE00", tr('status')]]
        for item in reg_stats:
            de_data.append([str(item['id']), f"{item['de76']:.2f}", f"{item['de94']:.2f}", f"{item['de00']:.2f}", translate_status(item['status'], report_lang)])
        t_de = make_table(de_data, colWidths=[1.0*inch, 1.5*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        cmds = []
        for i, item in enumerate(reg_stats, 1):
            cmds.append(('BACKGROUND', (4,i), (4,i), STATUS_COLORS.get(item['status'], colors.black)))
            cmds.append(('TEXTCOLOR', (4,i), (4,i), colors.white))
        t_de.setStyle(TableStyle(cmds))
        elements.append(KeepTogether([
            Paragraph(tr('diff_metrics'), StyleH1),
            t_de,
            Spacer(1, 0.2*inch),
        ]))
        
        # ΔE Summary Statistics — immediately after Difference Metrics
        if reg_stats:
            de_sum_header = [tr('metric'), tr('average'), tr('std_dev'), tr('minimum'), tr('maximum'), tr('status')]
            de76_vals = [x['de76'] for x in reg_stats]
            de94_vals = [x['de94'] for x in reg_stats]
            de00_vals = [x['de00'] for x in reg_stats]
            de_sum_rows = [de_sum_header]
            de_sum_rows.append([tr('de_76_label'), f"{np.mean(de76_vals):.2f}", f"{np.std(de76_vals):.2f}", f"{np.min(de76_vals):.2f}", f"{np.max(de76_vals):.2f}", tr('informational')])
            de_sum_rows.append([tr('de_94_label'), f"{np.mean(de94_vals):.2f}", f"{np.std(de94_vals):.2f}", f"{np.min(de94_vals):.2f}", f"{np.max(de94_vals):.2f}", tr('informational')])
            de00_status = translate_status(overall_status, report_lang)
            de_sum_rows.append([tr('de_2000_label'), f"{np.mean(de00_vals):.2f}", f"{np.std(de00_vals):.2f}", f"{np.min(de00_vals):.2f}", f"{np.max(de00_vals):.2f}", de00_status])
            t_de_sum = make_table(de_sum_rows, colWidths=[1.5*inch, 0.9*inch, 0.9*inch, 0.9*inch, 0.9*inch, 1.2*inch])
            de_sum_cmds = [
                ('BACKGROUND', (5, 3), (5, 3), STATUS_COLORS.get(overall_status, colors.black)),
                ('TEXTCOLOR', (5, 3), (5, 3), colors.white),
                ('FONTNAME', (5, 3), (5, 3), PDF_FONT_BOLD),
            ]
            t_de_sum.setStyle(TableStyle(de_sum_cmds))
            elements.append(KeepTogether([
                Paragraph(tr('de_summary_statistics'), StyleH2),
                Paragraph(f"{tr('decision_metric')}: ΔE00", StyleSmall),
                t_de_sum,
                Spacer(1, 0.2*inch),
            ]))
    
    # Illuminant-Based Color Analysis
    if sections.get('illuminant_analysis', True) and reg_stats:
        ill_data = [[tr('illuminant'), f"{tr('average')} ΔE00", tr('csi'), tr('status')]]
        
        for ill in test_illuminants:
            ill_key = ill.strip()
            if ill_key not in WHITE_POINTS: continue
            
            if ill_key == primary_ill:
                # Use the canonical values from the main analysis
                mean_ill_de = float(mean_de00)
            else:
                # Chromatic adaptation for non-primary illuminants
                ill_de_values = []
                
                for item in reg_stats:
                    ref_xyz_d65 = item['ref']['xyz']
                    ref_xyz_tgt = adapt_to_illuminant(ref_xyz_d65, ill_key)
                    ref_lab_tgt = xyz_to_lab(ref_xyz_tgt, WHITE_POINTS[ill_key])
                    
                    sam_xyz_d65 = item['sam']['xyz']
                    sam_xyz_tgt = adapt_to_illuminant(sam_xyz_d65, ill_key)
                    sam_lab_tgt = xyz_to_lab(sam_xyz_tgt, WHITE_POINTS[ill_key])
                    
                    d00 = deltaE2000(ref_lab_tgt, sam_lab_tgt)
                    ill_de_values.append(d00)
                    
                mean_ill_de = np.mean(ill_de_values) if ill_de_values else 0.0
            if ill_key == primary_ill:
                ill_csi = float(csi_value)
            else:
                ill_csi = float(compute_csi_details(ref_img_bgr, sample_img_bgr, illuminant=ill_key)['value'])

            status = resolve_deltae_status(ill_csi, csi_pass_thr, csi_cond_thr)
            
            ill_data.append([ill_key, f"{mean_ill_de:.2f}", f"{ill_csi:.4f}", translate_status(status, report_lang)])
            
        t_ill = make_table(ill_data, colWidths=[1.4*inch, 1.7*inch, 1.6*inch, 1.3*inch])
        
        # Add dynamic styling for status column
        ill_table_styles = [
            ('BACKGROUND', (0,0), (-1,0), BLUE2),
            ('TEXTCOLOR', (0,0), (-1,0), colors.white),
            ('FONTNAME', (0,0), (-1,0), PDF_FONT_BOLD),
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('GRID', (0,0), (-1,-1), 0.4, NEUTRAL_L),
        ]
        
        for r_idx, row in enumerate(ill_data):
            if r_idx == 0: continue
            stat = resolve_deltae_status(float(row[2]), csi_pass_thr, csi_cond_thr)
            color = STATUS_COLORS.get(stat, colors.black)
            ill_table_styles.append(('TEXTCOLOR', (3, r_idx), (3, r_idx), color))
            if stat == "PASS": ill_table_styles.append(('FONTNAME', (3, r_idx), (3, r_idx), PDF_FONT_BOLD))
            
        t_ill.setStyle(TableStyle(ill_table_styles))
        elements.append(KeepTogether([
            Spacer(1, 0.3*inch),
            Paragraph(tr('illuminant_analysis'), StyleH1),
            Spacer(1, 0.1*inch),
            t_ill,
            Spacer(1, 0.3*inch),
        ]))

    # Visualizations
    if sections.get('visualizations', True):
        elements.append(Spacer(1, 0.3*inch))
        viz_heading = Paragraph(tr('visualizations'), StyleH1)
        viz_heading_used = False
        
        if sections.get('spectral', True) and reg_stats:
            spectral_desc = 'Grafik, RGB ortalamalarından spektral davranışı yaklaşık olarak göstermektedir.' if report_lang == 'tr' else 'The chart approximates spectral behavior from RGB averages.'
            spec_path = os.path.join(temp_dir, "spec.png")
            mean_rgb_ref = np.mean([x['ref']['rgb01'] for x in reg_stats], axis=0)
            mean_rgb_sam = np.mean([x['sam']['rgb01'] for x in reg_stats], axis=0)
            plot_spectral_proxy(mean_rgb_ref, mean_rgb_sam, spec_path, tr=tr)
            kt_items = []
            if not viz_heading_used:
                kt_items.append(viz_heading)
                viz_heading_used = True
            kt_items.extend([
                Paragraph(tr('spectral_analysis') + " (" + tr('spectral_proxy') + ")", StyleH2),
                Paragraph(spectral_desc, StyleSmall),
                RLImage(spec_path, 6*inch, 2.6*inch),
                Spacer(1, 0.2*inch),
            ])
            elements.append(KeepTogether(kt_items))
        
        if sections.get('histograms', True):
            hist_path = os.path.join(temp_dir, "hist_dual.png")
            plot_rgb_histograms_dual(ref_img_bgr, sample_img_bgr, hist_path, tr=tr)
            hist_interp = tr('histogram_interpretation')
            kt_items = []
            if not viz_heading_used:
                kt_items.append(viz_heading)
                viz_heading_used = True
            kt_items.extend([
                Paragraph(tr('histograms_title'), StyleH2),
                RLImage(hist_path, 6.5*inch, 2.5*inch),
                Spacer(1, 0.1*inch),
                Paragraph(f"<i>{hist_interp}</i>", StyleSmall),
                Spacer(1, 0.2*inch),
            ])
            elements.append(KeepTogether(kt_items))

        if sections.get('visual_diff', True):
            # Compute per-pixel ΔE map from ref and sample
            ref_lab_full = cv2.cvtColor(ref_img_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
            sam_lab_full = cv2.cvtColor(sample_img_bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
            diff_map = np.sqrt(np.sum((ref_lab_full - sam_lab_full) ** 2, axis=2))
            heatmap_path = os.path.join(temp_dir, "hm.png")
            plot_heatmap(diff_map, tr('fig_de_heatmap'), heatmap_path, tr=tr)
            kt_items = []
            if not viz_heading_used:
                kt_items.append(viz_heading)
                viz_heading_used = True
            kt_items.extend([
                Paragraph(tr('visual_diff') + " " + tr('analysis'), StyleH2),
                RLImage(heatmap_path, 6*inch, 3*inch),
                Spacer(1, 0.5*inch),
            ])
            elements.append(KeepTogether(kt_items))
        
        if not viz_heading_used:
            elements.append(viz_heading)
            


    # Analysis Insights & Recommendations (via RecommendationsEngine)
    if sections.get('recommendations_color', True):
        from modules.RecommendationsEngine import generate_color_recommendations, render_findings_to_flowables
        elements.append(Spacer(1, 0.3*inch))

        pass_thr = float(cfg.get('color_threshold_pass', cfg.get('thresholds', {}).get('pass', 2.0)))
        cond_thr = float(cfg.get('color_threshold_conditional', cfg.get('thresholds', {}).get('conditional', 5.0)))

        findings, conclusion_text, conclusion_status = generate_color_recommendations(
            mean_de00=mean_de00,
            reg_stats=reg_stats,
            csi_value=csi_value,
            pass_thr=pass_thr,
            cond_thr=cond_thr,
            csi_good_thr=csi_pass_thr,
            csi_warn_thr=csi_cond_thr,
            lang=report_lang
        )

        rec_title = 'Temel Bulgular ve Öneriler' if report_lang == 'tr' else 'Key Findings & Recommendations'
        rec_flowables = render_findings_to_flowables(
            findings, conclusion_text, conclusion_status, rec_title, lang=report_lang
        )
        elements.extend(rec_flowables)


    doc.build(elements, onFirstPage=make_header_footer(ts, report_lang), onLaterPages=make_header_footer(ts, report_lang))
    return out_path

# =================================================================================================
# MAIN ENTRY POINT
# =================================================================================================

def analyze_and_generate(ref_image, sample_image, config, output_path, report_id=None, timestamp=None):
    """
    Main function to run the full Color analysis pipeline.
    ref_image, sample_image: numpy arrays (BGR)
    config: configuration dictionary
    output_path: path to save the PDF
    """
    import tempfile
    
    # Ensure images are valid arrays
    if ref_image is None or sample_image is None:
        raise ValueError("Invalid image inputs")
        
    # Analyze
    analysis_data = analyze_color(ref_image, sample_image, config)
    
    # Generate PDF (using temporary dir for assets)
    with tempfile.TemporaryDirectory() as temp_dir:
        generate_pdf_headless(ref_image, analysis_data['modified_sample'], analysis_data, output_path, config, temp_dir, report_id=report_id, timestamp=timestamp)
        
    return output_path, analysis_data
