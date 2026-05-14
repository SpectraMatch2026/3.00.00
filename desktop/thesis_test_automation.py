"""
Thesis Test Automation - Professional Data Extraction & Organization
--------------------------------------------------------------------
Runs each alignment technique against the current images, downloads
all PDFs, images, and structured data, organized per-technique.

Output structure inside TEZ_TESTI.zip:

  TEZ_TESTI/
  +--- YYYY-MM-DD_HH-MM-SS/
      +--- Master_Index.json
      +--- Direct_Pixel/
      |   +--- PDFs/
      |   |   +--- Full_Report.pdf
      |   |   +--- Color_Report.pdf
      |   |   +--- Pattern_Report.pdf
      |   |   +--- Settings_Receipt.pdf
      |   +--- Images/
      |   |   +--- heatmap.png
      |   |   +--- spectral.png
      |   |   +--- ...
      |   +--- Data.json
      +--- AI_SmartMatch/
      |   +--- ...
      +--- BESTCH/
          +--- ...
"""

import os
import sys
import json
import time
import copy
import base64
import shutil
import tempfile
import traceback
import urllib.request
import urllib.error
import zipfile
from datetime import datetime
from io import BytesIO


THESIS_REQUIRED_FIGURES = [
    '4_1.png', '4_2.png', '4_3.png', '4_4.png', '4_5.png',
    '4_6.png', '4_7.png', '4_8.png',
    '5_1.png', '5_2.png', '5_3.png',
    '5_4.png', '5_5.png', '5_6.png', '5_7.png', '5_8.png',
    '5_9.png', '5_10.png', '5_11.png', '5_12.png', '5_13.png',
    '5_14.png', '5_15.png', '5_16.png',
    '5_17.png', '5_18.png', '5_19.png', '5_20.png', '5_21.png',
]


AI_SMARTMATCH_FIGURE_MAP = {
    # Chapter 5 figures (AI SmartMatch results) — 5_4..5_16
    '5_4.png': 'histograms.png',
    '5_5.png': 'lab_scatter.png',
    '5_6.png': 'lab_bars.png',
    '5_7.png': 'spectral.png',
    '5_8.png': 'heatmap.png',
    '5_9.png': 'structural_ssim.png',
    '5_10.png': 'phase_correlation.png',
    '5_11.png': 'gradient_similarity.png',
    '5_12.png': 'phase_boundary.png',
    '5_13.png': 'gradient_boundary.png',
    '5_14.png': 'structural_subplot.png',
    '5_15.png': 'fourier_spectrum.png',
    '5_16.png': 'glcm_heatmap.png',
}


HEATMAP_BY_TECHNIQUE = {
    # Chapter 5 comparative heatmaps by technique — 5_19..5_21
    '5_19.png': 'Direct_Pixel',
    '5_20.png': 'AI_SmartMatch',
    '5_21.png': 'BESTCH',
}


# -- Alignment technique definitions ------------------------------------------
TECHNIQUES = [
    {'mode': 'direct',         'folder': 'Direct_Pixel',  'label': 'Direct Pixel'},
    {'mode': 'ai_smart_match', 'folder': 'AI_SmartMatch', 'label': 'AI SmartMatch'},
    {'mode': 'bestch',         'folder': 'BESTCH',        'label': 'BESTCH'},
]


def _to_int(value, default=0):
    try:
        return int(round(float(value)))
    except Exception:
        return default


def _prepare_thesis_settings(settings):
    thesis_settings = copy.deepcopy(settings or {})
    thesis_settings.setdefault('sampling_mode', 'random')
    thesis_settings.setdefault('sampling_points', [])

    region_count = max(0, _to_int(thesis_settings.get('region_count', 0), 0))
    sampling_points = thesis_settings.get('sampling_points') or []
    sampling_mode = str(thesis_settings.get('sampling_mode', 'random') or 'random').lower()

    if region_count > 0 and sampling_mode == 'manual' and len(sampling_points) != region_count:
        print('[ThesisTest] Manual sampling points are incomplete; switching to random sampling for this run.')
        thesis_settings['sampling_mode'] = 'random'
        thesis_settings['sampling_points'] = []

    return thesis_settings


