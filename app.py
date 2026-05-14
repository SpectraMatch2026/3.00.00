"""SpectraMatch web app (Flask).

JPaaS often runs behind Apache/mod_wsgi with relatively strict startup timeouts.
Importing heavy native packages (opencv/numpy/reportlab) at module import time can
delay the first request and trigger: "Timeout when reading response headers".

To keep the WSGI import fast, we *lazy-import* heavy dependencies inside the
request handler(s).
"""

from flask import Flask, render_template, request, send_file, jsonify, redirect, abort
import os
import time
import threading

import json
import uuid
import tempfile
from datetime import datetime, timedelta

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DESKTOP_INSTALLER_NAME = 'SpectraMatch_Setup_3.0.0.exe'
DEFAULT_DESKTOP_INSTALLER_URL = (
    f'https://github.com/SpectraMatch2026/3.0.0/raw/main/static/downloads/{DESKTOP_INSTALLER_NAME}'
)
LOCAL_DESKTOP_INSTALLER_PATHS = (
    os.path.join(PROJECT_ROOT, 'static', 'downloads', DESKTOP_INSTALLER_NAME),
    os.path.join(PROJECT_ROOT, 'installer', 'output', DESKTOP_INSTALLER_NAME),
)

app = Flask(__name__, static_folder='static', template_folder='templates')

def _sanitize_for_json(obj):
    """Recursively convert numpy types to native Python types for JSON serialization."""
    import numpy as np
    if isinstance(obj, dict):
        return {k: _sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, (list, tuple)):
        return [_sanitize_for_json(v) for v in obj]
    elif isinstance(obj, (np.bool_,)):
        return bool(obj)
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

