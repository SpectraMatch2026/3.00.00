"""
ImageAlignmentBackend.py — SpectraMatch v3.0.0
Image Alignment & Registration Module for Textile Quality Control

Provides 3 professional alignment modes for preprocessing sample images:
1. Direct Pixel — No preprocessing, direct pixel comparison
2. AI SmartMatch — Intelligent multi-strategy adaptive alignment
3. BESTCH — Best matching region detection and comparison

All techniques are designed for textile QC scenarios where:
- Same camera captures both reference and sample
- Minor capture variations: slight tilt, small angle, distance, lighting
- Colors and patterns must NOT be altered — only geometric normalization
"""

import cv2
import numpy as np
from enum import Enum


class AlignmentMode(Enum):
    DIRECT = 'direct'
    AI_SMART_MATCH = 'ai_smart_match'
    BESTCH = 'bestch'


# ═══════════════════════════════════════════════════════════════════
# Mode Metadata
# ═══════════════════════════════════════════════════════════════════

ALIGNMENT_MODES = {
    'direct': {
        'id': 'direct',
        'name': 'Direct Pixel',
        'name_tr': 'Doğrudan Piksel',
        'description': 'No preprocessing applied. Compares images pixel-by-pixel as captured. Best when capture conditions are perfectly controlled.',
        'description_tr': 'Ön işleme uygulanmaz. Görüntüleri çekildiği gibi piksel piksel karşılaştırır. Çekim koşulları mükemmel kontrol edildiğinde en iyisidir.',
        'icon': 'grid',
        'category': 'baseline',
        'handles': [],
    },
    'ai_smart_match': {
        'id': 'ai_smart_match',
        'name': 'AI SmartMatch',
        'name_tr': 'AI SmartMatch',
        'description': 'Intelligent multi-strategy algorithm that automatically finds and aligns corresponding regions. Combines template matching, feature detection, and adaptive geometric correction for optimal results.',
        'description_tr': 'Karşılık gelen bölgeleri otomatik olarak bulan ve hizalayan akıllı çok stratejili algoritma. Optimum sonuçlar için şablon eşleştirme, özellik algılama ve uyarlanabilir geometrik düzeltmeyi birleştirir.',
        'icon': 'cpu',
        'category': 'ai',
        'handles': ['rotation', 'scale', 'translation', 'perspective', 'lighting'],
    },
    'bestch': {
        'id': 'bestch',
        'name': 'BESTCH',
        'name_tr': 'BESTCH',
        'description': 'Best matching region detection. Searches for the most similar region (~25% area) between images and crops both to matching areas. Ideal when sample position differs significantly from reference.',
        'description_tr': 'En iyi eşleşen bölge algılama. Görüntüler arasında en benzer bölgeyi (~%25 alan) arar ve her ikisini de eşleşen alanlara kırpar. Numune konumu referanstan önemli ölçüde farklı olduğunda idealdir.',
        'icon': 'crop',
        'category': 'ai',
        'handles': ['translation', 'cropping'],
    },
}


def get_mode_info(mode_id):
    """Return metadata dict for a given mode."""
    return ALIGNMENT_MODES.get(mode_id, ALIGNMENT_MODES['direct'])


def list_modes():
    """Return list of all mode metadata dicts."""
    return list(ALIGNMENT_MODES.values())


# ═══════════════════════════════════════════════════════════════════
# 1. Direct Pixel Comparison — No preprocessing
# ═══════════════════════════════════════════════════════════════════

def align_direct(ref_img, sample_img, region_data=None):
    """No-op: returns images as-is. This is the current/legacy behavior."""
    return {
        'aligned_sample': sample_img.copy(),
        'transform_matrix': np.eye(3, dtype=np.float64).tolist(),
        'method': 'direct',
        'metrics': {
            'applied': False,
            'description': 'No alignment applied — direct pixel comparison',
        },
    }


# ═══════════════════════════════════════════════════════════════════
# 2. AI SmartMatch — Intelligent Multi-Strategy Alignment
# ═══════════════════════════════════════════════════════════════════