# -- Public entry point --------------------------------------------------------
def run_thesis_tests(flask_port, current_settings, current_region_data, ref_file_info, sample_file_info, output_dir):
    """
    Execute thesis tests: 3 alignment techniques x full analysis pipeline.

    Returns dict with success status, zip path, and per-technique summary.
    """
    work_root = None
    try:
        # Resolve project paths (works both frozen EXE and source)
        desktop_dir = os.path.dirname(os.path.abspath(__file__))
        if getattr(sys, 'frozen', False):
            project_dir = sys._MEIPASS
        else:
            project_dir = os.path.dirname(desktop_dir)

        readytotest_dir = os.path.join(project_dir, 'static', 'READYTOTEST')
        work_root = tempfile.mkdtemp(prefix='spectramatch_thesis_')
        export_root = os.path.join(work_root, 'TEZ_TESTI')
        os.makedirs(export_root, exist_ok=True)

        ref_path, sample_path, ref_name, sample_name, img_source = \
            _resolve_images(ref_file_info, sample_file_info, readytotest_dir, work_root)

        base_url  = f'http://127.0.0.1:{flask_port}'
        run_ts    = datetime.now().strftime('%Y-%m-%d_%H-%M-%S')
        run_dir   = os.path.join(export_root, run_ts)
        os.makedirs(run_dir, exist_ok=True)

        print(f'[ThesisTest] Run folder: {run_dir}')
        print(f'[ThesisTest] Images: {ref_name} / {sample_name}  ({img_source})')

        tech_results = []

        for i, tech in enumerate(TECHNIQUES):
            print(f'[ThesisTest] -- Technique {i+1}/3: {tech["label"]} --')
            r = _run_technique(
                tech, base_url, run_dir,
                current_settings, current_region_data,
                ref_path, sample_path, ref_name, sample_name
            )
            tech_results.append(r)

        figures_report = _compile_latex_figures(project_dir, run_dir, run_dir,
                                                ref_path, sample_path)

        successful   = sum(1 for r in tech_results if r.get('success'))
        total_pdfs   = sum(r.get('pdfs_saved',   0) for r in tech_results)
        total_images = sum(r.get('images_saved', 0) for r in tech_results)

        archive_run_folder = os.path.join('TEZ_TESTI', run_ts).replace('\\', '/')
        master = {
            'run_timestamp' : run_ts,
            'run_folder'    : archive_run_folder,
            'image_source'  : img_source,
            'images_used'   : {'reference': ref_name, 'sample': sample_name},
            'techniques'    : tech_results,
            'summary': {
                'total'        : len(tech_results),
                'successful'   : successful,
                'total_pdfs'   : total_pdfs,
                'total_images' : total_images,
            },
            'latex_figures': figures_report,
        }
        with open(os.path.join(run_dir, 'Master_Index.json'), 'w', encoding='utf-8') as f:
            json.dump(master, f, indent=2, ensure_ascii=False)

        zip_path = _create_thesis_zip(export_root, output_dir)

        print(f'[ThesisTest] Done: {successful}/3 succeeded | {total_pdfs} PDFs | {total_images} images')
        print(f'[ThesisTest] ZIP saved to: {zip_path}')

        return {
            'success'      : True,
            'message'      : f'{successful}/3 techniques completed successfully',
            'thesis_folder': archive_run_folder,
            'zip_path'     : zip_path,
            'output_folder': output_dir,
            'total_pdfs'   : total_pdfs,
            'total_images' : total_images,
            'techniques'   : tech_results,
            'latex_figures': figures_report,
        }

    except Exception as e:
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
    finally:
        if work_root and os.path.isdir(work_root):
            shutil.rmtree(work_root, ignore_errors=True)


