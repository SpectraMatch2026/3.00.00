# -*- coding: utf-8 -*-
"""
PDF Report Translations Module
Provides Turkish and English translations for all PDF reports.
Technical terms include original English in parentheses for clarity.
"""

# =================================================================================================
# REPORT TRANSLATIONS - ENGLISH & TURKISH
# =================================================================================================

TRANSLATIONS = {
    'en': {
        # Common / Shared
        'report_title': 'Quality Control Report',
        'color_report_title': 'Color Analysis Report',
        'pattern_report_title': 'Pattern Analysis Report',
        'single_image_title': 'Single Image Analysis Report',
        'config_report_title': 'Configuration Receipt',
        'generated_on': 'Generated on',
        'operator': 'Operator',
        'report_id': 'Report ID',
        'software_version': 'Software Version',
        'page': 'Page',
        'of': 'of',
        'confidential': 'CONFIDENTIAL',
        'summary': 'Summary',
        'details': 'Details',
        'conclusion': 'Conclusion',
        'recommendations': 'Recommendations',
        'pass': 'PASS',
        'fail': 'FAIL',
        'conditional': 'CONDITIONAL',
        'status': 'Status',
        'result': 'Result',
        'value': 'Value',
        'threshold': 'Threshold',
        'reference': 'Reference',
        'sample': 'Sample',
        'difference': 'Difference',
        'score': 'Score',
        'overall': 'Overall',
        'region': 'Region',
        'point': 'Point',
        'average': 'Average',
        'minimum': 'Minimum',
        'maximum': 'Maximum',
        'std_dev': 'Std. Deviation',
        'notes': 'Notes',
        'warning': 'Warning',
        'info': 'Information',
        
        # Color Report Specific
        'color_analysis': 'Color Analysis',
        'color_difference': 'Color Difference',
        'delta_e': 'Delta E',
        'delta_e_2000': 'ΔE00',
        'color_spaces': 'Color Spaces',
        'rgb_values': 'RGB Values',
        'lab_values': 'Lab* Values',
        'xyz_values': 'XYZ Values',
        'cmyk_values': 'CMYK Values',
        'color_metrics': 'Color Metrics',
        'diff_metrics': 'Difference Metrics',
        'illuminant': 'Illuminant',
        'illuminant_analysis': 'Illuminant Analysis',
        'primary_illuminant': 'Primary Illuminant',
        'color_similarity_index': 'CSI (Full-image ΔE00)',
        'csi': 'CSI',
        'pass_threshold': 'Pass Threshold',
        'conditional_threshold': 'Conditional Threshold',
        'global_acceptance': 'Global Acceptance',
        'regional_analysis': 'Regional Analysis',
        'sampling_points': 'Sampling Points',
        'color_swatch': 'Color Swatch',
        'visual_comparison': 'Visual Comparison',
        'spectral_proxy': 'Spectral Proxy',
        'detailed_statistics': 'Detailed Statistics',
        'visualizations': 'Visualizations',
        'visual_diff': 'Visual Difference',
        'ref_color': 'Reference Color',
        'sample_color': 'Sample Color',
        'lightness': 'Lightness',
        'chroma': 'Chroma',
        'hue': 'Hue',
        'red': 'Red',
        'green': 'Green',
        'blue': 'Blue',
        
        # Pattern Report Specific
        'pattern_analysis': 'Pattern Analysis',
        'structural_similarity': 'Structural Similarity',
        'ssim': 'SSIM',
        'gradient_similarity': 'Gradient Similarity',
        'phase_correlation': 'Phase Correlation',
        'structural_difference': 'Structural Difference',
        'pattern_score': 'Pattern Score',
        'similarity_score': 'Similarity Score',
        'change_percentage': 'Change Percentage',
        'total_pixels': 'Total Pixels',
        'changed_pixels': 'Changed Pixels',
        'method_results': 'Method Results',
        'composite_analysis': 'Composite Analysis',
        'boundary_analysis': 'Boundary Analysis',
        'gradient_boundary': 'Gradient Boundary',
        'phase_boundary': 'Phase Boundary',
        'texture_analysis': 'Texture Analysis',
        'edge_detection': 'Edge Detection',
        'frequency_analysis': 'Frequency Analysis',
        
        # Single Image Report Specific
        'single_image_analysis': 'Single Image Analysis',
        'color_measurement': 'Color Measurement',
        'measurement_points': 'Measurement Points',
        'spectral_analysis': 'Spectral Analysis',
        'color_distribution': 'Color Distribution',
        'dominant_colors': 'Dominant Colors',
        'color_histogram': 'Color Histogram',
        
        # Configuration Report Specific
        'configuration_settings': 'Configuration Settings',
        'analysis_parameters': 'Analysis Parameters',
        'color_unit_settings': 'Color Unit Settings',
        'pattern_unit_settings': 'Pattern Unit Settings',
        'threshold_settings': 'Threshold Settings',
        'illuminant_settings': 'Illuminant Settings',
        'report_sections': 'Report Sections',
        'enabled': 'Enabled',
        'disabled': 'Disabled',
        'region_shape': 'Region Shape',
        'circle': 'Circle',
        'square': 'Square',
        'rectangle': 'Rectangle',
        'diameter': 'Diameter',
        'width': 'Width',
        'height': 'Height',
        'timezone_offset': 'Timezone Offset',
        
        # Verdicts and Messages
        'excellent_match': 'Excellent match - colors are virtually identical',
        'good_match': 'Good match - acceptable color difference',
        'marginal_match': 'Marginal match - noticeable color difference',
        'poor_match': 'Poor match - significant color difference',
        'no_match': 'No match - colors are distinctly different',
        'within_tolerance': 'Within tolerance',
        'outside_tolerance': 'Outside tolerance',
        'requires_review': 'Requires review',
        'approved': 'Approved',
        'rejected': 'Rejected',
        
        # Cover Page
        'cover_subtitle': 'Professional Quality Control Solutions',
        'cover_company': 'Textile Engineering Solutions',
        'analysis_date': 'Analysis Date',
        'analysis_time': 'Analysis Time',
        'document_id': 'Document ID',
        'prepared_by': 'Prepared By',
        'reviewed_by': 'Reviewed By',
        'approved_by': 'Approved By',
        
        # Footer
        'footer_confidential': 'This document is confidential and for authorized personnel only.',
        'footer_generated': 'This report was automatically generated.',
        'all_rights_reserved': 'All rights reserved.',
        
        # Executive Summary
        'executive_summary': 'Executive Summary',
        'analysis_overview': 'Analysis Overview',
        'key_findings': 'Key Findings',
        'final_decision': 'Final Decision',
        'accept': 'ACCEPT',
        'reject': 'REJECT',
        'review': 'REVIEW',
        
        # Color Analysis Extended
        'color_quality_assessment': 'Color Quality Assessment',
        'color_consistency': 'Color Consistency',
        'color_accuracy': 'Color Accuracy',
        'color_uniformity': 'Color Uniformity',
        'color_deviation': 'Color Deviation',
        'acceptable_range': 'Acceptable Range',
        'measured_value': 'Measured Value',
        'target_value': 'Target Value',
        'tolerance_range': 'Tolerance Range',
        'color_space': 'Color Space',
        'reference_image': 'Reference Image',
        'sample_image': 'Sample Image',
        'color_difference_map': 'Color Difference Map',
        'heatmap': 'Heatmap',
        'legend': 'Legend',
        'scale': 'Scale',
        
        # Statistics
        'statistical_analysis': 'Statistical Analysis',
        'mean': 'Mean',
        'median': 'Median',
        'mode': 'Mode',
        'variance': 'Variance',
        'standard_deviation': 'Standard Deviation',
        'range': 'Range',
        'count': 'Count',
        'total': 'Total',
        'percentage': 'Percentage',
        
        # Pattern Analysis Extended
        'pattern_quality_assessment': 'Pattern Quality Assessment',
        'pattern_consistency': 'Pattern Consistency',
        'pattern_accuracy': 'Pattern Accuracy',
        'pattern_alignment': 'Pattern Alignment',
        'pattern_repeat': 'Pattern Repeat',
        'pattern_distortion': 'Pattern Distortion',
        'structural_integrity': 'Structural Integrity',
        'texture_quality': 'Texture Quality',
        'edge_sharpness': 'Edge Sharpness',
        'contrast_ratio': 'Contrast Ratio',
        'brightness_uniformity': 'Brightness Uniformity',
        
        # Method Names
        'method': 'Method',
        'algorithm': 'Algorithm',
        'technique': 'Technique',
        'approach': 'Approach',
        
        # Table Headers
        'metric': 'Metric',
        'parameter': 'Parameter',
        'setting': 'Setting',
        'description': 'Description',
        'unit': 'Unit',
        'criteria': 'Criteria',
        'evaluation': 'Evaluation',
        
        # Decision Messages
        'decision_accept': 'Sample meets quality standards.',
        'decision_reject': 'Sample does not meet quality standards.',
        'decision_conditional': 'Sample conditionally accepted, requires review.',
        
        # Recommendations
        'rec_accept': 'Sample is suitable for production.',
        'rec_reject': 'Sample should be re-evaluated or rejected.',
        'rec_conditional': 'Additional testing or manual review recommended.',
        
        # Additional Terms
        'image': 'Image',
        'images': 'Images',
        'comparison': 'Comparison',
        'analysis': 'Analysis',
        'report': 'Report',
        'date': 'Date',
        'time': 'Time',
        'version': 'Version',
        'type': 'Type',
        'name': 'Name',
        'id': 'ID',
        'number': 'Number',
        'index': 'Index',
        'level': 'Level',
        'grade': 'Grade',
        'class': 'Class',
        'category': 'Category',
        'group': 'Group',
        'batch': 'Batch',
        'lot': 'Lot',
        'serial': 'Serial',
        
        # Units
        'pixels': 'pixels',
        'percent': 'percent',
        'degrees': 'degrees',
        'points': 'points',
        'units': 'units',
        
        # Actions
        'view': 'View',
        'download': 'Download',
        'print': 'Print',
        'save': 'Save',
        'export': 'Export',
        
        # Settings Report Specific
        'color_unit_settings': 'COLOR UNIT SETTINGS',
        'pattern_unit_settings': 'PATTERN UNIT SETTINGS',
        'single_image_unit_settings': 'SINGLE IMAGE UNIT SETTINGS',
        'report_sections': 'REPORT SECTIONS',
        'processed_images_log': 'PROCESSED IMAGES LOG',
        'analysis_results': 'Analysis Results',
        'no_images_recorded': 'No images recorded.',
        'decision': 'DECISION',
        'color_score': 'Color Score',
        'pattern_score': 'Pattern Score',
        'overall_score': 'Overall Score',
        'overall_score_note': 'Pattern Score / Color Score',
        'overall_score_explainer': 'Pattern is shown as a normalized similarity score; color is shown as the selected raw metric.',
        'status_label': 'STATUS',
        'complete': 'COMPLETE',
        'accept': 'ACCEPT',
        'reject': 'REJECT',
        'pending': 'PENDING',
        'sample_before_alignment': 'Sample Before Alignment',
        'aligned_sample': 'Aligned Sample',
        'alignment_technique': 'Alignment Technique',
        'alignment_direct': 'Direct Pixel',
        'alignment_ai_smart_match': 'AI SmartMatch',
        'alignment_bestch': 'BESTCH',
        
        # Settings Labels
        'sampling_mode': 'Sampling Mode',
        'sampling_count': 'Sampling Count',
        'cond_threshold': 'Cond Threshold',
        'global_thresh': 'Global Thresh',
        'csi_good': 'CSI Pass',
        'csi_warn': 'CSI Conditional',
        'ssim_pass': 'SSIM Pass',
        'ssim_cond': 'SSIM Cond',
        'grad_pass': 'Grad Pass',
        'grad_cond': 'Grad Cond',
        'phase_pass': 'Phase Pass',
        'phase_cond': 'Phase Cond',
        'structural_pass': 'Structural Pass',
        'structural_cond': 'Structural Cond',
        
        # Section Names for Checklist
        'color_unit': 'Color Unit',
        'pattern_unit': 'Pattern Unit',
        'single_image_unit': 'Single Image Unit',
        'rgb': 'RGB',
        'lab': 'L*a*b*',
        'xyz': 'XYZ',
        'cmyk': 'CMYK',
        'stats': 'Statistics',
        'detailed_lab': 'Detailed Lab',
        'spectral': 'Spectral Data',
        'csi_under_heatmap': 'CSI under Heatmap',
        'recommendations_color': 'Recommendations',
        'ssim': 'SSIM',
        'gradient': 'Gradient Sim',
        'phase': 'Phase Corr',
        'structural': 'Structural Diff',
        'gradient_boundary': 'Grad Boundary',
        'phase_boundary': 'Phase Boundary',
        'recommendations_pattern': 'Recommendations',
        'fourier': 'Fourier Analysis',
        'glcm': 'GLCM Texture',
        'histograms': 'Histograms',
        'exec_summary': 'Executive Summary',
        'uniform': 'uniform',
        'grad_diff_sensitivity': 'Gradient Diff Sensitivity',
        'phase_diff_sensitivity': 'Phase Diff Sensitivity',
        'grad_bound_sensitivity': 'Gradient Boundary Sensitivity',
        'phase_bound_sensitivity': 'Phase Boundary Sensitivity',
        'structural_sensitivity': 'Structural Sensitivity',
        'random': 'random',
        'manual': 'manual',
        'report_language': 'Report Language',
        'test_illuminants': 'Test Illuminants',
        'pattern_global_threshold': 'Pattern Global Threshold',
        'general_settings': 'General Settings',
        'color_scoring_method': 'Color Scoring Method',
        'delta_e_2000': 'ΔE00',
        'csi_method': 'CSI (Full-image ΔE00)',
        'csi2000_method': 'CSI2000 (Average of CSI & ΔE00)',
        'pattern_scoring_method': 'Pattern Scoring Method',
        'pattern_method_all': 'All (Average)',
        'pattern_method_ssim': 'Structural SSIM',
        'pattern_method_gradient': 'Gradient Similarity',
        'pattern_method_phase': 'Phase Correlation',
        'pattern_method_structural': 'Structural Match',
        'unified_report_title': 'Color & Pattern Analysis Report',
        'color_module': 'Color Module',
        'pattern_module': 'Pattern Module',
        'color_score_label': 'Color Score',
        'pattern_score_label': 'Pattern Score',
        
        # Table data labels
        'ref_avg': 'Reference Average',
        'sample_avg': 'Sample Average',
        'delta': 'Delta',
        'l_star': 'L* (Lightness)',
        'a_star': 'a* (Red-Green)',
        'b_star': 'b* (Yellow-Blue)',
        
        # Illuminant names
        'd65': 'D65 (Daylight)',
        'd50': 'D50 (Horizon Light)',
        'a': 'A (Incandescent)',
        'f2': 'F2 (Cool White Fluorescent)',
        'f11': 'F11 (Narrow Band Fluorescent)',
        
        # Color metric names
        'cie76': 'CIE76 (Classic Delta E)',
        'cie94': 'CIE94 (Industrial Delta E)',
        'ciede2000': 'CIEDE2000 (Advanced Delta E)',
        'cmc': 'CMC (Textile Delta E)',
        
        # LAB Color Space Analysis
        'lab_visualizations': 'Lab* Visualizations',
        'lab_quality_assessment': 'Quality Assessment (Lab* thresholds)',
        'lab_detailed_analysis': 'Detailed Lab* Color Space Analysis',
        'lab_recommendations': 'Lab* Recommendations',
        'de_summary_statistics': 'ΔE Summary Statistics',
        'lab_scatter_title': 'a* vs b* Chromaticity Scatter',
        'lab_components_mean': 'Lab Components – Mean',
        'overall_magnitude': 'Overall Magnitude',
        'interpretation': 'Interpretation',
        'component': 'Component',
        'actual_value': 'Actual',
        'within_tight_tol': 'Within tight tolerances. Maintain current parameters and monitor periodically.',
        'exceeded_threshold': 'exceeded the threshold',
        'lab_pass_rec': 'All Lab* component differences are within specified thresholds.',
        'lab_fail_prefix': 'The following parameters exceeded their thresholds: ',
        'lab_review_action': 'Review the affected parameters and consider recalibration.',
        'lightness_diff': 'Lightness difference',
        'redness_greenness': 'Red-green axis shift',
        'yellowness_blueness': 'Yellow-blue axis shift',
        'combined_magnitude': 'Combined color vector magnitude',
        'negligible': 'Negligible',
        'noticeable': 'Noticeable',
        'significant': 'Significant',
        'critical': 'Critical',
        'de_76_label': 'ΔE76 (CIE 1976)',
        'de_94_label': 'ΔE94 (CIE 1994)',
        'de_2000_label': 'ΔE00 (CIEDE2000)',
        'decision_metric': 'Decision Metric',
        'informational': 'Informational',
        'lab_thresh_dl': 'ΔL* Threshold',
        'lab_thresh_da': 'Δa* Threshold',
        'lab_thresh_db': 'Δb* Threshold',
        'lab_thresh_mag': 'Magnitude Threshold',
        'enable_lab_analysis': 'Enable Lab* Analysis',

        # Fourier Domain Analysis
        'fourier_title': 'Fourier Domain Analysis',
        'fourier_subtitle': '2D Fast Fourier Transform reveals periodic structures and directional patterns in the fabric.',
        'fft_spectrum_title': '2D FFT Power Spectrum',
        'fourier_peaks_title': 'Frequency Peaks',
        'fourier_metrics_title': 'Fourier Metrics',
        'peak': 'Peak',
        'radius': 'Radius',
        'angle_deg': 'Angle (°)',
        'magnitude': 'Magnitude',
        'fundamental_period': 'Fundamental Period (px)',
        'dominant_orientation': 'Dominant Orientation (°)',
        'anisotropy_ratio': 'Anisotropy Ratio',
        'metric': 'Metric',

        # RGB Histograms
        'histograms_title': 'Histograms (RGB)',
        'histogram_interpretation': 'Interpretation: RGB histograms show the distribution of color values across the image. Similar histogram shapes between Reference and Sample indicate consistent color reproduction. Shifts in peak positions suggest color bias; narrower distributions indicate more uniform color.',
        'histogram_interpretation_single': 'Interpretation: The RGB histogram shows the distribution of color values across the image. Narrower distributions indicate more uniform color; wider spreads suggest greater color variation.',

        # GLCM Texture Analysis
        'glcm_title': 'GLCM Texture Analysis',
        'glcm_subtitle': 'Gray-Level Co-occurrence Matrix quantifies texture properties by analyzing spatial relationships between pixel intensities.',
        'glcm_property': 'Property',
        'glcm_contrast': 'Contrast',
        'glcm_dissimilarity': 'Dissimilarity',
        'glcm_homogeneity': 'Homogeneity',
        'glcm_energy': 'Energy',
        'glcm_correlation': 'Correlation',
        'glcm_asm': 'ASM',
        'glcm_comparison_title': 'GLCM Property Comparison',
        'glcm_heatmap_title': 'GLCM Matrix Visualization',
        'glcm_interpretation': 'Interpretation: Higher contrast indicates greater local intensity variation. Homogeneity measures pixel pair smoothness. Energy and ASM reflect texture uniformity. Correlation measures linear dependency of gray levels.',
    },
    
    'tr': {
        # Common / Shared
        'report_title': 'Kalite Kontrol Raporu',
        'color_report_title': 'Renk Analizi Raporu',
        'pattern_report_title': 'Desen Analizi Raporu',
        'single_image_title': 'Tek Görüntü Analiz Raporu',
        'config_report_title': 'Yapılandırma Belgesi',
        'generated_on': 'Oluşturulma Tarihi',
        'operator': 'Operatör',
        'report_id': 'Rapor Kimliği',
        'software_version': 'Yazılım Sürümü',
        'page': 'Sayfa',
        'of': '/',
        'confidential': 'GİZLİ',
        'summary': 'Özet',
        'details': 'Detaylar',
        'conclusion': 'Sonuç',
        'recommendations': 'Öneriler',
        'pass': 'GEÇTİ',
        'fail': 'KALDI',
        'conditional': 'KOŞULLU',
        'status': 'Durum',
        'result': 'Sonuç',
        'value': 'Değer',
        'threshold': 'Eşik',
        'reference': 'Referans',
        'sample': 'Numune',
        'difference': 'Fark',
        'score': 'Skor',
        'overall': 'Genel',
        'region': 'Bölge',
        'point': 'Nokta',
        'average': 'Ortalama',
        'minimum': 'Minimum',
        'maximum': 'Maksimum',
        'std_dev': 'Std. Sapma',
        'notes': 'Notlar',
        'warning': 'Uyarı',
        'info': 'Bilgi',
        
        # Color Report Specific
        'color_analysis': 'Renk Analizi',
        'color_difference': 'Renk Farkı',
        'delta_e': 'Delta E',
        'delta_e_2000': 'ΔE00',
        'color_spaces': 'Renk Uzayları',
        'rgb_values': 'RGB Değerleri',
        'lab_values': 'Lab* Değerleri',
        'xyz_values': 'XYZ Değerleri',
        'cmyk_values': 'CMYK Değerleri',
        'color_metrics': 'Renk Metrikleri',
        'diff_metrics': 'Fark Metrikleri',
        'illuminant': 'Aydınlatma (Illuminant)',
        'illuminant_analysis': 'Aydınlatma Analizi',
        'primary_illuminant': 'Birincil Aydınlatma',
        'color_similarity_index': 'CSI (Tam görüntü ΔE00)',
        'csi': 'CSI',
        'pass_threshold': 'Geçiş Eşiği',
        'conditional_threshold': 'Koşullu Eşik',
        'global_acceptance': 'Genel Kabul',
        'regional_analysis': 'Bölgesel Analiz',
        'sampling_points': 'Örnekleme Noktaları',
        'color_swatch': 'Renk Örneği',
        'visual_comparison': 'Görsel Karşılaştırma',
        'spectral_proxy': 'Spektral Vekil (Spectral Proxy)',
        'detailed_statistics': 'Detaylı İstatistikler',
        'visualizations': 'Görselleştirmeler',
        'visual_diff': 'Görsel Fark',
        'ref_color': 'Referans Renk',
        'sample_color': 'Numune Renk',
        'lightness': 'Parlaklık (Lightness)',
        'chroma': 'Doygunluk (Chroma)',
        'hue': 'Ton (Hue)',
        'red': 'Kırmızı',
        'green': 'Yeşil',
        'blue': 'Mavi',
        
        # Pattern Report Specific
        'pattern_analysis': 'Desen Analizi',
        'structural_similarity': 'Yapısal Benzerlik (SSIM)',
        'ssim': 'SSIM',
        'gradient_similarity': 'Gradyan Benzerliği',
        'phase_correlation': 'Faz Korelasyonu',
        'structural_difference': 'Yapısal Fark',
        'pattern_score': 'Desen Skoru',
        'similarity_score': 'Benzerlik Skoru',
        'change_percentage': 'Değişim Yüzdesi',
        'total_pixels': 'Toplam Piksel',
        'changed_pixels': 'Değişen Piksel',
        'method_results': 'Yöntem Sonuçları',
        'composite_analysis': 'Bileşik Analiz',
        'boundary_analysis': 'Sınır Analizi',
        'gradient_boundary': 'Gradyan Sınırı',
        'phase_boundary': 'Faz Sınırı',
        'texture_analysis': 'Doku Analizi',
        'edge_detection': 'Kenar Algılama',
        'frequency_analysis': 'Frekans Analizi',
        
        # Single Image Report Specific
        'single_image_analysis': 'Tek Görüntü Analizi',
        'color_measurement': 'Renk Ölçümü',
        'measurement_points': 'Ölçüm Noktaları',
        'spectral_analysis': 'Spektral Analiz',
        'color_distribution': 'Renk Dağılımı',
        'dominant_colors': 'Baskın Renkler',
        'color_histogram': 'Renk Histogramı',
        
        # Configuration Report Specific
        'configuration_settings': 'Yapılandırma Ayarları',
        'analysis_parameters': 'Analiz Parametreleri',
        'color_unit_settings': 'Renk Birimi Ayarları',
        'pattern_unit_settings': 'Desen Birimi Ayarları',
        'threshold_settings': 'Eşik Ayarları',
        'illuminant_settings': 'Aydınlatma Ayarları',
        'report_sections': 'Rapor Bölümleri',
        'enabled': 'Etkin',
        'disabled': 'Devre Dışı',
        'region_shape': 'Bölge Şekli',
        'circle': 'Daire',
        'square': 'Kare',
        'rectangle': 'Dikdörtgen',
        'diameter': 'Çap',
        'width': 'Genişlik',
        'height': 'Yükseklik',
        'timezone_offset': 'Saat Dilimi Farkı',
        
        # Verdicts and Messages
        'excellent_match': 'Mükemmel eşleşme - renkler neredeyse aynı',
        'good_match': 'İyi eşleşme - kabul edilebilir renk farkı',
        'marginal_match': 'Marjinal eşleşme - fark edilir renk farkı',
        'poor_match': 'Zayıf eşleşme - önemli renk farkı',
        'no_match': 'Eşleşme yok - renkler belirgin şekilde farklı',
        'within_tolerance': 'Tolerans dahilinde',
        'outside_tolerance': 'Tolerans dışında',
        'requires_review': 'İnceleme gerektirir',
        'approved': 'Onaylandı',
        'rejected': 'Reddedildi',
        
        # Cover Page
        'cover_subtitle': 'Profesyonel Kalite Kontrol Çözümleri',
        'cover_company': 'Tekstil Mühendislik Çözümleri',
        'analysis_date': 'Analiz Tarihi',
        'analysis_time': 'Analiz Saati',
        'document_id': 'Belge Kimliği',
        'prepared_by': 'Hazırlayan',
        'reviewed_by': 'İnceleyen',
        'approved_by': 'Onaylayan',
        
        # Footer
        'footer_confidential': 'Bu belge gizlidir ve yalnızca yetkili personel tarafından kullanılabilir.',
        'footer_generated': 'Bu rapor otomatik olarak oluşturulmuştur.',
        'all_rights_reserved': 'Tüm hakları saklıdır.',
        
        # Executive Summary
        'executive_summary': 'Yönetici Özeti',
        'analysis_overview': 'Analiz Genel Bakışı',
        'key_findings': 'Temel Bulgular',
        'final_decision': 'Nihai Karar',
        'accept': 'KABUL',
        'reject': 'RET',
        'review': 'İNCELEME',
        
        # Color Analysis Extended
        'color_quality_assessment': 'Renk Kalite Değerlendirmesi',
        'color_consistency': 'Renk Tutarlılığı',
        'color_accuracy': 'Renk Doğruluğu',
        'color_uniformity': 'Renk Homojenliği',
        'color_deviation': 'Renk Sapması',
        'acceptable_range': 'Kabul Edilebilir Aralık',
        'measured_value': 'Ölçülen Değer',
        'target_value': 'Hedef Değer',
        'tolerance_range': 'Tolerans Aralığı',
        'color_space': 'Renk Uzayı',
        'reference_image': 'Referans Görüntü',
        'sample_image': 'Numune Görüntü',
        'color_difference_map': 'Renk Fark Haritası',
        'heatmap': 'Isı Haritası (Heatmap)',
        'legend': 'Gösterge',
        'scale': 'Ölçek',
        
        # Statistics
        'statistical_analysis': 'İstatistiksel Analiz',
        'mean': 'Ortalama',
        'median': 'Medyan',
        'mode': 'Mod',
        'variance': 'Varyans',
        'standard_deviation': 'Standart Sapma',
        'range': 'Aralık',
        'count': 'Sayı',
        'total': 'Toplam',
        'percentage': 'Yüzde',
        
        # Pattern Analysis Extended
        'pattern_quality_assessment': 'Desen Kalite Değerlendirmesi',
        'pattern_consistency': 'Desen Tutarlılığı',
        'pattern_accuracy': 'Desen Doğruluğu',
        'pattern_alignment': 'Desen Hizalaması',
        'pattern_repeat': 'Desen Tekrarı',
        'pattern_distortion': 'Desen Bozulması',
        'structural_integrity': 'Yapısal Bütünlük',
        'texture_quality': 'Doku Kalitesi',
        'edge_sharpness': 'Kenar Keskinliği',
        'contrast_ratio': 'Kontrast Oranı',
        'brightness_uniformity': 'Parlaklık Homojenliği',
        
        # Method Names
        'method': 'Yöntem',
        'algorithm': 'Algoritma',
        'technique': 'Teknik',
        'approach': 'Yaklaşım',
        
        # Table Headers
        'metric': 'Metrik',
        'parameter': 'Parametre',
        'setting': 'Ayar',
        'description': 'Açıklama',
        'unit': 'Birim',
        'criteria': 'Kriter',
        'evaluation': 'Değerlendirme',
        
        # Decision Messages
        'decision_accept': 'Numune kalite standartlarını karşılamaktadır.',
        'decision_reject': 'Numune kalite standartlarını karşılamamaktadır.',
        'decision_conditional': 'Numune koşullu kabul edilmiştir, inceleme gerektirir.',
        
        # Recommendations
        'rec_accept': 'Numune üretim için uygundur.',
        'rec_reject': 'Numunenin yeniden değerlendirilmesi veya reddedilmesi önerilir.',
        'rec_conditional': 'İlave testler veya manuel inceleme önerilir.',
        
        # Additional Terms
        'image': 'Görüntü',
        'images': 'Görüntüler',
        'comparison': 'Karşılaştırma',
        'analysis': 'Analiz',
        'report': 'Rapor',
        'date': 'Tarih',
        'time': 'Saat',
        'version': 'Sürüm',
        'type': 'Tür',
        'name': 'Ad',
        'id': 'Kimlik',
        'number': 'Numara',
        'index': 'Endeks',
        'level': 'Seviye',
        'grade': 'Derece',
        'class': 'Sınıf',
        'category': 'Kategori',
        'group': 'Grup',
        'batch': 'Parti',
        'lot': 'Lot',
        'serial': 'Seri',
        
        # Units
        'pixels': 'piksel',
        'percent': 'yüzde',
        'degrees': 'derece',
        'points': 'nokta',
        'units': 'birim',
        
        # Actions
        'view': 'Görüntüle',
        'download': 'İndir',
        'print': 'Yazdır',
        'save': 'Kaydet',
        'export': 'Dışa Aktar',
        
        # Settings Report Specific
        'color_unit_settings': 'RENK BİRİMİ AYARLARI',
        'pattern_unit_settings': 'DESEN BİRİMİ AYARLARI',
        'single_image_unit_settings': 'TEK GÖRÜNTÜ BİRİMİ AYARLARI',
        'report_sections': 'RAPOR BÖLÜMLERİ',
        'processed_images_log': 'İŞLENEN GÖRÜNTÜLER KAYDI',
        'analysis_results': 'Analiz Sonuçları',
        'no_images_recorded': 'Kayıtlı görüntü yok.',
        'decision': 'KARAR',
        'color_score': 'Renk Skoru',
        'pattern_score': 'Desen Skoru',
        'overall_score': 'Genel Skor',
        'overall_score_note': 'Desen skoru / Renk skoru',
        'overall_score_explainer': 'Desen normalize edilmiş benzerlik skoru, renk ise seçilen ham metrik olarak gösterilir.',
        'status_label': 'DURUM',
        'complete': 'TAMAMLANDI',
        'accept': 'KABUL',
        'reject': 'RED',
        'sample_before_alignment': 'Hizalama Öncesi Numune',
        'aligned_sample': 'Hizalanmış Numune',
        'alignment_technique': 'Hizalama Tekniği',
        'alignment_direct': 'Doğrudan Piksel',
        'alignment_ai_smart_match': 'AI SmartMatch',
        'alignment_bestch': 'BESTCH',
        'pending': 'BEKLİYOR',
        
        # Settings Labels
        'sampling_mode': 'Örnekleme Modu',
        'sampling_count': 'Örnekleme Sayısı',
        'cond_threshold': 'Koşullu Eşik',
        'global_thresh': 'Genel Eşik',
        'csi_good': 'CSI Geçiş',
        'csi_warn': 'CSI Koşullu',
        'ssim_pass': 'SSIM Geçiş',
        'ssim_cond': 'SSIM Koşullu',
        'grad_pass': 'Gradyan Geçiş',
        'grad_cond': 'Gradyan Koşullu',
        'phase_pass': 'Faz Geçiş',
        'phase_cond': 'Faz Koşullu',
        'structural_pass': 'Yapısal Geçiş',
        'structural_cond': 'Yapısal Koşullu',
        
        # Section Names for Checklist
        'color_unit': 'Renk Birimi',
        'pattern_unit': 'Desen Birimi',
        'single_image_unit': 'Tek Görüntü Birimi',
        'rgb': 'RGB',
        'lab': 'L*a*b*',
        'xyz': 'XYZ',
        'cmyk': 'CMYK',
        'stats': 'İstatistikler',
        'detailed_lab': 'Detaylı Lab',
        'spectral': 'Spektral Veri',
        'csi_under_heatmap': 'Isı Haritası Altında CSI',
        'recommendations_color': 'Öneriler',
        'ssim': 'SSIM',
        'gradient': 'Gradyan Benzerliği',
        'phase': 'Faz Korelasyonu',
        'structural': 'Yapısal Fark',
        'gradient_boundary': 'Gradyan Sınırı',
        'phase_boundary': 'Faz Sınırı',
        'recommendations_pattern': 'Öneriler',
        'fourier': 'Fourier Analizi',
        'glcm': 'GLCM Doku',
        'histograms': 'Histogramlar',
        'exec_summary': 'Yönetici Özeti',
        'uniform': 'düzenli',
        'grad_diff_sensitivity': 'Gradyan Fark Hassasiyeti',
        'phase_diff_sensitivity': 'Faz Fark Hassasiyeti',
        'grad_bound_sensitivity': 'Gradyan Sınır Hassasiyeti',
        'phase_bound_sensitivity': 'Faz Sınır Hassasiyeti',
        'structural_sensitivity': 'Yapısal Hassasiyet',
        'random': 'rastgele',
        'manual': 'manuel',
        'report_language': 'Rapor Dili',
        'test_illuminants': 'Test Aydınlatmaları',
        'pattern_global_threshold': 'Desen Genel Eşik',
        'general_settings': 'Genel Ayarlar',
        'color_scoring_method': 'Renk Puanlama Yöntemi',
        'delta_e_2000': 'ΔE00',
        'csi_method': 'CSI (Tam görüntü ΔE00)',
        'csi2000_method': 'CSI2000 (CSI & ΔE00 Ortalaması)',
        'pattern_scoring_method': 'Desen Puanlama Yöntemi',
        'pattern_method_all': 'Tümü (Ortalama)',
        'pattern_method_ssim': 'Yapısal SSIM',
        'pattern_method_gradient': 'Gradyan Benzerliği',
        'pattern_method_phase': 'Faz Korelasyonu',
        'pattern_method_structural': 'Yapısal Eşleşme',
        'unified_report_title': 'Renk ve Desen Analiz Raporu',
        'color_module': 'Renk Modülü',
        'pattern_module': 'Desen Modülü',
        'color_score_label': 'Renk Puanı',
        'pattern_score_label': 'Desen Puanı',
        
        # Table data labels for statistics
        'ref_avg': 'Referans Ortalama',
        'sample_avg': 'Numune Ortalama',
        'delta': 'Delta (Fark)',
        'l_star': 'L* (Parlaklık)',
        'a_star': 'a* (Kırmızı-Yeşil)',
        'b_star': 'b* (Sarı-Mavi)',
        
        # Illuminant names
        'd65': 'D65 (Gün Işığı)',
        'd50': 'D50 (Ufuk Işığı)',
        'a': 'A (Akkor Lamba)',
        'f2': 'F2 (Soğuk Beyaz Floresan)',
        'f11': 'F11 (Dar Bantlı Floresan)',
        
        # Color metric names
        'cie76': 'CIE76 (Klasik Delta E)',
        'cie94': 'CIE94 (Endüstriyel Delta E)',
        'ciede2000': 'CIEDE2000 (Gelişmiş Delta E)',
        'cmc': 'CMC (Tekstil Delta E)',
        
        # LAB Color Space Analysis
        'lab_visualizations': 'Lab* Görselleştirmeleri',
        'lab_quality_assessment': 'Kalite Değerlendirmesi (Lab* eşik değerleri)',
        'lab_detailed_analysis': 'Detaylı Lab* Renk Uzayı Analizi',
        'lab_recommendations': 'Lab* Önerileri',
        'de_summary_statistics': 'ΔE Özet İstatistikleri',
        'lab_scatter_title': 'a* - b* Krominans Dağılımı',
        'lab_components_mean': 'Lab Bileşenleri – Ortalama',
        'overall_magnitude': 'Genel Büyüklük',
        'interpretation': 'Yorum',
        'component': 'Bileşen',
        'actual_value': 'Gerçek',
        'within_tight_tol': 'Sıkı toleranslar içinde. Mevcut parametreler korunmalı ve periyodik olarak izlenmelidir.',
        'exceeded_threshold': 'eşik değerini aştı',
        'lab_pass_rec': 'Tüm Lab* bileşen farkları belirtilen eşik değerleri dahilindedir.',
        'lab_fail_prefix': 'Aşağıdaki parametreler eşik değerlerini aşmıştır: ',
        'lab_review_action': 'Etkilenen parametreleri gözden geçirin ve yeniden kalibrasyon düşünün.',
        'lightness_diff': 'Parlaklık farkı',
        'redness_greenness': 'Kırmızı-yeşil eksen kayması',
        'yellowness_blueness': 'Sarı-mavi eksen kayması',
        'combined_magnitude': 'Birleşik renk vektör büyüklüğü',
        'negligible': 'İhmal edilebilir',
        'noticeable': 'Fark edilir',
        'significant': 'Önemli',
        'critical': 'Kritik',
        'de_76_label': 'ΔE76 (CIE 1976)',
        'de_94_label': 'ΔE94 (CIE 1994)',
        'de_2000_label': 'ΔE00 (CIEDE2000)',
        'decision_metric': 'Karar Metriği',
        'informational': 'Bilgilendirme',
        'lab_thresh_dl': 'ΔL* Eşik Değeri',
        'lab_thresh_da': 'Δa* Eşik Değeri',
        'lab_thresh_db': 'Δb* Eşik Değeri',
        'lab_thresh_mag': 'Büyüklük Eşik Değeri',
        'enable_lab_analysis': 'Lab* Analizini Etkinleştir',

        # Fourier Domain Analysis
        'fourier_title': 'Fourier Alan Analizi',
        'fourier_subtitle': '2D Hızlı Fourier Dönüşümü, kumaştaki periyodik yapıları ve yönlü desenleri ortaya çıkarır.',
        'fft_spectrum_title': '2D FFT Güç Spektrumu',
        'fourier_peaks_title': 'Frekans Tepeleri',
        'fourier_metrics_title': 'Fourier Metrikleri',
        'peak': 'Tepe',
        'radius': 'Yarıçap',
        'angle_deg': 'Açı (°)',
        'magnitude': 'Büyüklük',
        'fundamental_period': 'Temel Periyot (px)',
        'dominant_orientation': 'Baskın Yönelim (°)',
        'anisotropy_ratio': 'Anizotropi Oranı',
        'metric': 'Metrik',

        # RGB Histograms
        'histograms_title': 'Histogramlar (RGB)',
        'histogram_interpretation': 'Yorum: RGB histogramları, görüntüdeki renk değerlerinin dağılımını gösterir. Referans ve Numune arasındaki benzer histogram şekilleri tutarlı renk üretimini gösterir. Tepe konumlarındaki kaymalar renk sapmasına işaret eder; daha dar dağılımlar daha homojen rengi gösterir.',
        'histogram_interpretation_single': 'Yorum: RGB histogramı, görüntüdeki renk değerlerinin dağılımını gösterir. Daha dar dağılımlar daha homojen rengi gösterir; daha geniş yayılımlar daha fazla renk çeşitliliğine işaret eder.',

        # GLCM Texture Analysis
        'glcm_title': 'GLCM Doku Analizi',
        'glcm_subtitle': 'Gri Seviye Eş Oluşum Matrisi (GLCM), piksel yoğunlukları arasındaki uzamsal ilişkileri analiz ederek doku özelliklerini ölçer.',
        'glcm_property': 'Özellik',
        'glcm_contrast': 'Kontrast (Contrast)',
        'glcm_dissimilarity': 'Benzemezlik (Dissimilarity)',
        'glcm_homogeneity': 'Homojenlik (Homogeneity)',
        'glcm_energy': 'Enerji (Energy)',
        'glcm_correlation': 'Korelasyon (Correlation)',
        'glcm_asm': 'ASM',
        'glcm_comparison_title': 'GLCM Özellik Karşılaştırması',
        'glcm_heatmap_title': 'GLCM Matris Görselleştirmesi',
        'glcm_interpretation': 'Yorum: Yüksek kontrast, yerel yoğunluk varyasyonunun fazla olduğunu gösterir. Homojenlik piksel çifti düzgünlüğünü ölçer. Enerji ve ASM doku tekdüzeliğini yansıtır. Korelasyon gri seviyelerin doğrusal bağımlılığını ölçer.',
    }
}