def align_ai_smart_match(ref_img, sample_img, region_data=None):
    """
    Custom AI-based multi-strategy alignment algorithm.

    Combines multiple approaches in a cascade:
    1. Multi-scale normalized template matching to estimate position/scale
    2. AKAZE feature matching for geometric refinement
    3. Sub-pixel ECC refinement on the best candidate
    4. Lighting analysis (non-destructive)

    Returns the best alignment found across all strategies.
    """
    h_ref, w_ref = ref_img.shape[:2]
    h_sam, w_sam = sample_img.shape[:2]

    # ── Stage 1: Multi-scale Template Matching ──
    template = ref_img[:, :, :3] if ref_img.shape[2] >= 3 else ref_img
    search_img = sample_img[:, :, :3] if sample_img.shape[2] >= 3 else sample_img

    template_gray = cv2.cvtColor(template, cv2.COLOR_BGR2GRAY)
    search_gray = cv2.cvtColor(search_img, cv2.COLOR_BGR2GRAY)

    best_match = _multi_scale_template_match(template_gray, search_gray,
                                             color_sample=sample_img,
                                             ref_shape=(h_ref, w_ref))

    # ── Stage 2: Feature-Based Geometric Refinement ──
    feature_result = _feature_guided_alignment(ref_img, sample_img)

    # ── Stage 3: Choose best strategy and refine ──
    strategies = []

    if best_match is not None and best_match.get('aligned_sample') is not None:
        strategies.append(('template', best_match))

    if feature_result is not None and feature_result.get('aligned_sample') is not None:
        strategies.append(('feature', feature_result))

    if not strategies:
        # Fallback: try ECC directly
        ecc_result = _align_ecc(ref_img, sample_img, motion_type='euclidean')
        return {
            'aligned_sample': ecc_result['aligned_sample'],
            'transform_matrix': ecc_result['transform_matrix'],
            'method': 'ai_smart_match',
            'metrics': {
                **ecc_result['metrics'],
                'strategy': 'ecc_fallback',
                'description': 'AI SmartMatch: ECC fallback — ' + ecc_result['metrics'].get('description', ''),
            },
        }

    # Evaluate and select best strategy
    best_strategy = None
    best_aligned = None
    best_score = -1
    best_metrics = {}

    for name, result in strategies:
        aligned = result['aligned_sample']
        score = _compute_alignment_quality(ref_img, aligned)
        if score > best_score:
            best_score = score
            best_strategy = name
            best_aligned = aligned
            best_metrics = result.get('metrics', {})

    # ── Stage 4: Sub-pixel ECC Refinement on best result ──
    try:
        ref_gray_f = cv2.cvtColor(ref_img[:, :, :3], cv2.COLOR_BGR2GRAY)
        best_gray_f = cv2.cvtColor(best_aligned[:, :, :3], cv2.COLOR_BGR2GRAY)
        if best_gray_f.shape[:2] != ref_gray_f.shape[:2]:
            best_gray_f = cv2.resize(best_gray_f, (ref_gray_f.shape[1], ref_gray_f.shape[0]))

        warp_ecc = np.eye(2, 3, dtype=np.float32)
        criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, 50, 1e-5)
        cc, warp_ecc = cv2.findTransformECC(
            ref_gray_f, best_gray_f, warp_ecc,
            cv2.MOTION_EUCLIDEAN, criteria,
            inputMask=None, gaussFiltSize=3
        )

        h_out, w_out = ref_img.shape[:2]
        refined = cv2.warpAffine(
            best_aligned, warp_ecc, (w_out, h_out),
            flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
            borderMode=cv2.BORDER_REPLICATE
        )

        refined_score = _compute_alignment_quality(ref_img, refined)
        if refined_score > best_score:
            best_aligned = refined
            best_score = refined_score
            best_metrics['ecc_refined'] = True
            best_metrics['ecc_cc'] = round(float(cc), 6)
    except Exception:
        pass  # ECC refinement is optional

    # ── Stage 5: Lighting Inspection (non-destructive) ──
    lighting_delta = _analyze_lighting_difference(ref_img, best_aligned)

    # Build comprehensive metrics
    return {
        'aligned_sample': best_aligned,
        'transform_matrix': best_metrics.get('transform_matrix', np.eye(3).tolist()),
        'method': 'ai_smart_match',
        'metrics': {
            'applied': True,
            'strategy': best_strategy,
            'alignment_quality': round(float(best_score), 4),
            'rotation_deg': best_metrics.get('rotation_deg', 0),
            'scale_factor': best_metrics.get('scale_factor', 1.0),
            'translation_x': best_metrics.get('translation_x', 0),
            'translation_y': best_metrics.get('translation_y', 0),
            'ecc_refined': best_metrics.get('ecc_refined', False),
            'ecc_cc': best_metrics.get('ecc_cc', 0),
            'lighting_delta': lighting_delta,
            'description': f'AI SmartMatch via {best_strategy}: quality={best_score:.4f}, lighting_delta={lighting_delta:.2f}',
        },
    }