def _compile_latex_figures(project_dir, thesis_dir, run_dir,
                           ref_path=None, sample_path=None):
    """Build a thesis/figures folder containing LaTeX-ready figure files.

    This function fills the known missing thesis figures that can be produced
    automatically from analysis outputs.

    It intentionally does NOT attempt to capture UI screenshots; those are
    reported as manual requirements.
    """
    import shutil
    figures_dir = os.path.join(thesis_dir, 'Figures')
    os.makedirs(figures_dir, exist_ok=True)

    def _copy(src, dst_name):
        dst = os.path.join(figures_dir, dst_name)
        shutil.copy2(src, dst)
        return dst

    generated = []
    missing = []

    # 1) Chapter 5: copy/rename AI SmartMatch analysis images (5_1..5_13)
    ai_images_dir = os.path.join(run_dir, 'AI_SmartMatch', 'Images')
    for latex_name, image_name in AI_SMARTMATCH_FIGURE_MAP.items():
        src = os.path.join(ai_images_dir, image_name)
        if os.path.exists(src):
            _copy(src, latex_name)
            generated.append(latex_name)
        else:
            missing.append({'figure': latex_name, 'reason': f'Not generated by analysis (missing file: {src})'})

    # 2) Chapter 5 comparative heatmaps: from each technique (5_16..5_18)
    for latex_name, folder in HEATMAP_BY_TECHNIQUE.items():
        src = os.path.join(run_dir, folder, 'Images', 'heatmap.png')
        if os.path.exists(src):
            _copy(src, latex_name)
            generated.append(latex_name)
        else:
            missing.append({'figure': latex_name, 'reason': f'Not generated by analysis (missing file: {src})'})

    # 3) Chapter 5 comparison charts: 5_14 (score bars) + 5_15 (ΔE bars)
    try:
        data = {}
        for folder in ('Direct_Pixel', 'AI_SmartMatch', 'BESTCH'):
            p = os.path.join(run_dir, folder, 'Data.json')
            if os.path.exists(p):
                with open(p, 'r', encoding='utf-8') as f:
                    data[folder] = json.load(f)

        if len(data) >= 2:
            created = _generate_comparison_charts(figures_dir, data)
            generated.extend(created)
        else:
            missing.append({'figure': '5_17.png', 'reason': 'Not enough technique data to generate comparison chart'})
            missing.append({'figure': '5_18.png', 'reason': 'Not enough technique data to generate comparison chart'})
    except Exception as e:
        missing.append({'figure': '5_17.png', 'reason': f'Failed to generate comparison chart: {e}'})
        missing.append({'figure': '5_18.png', 'reason': f'Failed to generate comparison chart: {e}'})

    # 4) Chapter 5: alignment studio images (5_1, 5_2, 5_3) — auto-generated
    try:
        if ref_path and sample_path:
            created = _generate_alignment_studio_figures(
                figures_dir, ref_path, sample_path)
            generated.extend(created)
        else:
            for f in ('5_1.png', '5_2.png', '5_3.png'):
                missing.append({'figure': f, 'reason': 'No image paths available for studio generation'})
    except Exception as e:
        for f in ('5_1.png', '5_2.png', '5_3.png'):
            missing.append({'figure': f, 'reason': f'Failed to generate studio figure: {e}'})

    # 5) Chapter 4 UI screenshots + system flowchart: manual
    for f in ('4_1.png', '4_2.png', '4_3.png', '4_4.png', '4_5.png',
              '4_6.png', '4_7.png', '4_8.png'):
        if f not in generated:
            missing.append({'figure': f, 'reason': 'Manual screenshot required (UI figure)'})


    # 7) Sanity check: report any other required figures not covered
    for f in THESIS_REQUIRED_FIGURES:
        out_path = os.path.join(figures_dir, f)
        if not os.path.exists(out_path) and not any(m.get('figure') == f for m in missing):
            missing.append({'figure': f, 'reason': 'Not generated by automation (no rule defined)'})

    return {
        'figures_dir': figures_dir,
        'required_count': len(THESIS_REQUIRED_FIGURES),
        'generated_count': len({*generated}),
        'generated': sorted({*generated}),
        'missing_count': len(missing),
        'missing': sorted(missing, key=lambda x: x.get('figure', '')),
        'notes': [
            'Chapter 5 alignment studio images (5_1..5_3) are auto-generated.',
            'Chapter 5 figures (5_4..5_16) are exported from AI SmartMatch analysis images.',
            'Chapter 5 comparison charts (5_17, 5_18) are auto-generated from Data.json.',
            'Chapter 5 comparative heatmaps (5_19..5_21) are exported from each technique.',
            'Chapter 4 UI screenshots (4_1..4_8) must be captured/created manually.',
        ],
    }