def get_translator(lang='en'):
    """
    Returns a translator function for the specified language.
    
    Args:
        lang: Language code ('en' or 'tr')
    
    Returns:
        A function that takes a key and returns the translated string
    """
    translations = TRANSLATIONS.get(lang, TRANSLATIONS['en'])
    
    def translate(key, default=None):
        """
        Translate a key to the current language.
        
        Args:
            key: Translation key
            default: Default value if key not found (defaults to key itself)
        
        Returns:
            Translated string
        """
        if default is None:
            default = key.replace('_', ' ').title()
        return translations.get(key, default)
    
    return translate


def t(key, lang='en', default=None):
    """
    Quick translation function.
    
    Args:
        key: Translation key
        lang: Language code ('en' or 'tr')
        default: Default value if key not found
    
    Returns:
        Translated string
    """
    translator = get_translator(lang)
    return translator(key, default)


# Status translation helper
def translate_status(status, lang='en'):
    """
    Translate status strings (PASS, FAIL, CONDITIONAL).
    
    Args:
        status: Status string in English
        lang: Target language
    
    Returns:
        Translated status string
    """
    status_map = {
        'en': {'PASS': 'PASS', 'FAIL': 'FAIL', 'CONDITIONAL': 'CONDITIONAL'},
        'tr': {'PASS': 'GEÇTİ', 'FAIL': 'KALDI', 'CONDITIONAL': 'KOŞULLU'}
    }
    return status_map.get(lang, status_map['en']).get(status.upper(), status)