def _multi_scale_template_match(template_gray, search_gray,
                                scale_range=(0.85, 1.15), scale_steps=7,
                                color_sample=None, ref_shape=None):
    """Multi-scale normalized cross-correlation template matching."""
    h_t, w_t = template_gray.shape[:2]
    h_s, w_s = search_gray.shape[:2]

    pad = max(int(max(h_t, w_t) * 0.20), 30)
    search_padded = cv2.copyMakeBorder(search_gray, pad, pad, pad, pad,
                                       cv2.BORDER_REPLICATE)
    h_sp, w_sp = search_padded.shape[:2]

    best_val = -1
    best_scale = 1.0
    best_loc = (0, 0)

    scales = np.linspace(scale_range[0], scale_range[1], scale_steps)

    for scale in scales:
        new_w = int(w_t * scale)
        new_h = int(h_t * scale)

        if new_w >= w_sp or new_h >= h_sp or new_w < 10 or new_h < 10:
            continue

        resized_template = cv2.resize(template_gray, (new_w, new_h))

        result = cv2.matchTemplate(search_padded, resized_template,
                                   cv2.TM_CCOEFF_NORMED)
        _, max_val, _, max_loc = cv2.minMaxLoc(result)

        if max_val > best_val:
            best_val = max_val
            best_scale = scale
            best_loc = (max_loc[0] - pad, max_loc[1] - pad)

    if best_val < 0.3 or color_sample is None:
        return None

    # Build affine transform
    sx = 1.0 / best_scale
    sy = 1.0 / best_scale
    tx = -best_loc[0] * sx
    ty = -best_loc[1] * sy

    M = np.float32([[sx, 0, tx], [0, sy, ty]])

    h_out = ref_shape[0] if ref_shape else h_t
    w_out = ref_shape[1] if ref_shape else w_t

    aligned = cv2.warpAffine(color_sample, M, (w_out, h_out),
                             flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_REPLICATE)

    return {
        'aligned_sample': aligned,
        'metrics': {
            'match_score': round(float(best_val), 4),
            'scale_factor': round(float(best_scale), 4),
            'translation_x': round(float(tx), 2),
            'translation_y': round(float(ty), 2),
            'transform_matrix': M.tolist(),
        },
    }