def _generate_comparison_charts(figures_dir, technique_data):
    """Create 5_17.png (score comparison) and 5_18.png (ΔE comparison)."""
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt

    order = ['Direct_Pixel', 'AI_SmartMatch', 'BESTCH']
    labels = ['Direct Pixel', 'AI SmartMatch', 'BESTCH']

    def _get(d, path, default=0.0):
        cur = d
        for k in path:
            if not isinstance(cur, dict) or k not in cur:
                return default
            cur = cur[k]
        try:
            return float(cur)
        except Exception:
            return default

    color_scores = []
    pattern_scores = []
    overall_scores = []
    mean_de00 = []

    for key in order:
        doc = technique_data.get(key, {})
        color_scores.append(_get(doc, ['scores', 'color_score'], 0.0))
        pattern_scores.append(_get(doc, ['scores', 'pattern_score'], 0.0))
        overall_scores.append(_get(doc, ['scores', 'overall_score'], 0.0))
        mean_de00.append(_get(doc, ['color_analysis', 'mean_de00'], 0.0))

    created = []

    # 5_17: grouped bar chart (color/pattern/overall)
    x = range(len(labels))
    w = 0.25
    fig, ax = plt.subplots(figsize=(8.5, 4.2), dpi=160)
    ax.bar([i - w for i in x], color_scores, width=w, label='Color Score')
    ax.bar([i for i in x], pattern_scores, width=w, label='Pattern Score')
    ax.bar([i + w for i in x], overall_scores, width=w, label='Overall Score')
    ax.set_xticks(list(x))
    ax.set_xticklabels(labels)
    ax.set_ylim(0, 105)
    ax.set_ylabel('Score (%)')
    ax.grid(axis='y', alpha=0.25)
    ax.legend(loc='lower right', frameon=False)
    fig.tight_layout()
    p1 = os.path.join(figures_dir, '5_17.png')
    fig.savefig(p1)
    plt.close(fig)
    created.append('5_17.png')

    # 5_18: bar chart mean ΔE00
    fig, ax = plt.subplots(figsize=(8.5, 3.8), dpi=160)
    ax.bar(labels, mean_de00, color=['#2980B9', '#8E44AD', '#27AE60'])
    ax.set_ylabel('Mean ΔE00')
    ax.grid(axis='y', alpha=0.25)
    fig.tight_layout()
    p2 = os.path.join(figures_dir, '5_18.png')
    fig.savefig(p2)
    plt.close(fig)
    created.append('5_18.png')

    return created


def _generate_alignment_studio_figures(figures_dir, ref_path, sample_path):
    """Create 5_1/5_2/5_3: alignment studio side-by-side images.

    Each figure shows Reference | Technique-Applied Sample, mimicking
    the Alignment Studio preview for each of the three techniques.

    5_1.png — Direct Pixel  (no transformation)
    5_2.png — AI SmartMatch (multi-stage adaptive alignment)
    5_3.png — BESTCH        (best-region crop)
    """
    import cv2
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    from modules.ImageAlignmentBackend import apply_alignment

    ref = cv2.imread(ref_path)
    sam = cv2.imread(sample_path)
    if ref is None or sam is None:
        raise FileNotFoundError(f'Cannot read images: {ref_path}, {sample_path}')

    techniques = [
        ('direct',         'Dogrudan Piksel',
         '5_1.png', 'Referans Goruntu',       'Numune (Degisiklik Yok)'),
        ('ai_smart_match', 'AI SmartMatch',
         '5_2.png', 'Referans Goruntu',       'Hizalanmis Numune'),
        ('bestch',         'BESTCH',
         '5_3.png', 'Referans (Kirpilmis)',   'Numune (Kirpilmis)'),
    ]

    created = []
    for mode, label, fname, ref_title, sam_title in techniques:
        result = apply_alignment(ref.copy(), sam.copy(), mode)
        aligned_sam = result['aligned_sample']
        show_ref = result.get('ref_cropped', ref) if mode == 'bestch' else ref

        ref_rgb = cv2.cvtColor(show_ref, cv2.COLOR_BGR2RGB)
        sam_rgb = cv2.cvtColor(aligned_sam, cv2.COLOR_BGR2RGB)

        fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(13, 5.5), dpi=150)
        ax1.imshow(ref_rgb)
        ax1.set_title(ref_title, fontsize=12, fontweight='bold', pad=10)
        ax1.axis('off')
        ax2.imshow(sam_rgb)
        ax2.set_title(sam_title, fontsize=12, fontweight='bold', pad=10)
        ax2.axis('off')
        fig.suptitle(label, fontsize=14, fontweight='bold', y=0.98)
        fig.tight_layout(rect=[0, 0, 1, 0.94])

        out = os.path.join(figures_dir, fname)
        fig.savefig(out, bbox_inches='tight', facecolor='white', dpi=150)
        plt.close(fig)
        created.append(fname)
        print(f'  [OK] Generated {fname} ({label})')

    return created