UPLOAD_FOLDER = os.path.join(tempfile.gettempdir(), 'textile_qc_uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Set max upload size to 100MB to avoid generic connection resets on huge files
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

# Temp file cleanup configuration
TEMP_FILE_MAX_AGE_HOURS = 24  # Delete files older than 24 hours
CLEANUP_INTERVAL_SECONDS = 3600  # Run cleanup every hour

def cleanup_old_temp_files():
    """Remove temporary files older than TEMP_FILE_MAX_AGE_HOURS."""
    try:
        now = time.time()
        max_age_seconds = TEMP_FILE_MAX_AGE_HOURS * 3600
        
        for filename in os.listdir(UPLOAD_FOLDER):
            filepath = os.path.join(UPLOAD_FOLDER, filename)
            if os.path.isfile(filepath):
                file_age = now - os.path.getmtime(filepath)
                if file_age > max_age_seconds:
                    try:
                        os.remove(filepath)
                        print(f"Cleaned up old temp file: {filename}")
                    except Exception as e:
                        print(f"Error removing temp file {filename}: {e}")
    except Exception as e:
        print(f"Error during temp file cleanup: {e}")

def start_cleanup_scheduler():
    """Start a background thread for periodic cleanup."""
    def cleanup_loop():
        while True:
            time.sleep(CLEANUP_INTERVAL_SECONDS)
            cleanup_old_temp_files()
    
    cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
    cleanup_thread.start()

cleanup_old_temp_files()
start_cleanup_scheduler()


def _find_local_desktop_installer():
    for installer_path in LOCAL_DESKTOP_INSTALLER_PATHS:
        if os.path.isfile(installer_path):
            return installer_path
    return None

def crop_image(image, region_data):
    """
    Crop the image based on region data (x, y, width, height, type).
    If type is circle, mask out the area outside the circle.
    If type is rect/square, we still ensure the area is cleanly cropped.
    """
    if not region_data or region_data.get('type') == 'full':
        return image
        
    try:
        # Lazy imports (keeps WSGI startup fast)
        import cv2
        import numpy as np

        x = int(float(region_data['x']))
        y = int(float(region_data['y']))
        w = int(float(region_data['width']))
        h = int(float(region_data['height']))
        rtype = region_data.get('type', 'rect')
        
        # Ensure bounds
        img_h, img_w = image.shape[:2]
        
        # Clip coordinates to image boundaries
        x = max(0, min(x, img_w))
        y = max(0, min(y, img_h))
        
        # Adjust width/height if they extend beyond image
        w = min(w, img_w - x)
        h = min(h, img_h - y)
        
        if w <= 0 or h <= 0: return image
        
        cropped = image[y:y+h, x:x+w]
        
        # Add Alpha Channel (BGRA)
        if cropped.shape[2] == 3:
            b, g, r = cv2.split(cropped)
            alpha = np.full((h, w), 255, dtype=np.uint8)
            cropped_bgra = cv2.merge([b, g, r, alpha])
        else:
            cropped_bgra = cropped

        # Strict masking for ALL non-full types
        if rtype == 'circle':
            # Create circular mask for Alpha
            mask = np.zeros((h, w), dtype=np.uint8)
            cx, cy = w // 2, h // 2
            radius = min(w, h) // 2
            cv2.circle(mask, (cx, cy), radius, 255, -1)
            
            # Update Alpha channel
            cropped_bgra[:, :, 3] = cv2.bitwise_and(cropped_bgra[:, :, 3], mask)
            
            # Zero out RGB where Alpha is 0
            b, g, r, a = cv2.split(cropped_bgra)
            b = cv2.bitwise_and(b, b, mask=mask)
            g = cv2.bitwise_and(g, g, mask=mask)
            r = cv2.bitwise_and(r, r, mask=mask)
            cropped_bgra = cv2.merge([b, g, r, a])
            
        return cropped_bgra
    except Exception as e:
        print(f"Error cropping: {e}")
        if image.shape[2] == 3:
            return cv2.cvtColor(image, cv2.COLOR_BGR2BGRA)
        return image

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/desktop')
def desktop_ui():
    return render_template('desktop.html')

@app.route('/download/desktop')
def download_desktop_installer():
    """Serve the Windows desktop installer (.exe).
    
    Priority order:
      1. Canonical local copy (static/downloads/SpectraMatch_Setup_3.0.0.exe)
      2. Legacy local build   (installer/output/SpectraMatch_Setup_3.0.0.exe)
      3. DESKTOP_INSTALLER_URL env-var override (if set)
      4. Default GitHub Release redirect
    """
    installer_path = _find_local_desktop_installer()

    if installer_path:
        return send_file(
            installer_path,
            as_attachment=True,
            download_name=DESKTOP_INSTALLER_NAME,
            mimetype='application/octet-stream'
        )

    release_url = os.environ.get('DESKTOP_INSTALLER_URL', DEFAULT_DESKTOP_INSTALLER_URL)
    return redirect(release_url)


@app.route("/datasheets")
@app.route("/datasheets/")
def datasheets_page():
    return render_template("datasheets.html")


@app.route("/datasheetEN.pdf")
def datasheet_en_root():
    path = os.path.join(app.static_folder, "DataSheets", "Datasheet_EN.pdf")
    if not os.path.isfile(path):
        abort(404)
    return send_file(path, mimetype="application/pdf")


@app.route("/datasheetTR.pdf")
def datasheet_tr_root():
    path = os.path.join(app.static_folder, "DataSheets", "Datasheet_TR.pdf")
    if not os.path.isfile(path):
        abort(404)
    return send_file(path, mimetype="application/pdf")


SAMPLE_REPORT_DIR = os.path.join(PROJECT_ROOT, "ThesisReprots PDFs")
SAMPLE_REPORT_FILES = {
    "Full_Report.pdf": {
        "slug": "fullreport",
        "download": "Full_Report.pdf",
        "title_en": "Full report",
        "title_tr": "Tam analiz raporu",
        "meta": "SpectraMatch full PDF report with sample output.",
    },
    "Color_Report.pdf": {
        "slug": "colorreport",
        "download": "Color_Report.pdf",
        "title_en": "Color report",
        "title_tr": "Renk analiz raporu",
        "meta": "SpectraMatch color PDF report with sample output.",
    },
    "Pattern_Report.pdf": {
        "slug": "patternreport",
        "download": "Pattern_Report.pdf",
        "title_en": "Pattern report",
        "title_tr": "Desen analiz raporu",
        "meta": "SpectraMatch pattern PDF report with sample output.",
    },
    "Settings_Receipt.pdf": {
        "slug": "settingsreport",
        "download": "Settings_Receipt.pdf",
        "title_en": "Settings receipt",
        "title_tr": "Ayarlar ozeti",
        "meta": "SpectraMatch settings receipt PDF with sample output.",
    },
}


def _sample_report_path(filename):
    safe_name = os.path.basename(filename)
    if safe_name not in SAMPLE_REPORT_FILES:
        abort(404)
    path = os.path.join(SAMPLE_REPORT_DIR, safe_name)
    if not os.path.isfile(path):
        abort(404)
    return path


def _render_sample_report_viewer(filename):
    template_path = os.path.join(app.template_folder, "report_viewer.html")
    if not os.path.isfile(template_path):
        abort(404)
    spec = SAMPLE_REPORT_FILES[filename]
    with open(template_path, encoding="utf-8") as f:
        html = f.read()
    return (
        html.replace("__META_DESC__", spec["meta"])
        .replace("__TITLE_EN__", spec["title_en"])
        .replace("__TITLE_TR__", spec["title_tr"])
        .replace("__PDF_FILE__", filename)
        .replace("__DOWNLOAD_NAME__", spec["download"])
    )


@app.route("/reports")
@app.route("/reports/")
def reports_hub_page():
    return render_template("reports_hub.html")


@app.route("/fullreport")
@app.route("/fullreport/")
def full_report_viewer():
    return _render_sample_report_viewer("Full_Report.pdf")


@app.route("/colorreport")
@app.route("/colorreport/")
def color_report_viewer():
    return _render_sample_report_viewer("Color_Report.pdf")


@app.route("/patternreport")
@app.route("/patternreport/")
def pattern_report_viewer():
    return _render_sample_report_viewer("Pattern_Report.pdf")


@app.route("/settingsreport")
@app.route("/settingsreport/")
def settings_report_viewer():
    return _render_sample_report_viewer("Settings_Receipt.pdf")


@app.route("/Full_Report.pdf")
def sample_full_report_pdf():
    return send_file(_sample_report_path("Full_Report.pdf"), mimetype="application/pdf")


@app.route("/Color_Report.pdf")
def sample_color_report_pdf():
    return send_file(_sample_report_path("Color_Report.pdf"), mimetype="application/pdf")


@app.route("/Pattern_Report.pdf")
def sample_pattern_report_pdf():
    return send_file(_sample_report_path("Pattern_Report.pdf"), mimetype="application/pdf")


@app.route("/Settings_Receipt.pdf")
def sample_settings_receipt_pdf():
    return send_file(_sample_report_path("Settings_Receipt.pdf"), mimetype="application/pdf")


@app.route('/api/alignment/modes', methods=['GET'])
def alignment_modes():
    """Return available alignment mode metadata."""
    from modules.ImageAlignmentBackend import list_modes
    return jsonify({'modes': list_modes()})


@app.route('/api/alignment/preview', methods=['POST'])
def alignment_preview():
    """
    Test an alignment technique on uploaded images and return preview data.
    Does NOT save or affect analysis — purely for interactive testing.
    """
    ref_file = request.files.get('ref_image')
    sample_file = request.files.get('sample_image')
    mode = request.form.get('mode', 'direct')
    region_json = request.form.get('region_data', '{}')

    if not ref_file or not sample_file:
        return jsonify({'error': 'Both images are required'}), 400

    try:
        import cv2
        import numpy as np
        from modules.ImageAlignmentBackend import apply_alignment, generate_preview_images

        region_data = json.loads(region_json)

        ref_bytes = ref_file.read()
        ref_arr = np.frombuffer(ref_bytes, np.uint8)
        ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)

        sample_bytes = sample_file.read()
        sample_arr = np.frombuffer(sample_bytes, np.uint8)
        sample_img = cv2.imdecode(sample_arr, cv2.IMREAD_COLOR)

        if ref_img is None or sample_img is None:
            return jsonify({'error': 'Invalid image format'}), 400

        # Apply region crop if provided
        ref_proc = crop_image(ref_img, region_data) if region_data and region_data.get('type') != 'full' and region_data.get('use_crop') else ref_img
        sam_proc = crop_image(sample_img, region_data) if region_data and region_data.get('type') != 'full' and region_data.get('use_crop') else sample_img

        # Run alignment
        result = apply_alignment(ref_proc, sam_proc, mode=mode, region_data=region_data)

        # Generate preview images (base64)
        previews = generate_preview_images(ref_proc, sam_proc, result)

        return jsonify({
            'success': True,
            'mode': mode,
            'metrics': _sanitize_for_json(result.get('metrics', {})),
            'previews': previews,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/alignment/processing-report', methods=['POST'])
def alignment_processing_report():
    """
    Generate a Calibration PDF report, save it to UPLOAD_FOLDER,
    and return JSON with a download URL (same pattern as other reports).
    This ensures pywebview's native save_report bridge can fetch it.
    """
    ref_file = request.files.get('ref_image')
    sample_file = request.files.get('sample_image')
    tested_json = request.form.get('tested_techniques', '{}')
    preview_json = request.form.get('preview_images', '{}')
    saved_technique = request.form.get('saved_technique', 'direct')
    region_json = request.form.get('region_data', '{}')
    report_lang = request.form.get('report_lang', 'tr')

    try:
        import cv2
        import numpy as np
        from modules.ProcessingReportBackend import generate_processing_report

        tested_techniques = json.loads(tested_json)
        preview_images = json.loads(preview_json)
        region_data = json.loads(region_json)

        # Load images for thumbnails
        ref_img = None
        sample_img = None
        if ref_file:
            ref_bytes = ref_file.read()
            ref_arr = np.frombuffer(ref_bytes, np.uint8)
            ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)
        if sample_file:
            sample_bytes = sample_file.read()
            sample_arr = np.frombuffer(sample_bytes, np.uint8)
            sample_img = cv2.imdecode(sample_arr, cv2.IMREAD_COLOR)

        # Generate with a unique session ID, saved to UPLOAD_FOLDER
        cal_session = 'cal_' + str(uuid.uuid4())
        ts_str = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        cal_filename = f'SpectraMatch_Calibration_Report_{ts_str}.pdf'
        output_path = os.path.join(UPLOAD_FOLDER, f'{cal_session}_calibration.pdf')

        generate_processing_report(
            output_path=output_path,
            tested_techniques=tested_techniques,
            saved_technique=saved_technique,
            ref_img=ref_img,
            sample_img=sample_img,
            region_data=region_data,
            report_lang=report_lang,
            timezone_offset=3,
            preview_images=preview_images,
        )

        download_url = f'/api/download_report/calibration/{cal_session}?fn={cal_filename}'

        return jsonify({
            'success': True,
            'download_url': download_url,
            'filename': cal_filename,
            'session_id': cal_session,
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/download_report/calibration/<session_id>', methods=['GET'])
def download_calibration_report(session_id):
    """Serve a previously generated calibration report PDF."""
    safe_id = os.path.basename(session_id)
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{safe_id}_calibration.pdf")
    if os.path.exists(pdf_path):
        fn = request.args.get('fn', f"SpectraMatch_Calibration_Report_{safe_id}.pdf")
        return send_file(pdf_path, as_attachment=True, download_name=fn)
    return jsonify({'error': 'Calibration report not found'}), 404


@app.route('/api/analyze', methods=['POST'])
def analyze():
    ref_file = request.files.get('ref_image')
    sample_file = request.files.get('sample_image')
    settings_json = request.form.get('settings', '{}')
    region_json = request.form.get('region_data', '{}')
    
    single_image_mode = request.form.get('single_image_mode') == 'true'
    
    if single_image_mode:
        if not sample_file:
            return jsonify({'error': 'Missing sample image'}), 400
    else:
        if not ref_file or not sample_file:
            return jsonify({'error': 'Missing images'}), 400
        
    try:
        settings = json.loads(settings_json)
        region_data = json.loads(region_json)
    except:
        return jsonify({'error': 'Invalid JSON data'}), 400
    
    try:
        import cv2
        import numpy as np
        from pypdf import PdfWriter
        from modules import ColorUnitBackend, PatternUnitBackend, SettingsReceipt, SingleImageUnitBackend

        sample_bytes = sample_file.read()
        sample_arr = np.frombuffer(sample_bytes, np.uint8)
        sample_img = cv2.imdecode(sample_arr, cv2.IMREAD_COLOR)
        
        ref_img = None
        if not single_image_mode:
            ref_bytes = ref_file.read()
            ref_arr = np.frombuffer(ref_bytes, np.uint8)
            ref_img = cv2.imdecode(ref_arr, cv2.IMREAD_COLOR)
        
        if sample_img is None:
            return jsonify({'error': 'Invalid sample image format'}), 400
            
        if not single_image_mode and ref_img is None:
             return jsonify({'error': 'Invalid reference image format'}), 400
            
        # Get dimensions for validation and offset calculation
        if single_image_mode:
            img_h, img_w = sample_img.shape[:2]
        else:
            img_h, img_w = ref_img.shape[:2]
        
        # Calculate Crop Offset and Geometry for strict backend validation
        # Replicate crop_image logic to get exact offset
        crop_offset_x = 0
        crop_offset_y = 0
        region_geometry = None
        
        if region_data and region_data.get('type') != 'full' and region_data.get('use_crop'):
            try:
                rx = int(float(region_data.get('x', 0)))
                ry = int(float(region_data.get('y', 0)))
                rw = int(float(region_data.get('width', img_w)))
                rh = int(float(region_data.get('height', img_h)))
                rtype = region_data.get('type', 'rect')
                
                # Bounds clamping (matches crop_image)
                x_clamped = max(0, min(rx, img_w))
                y_clamped = max(0, min(ry, img_h))
                
                crop_offset_x = x_clamped
                crop_offset_y = y_clamped
                
                # Construct strict geometry for backend
                # Note: region_data x,y is always top-left of the bounding box
                if rtype == 'circle':
                    # Circle: center and radius from bounding box
                    cx = rx + rw // 2
                    cy = ry + rh // 2
                    r = min(rw, rh) // 2
                    region_geometry = {'type': 'circle', 'cx': cx, 'cy': cy, 'r': r}
                else:
                    region_geometry = {'type': 'rect', 'x': rx, 'y': ry, 'w': rw, 'h': rh}
                    
            except Exception as e:
                print(f"Error calculating region geometry: {e}")
        
        # Inject into settings
        settings['original_width'] = img_w
        settings['original_height'] = img_h
        settings['crop_offset_x'] = crop_offset_x
        settings['crop_offset_y'] = crop_offset_y
        settings['region_geometry'] = region_geometry
    
        # Pre-process / Crop
        sample_img_proc = crop_image(sample_img, region_data)
        ref_img_proc = None
        if not single_image_mode:
            ref_img_proc = crop_image(ref_img, region_data)
            ref_img_receipt_base = ref_img_proc.copy()
            sample_img_receipt_base = sample_img_proc.copy()
        else:
            ref_img_receipt_base = None
            sample_img_receipt_base = sample_img_proc.copy()
        
        # Image alignment preprocessing
        alignment_mode = settings.get('alignment_mode', 'direct')
        alignment_metrics = {'applied': False, 'method': 'direct'}
        if not single_image_mode and alignment_mode != 'direct':
            try:
                from modules.ImageAlignmentBackend import apply_alignment
                align_result = apply_alignment(ref_img_proc, sample_img_proc,
                                               mode=alignment_mode,
                                               region_data=region_data)
                if align_result['metrics'].get('applied', False):
                    sample_img_proc = align_result['aligned_sample']
                    if align_result.get('ref_cropped') is not None:
                        ref_img_proc = align_result['ref_cropped']
                    alignment_metrics = align_result['metrics']
                else:
                    alignment_metrics = align_result['metrics']
            except Exception as e:
                print(f"Alignment preprocessing error: {e}")
                import traceback
                traceback.print_exc()
        aligned_sample_receipt = sample_img_proc.copy() if (not single_image_mode and alignment_metrics.get('applied')) else None

        # Paths for temp PDFs
        session_id = str(uuid.uuid4())
        temp_dir = UPLOAD_FOLDER
        color_pdf = os.path.join(temp_dir, f"{session_id}_color.pdf")
        pattern_pdf = os.path.join(temp_dir, f"{session_id}_pattern.pdf")
        merged_pdf = os.path.join(temp_dir, f"{session_id}_report.pdf")
        
        try:
            tz_offset = float(settings.get('timezone_offset', 3))
        except:
            tz_offset = 3.0
            
        timestamp = datetime.utcnow() + timedelta(hours=tz_offset)
        analysis_id = f"SPEC_{timestamp.strftime('%y%m%d_%H%M%S')}"
        
        date_str = timestamp.strftime("%Y-%m-%d")
        time_str = timestamp.strftime("%H:%M:%S")
        
        # Language suffix for filenames (_TR or _EN)
        _rlang = settings.get('report_lang', 'tr')
        _lang_suffix = '_TR' if _rlang == 'tr' else '_EN'

        if single_image_mode:
            # --- Single Image Mode Pipeline ---
            # Use merged_pdf path for the single report
            SingleImageUnitBackend.analyze_and_generate(
                sample_img_proc, settings, merged_pdf, 
                report_id=analysis_id, timestamp=timestamp
            )
            
            # Settings Receipt
            receipt_pdf = os.path.join(temp_dir, f"{session_id}_receipt.pdf")
            from modules.ReportUtils import numpy_to_rl # Use shared
            from modules.ReportTranslations import get_translator
            
            rl_sample = numpy_to_rl(sample_img_proc, max_w=200, max_h=200)
            report_tr = get_translator(settings.get('report_lang', 'tr'))
            processed_imgs_for_receipt = [{'label': report_tr('sample_image'), 'image': rl_sample}]
            
            op_name = settings.get('operator', 'Operator')
            
            SettingsReceipt.generate_receipt(
                receipt_pdf, settings, processed_imgs_for_receipt,
                analysis_id, op_name, date_str, time_str,
                mode="single", software_version="3.0.0"
            )
            
            # Return JSON response with download URLs (consistent with two-image mode)
            size_mb = os.path.getsize(merged_pdf) / (1024 * 1024)
            
            # Generate visualization images for frontend display
            viz_urls = _save_single_image_visualizations(session_id, sample_img_proc, settings)
            
            return jsonify({
                'success': True,
                'decision': 'COMPLETE',
                'color_score': 0,
                'pattern_score': 0,
                'overall_score': 0,
                'pdf_url': f"/api/download_report/merged/{session_id}",
                'receipt_url': f"/api/download_receipt/{session_id}",
                'report_size': f"{size_mb:.2f} MB",
                'single_image_mode': True,
                'session_id': session_id,
                'report_id': analysis_id,
                'report_date': date_str,
                'report_time': time_str,
                'operator': settings.get('operator', 'Operator'),
                'images': viz_urls,
                'fn_full': f"{analysis_id}T{_lang_suffix}.pdf",
                'fn_receipt': f"{analysis_id}_AYARLAR{_lang_suffix}.pdf"
            })

        else:
            # --- Existing Two-Image Pipeline ---
            
            # 1. Color Analysis
            _, color_results = ColorUnitBackend.analyze_and_generate(ref_img_proc, sample_img_proc, settings, color_pdf, report_id=analysis_id, timestamp=timestamp)
            
            # 2. Pattern Analysis
            _, pattern_results = PatternUnitBackend.analyze_and_generate(ref_img_proc, sample_img_proc, settings, pattern_pdf, report_id=analysis_id, timestamp=timestamp, is_combined=True)
            
            
            # Keep individual PDFs for split download
            receipt_pdf = os.path.join(temp_dir, f"{session_id}_receipt.pdf")
            
            # Convert crops to RLImages for receipt
            from modules.ReportUtils import numpy_to_rl, generate_unified_cover
            from modules.ReportTranslations import get_translator, get_alignment_mode_label
            from pypdf import PdfReader
            
            report_lang = settings.get('report_lang', 'tr')
            report_tr = get_translator(report_lang)
            rl_ref = numpy_to_rl(ref_img_receipt_base, max_w=200, max_h=200)
            rl_sample_before = numpy_to_rl(sample_img_receipt_base, max_w=200, max_h=200)
            processed_imgs_for_receipt = [
                {'label': report_tr('reference_image'), 'image': rl_ref},
                {
                    'label': report_tr('sample_before_alignment') if alignment_metrics.get('applied') else report_tr('sample_image'),
                    'image': rl_sample_before,
                },
            ]
            if aligned_sample_receipt is not None:
                alignment_name = get_alignment_mode_label(alignment_mode, report_lang)
                rl_aligned_sample = numpy_to_rl(aligned_sample_receipt, max_w=200, max_h=200)
                processed_imgs_for_receipt.append({
                    'label': f"{report_tr('aligned_sample')} ({alignment_name})",
                    'image': rl_aligned_sample,
                    'compact': True,
                })
                settings['receipt_alignment_applied'] = True
                settings['receipt_alignment_name'] = alignment_name
            else:
                settings['receipt_alignment_applied'] = False
                settings['receipt_alignment_name'] = ''
            
            op_name = settings.get('operator', 'Operator')
            c_points = color_results.get('sampled_points', [])
            
            # Color score calculation
            color_scoring_method = settings.get('color_scoring_method', 'delta_e')
            mean_de = color_results.get('mean_de00', 0)
            csi_val = color_results.get('csi_value', 0)
            color_pass_thr = float(settings.get('color_threshold_pass', settings.get('thresholds', {}).get('pass', 2.0)))
            color_cond_thr = float(settings.get('color_threshold_conditional', settings.get('thresholds', {}).get('conditional', 5.0)))
            csi_thresholds = settings.get('csi_thresholds', {})
            if not isinstance(csi_thresholds, dict):
                csi_thresholds = {}
            csi_good_thr, csi_warn_thr, _ = ColorUnitBackend.resolve_csi_thresholds(
                settings, color_pass_thr, color_cond_thr
            )
            csi_status = str(
                color_results.get('csi_details', {}).get('status')
                or ColorUnitBackend.resolve_deltae_status(csi_val, csi_good_thr, csi_warn_thr)
            )
            color_score_format = 'raw_value'
            
            if color_scoring_method == 'csi':
                color_score = float(csi_val)
                color_score_visual_pct = ColorUnitBackend.deltae_to_score(csi_val)
                c_status = csi_status
                color_method_label = 'CSI'
            elif color_scoring_method == 'csi2000':
                color_score = float((float(csi_val) + float(mean_de)) / 2.0)
                csi2000_pass_thr = (color_pass_thr + csi_good_thr) / 2.0
                csi2000_cond_thr = (color_cond_thr + csi_warn_thr) / 2.0
                color_score_visual_pct = ColorUnitBackend.deltae_to_score(color_score)
                c_status = ColorUnitBackend.resolve_deltae_status(color_score, csi2000_pass_thr, csi2000_cond_thr)
                color_method_label = 'CSI2000'
            else:
                color_score = float(mean_de)
                color_score_visual_pct = ColorUnitBackend.deltae_to_score(mean_de)
                c_status = color_results.get('overall_status', 'FAIL')
                color_method_label = 'DELTAE2000'
            
            # Pattern score calculation
            pattern_scoring_method = settings.get('pattern_scoring_method', 'all')
            all_pattern_scores = pattern_results.get('scores', {})
            composite_score = pattern_results.get('composite_score', 0)
            global_pat_thr = float(settings.get('global_pattern_threshold', settings.get('global_threshold', 75.0)))
            
            PATTERN_METHOD_MAP = {
                'ssim': 'Structural SSIM',
                'gradient': 'Gradient Similarity',
                'phase': 'Phase Correlation',
                'structural': 'Structural Match',
            }
            
            if pattern_scoring_method in PATTERN_METHOD_MAP:
                method_key = PATTERN_METHOD_MAP[pattern_scoring_method]
                pattern_score = all_pattern_scores.get(method_key, composite_score)
                thr_cfg = settings.get('thresholds', {}).get(method_key, {})
                pat_pass_thr = float(thr_cfg.get('pass', global_pat_thr)) if isinstance(thr_cfg, dict) else global_pat_thr
                pat_cond_thr = float(thr_cfg.get('conditional', global_pat_thr - 15)) if isinstance(thr_cfg, dict) else (global_pat_thr - 15)
                if pattern_score >= pat_pass_thr:
                    p_status = 'PASS'
                elif pattern_score >= pat_cond_thr:
                    p_status = 'CONDITIONAL'
                else:
                    p_status = 'FAIL'
                pattern_method_label = method_key
            else:
                pattern_score = composite_score
                p_status = pattern_results.get('final_status', 'FAIL')
                pattern_method_label = 'Composite (All)'
            
            # Ensure plain Python float (not numpy float32) for JSON serialization
            color_score = float(color_score)
            color_score_visual_pct = float(color_score_visual_pct)
            pattern_score = float(pattern_score)
            overall_score = float((color_score_visual_pct + pattern_score) / 2)
            
            # Determine Overall Decision
            
            if c_status == 'PASS' and p_status == 'PASS':
                decision = 'ACCEPT'
            elif c_status == 'FAIL' or p_status == 'FAIL':
                decision = 'REJECT'
            else:
                decision = 'CONDITIONAL'
    
            # Settings receipt
            SettingsReceipt.generate_receipt(
                receipt_pdf,
                settings,
                processed_imgs_for_receipt,
                analysis_id,
                op_name,
                date_str,
                time_str,
                color_score=color_score,
                pattern_score=pattern_score,
                overall_score=overall_score,
                decision=decision,
                software_version="3.0.0",
                color_method_key=color_scoring_method,
                pattern_method_key=pattern_scoring_method,
            )
                
            # 5. Generate Unified Cover and Merge PDFs
            cover_pdf = os.path.join(temp_dir, f"{session_id}_cover.pdf")
            
            color_data_for_cover = {
                'score': color_score,
                'status': c_status,
                'method_label': color_method_label,
                'method_key': color_scoring_method,
            }
            pattern_data_for_cover = {
                'score': pattern_score,
                'status': p_status,
                'method_label': pattern_method_label,
                'method_key': pattern_scoring_method,
                'scores': all_pattern_scores,
            }
            
            generate_unified_cover(
                cover_pdf, settings,
                color_data=color_data_for_cover,
                pattern_data=pattern_data_for_cover,
                report_id=analysis_id,
                timestamp=timestamp
            )
            
            # Merge: unified_cover + color_pages(skip cover) + pattern_pages(skip cover)
            merger = PdfWriter()
            # Add unified cover page
            cover_reader = PdfReader(cover_pdf)
            for page in cover_reader.pages:
                merger.add_page(page)
            # Add color report pages (skip first page = original cover)
            color_reader = PdfReader(color_pdf)
            for page in color_reader.pages[1:]:
                merger.add_page(page)
            # Add pattern report pages (skip first page = original cover)
            pattern_reader = PdfReader(pattern_pdf)
            for page in pattern_reader.pages[1:]:
                merger.add_page(page)
            merger.write(merged_pdf)
            merger.close()
            
            size_merged = os.path.getsize(merged_pdf) / (1024 * 1024)
            size_color = os.path.getsize(color_pdf) / (1024 * 1024) if os.path.exists(color_pdf) else 0
            size_pattern = os.path.getsize(pattern_pdf) / (1024 * 1024) if os.path.exists(pattern_pdf) else 0
            
            def _safe_lab(d):
                return [round(float(v), 2) for v in d.get('lab', [0,0,0])]
            def _safe_rgb(d):
                r255 = d.get('rgb255', d.get('rgb', [0,0,0]))
                return [int(min(255, max(0, round(float(v))))) for v in r255]
            def _safe_xyz(d):
                return [round(float(v), 4) for v in d.get('xyz', [0,0,0])]
            def _safe_cmyk(d):
                cmyk = d.get('cmyk', [0,0,0,0])
                return [round(float(v)*100, 2) for v in cmyk]
            def _safe_rgb_std(d):
                return [round(float(v), 4) for v in d.get('rgb_std', [0,0,0])]

            reg_stats_safe = []
            for rs in color_results.get('reg_stats', []):
                ref_d = rs.get('ref', {})
                sam_d = rs.get('sam', {})
                reg_stats_safe.append({
                    'id': rs.get('id'),
                    'pos': [int(v) for v in rs.get('pos', (0,0))],
                    'radius': int(ref_d.get('r', color_results.get('r', 0))),
                    'de76': round(float(rs.get('de76', 0)), 4),
                    'de94': round(float(rs.get('de94', 0)), 4),
                    'de00': round(float(rs.get('de00', 0)), 4),
                    'status': rs.get('status', ''),
                    'ref_lab': _safe_lab(ref_d),
                    'sam_lab': _safe_lab(sam_d),
                    'ref_rgb': _safe_rgb(ref_d),
                    'sam_rgb': _safe_rgb(sam_d),
                    'ref_xyz': _safe_xyz(ref_d),
                    'sam_xyz': _safe_xyz(sam_d),
                    'ref_cmyk': _safe_cmyk(ref_d),
                    'sam_cmyk': _safe_cmyk(sam_d),
                    'ref_rgb_std': _safe_rgb_std(ref_d),
                    'sam_rgb_std': _safe_rgb_std(sam_d),
                })

            # Lab* detailed analysis: ΔL*, Δa*, Δb*, magnitude, per-component thresholds
            lab_analysis = {}
            if reg_stats_safe:
                import numpy as _np
                lab_thr = settings.get('lab_thresholds', {})
                thr_dl = float(lab_thr.get('dl', 1.0))
                thr_da = float(lab_thr.get('da', 1.0))
                thr_db = float(lab_thr.get('db', 1.0))
                thr_mag = float(lab_thr.get('magnitude', 2.0))
                mean_ref_L = float(_np.mean([r['ref_lab'][0] for r in reg_stats_safe]))
                mean_ref_a = float(_np.mean([r['ref_lab'][1] for r in reg_stats_safe]))
                mean_ref_b = float(_np.mean([r['ref_lab'][2] for r in reg_stats_safe]))
                mean_sam_L = float(_np.mean([r['sam_lab'][0] for r in reg_stats_safe]))
                mean_sam_a = float(_np.mean([r['sam_lab'][1] for r in reg_stats_safe]))
                mean_sam_b = float(_np.mean([r['sam_lab'][2] for r in reg_stats_safe]))
                import math as _math
                dL = round(mean_sam_L - mean_ref_L, 4)
                da = round(mean_sam_a - mean_ref_a, 4)
                db = round(mean_sam_b - mean_ref_b, 4)
                mag = round(_math.sqrt(dL**2 + da**2 + db**2), 4)
                lab_analysis = {
                    'mean_ref': {'L': round(mean_ref_L,4), 'a': round(mean_ref_a,4), 'b': round(mean_ref_b,4)},
                    'mean_sam': {'L': round(mean_sam_L,4), 'a': round(mean_sam_a,4), 'b': round(mean_sam_b,4)},
                    'delta_L': dL, 'delta_a': da, 'delta_b': db, 'magnitude': mag,
                    'thresholds': {'dL': thr_dl, 'da': thr_da, 'db': thr_db, 'magnitude': thr_mag},
                    'status': {
                        'dL': 'PASS' if abs(dL) <= thr_dl else 'FAIL',
                        'da': 'PASS' if abs(da) <= thr_da else 'FAIL',
                        'db': 'PASS' if abs(db) <= thr_db else 'FAIL',
                        'magnitude': 'PASS' if mag <= thr_mag else 'FAIL',
                    },
                }
            
            pattern_scores = {}
            for k, v in pattern_results.get('scores', {}).items():
                pattern_scores[k] = round(float(v), 2)

            # Pattern per-metric pass/fail details (mirrors what the PDF shows)
            pat_thr_cfg = settings.get('thresholds', {})
            _global_pat_thr = float(settings.get('global_pattern_threshold', settings.get('global_threshold', 75.0)))
            pattern_details = {}
            for _mk, _mv in pattern_scores.items():
                _thr_entry = pat_thr_cfg.get(_mk, {})
                _pass_t = float(_thr_entry.get('pass', _global_pat_thr)) if isinstance(_thr_entry, dict) else _global_pat_thr
                _cond_t = float(_thr_entry.get('conditional', _global_pat_thr - 15)) if isinstance(_thr_entry, dict) else (_global_pat_thr - 15)
                _st = 'PASS' if _mv >= _pass_t else ('CONDITIONAL' if _mv >= _cond_t else 'FAIL')
                pattern_details[_mk] = {'score': _mv, 'pass_threshold': _pass_t, 'cond_threshold': _cond_t, 'status': _st}
            
            # Generate visualization images for frontend display
            viz_urls = _save_visualization_images(session_id, ref_img_proc, sample_img_proc, color_results, pattern_results, settings)
            
            # Structural diff metadata
            structural_meta = {}
            structural = pattern_results.get('structural_results')
            if structural:
                structural_meta = {
                    'similarity_score': round(float(structural.get('similarity_score', 0)), 2),
                    'verdict': structural.get('verdict', ''),
                    'change_percentage': round(float(structural.get('change_percentage', 0)), 4),
                    'total_pixels': int(structural.get('total_pixels', 0)),
                    'changed_pixels': int(structural.get('changed_pixels', 0)),
                }

            # ΔE summary statistics
            de_statistics = {}
            if reg_stats_safe:
                import numpy as np
                de76_vals = [r['de76'] for r in reg_stats_safe]
                de94_vals = [r['de94'] for r in reg_stats_safe]
                de00_vals = [r['de00'] for r in reg_stats_safe]
                for metric_name, vals in [('de76', de76_vals), ('de94', de94_vals), ('de00', de00_vals)]:
                    de_statistics[metric_name] = {
                        'mean': round(float(np.mean(vals)), 4),
                        'std': round(float(np.std(vals)), 4),
                        'min': round(float(np.min(vals)), 4),
                        'max': round(float(np.max(vals)), 4),
                    }

            # Illuminant analysis data
            illuminant_data = []
            try:
                from modules.ColorUnitBackend import adapt_to_illuminant, xyz_to_lab, deltaE2000, WHITE_POINTS, compute_csi_details
                raw_reg_stats = color_results.get('reg_stats', [])
                primary_ill = settings.get('primary_illuminant', 'D65')
                test_illuminants = settings.get('test_illuminants', ['D65', 'D50', 'TL84'])
                if isinstance(test_illuminants, str):
                    test_illuminants = [test_illuminants]
                for ill in test_illuminants:
                    ill_key = ill.strip()
                    if ill_key not in WHITE_POINTS:
                        continue
                    if ill_key == primary_ill:
                        # Use the canonical values from the main analysis
                        mean_ill_de = float(mean_de)
                        ill_csi = float(csi_val)
                    else:
                        # Chromatic adaptation for non-primary illuminants
                        ill_de_values = []
                        for item in raw_reg_stats:
                            ref_xyz_d65 = item['ref']['xyz']
                            ref_xyz_tgt = adapt_to_illuminant(ref_xyz_d65, ill_key)
                            ref_lab_tgt = xyz_to_lab(ref_xyz_tgt, WHITE_POINTS[ill_key])
                            sam_xyz_d65 = item['sam']['xyz']
                            sam_xyz_tgt = adapt_to_illuminant(sam_xyz_d65, ill_key)
                            sam_lab_tgt = xyz_to_lab(sam_xyz_tgt, WHITE_POINTS[ill_key])
                            d00 = deltaE2000(ref_lab_tgt, sam_lab_tgt)
                            ill_de_values.append(d00)
                        mean_ill_de = float(np.mean(ill_de_values)) if ill_de_values else 0.0
                        ill_csi = float(compute_csi_details(ref_img_proc, sample_img_proc, illuminant=ill_key)['value'])
                    ill_status = ColorUnitBackend.resolve_deltae_status(ill_csi, csi_good_thr, csi_warn_thr)
                    illuminant_data.append({
                        'illuminant': ill_key,
                        'mean_de00': round(mean_ill_de, 4),
                        'csi': round(ill_csi, 4),
                        'status': ill_status,
                    })
            except Exception as e:
                print(f"Error computing illuminant data for frontend: {e}")

            # Recommendations and conclusions
            color_findings = []
            color_conclusion_text = ''
            color_conclusion_status = ''
            pattern_findings = []
            pattern_conclusion_text = ''
            pattern_conclusion_status = ''
            try:
                from modules.RecommendationsEngine import generate_color_recommendations, generate_pattern_recommendations
                report_lang = settings.get('report_lang', 'tr')
                pass_thr = float(settings.get('color_threshold_pass', settings.get('thresholds', {}).get('pass', 2.0)))
                cond_thr_val = float(settings.get('color_threshold_conditional', settings.get('thresholds', {}).get('conditional', 5.0)))
                color_findings, color_conclusion_text, color_conclusion_status = generate_color_recommendations(
                    mean_de00=mean_de,
                    reg_stats=color_results.get('reg_stats', []),
                    csi_value=csi_val,
                    pass_thr=pass_thr,
                    cond_thr=cond_thr_val,
                    csi_good_thr=csi_good_thr,
                    csi_warn_thr=csi_warn_thr,
                    lang=report_lang,
                )
                global_pat_thr_val = float(settings.get('global_pattern_threshold', settings.get('global_threshold', 75.0)))
                pat_thresholds = settings.get('thresholds', {})
                pattern_findings, pattern_conclusion_text, pattern_conclusion_status = generate_pattern_recommendations(
                    composite_score=float(pattern_results.get('composite_score', 0)),
                    scores=pattern_results.get('scores', {}),
                    structural_results=structural,
                    global_threshold=global_pat_thr_val,
                    thresholds=pat_thresholds,
                    lang=report_lang,
                )
            except Exception as e:
                print(f"Error generating recommendations for frontend: {e}")

            # Fourier analysis data
            fourier_data = {}
            try:
                fourier_res = pattern_results.get('fourier_results')
                if fourier_res:
                    def _fda_scalars(fda):
                        if not fda:
                            return {}
                        return {
                            'fundamental_period': round(float(fda.get('fundamental_period', 0)), 4),
                            'dominant_orientation': round(float(fda.get('dominant_orientation', 0)), 4),
                            'anisotropy': round(float(fda.get('anisotropy', 1)), 4),
                            'peaks': [
                                {
                                    'radius': round(float(p['radius']), 4),
                                    'angle': round(float(p['angle']), 4),
                                    'magnitude': round(float(p['magnitude']), 4),
                                    'px': int(p['px']),
                                    'py': int(p['py']),
                                }
                                for p in fda.get('peaks', [])
                            ],
                        }
                    fourier_data = {
                        'sample': _fda_scalars(fourier_res.get('sample')),
                        'ref': _fda_scalars(fourier_res.get('ref')),
                        'fundamental_period': round(float(fourier_res.get('fundamental_period', 0)), 4),
                        'dominant_orientation': round(float(fourier_res.get('dominant_orientation', 0)), 4),
                        'anisotropy': round(float(fourier_res.get('anisotropy', 1)), 4),
                        'peaks': [
                            {
                                'radius': round(float(p['radius']), 4),
                                'angle': round(float(p['angle']), 4),
                                'magnitude': round(float(p['magnitude']), 4),
                                'px': int(p['px']),
                                'py': int(p['py']),
                            }
                            for p in fourier_res.get('peaks', [])
                        ],
                    }
            except Exception as e:
                print(f"Error extracting fourier data: {e}")

            # GLCM texture data
            glcm_data = {}
            try:
                glcm_res = pattern_results.get('glcm_results')
                if glcm_res:
                    def _glcm_props(g):
                        if not g:
                            return {}
                        return {k: round(float(v), 6) for k, v in g.get('properties', {}).items()}
                    glcm_data = {
                        'ref': _glcm_props(glcm_res.get('ref')),
                        'sample': _glcm_props(glcm_res.get('sample')),
                    }
            except Exception as e:
                print(f"Error extracting GLCM data: {e}")

            # Color sampling metadata
            color_sampling_points = []
            try:
                for pt in color_results.get('points', []):
                    if isinstance(pt, (list, tuple)) and len(pt) >= 2:
                        color_sampling_points.append({
                            'x': int(pt[0]),
                            'y': int(pt[1]),
                            'is_manual': bool(pt[2]) if len(pt) > 2 else False,
                        })
            except Exception as e:
                print(f"Error extracting color sampling points: {e}")

            # Color averages
            color_averages = {}
            try:
                raw_reg_stats = color_results.get('reg_stats', [])
                if raw_reg_stats:
                    ref_labs = [r['ref']['lab'] for r in raw_reg_stats]
                    sam_labs = [r['sam']['lab'] for r in raw_reg_stats]
                    ref_rgbs = [r['ref'].get('rgb255', r['ref'].get('rgb', [0,0,0])) for r in raw_reg_stats]
                    sam_rgbs = [r['sam'].get('rgb255', r['sam'].get('rgb', [0,0,0])) for r in raw_reg_stats]
                    color_averages = {
                        'ref_lab': [round(float(x), 2) for x in np.mean(ref_labs, axis=0)],
                        'sam_lab': [round(float(x), 2) for x in np.mean(sam_labs, axis=0)],
                        'ref_rgb': [int(round(float(x))) for x in np.mean(ref_rgbs, axis=0)],
                        'sam_rgb': [int(round(float(x))) for x in np.mean(sam_rgbs, axis=0)],
                    }
            except Exception as e:
                print(f"Error computing color averages: {e}")

            # Return JSON response with download URLs and detailed data
            response_data = _sanitize_for_json({
                'success': True,
                'session_id': session_id,
                'color_score': color_score,
                'pattern_score': pattern_score,
                'overall_score': overall_score,
                'decision': decision,
                'pdf_url': f"/api/download_report/merged/{session_id}",
                'receipt_url': f"/api/download_receipt/{session_id}",
                'color_report_url': f"/api/download_report/color/{session_id}",
                'pattern_report_url': f"/api/download_report/pattern/{session_id}",
                'report_size': f"{size_merged:.2f} MB",
                'color_report_size': f"{size_color:.2f} MB",
                'pattern_report_size': f"{size_pattern:.2f} MB",
                'report_id': analysis_id,
                'report_date': date_str,
                'report_time': time_str,
                'operator': op_name,
                'mean_de00': round(float(mean_de), 4),
                'csi_value': round(float(csi_val), 4),
                'csi_details': color_results.get('csi_details', {}),
                'color_scoring_method': color_scoring_method,
                'color_method_label': color_method_label,
                'color_score_format': color_score_format,
                'color_score_visual_pct': round(float(color_score_visual_pct), 2),
                'pattern_scoring_method': pattern_scoring_method,
                'pattern_method_label': pattern_method_label,
                'color_status': c_status,
                'pattern_status': p_status,
                'color_regions': reg_stats_safe,
                'pattern_scores': pattern_scores,
                'pattern_composite': round(float(pattern_results.get('composite_score', 0)), 2),
                'pattern_final_status': p_status,
                'images': viz_urls,
                'structural_meta': structural_meta,
                'de_statistics': de_statistics,
                'illuminant_data': illuminant_data,
                'color_findings': color_findings,
                'color_conclusion_text': color_conclusion_text,
                'color_conclusion_status': color_conclusion_status,
                'pattern_findings': pattern_findings,
                'pattern_conclusion_text': pattern_conclusion_text,
                'pattern_conclusion_status': pattern_conclusion_status,
                'color_averages': color_averages,
                'alignment_mode': alignment_mode,
                'alignment_metrics': alignment_metrics,
                'fourier_data': fourier_data,
                'glcm_data': glcm_data,
                'color_sampling_radius': int(color_results.get('r', 0)),
                'color_sampling_points': color_sampling_points,
                'color_sampling_count': len(color_sampling_points),
                'lab_analysis': lab_analysis,
                'pattern_details': pattern_details,
                'image_dimensions': {
                    'ref':    {'width': int(ref_img.shape[1]),  'height': int(ref_img.shape[0])},
                    'sample': {'width': int(sample_img.shape[1]), 'height': int(sample_img.shape[0])},
                    'processed_ref':    {'width': int(ref_img_proc.shape[1]),  'height': int(ref_img_proc.shape[0])},
                    'processed_sample': {'width': int(sample_img_proc.shape[1]), 'height': int(sample_img_proc.shape[0])},
                },
                'fn_full': f"{analysis_id}{_lang_suffix}.pdf",
                'fn_color': f"{analysis_id}R{_lang_suffix}.pdf",
                'fn_pattern': f"{analysis_id}D{_lang_suffix}.pdf",
                'fn_receipt': f"{analysis_id}_AYARLAR{_lang_suffix}.pdf"
            })
            return jsonify(response_data)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
        
@app.route('/api/download_receipt/<session_id>', methods=['GET'])
def download_receipt(session_id):
    # Sanitize session_id to prevent path traversal
    safe_id = os.path.basename(session_id)
    receipt_pdf = os.path.join(UPLOAD_FOLDER, f"{safe_id}_receipt.pdf")
    
    if os.path.exists(receipt_pdf):
        fn = request.args.get('fn', f"Configuration_Receipt_{safe_id}.pdf")
        return send_file(receipt_pdf, as_attachment=True, download_name=fn)
    else:
        return jsonify({'error': 'Receipt not found'}), 404

@app.route('/api/download_report/color/<session_id>', methods=['GET'])
def download_color_report(session_id):
    safe_id = os.path.basename(session_id)
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{safe_id}_color.pdf")
    if os.path.exists(pdf_path):
        fn = request.args.get('fn', f"SpectraMatch_Color_Report_{safe_id}.pdf")
        return send_file(pdf_path, as_attachment=True, download_name=fn)
    return jsonify({'error': 'Report not found'}), 404

@app.route('/api/download_report/pattern/<session_id>', methods=['GET'])
def download_pattern_report(session_id):
    safe_id = os.path.basename(session_id)
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{safe_id}_pattern.pdf")
    if os.path.exists(pdf_path):
        fn = request.args.get('fn', f"SpectraMatch_Pattern_Report_{safe_id}.pdf")
        return send_file(pdf_path, as_attachment=True, download_name=fn)
    return jsonify({'error': 'Report not found'}), 404

@app.route('/api/download_report/merged/<session_id>', methods=['GET'])
def download_merged_report(session_id):
    safe_id = os.path.basename(session_id)
    pdf_path = os.path.join(UPLOAD_FOLDER, f"{safe_id}_report.pdf")
    if os.path.exists(pdf_path):
        fn = request.args.get('fn', f"SpectraMatch_Report_{safe_id}.pdf")
        return send_file(pdf_path, as_attachment=True, download_name=fn)
    return jsonify({'error': 'Report not found'}), 404

@app.route('/api/report_image/<session_id>/<name>', methods=['GET'])
def serve_report_image(session_id, name):
    safe_id = os.path.basename(session_id)
    safe_name = os.path.basename(name)
    img_path = os.path.join(UPLOAD_FOLDER, f"{safe_id}_img_{safe_name}.png")
    if os.path.exists(img_path):
        return send_file(img_path, mimetype='image/png')
    return jsonify({'error': 'Image not found'}), 404


def _save_visualization_images(session_id, ref_img_proc, sample_img_proc, color_results, pattern_results, settings):
    """Generate and save all visualization images for frontend display.
    Returns a dict of image_name -> URL path."""
    import cv2
    import numpy as np
    from modules import ColorUnitBackend, PatternUnitBackend

    image_urls = {}
    img_prefix = os.path.join(UPLOAD_FOLDER, f"{session_id}_img_")

    try:
        reg_stats = color_results.get('reg_stats', [])

        # --- Color Visualizations ---
        # Handle images with alpha channel (4-channel BGRA from crop)
        ref_bgr = ref_img_proc[:, :, :3] if ref_img_proc.shape[2] == 4 else ref_img_proc
        sam_bgr = sample_img_proc[:, :, :3] if sample_img_proc.shape[2] == 4 else sample_img_proc

        # 1. Spectral Proxy
        if reg_stats:
            try:
                mean_rgb_ref = np.mean([x['ref']['rgb01'] for x in reg_stats], axis=0)
                mean_rgb_sam = np.mean([x['sam']['rgb01'] for x in reg_stats], axis=0)
                p = img_prefix + "spectral.png"
                ColorUnitBackend.plot_spectral_proxy(mean_rgb_ref, mean_rgb_sam, p)
                image_urls['spectral'] = f"/api/report_image/{session_id}/spectral"
            except Exception as e:
                print(f"Error saving spectral image: {e}")

        # 2. RGB Histograms (dual)
        try:
            p = img_prefix + "histograms.png"
            ColorUnitBackend.plot_rgb_histograms_dual(ref_bgr, sam_bgr, p)
            image_urls['histograms'] = f"/api/report_image/{session_id}/histograms"
        except Exception as e:
            print(f"Error saving histogram image: {e}")

        # 3. ΔE Heatmap
        try:
            h_r, w_r = ref_bgr.shape[:2]
            target_w = min(640, w_r)
            target_h = int(target_w * h_r / w_r)
            small_ref = cv2.resize(ref_bgr, (target_w, target_h))
            small_sam = cv2.resize(sam_bgr, (target_w, target_h))
            s_ref_lab = cv2.cvtColor(small_ref, cv2.COLOR_BGR2LAB).astype(np.float32)
            s_sam_lab = cv2.cvtColor(small_sam, cv2.COLOR_BGR2LAB).astype(np.float32)
            diff_map = np.sqrt(np.sum((s_ref_lab - s_sam_lab) ** 2, axis=2))
            p = img_prefix + "heatmap.png"
            ColorUnitBackend.plot_heatmap(diff_map, "ΔE Heatmap", p)
            image_urls['heatmap'] = f"/api/report_image/{session_id}/heatmap"
        except Exception as e:
            print(f"Error saving heatmap image: {e}")

        # 4. Lab Scatter
        if reg_stats:
            try:
                p = img_prefix + "lab_scatter.png"
                ColorUnitBackend.plot_lab_scatter(reg_stats, p)
                image_urls['lab_scatter'] = f"/api/report_image/{session_id}/lab_scatter"
            except Exception as e:
                print(f"Error saving lab scatter image: {e}")

        # 5. Lab Bars
        if reg_stats:
            try:
                p = img_prefix + "lab_bars.png"
                ColorUnitBackend.plot_lab_bars(reg_stats, p)
                image_urls['lab_bars'] = f"/api/report_image/{session_id}/lab_bars"
            except Exception as e:
                print(f"Error saving lab bars image: {e}")

        # --- Pattern Visualizations ---
        diff_images = pattern_results.get('diff_images', {})

        # 6-8. Diff Maps (SSIM, Gradient, Phase)
        for key, cv_img in diff_images.items():
            try:
                safe_key = key.lower().replace(' ', '_')
                p = img_prefix + f"{safe_key}.png"
                cv2.imwrite(p, cv_img)
                image_urls[safe_key] = f"/api/report_image/{session_id}/{safe_key}"
            except Exception as e:
                print(f"Error saving {key} diff image: {e}")

        # 9-10. Gradient Boundary
        grad_res = pattern_results.get('grad_boundary')
        if grad_res:
            try:
                contoured, filled = grad_res[0], grad_res[1]
                p1 = img_prefix + "gradient_boundary.png"
                cv2.imwrite(p1, cv2.cvtColor(contoured, cv2.COLOR_RGB2BGR))
                image_urls['gradient_boundary'] = f"/api/report_image/{session_id}/gradient_boundary"
                p2 = img_prefix + "gradient_filled.png"
                cv2.imwrite(p2, cv2.cvtColor(filled, cv2.COLOR_RGB2BGR))
                image_urls['gradient_filled'] = f"/api/report_image/{session_id}/gradient_filled"
            except Exception as e:
                print(f"Error saving gradient boundary images: {e}")

        # 11-12. Phase Boundary
        phase_res = pattern_results.get('phase_boundary')
        if phase_res:
            try:
                contoured, filled = phase_res[0], phase_res[1]
                p1 = img_prefix + "phase_boundary.png"
                cv2.imwrite(p1, cv2.cvtColor(contoured, cv2.COLOR_RGB2BGR))
                image_urls['phase_boundary'] = f"/api/report_image/{session_id}/phase_boundary"
                p2 = img_prefix + "phase_filled.png"
                cv2.imwrite(p2, cv2.cvtColor(filled, cv2.COLOR_RGB2BGR))
                image_urls['phase_filled'] = f"/api/report_image/{session_id}/phase_filled"
            except Exception as e:
                print(f"Error saving phase boundary images: {e}")

        # 13-14. Structural Difference
        structural = pattern_results.get('structural_results')
        if structural:
            try:
                raw_sub = structural.get('subplot_raw')
                if raw_sub:
                    p = img_prefix + "structural_subplot.png"
                    with open(p, 'wb') as f:
                        f.write(raw_sub)
                    image_urls['structural_subplot'] = f"/api/report_image/{session_id}/structural_subplot"
                raw_diff = structural.get('diff_raw')
                if raw_diff:
                    p = img_prefix + "structural_pure.png"
                    with open(p, 'wb') as f:
                        f.write(raw_diff)
                    image_urls['structural_pure'] = f"/api/report_image/{session_id}/structural_pure"
            except Exception as e:
                print(f"Error saving structural images: {e}")

        # 15. Fourier Spectrum
        fourier = pattern_results.get('fourier_results')
        if fourier:
            try:
                spec_path = fourier.get('spectrum_img_path')
                if spec_path and os.path.exists(spec_path):
                    import shutil
                    p = img_prefix + "fourier_spectrum.png"
                    shutil.copy2(spec_path, p)
                    image_urls['fourier_spectrum'] = f"/api/report_image/{session_id}/fourier_spectrum"
            except Exception as e:
                print(f"Error saving fourier spectrum: {e}")

        # 16. GLCM Heatmap
        glcm = pattern_results.get('glcm_results')
        if glcm:
            try:
                import shutil
                hm_path = glcm.get('heatmap_img_path')
                if hm_path and os.path.exists(hm_path):
                    p = img_prefix + "glcm_heatmap.png"
                    shutil.copy2(hm_path, p)
                    image_urls['glcm_heatmap'] = f"/api/report_image/{session_id}/glcm_heatmap"
            except Exception as e:
                print(f"Error saving GLCM heatmap: {e}")


    except Exception as e:
        print(f"Error in _save_visualization_images: {e}")
        import traceback
        traceback.print_exc()

    return image_urls


def _save_single_image_visualizations(session_id, sample_img_proc, settings):
    """Generate and save visualization images for single image mode."""
    import cv2
    import numpy as np
    from modules.ColorUnitBackend import plot_rgb_histogram
    from modules.SingleImageUnitBackend import plot_single_spectral_proxy
    from modules.PatternUnitBackend import fourier_domain_analysis, plot_fft_spectrum

    image_urls = {}
    img_prefix = os.path.join(UPLOAD_FOLDER, f"{session_id}_img_")

    sam_bgr = sample_img_proc[:, :, :3] if sample_img_proc.shape[2] == 4 else sample_img_proc

    # 1. RGB Histogram (single)
    try:
        p = img_prefix + "histogram_single.png"
        plot_rgb_histogram(sam_bgr, p, title='Sample RGB Histogram')
        image_urls['histogram_single'] = f"/api/report_image/{session_id}/histogram_single"
    except Exception as e:
        print(f"Error saving single histogram: {e}")

    # 2. Spectral Proxy (single)
    try:
        mean_bgr = np.mean(sam_bgr.reshape(-1, 3), axis=0)
        mean_rgb01 = mean_bgr[::-1] / 255.0
        p = img_prefix + "spectral_single.png"
        plot_single_spectral_proxy(mean_rgb01, p)
        image_urls['spectral_single'] = f"/api/report_image/{session_id}/spectral_single"
    except Exception as e:
        print(f"Error saving single spectral: {e}")

    # 3. FFT Spectrum (single)
    try:
        fda = fourier_domain_analysis(sam_bgr)
        p = img_prefix + "fourier_single.png"
        plot_fft_spectrum(fda, p)
        image_urls['fourier_single'] = f"/api/report_image/{session_id}/fourier_single"
    except Exception as e:
        print(f"Error saving single fourier: {e}")

    return image_urls


if __name__ == '__main__':
    app.run(port=8080, debug=True)