def _feature_guided_alignment(ref_img, sample_img):
    """Use AKAZE features for geometric verification and alignment."""
    ref_gray = cv2.cvtColor(ref_img[:, :, :3], cv2.COLOR_BGR2GRAY) if ref_img.shape[2] >= 3 else ref_img
    sam_gray = cv2.cvtColor(sample_img[:, :, :3], cv2.COLOR_BGR2GRAY) if sample_img.shape[2] >= 3 else sample_img

    detector = cv2.AKAZE_create()
    kp_ref, desc_ref = detector.detectAndCompute(ref_gray, None)
    kp_sam, desc_sam = detector.detectAndCompute(sam_gray, None)

    if desc_ref is None or desc_sam is None or len(kp_ref) < 8 or len(kp_sam) < 8:
        return None

    bf = cv2.BFMatcher(cv2.NORM_HAMMING)
    raw_matches = bf.knnMatch(desc_sam, desc_ref, k=2)

    good_matches = []
    for pair in raw_matches:
        if len(pair) == 2:
            m, n = pair
            if m.distance < 0.7 * n.distance:
                good_matches.append(m)

    if len(good_matches) < 8:
        return None

    src_pts = np.float32([kp_sam[m.queryIdx].pt for m in good_matches]).reshape(-1, 1, 2)
    dst_pts = np.float32([kp_ref[m.trainIdx].pt for m in good_matches]).reshape(-1, 1, 2)

    M, inliers = cv2.estimateAffinePartial2D(src_pts, dst_pts, method=cv2.RANSAC, ransacReprojThreshold=5.0)

    if M is None:
        return None

    inlier_count = int(inliers.sum()) if inliers is not None else 0

    rotation_deg = np.degrees(np.arctan2(M[1, 0], M[0, 0]))
    scale_factor = np.sqrt(M[0, 0]**2 + M[1, 0]**2)
    tx = M[0, 2]
    ty = M[1, 2]

    if abs(rotation_deg) > 15 or scale_factor < 0.7 or scale_factor > 1.4:
        return None

    h, w = ref_img.shape[:2]
    aligned = cv2.warpAffine(sample_img, M, (w, h),
                             flags=cv2.INTER_LINEAR,
                             borderMode=cv2.BORDER_REPLICATE)

    return {
        'aligned_sample': aligned,
        'metrics': {
            'good_matches': len(good_matches),
            'inliers': inlier_count,
            'rotation_deg': round(float(rotation_deg), 3),
            'scale_factor': round(float(scale_factor), 4),
            'translation_x': round(float(tx), 2),
            'translation_y': round(float(ty), 2),
            'transform_matrix': M.tolist(),
        },
    }