def _resolve_images(ref_file_info, sample_file_info, readytotest_dir, temp_dir):
    """Return (ref_path, sample_path, ref_name, sample_name, source_label)."""
    ref_path, ref_name = _materialize_workspace_image(ref_file_info, temp_dir, 'reference')
    sample_path, sample_name = _materialize_workspace_image(sample_file_info, temp_dir, 'sample')

    if ref_path and sample_path:
        return (
            ref_path,
            sample_path,
            ref_name,
            sample_name,
            'Workspace Images',
        )

    # Fallback: built-in Ready-to-Test pair 1
    ref = os.path.join(readytotest_dir, '1.png')
    sam = os.path.join(readytotest_dir, '2.png')
    if not os.path.exists(ref) or not os.path.exists(sam):
        raise FileNotFoundError(
            f'Ready-to-Test images not found in: {readytotest_dir}\n'
            'Please load images in the workspace, or ensure the '
            'READYTOTEST folder exists.'
        )
    return ref, sam, '1.png', '2.png', 'Ready-to-Test Pair 1'


def _materialize_workspace_image(file_info, temp_dir, default_stem):
    if not isinstance(file_info, dict):
        return None, None

    data_url = file_info.get('dataUrl')
    image_name = _safe_image_name(file_info.get('name') or f'{default_stem}.png', default_stem)

    if data_url:
        try:
            return _write_data_url_image(data_url, temp_dir, image_name), image_name
        except Exception as exc:
            print(f'[ThesisTest] WARNING: failed to materialize workspace image {image_name}: {exc}')

    image_path = file_info.get('path')
    if image_path and os.path.exists(image_path):
        return image_path, image_name

    return None, None


def _safe_image_name(name, default_stem):
    base = os.path.basename(name or f'{default_stem}.png')
    stem, ext = os.path.splitext(base)
    stem = stem or default_stem
    ext = ext.lower() if ext else '.png'
    if ext not in {'.png', '.jpg', '.jpeg', '.bmp', '.tif', '.tiff', '.webp'}:
        ext = '.png'
    return f'{stem}{ext}'


def _write_data_url_image(data_url, temp_dir, image_name):
    if ',' not in data_url:
        raise ValueError('Invalid data URL')

    header, encoded = data_url.split(',', 1)
    out_path = os.path.join(temp_dir, image_name)
    with open(out_path, 'wb') as handle:
        handle.write(base64.b64decode(encoded))
    return out_path


def _create_thesis_zip(export_root, output_dir):
    if not output_dir or not os.path.isdir(output_dir):
        raise FileNotFoundError(f'Output folder is not available: {output_dir}')

    zip_path = os.path.join(output_dir, 'TEZ_TESTI.zip')
    if os.path.exists(zip_path):
        os.remove(zip_path)

    with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for root, _, files in os.walk(export_root):
            for file_name in files:
                full_path = os.path.join(root, file_name)
                arcname = os.path.relpath(full_path, os.path.dirname(export_root))
                archive.write(full_path, arcname)

    return zip_path