def translate_decision(decision, lang='en'):
    """Translate decision strings used in receipts and summaries."""
    decision_map = {
        'en': {
            'ACCEPT': 'ACCEPT',
            'REJECT': 'REJECT',
            'FAIL': 'REJECT',
            'CONDITIONAL': 'CONDITIONAL',
            'COMPLETE': 'COMPLETE',
            'PENDING': 'PENDING',
        },
        'tr': {
            'ACCEPT': 'KABUL',
            'REJECT': 'RED',
            'FAIL': 'RED',
            'CONDITIONAL': 'KOŞULLU',
            'COMPLETE': 'TAMAMLANDI',
            'PENDING': 'BEKLİYOR',
        },
    }
    normalized = str(decision or '').upper()
    return decision_map.get(lang, decision_map['en']).get(normalized, normalized)


def format_color_method_label(method, lang='en'):
    """Return a localized short display label for a color scoring method."""
    tr = get_translator(lang)
    normalized = str(method or '').strip().lower().replace(' ', '')
    mapping = {
        'delta_e': tr('delta_e_2000'),
        'deltae2000': tr('delta_e_2000'),
        'csi': 'CSI',
        'csi2000': 'CSI2000',
    }
    return mapping.get(normalized, str(method or tr('delta_e_2000')))