def _compute_alignment_quality(ref_img, aligned_img):
    """Compute normalized cross-correlation as alignment quality metric."""
    ref_gray = cv2.cvtColor(ref_img[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float64)
    ali_gray = cv2.cvtColor(aligned_img[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float64)

    if ali_gray.shape[:2] != ref_gray.shape[:2]:
        ali_gray = cv2.resize(ali_gray, (ref_gray.shape[1], ref_gray.shape[0]))

    ref_norm = ref_gray - ref_gray.mean()
    ali_norm = ali_gray - ali_gray.mean()

    denom = np.sqrt(np.sum(ref_norm**2) * np.sum(ali_norm**2))
    if denom < 1e-10:
        return 0.0

    ncc = np.sum(ref_norm * ali_norm) / denom
    return float(ncc)


def _analyze_lighting_difference(ref_img, sample_img):
    """Analyze mean brightness difference between images (non-destructive)."""
    ref_gray = cv2.cvtColor(ref_img[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float64)
    sam_gray = cv2.cvtColor(sample_img[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float64)

    if sam_gray.shape[:2] != ref_gray.shape[:2]:
        sam_gray = cv2.resize(sam_gray, (ref_gray.shape[1], ref_gray.shape[0]))

    ref_mean = ref_gray.mean()
    sam_mean = sam_gray.mean()

    if ref_mean < 1e-10:
        return 0.0

    delta_pct = ((sam_mean - ref_mean) / ref_mean) * 100.0
    return round(float(delta_pct), 2)


def _align_ecc(ref_img, sample_img, motion_type='affine', max_iterations=200, epsilon=1e-6):
    """Internal ECC alignment helper (used by AI SmartMatch)."""
    MOTION_MAP = {
        'translation': cv2.MOTION_TRANSLATION,
        'euclidean': cv2.MOTION_EUCLIDEAN,
        'affine': cv2.MOTION_AFFINE,
    }
    cv_motion = MOTION_MAP.get(motion_type, cv2.MOTION_AFFINE)

    h, w = ref_img.shape[:2]

    work_sample = sample_img.copy()
    if work_sample.shape[:2] != (h, w):
        work_sample = cv2.resize(work_sample, (w, h))

    warp_matrix = np.eye(2, 3, dtype=np.float32)

    ref_gray = cv2.cvtColor(ref_img[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float32) if ref_img.shape[2] >= 3 else ref_img.astype(np.float32)
    sam_gray = cv2.cvtColor(work_sample[:, :, :3], cv2.COLOR_BGR2GRAY).astype(np.float32) if work_sample.shape[2] >= 3 else work_sample.astype(np.float32)

    criteria = (cv2.TERM_CRITERIA_EPS | cv2.TERM_CRITERIA_COUNT, max_iterations, epsilon)

    try:
        cc, warp_matrix = cv2.findTransformECC(
            ref_gray, sam_gray, warp_matrix, cv_motion, criteria,
            inputMask=None, gaussFiltSize=5
        )

        aligned = cv2.warpAffine(
            work_sample, warp_matrix, (w, h),
            flags=cv2.INTER_LINEAR + cv2.WARP_INVERSE_MAP,
            borderMode=cv2.BORDER_REPLICATE
        )

        rotation_deg = np.degrees(np.arctan2(warp_matrix[1, 0], warp_matrix[0, 0]))
        scale_x = np.sqrt(warp_matrix[0, 0]**2 + warp_matrix[1, 0]**2)
        scale_y = np.sqrt(warp_matrix[0, 1]**2 + warp_matrix[1, 1]**2)
        tx = warp_matrix[0, 2]
        ty = warp_matrix[1, 2]

        return {
            'aligned_sample': aligned,
            'transform_matrix': warp_matrix.tolist(),
            'method': 'ecc_internal',
            'metrics': {
                'applied': True,
                'correlation_coefficient': round(float(cc), 6),
                'motion_type': motion_type,
                'rotation_deg': round(float(rotation_deg), 3),
                'scale_x': round(float(scale_x), 4),
                'scale_y': round(float(scale_y), 4),
                'translation_x': round(float(tx), 2),
                'translation_y': round(float(ty), 2),
                'description': f'ECC: cc={cc:.4f}, rotation={rotation_deg:.2f}°, shift=({tx:.1f}, {ty:.1f})px',
            },
        }

    except cv2.error as e:
        return {
            'aligned_sample': work_sample,
            'transform_matrix': np.eye(2, 3, dtype=np.float32).tolist(),
            'method': 'ecc_internal',
            'metrics': {
                'applied': False,
                'reason': f'ECC convergence failed: {str(e)}',
            },
        }


# ═══════════════════════════════════════════════════════════════════
# 3. BESTCH — Best Matching Region
# ═══════════════════════════════════════════════════════════════════

BESTCH_TARGET_AREA_RATIO = 0.25
BESTCH_SIMILARITY_LOW = 0.50
BESTCH_WORKING_DIM = 400


def align_bestch(ref_img, sample_img, region_data=None, force_low_similarity=False):
    """
    BESTCH - Best Matching Region technique.

    Searches for the most similar ~25%-area region between the reference
    and sample images. The matching regions may be at completely
    different positions in each image.

    Algorithm:
    1. Compute patch size (~50% of each dimension = ~25% area)
    2. Downscale both images to working resolution for speed
    3. Slide patch across reference image (coarse grid)
    4. For each reference patch, matchTemplate finds best position in sample
    5. Select overall best (ref_pos, sample_pos) pair
    6. Refine sample position at full resolution
    7. Crop both images at respective positions and return
    """
    h_ref, w_ref = ref_img.shape[:2]
    h_sam, w_sam = sample_img.shape[:2]
    total_area = h_ref * w_ref

    # Patch dimensions (~25% area => ~50% each side)
    ratio = float(np.sqrt(BESTCH_TARGET_AREA_RATIO))
    pw_full = int(w_ref * ratio)
    ph_full = int(h_ref * ratio)
    pw_full = max(32, min(pw_full, w_ref, w_sam))
    ph_full = max(32, min(ph_full, h_ref, h_sam))

    if pw_full < 32 or ph_full < 32:
        return _bestch_fail(ref_img, sample_img, 'Images too small for region matching')

    ref_gray = cv2.cvtColor(ref_img[:, :, :3], cv2.COLOR_BGR2GRAY)
    sam_gray = cv2.cvtColor(sample_img[:, :, :3], cv2.COLOR_BGR2GRAY)

    # Downscale factor
    max_dim = max(w_ref, h_ref, w_sam, h_sam)
    ds = max(1, int(round(max_dim / BESTCH_WORKING_DIM)))

    if ds > 1:
        ref_small = cv2.resize(ref_gray, (max(1, w_ref // ds), max(1, h_ref // ds)), interpolation=cv2.INTER_AREA)
        sam_small = cv2.resize(sam_gray, (max(1, w_sam // ds), max(1, h_sam // ds)), interpolation=cv2.INTER_AREA)
        pw_s = max(8, pw_full // ds)
        ph_s = max(8, ph_full // ds)
    else:
        ref_small = ref_gray
        sam_small = sam_gray
        pw_s = pw_full
        ph_s = ph_full

    h_rs, w_rs = ref_small.shape[:2]
    h_ss, w_ss = sam_small.shape[:2]

    if pw_s > w_ss or ph_s > h_ss:
        return _bestch_fail(ref_img, sample_img, 'Sample image too small for patch matching')

    # Phase 1: coarse sliding-window search
    stride = max(1, min(pw_s, ph_s) // 6)
    best_score = -1.0
    best_ref_s = (0, 0)
    best_sam_s = (0, 0)

    for ry in range(0, h_rs - ph_s + 1, stride):
        for rx in range(0, w_rs - pw_s + 1, stride):
            patch = ref_small[ry:ry + ph_s, rx:rx + pw_s]
            res = cv2.matchTemplate(sam_small, patch, cv2.TM_CCOEFF_NORMED)
            _, max_val, _, max_loc = cv2.minMaxLoc(res)
            if max_val > best_score:
                best_score = float(max_val)
                best_ref_s = (rx, ry)
                best_sam_s = (int(max_loc[0]), int(max_loc[1]))

    if best_score < 0:
        return _bestch_fail(ref_img, sample_img, 'No matching region found')

    # Scale back to full resolution
    ref_x = max(0, min(best_ref_s[0] * ds, w_ref - pw_full))
    ref_y = max(0, min(best_ref_s[1] * ds, h_ref - ph_full))

    # Phase 2: refine sample position at full resolution
    ref_patch_full = ref_gray[ref_y:ref_y + ph_full, ref_x:ref_x + pw_full]

    if (ref_patch_full.shape[0] == ph_full and ref_patch_full.shape[1] == pw_full
            and h_sam >= ph_full and w_sam >= pw_full):
        res_full = cv2.matchTemplate(sam_gray, ref_patch_full, cv2.TM_CCOEFF_NORMED)
        _, refined_score, _, refined_loc = cv2.minMaxLoc(res_full)
        best_score = float(refined_score)
        sam_x = int(refined_loc[0])
        sam_y = int(refined_loc[1])
    else:
        sam_x = max(0, min(best_sam_s[0] * ds, w_sam - pw_full))
        sam_y = max(0, min(best_sam_s[1] * ds, h_sam - ph_full))

    # Final bounds clamp
    ref_x = max(0, min(int(ref_x), w_ref - pw_full))
    ref_y = max(0, min(int(ref_y), h_ref - ph_full))
    sam_x = max(0, min(sam_x, w_sam - pw_full))
    sam_y = max(0, min(sam_y, h_sam - ph_full))

    # Crop both images
    ref_cropped = ref_img[ref_y:ref_y + ph_full, ref_x:ref_x + pw_full].copy()
    sam_cropped = sample_img[sam_y:sam_y + ph_full, sam_x:sam_x + pw_full].copy()

    # Metrics
    display_similarity = round(max(best_score, 0.0) * 100, 1)
    area_ratio = float(pw_full * ph_full) / float(total_area)
    low_sim = bool(best_score < BESTCH_SIMILARITY_LOW and not force_low_similarity)

    return {
        'aligned_sample': sam_cropped,
        'ref_cropped': ref_cropped,
        'transform_matrix': np.eye(3, dtype=np.float64).tolist(),
        'method': 'bestch',
        'metrics': {
            'applied': True,
            'similarity': float(display_similarity),
            'raw_similarity': round(max(best_score, 0.0), 6),
            'area_ratio': round(area_ratio, 4),
            'area_percent': round(area_ratio * 100.0, 1),
            'ref_crop': {'x': int(ref_x), 'y': int(ref_y), 'w': int(pw_full), 'h': int(ph_full)},
            'sample_crop': {'x': int(sam_x), 'y': int(sam_y), 'w': int(pw_full), 'h': int(ph_full)},
            'crop_size': f'{pw_full}x{ph_full}',
            'original_size': f'{w_ref}x{h_ref}',
            'low_similarity': low_sim,
            'description': f'BESTCH: {display_similarity}% region match, {area_ratio*100:.1f}% area, ref@({ref_x},{ref_y}) sample@({sam_x},{sam_y})',
        },
    }


def _bestch_fail(ref_img, sample_img, reason):
    """Return standard failure dict for BESTCH."""
    return {
        'aligned_sample': sample_img.copy(),
        'ref_cropped': ref_img.copy(),
        'transform_matrix': np.eye(3, dtype=np.float64).tolist(),
        'method': 'bestch',
        'metrics': {
            'applied': False,
            'reason': str(reason),
            'low_similarity': True,
            'similarity': 0.0,
            'area_percent': 0.0,
        },
    }


# ═══════════════════════════════════════════════════════════════════
# Unified Alignment Dispatcher
# ═══════════════════════════════════════════════════════════════════

def apply_alignment(ref_img, sample_img, mode='direct', region_data=None, **kwargs):
    """
    Main entry point — dispatch to the appropriate alignment method.

    Args:
        ref_img: Reference image (numpy BGR/BGRA)
        sample_img: Sample image (numpy BGR/BGRA)
        mode: One of 'direct', 'ai_smart_match', 'bestch'
        region_data: Optional region selection data dict
        **kwargs: Additional method-specific parameters

    Returns:
        dict with keys: aligned_sample, transform_matrix, method, metrics
    """
    DISPATCH = {
        'direct': align_direct,
        'ai_smart_match': align_ai_smart_match,
        'bestch': align_bestch,
    }

    align_fn = DISPATCH.get(mode, align_direct)

    try:
        result = align_fn(ref_img, sample_img, region_data=region_data, **kwargs)
    except Exception as e:
        print(f"[ImageAlignment] Error in {mode}: {e}")
        import traceback
        traceback.print_exc()
        result = {
            'aligned_sample': sample_img.copy(),
            'transform_matrix': np.eye(3).tolist(),
            'method': mode,
            'metrics': {
                'applied': False,
                'reason': f'Error: {str(e)}',
            },
        }

    return result


def generate_preview_images(ref_img, sample_img, result):
    """
    Generate visualization images for the SPACTRA Studio preview.
    Returns the aligned image in base64 format.
    For BESTCH, also returns the cropped reference image.
    """
    import base64

    previews = {}
    aligned = result['aligned_sample']

    ali_bgr = aligned[:, :, :3] if aligned.shape[2] >= 3 else aligned

    # Always include the reference image (already cropped by caller when region is active)
    ref_bgr = ref_img[:, :, :3] if ref_img.shape[2] >= 3 else ref_img
    previews['ref_source'] = _img_to_base64(ref_bgr)

    # For BESTCH, images may be further cropped by the algorithm itself
    if result.get('method') == 'bestch' and result.get('ref_cropped') is not None:
        ref_cropped = result['ref_cropped']
        rc_bgr = ref_cropped[:, :, :3] if ref_cropped.shape[2] >= 3 else ref_cropped
        previews['ref_cropped'] = _img_to_base64(rc_bgr)
        previews['aligned'] = _img_to_base64(ali_bgr)
    else:
        h, w = ref_img.shape[:2]
        if ali_bgr.shape[:2] != (h, w):
            ali_bgr = cv2.resize(ali_bgr, (w, h))
        previews['aligned'] = _img_to_base64(ali_bgr)

    return previews


def _img_to_base64(img):
    """Encode OpenCV image to base64 PNG string."""
    import base64
    _, buffer = cv2.imencode('.png', img)
    return base64.b64encode(buffer).decode('utf-8')