def _run_technique(tech, base_url, run_dir, settings, region_data,
                   ref_path, sample_path, ref_name, sample_name):
    """Run one analysis technique and save all outputs.  Always returns a dict."""
    mode   = tech['mode']
    folder = tech['folder']
    label  = tech['label']

    tech_dir   = os.path.join(run_dir, folder)
    pdfs_dir   = os.path.join(tech_dir, 'PDFs')
    images_dir = os.path.join(tech_dir, 'Images')
    for d in (pdfs_dir, images_dir):
        os.makedirs(d, exist_ok=True)

    t_start = time.time()

    test_settings = _prepare_thesis_settings(settings)
    test_settings['alignment_mode'] = mode

    try:
        result = _call_analyze(
            base_url, ref_path, sample_path, ref_name, sample_name,
            test_settings, region_data
        )
    except Exception as e:
        traceback.print_exc()
        return {
            'technique': folder, 'mode': mode, 'label': label,
            'success': False, 'error': f'Analysis request failed: {e}',
        }

    if not result.get('success'):
        err = result.get('error', 'Analysis returned success=false')
        print(f'  [FAIL] {label}: {err}')
        return {'technique': folder, 'mode': mode, 'label': label, 'success': False, 'error': err}

    session_id = result.get('session_id', '')
    if not session_id:
        return {
            'technique': folder, 'mode': mode, 'label': label,
            'success': False,
            'error': 'No session_id in analysis response',
        }

    duration = time.time() - t_start
    print(f'  [OK] Analysis done in {duration:.1f}s  |  decision={result.get("decision")}  |  '
          f'color={result.get("color_score",0):.1f}  pattern={result.get("pattern_score",0):.1f}')

    # 2. Download PDFs
    pdf_map = [
        ('Full_Report.pdf',      result.get('pdf_url',           f'/api/download_report/merged/{session_id}')),
        ('Color_Report.pdf',     result.get('color_report_url',  f'/api/download_report/color/{session_id}')),
        ('Pattern_Report.pdf',   result.get('pattern_report_url',f'/api/download_report/pattern/{session_id}')),
        ('Settings_Receipt.pdf', result.get('receipt_url',       f'/api/download_receipt/{session_id}')),
    ]
    pdfs_saved = []
    for pdf_name, pdf_path in pdf_map:
        try:
            data = _fetch(base_url + pdf_path, timeout=120)
            out  = os.path.join(pdfs_dir, pdf_name)
            with open(out, 'wb') as f:
                f.write(data)
            pdfs_saved.append(pdf_name)
        except Exception as e:
            print(f'  [WARN] PDF failed ({pdf_name}): {e}')

    # 3. Download visualization images
    # The response already contains the correct URLs in result['images']
    images_saved = []
    viz = result.get('images') or {}
    for key, img_url in viz.items():
        try:
            data = _fetch(base_url + img_url, timeout=60)
            out  = os.path.join(images_dir, f'{key}.png')
            with open(out, 'wb') as f:
                f.write(data)
            images_saved.append(f'{key}.png')
        except Exception as e:
            print(f'  [WARN] Image failed ({key}): {e}')

    # 4. Save structured Data.json
    data_json = _build_data_json(
        result, mode, label, duration,
        ref_name, sample_name, pdfs_saved, images_saved,
        test_settings, region_data
    )
    json_path = os.path.join(tech_dir, 'Data.json')
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(data_json, f, indent=2, ensure_ascii=False)
    print(f'  [{label}] {len(pdfs_saved)} PDFs  |  {len(images_saved)} images')

    return {
        'technique'       : folder,
        'mode'            : mode,
        'label'           : label,
        'success'         : True,
        'pdfs_saved'      : len(pdfs_saved),
        'images_saved'    : len(images_saved),
        'duration_seconds': round(duration, 2),
        'report_id'       : result.get('report_id', ''),
        'decision'        : result.get('decision', ''),
        'color_score'     : result.get('color_score', 0),
        'pattern_score'   : result.get('pattern_score', 0),
        'overall_score'   : result.get('overall_score', 0),
    }