def format_pattern_method_label(method, lang='en'):
    """Return a localized short display label for a pattern scoring method."""
    tr = get_translator(lang)
    normalized = str(method or '').strip().lower()
    mapping = {
        'all': tr('pattern_method_all'),
        'composite(all)': tr('pattern_method_all'),
        'composite (all)': tr('pattern_method_all'),
        'structural ssim': tr('pattern_method_ssim'),
        'ssim': tr('pattern_method_ssim'),
        'gradient similarity': tr('pattern_method_gradient'),
        'gradient': tr('pattern_method_gradient'),
        'phase correlation': tr('pattern_method_phase'),
        'phase': tr('pattern_method_phase'),
        'structural match': tr('pattern_method_structural'),
        'structural': tr('pattern_method_structural'),
    }
    return mapping.get(normalized, str(method or tr('pattern_method_all')))


def get_alignment_mode_label(mode, lang='en'):
    """Return a localized alignment mode label for receipts and reports."""
    tr = get_translator(lang)
    normalized = str(mode or 'direct').strip().lower()
    mapping = {
        'direct': tr('alignment_direct'),
        'ai_smart_match': tr('alignment_ai_smart_match'),
        'bestch': tr('alignment_bestch'),
    }
    return mapping.get(normalized, normalized)


def get_verdict_message(delta_e, lang='en'):
    """
    Get a verdict message based on Delta E value.
    
    Args:
        delta_e: Delta E 2000 value
        lang: Target language
    
    Returns:
        Verdict message string
    """
    translator = get_translator(lang)
    
    if delta_e < 1.0:
        return translator('excellent_match')
    elif delta_e < 2.0:
        return translator('good_match')
    elif delta_e < 3.5:
        return translator('marginal_match')
    elif delta_e < 5.0:
        return translator('poor_match')
    else:
        return translator('no_match')