# HTTP helpers
def _call_analyze(base_url, ref_path, sample_path, ref_name, sample_name,
                  settings, region_data):
    """POST multipart/form-data to /api/analyze and return parsed JSON dict."""
    boundary = b'SpectraMatchThesisBoundary7a2f9c'
    body     = BytesIO()

    def _add_file(field, filename, data, ctype=b'image/png'):
        body.write(b'--' + boundary + b'\r\n')
        body.write(
            b'Content-Disposition: form-data; name="' +
            field.encode() + b'"; filename="' + filename.encode() + b'"\r\n'
        )
        body.write(b'Content-Type: ' + ctype + b'\r\n\r\n')
        body.write(data)
        body.write(b'\r\n')

    def _add_field(field, value):
        body.write(b'--' + boundary + b'\r\n')
        body.write(
            b'Content-Disposition: form-data; name="' + field.encode() + b'"\r\n\r\n'
        )
        body.write(value.encode() if isinstance(value, str) else value)
        body.write(b'\r\n')

    with open(ref_path, 'rb')    as f: _add_file('ref_image',    ref_name,    f.read())
    with open(sample_path, 'rb') as f: _add_file('sample_image', sample_name, f.read())
    _add_field('settings',          json.dumps(settings))
    _add_field('region_data',       json.dumps(region_data))
    _add_field('single_image_mode', 'false')
    body.write(b'--' + boundary + b'--\r\n')

    req = urllib.request.Request(
        f'{base_url}/api/analyze',
        data=body.getvalue(),
        headers={'Content-Type': f'multipart/form-data; boundary={boundary.decode()}'},
    )
    with urllib.request.urlopen(req, timeout=360) as resp:
        raw = resp.read()
    return json.loads(raw.decode('utf-8'))


def _fetch(url, timeout=60):
    """Download a URL and return raw bytes.  Raises on HTTP error."""
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


# Comprehensive JSON builder
def _build_data_json(result, mode, label, duration, ref_name, sample_name,
                     pdfs_saved, images_saved, settings=None, region_data=None):
    """Package the full /api/analyze response into a structured thesis data file.

    Mirrors the full PDF report content: all tables, per-point color data
    (Lab, RGB, XYZ, CMYK), statistics, Lab* analysis, pattern details,
    illuminant table, recommendations, settings, region info, and metadata.
    URL-only fields are excluded (actual files are saved to disk).
    raw_api_fields is a catch-all that captures anything not explicitly mapped.
    """
    _url_fields = {
        'pdf_url', 'receipt_url', 'color_report_url', 'pattern_report_url',
        'images',
    }
    _mapped = {
        'success', 'session_id',
        # scores
        'color_score', 'pattern_score', 'overall_score', 'decision',
        'color_status', 'pattern_status',
        'color_scoring_method', 'color_method_label',
        'pattern_scoring_method', 'pattern_method_label',
        # color analysis
        'mean_de00', 'csi_value',
        'de_statistics', 'color_regions', 'color_averages', 'illuminant_data',
        'color_sampling_radius', 'color_sampling_points', 'color_sampling_count',
        'lab_analysis',
        # pattern analysis
        'pattern_composite', 'pattern_final_status', 'pattern_scores',
        'structural_meta', 'pattern_details',
        # fourier / glcm
        'fourier_data', 'glcm_data',
        # alignment
        'alignment_mode', 'alignment_metrics',
        # recommendations
        'color_findings', 'color_conclusion_text', 'color_conclusion_status',
        'pattern_findings', 'pattern_conclusion_text', 'pattern_conclusion_status',
        # metadata
        'report_id', 'report_date', 'report_time', 'operator',
        'report_size', 'color_report_size', 'pattern_report_size',
        'fn_full', 'fn_color', 'fn_pattern', 'fn_receipt',
        'image_dimensions',
    }

    doc = {
        # ── 1. Metadata ────────────────────────────────────────────────────
        'metadata': {
            'alignment_mode'        : mode,
            'alignment_label'       : label,
            'report_id'             : result.get('report_id',   ''),
            'report_date'           : result.get('report_date', ''),
            'report_time'           : result.get('report_time', ''),
            'operator'              : result.get('operator',    ''),
            'software_version'      : '3.0.0',
            'duration_seconds'      : round(duration, 2),
            'images_used'           : {'reference': ref_name, 'sample': sample_name},
            'image_dimensions'      : result.get('image_dimensions', {}),
            'pdfs_saved'            : pdfs_saved,
            'images_saved'          : images_saved,
            'pdf_filenames': {
                'full'    : result.get('fn_full',    ''),
                'color'   : result.get('fn_color',   ''),
                'pattern' : result.get('fn_pattern', ''),
                'receipt' : result.get('fn_receipt', ''),
            },
            'report_sizes': {
                'full'    : result.get('report_size',         ''),
                'color'   : result.get('color_report_size',   ''),
                'pattern' : result.get('pattern_report_size', ''),
            },
        },

        # ── 2. Overall Scores & Decision ───────────────────────────────────
        'scores': {
            'color_score'            : result.get('color_score',            0),
            'pattern_score'          : result.get('pattern_score',          0),
            'overall_score'          : result.get('overall_score',          0),
            'decision'               : result.get('decision',               ''),
            'color_status'           : result.get('color_status',           ''),
            'pattern_status'         : result.get('pattern_status',         ''),
            'color_scoring_method'   : result.get('color_scoring_method',   ''),
            'color_method_label'     : result.get('color_method_label',     ''),
            'pattern_scoring_method' : result.get('pattern_scoring_method', ''),
            'pattern_method_label'   : result.get('pattern_method_label',   ''),
        },

        # ── 3. Color Analysis (full tables) ───────────────────────────────
        'color_analysis': {
            'mean_de00'         : result.get('mean_de00',              0),
            'csi_value'         : result.get('csi_value',              0),
            'sampling_radius_px': result.get('color_sampling_radius',  0),
            'sampling_count'    : result.get('color_sampling_count',   0),
            'sampling_points'   : result.get('color_sampling_points',  []),
            # Per-point table: id, pos, radius, ΔE76/94/00, status,
            # Lab*/RGB/XYZ/CMYK/RGB-std for ref and sample
            'color_regions'     : result.get('color_regions',          []),
            # Summary averages across all sampled points
            'color_averages'    : result.get('color_averages',         {}),
            # ΔE76/94/00 mean/std/min/max
            'de_statistics'     : result.get('de_statistics',          {}),
            # Lab* detailed analysis: ΔL*, Δa*, Δb*, magnitude, thresholds, status
            'lab_analysis'      : result.get('lab_analysis',           {}),
            # Multi-illuminant table
            'illuminant_data'   : result.get('illuminant_data',        []),
        },

        # ── 4. Pattern Analysis (full tables) ─────────────────────────────
        'pattern_analysis': {
            'composite_score'  : result.get('pattern_composite',    0),
            'final_status'     : result.get('pattern_final_status', ''),
            # Individual metric scores: SSIM, Gradient, Phase, Structural
            'individual_scores': result.get('pattern_scores',       {}),
            # Per-metric: score + pass/cond/fail thresholds + status
            'metric_details'   : result.get('pattern_details',      {}),
            # Structural diff: similarity, change %, pixel counts
            'structural_meta'  : result.get('structural_meta',      {}),
        },

        # ── 5. Fourier Spectral Analysis ───────────────────────────────────
        'fourier_analysis': result.get('fourier_data', {}),

        # ── 6. GLCM Texture Analysis ───────────────────────────────────────
        'glcm_analysis': result.get('glcm_data', {}),

        # ── 7. Alignment ───────────────────────────────────────────────────
        'alignment': {
            'mode'   : result.get('alignment_mode', mode),
            'metrics': result.get('alignment_metrics', {}),
        },

        # ── 8. Recommendations & Conclusions ──────────────────────────────
        'recommendations': {
            'color_findings'            : result.get('color_findings',            []),
            'color_conclusion'          : result.get('color_conclusion_text',     ''),
            'color_conclusion_status'   : result.get('color_conclusion_status',   ''),
            'pattern_findings'          : result.get('pattern_findings',          []),
            'pattern_conclusion'        : result.get('pattern_conclusion_text',   ''),
            'pattern_conclusion_status' : result.get('pattern_conclusion_status', ''),
        },

        # ── 9. All test settings used ──────────────────────────────────────
        'settings_used': settings if settings is not None else {},

        # ── 10. Region / crop data ─────────────────────────────────────────
        'region_data': region_data if region_data is not None else {},

        # ── 11. Catch-all: any API field not explicitly mapped above ───────
        'extra_api_fields': {
            k: v for k, v in result.items()
            if k not in _url_fields and k not in _mapped
        },
    }
    return doc

