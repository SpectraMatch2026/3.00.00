// ═══════════════════════════════════════════════════════════════════
// SPACTRA Studio — SpectraMatch v3.0.0
// Interactive Image Alignment & Registration Testing Window
// ═══════════════════════════════════════════════════════════════════

var AlignmentStudio = (function () {
    'use strict';

    var state = {
        isOpen: false,
        activeTechnique: 'direct',
        appliedTechnique: null,
        savedTechnique: null,
        testedTechniques: {},
        refImageSrc: null,
        sampleImageSrc: null,
        refFile: null,
        sampleFile: null,
        regionData: null,
        currentMetrics: null,
        currentPreviews: null,
        isProcessing: false,
        isDesktop: false,
        autoTestPending: null,
        calibrationDone: false,
        calibrationResults: {},
        calibrationReportUrl: null,
        calibrationReportFilename: null,
        onApply: null,
    };

    var TECHNIQUES = [
        { id: 'direct', icon: 'grid', category: 'baseline', handles: [] },
        { id: 'ai_smart_match', icon: 'cpu', category: 'ai', handles: ['rotation', 'scale', 'translation', 'perspective', 'lighting'] },
        { id: 'bestch', icon: 'crop', category: 'ai', handles: ['translation', 'cropping'] },
    ];

    var ICONS = {
        grid: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>',
        crosshair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="22" y1="12" x2="18" y2="12"/><line x1="6" y1="12" x2="2" y2="12"/><line x1="12" y1="6" x2="12" y2="2"/><line x1="12" y1="22" x2="12" y2="18"/></svg>',
        layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>',
        activity: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
        cpu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="1" x2="9" y2="4"/><line x1="15" y1="1" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="23"/><line x1="15" y1="20" x2="15" y2="23"/><line x1="20" y1="9" x2="23" y2="9"/><line x1="20" y1="14" x2="23" y2="14"/><line x1="1" y1="9" x2="4" y2="9"/><line x1="1" y1="14" x2="4" y2="14"/></svg>',
        play: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
        check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>',
        save: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>',
        image: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>',
        sliders: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>',
        info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        arrowRight: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
        move: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="5 9 2 12 5 15"/><polyline points="9 5 12 2 15 5"/><polyline points="15 19 12 22 9 19"/><polyline points="19 9 22 12 19 15"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>',
        rotateCw: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>',
        anchor: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="3"/><line x1="12" y1="22" x2="12" y2="8"/><path d="M5 12H2a10 10 0 0 0 20 0h-3"/></svg>',
        target: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
        maximize: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
        triangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
        layout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/></svg>',
        crop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6.13 1L6 16a2 2 0 0 0 2 2h15"/><path d="M1 6.13L16 6a2 2 0 0 1 2 2v15"/></svg>',
        download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
        fileText: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
        alertTriangle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    };

    var PROCESSING_STEPS = [
        'Loading images...',
        'Analyzing features...',
        'Computing alignment transform...',
        'Applying geometric correction...',
        'Generating preview comparisons...',
        'Finalizing results...'
    ];

    function t(key, fallback) {
        if (typeof I18n !== 'undefined' && I18n.t) { return I18n.t(key) || fallback; }
        return fallback;
    }

    function _formatTechId(id) {
        return id.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
    }

    // ═══════════════════════════════════════════════════════════════
    // Build Modal DOM
    // ═══════════════════════════════════════════════════════════════

    function buildModal() {
        var existing = document.getElementById('alignmentStudioOverlay');
        if (existing) existing.remove();

        var overlay = document.createElement('div');
        overlay.id = 'alignmentStudioOverlay';
        overlay.className = 'alignment-studio-overlay';
        overlay.innerHTML = _buildHTML();
        document.body.appendChild(overlay);
        overlay.addEventListener('click', function (e) { if (e.target === overlay) close(); });
        _bindEvents();
    }

    function _buildHTML() {
        var techniquesHTML = TECHNIQUES.map(function (tech) {
            var badgesHTML = tech.handles.map(function (h) {
                return '<span class="as-badge ' + h + '">' + t('align.badge.' + h, h) + '</span>';
            }).join('');
            return '<div class="as-technique-card' + (tech.id === 'direct' ? ' active' : '') + '" data-technique="' + tech.id + '">' +
                '<div class="as-technique-card-header">' +
                    '<div class="as-technique-icon ' + tech.category + '">' + ICONS[tech.icon] + '</div>' +
                    '<div class="as-technique-info">' +
                        '<div class="as-technique-name" data-i18n="align.name.' + tech.id + '">' + t('align.name.' + tech.id, _formatTechId(tech.id)) + '</div>' +
                        '<div class="as-technique-status" id="asStatus_' + tech.id + '"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="as-technique-desc" data-i18n="align.desc.' + tech.id + '">' + t('align.desc.' + tech.id, '') + '</div>' +
                (badgesHTML ? '<div class="as-technique-badges">' + badgesHTML + '</div>' : '') +
                '<div class="as-technique-actions">' +
                    '<button class="as-btn as-btn-test" data-action="test" data-technique="' + tech.id + '">' +
                        ICONS.play + '<span>' + t('align.test', 'Test') + '</span>' +
                    '</button>' +
                '</div>' +
            '</div>';
        }).join('');

        return '<div class="as-container">' +
            '<div class="as-header">' +
                '<div class="as-header-icon">' + ICONS.sliders + '</div>' +
                '<div class="as-header-text">' +
                    '<h2 data-i18n="align.studio.title">' + t('align.studio.title', 'SPACTRA Studio') + '</h2>' +
                    '<small data-i18n="align.studio.subtitle">' + t('align.studio.subtitle', 'Test and compare alignment techniques interactively') + '</small>' +
                '</div>' +
                '<div class="as-header-spacer"></div>' +
                '<div class="as-saved-indicator" id="asSavedIndicator"></div>' +
                '<button class="as-close-btn" id="asCloseBtn">&times;</button>' +
            '</div>' +
            '<div class="as-body">' +
                '<div class="as-techniques-panel">' +
                    '<div class="as-techniques-header">' +
                        '<h3 data-i18n="align.techniques">' + t('align.techniques', 'Alignment Techniques') + '</h3>' +
                    '</div>' +
                    '<div class="as-techniques-list">' + techniquesHTML + '</div>' +
                '</div>' +
                '<div class="as-preview-panel">' +
                    '<div class="as-preview-area" id="asPreviewArea">' +
                        '<div class="as-preview-empty" id="asPreviewEmpty">' +
                            ICONS.image +
                            '<p>' + t('align.preview.empty', 'Select a technique and click Test to preview') + '</p>' +
                            '<small>' + t('align.preview.empty.hint', 'Upload both images first, then test alignment methods here') + '</small>' +
                        '</div>' +
                        '<div class="as-processing-overlay" id="asProcessingOverlay">' +
                            '<div class="as-processing-spinner"></div>' +
                            '<div class="as-processing-text" id="asProcessingText">Processing...</div>' +
                            '<div class="as-processing-step" id="asProcessingStep"></div>' +
                            '<div class="as-processing-bar"><div class="as-processing-bar-fill" id="asProcessingBarFill"></div></div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="as-metrics-bar" id="asMetricsBar">' +
                        '<div class="as-footer-info">' + ICONS.info +
                            '<span>' + t('align.metrics.hint', 'Metrics will appear here after testing') + '</span>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
            '</div>' +
            '<div class="as-footer">' +
                '<div class="as-footer-info">' + ICONS.info +
                    '<span>' + t('align.footer.note', 'Click a technique to auto-test it. Use Apply & Close to confirm your choice.') + '</span>' +
                '</div>' +
                '<div class="as-footer-spacer"></div>' +
                '<button class="as-btn-footer as-btn-calibration" id="asCalibrationBtn">' +
                    ICONS.play + '<span>' + t('align.calibration', 'Calibration') + '</span>' +
                '</button>' +
                '<button class="as-btn-footer as-btn-download-calibration" id="asDownloadCalibrationBtn" style="display:none;">' +
                    ICONS.download + '<span>' + t('align.download.calibration', 'Download Calibration Report') + '</span>' +
                '</button>' +
                '<button class="as-btn-footer as-btn-cancel" id="asCancelBtn">' +
                    '<span>' + t('align.cancel', 'Close') + '</span>' +
                '</button>' +
                '<button class="as-btn-footer as-btn-confirm" id="asConfirmBtn">' +
                    ICONS.check + '<span>' + t('align.confirm', 'Apply & Close') + '</span>' +
                '</button>' +
            '</div>' +
            // BESTCH similarity popup (hidden by default)
            '<div class="as-similarity-popup" id="asSimilarityPopup">' +
                '<div class="as-similarity-popup-inner">' +
                    '<div class="as-similarity-popup-icon">' + ICONS.alertTriangle + '</div>' +
                    '<h3>' + t('align.bestch.low.title', 'Low Similarity Detected') + '</h3>' +
                    '<p class="as-similarity-popup-msg" id="asSimilarityMsg"></p>' +
                    '<div class="as-similarity-popup-details" id="asSimilarityDetails"></div>' +
                    '<div class="as-similarity-popup-actions">' +
                        '<button class="as-btn-footer as-btn-cancel" id="asSimilarityCancel">' +
                            '<span>' + t('align.bestch.try.other', 'Try Another Technique') + '</span>' +
                        '</button>' +
                        '<button class="as-btn-footer as-btn-proceed" id="asSimilarityProceed">' +
                            '<span>' + t('align.bestch.proceed', 'Proceed Anyway') + '</span>' +
                        '</button>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }

    // ═══════════════════════════════════════════════════════════════
    // Event Binding
    // ═══════════════════════════════════════════════════════════════

    function _bindEvents() {
        var overlay = document.getElementById('alignmentStudioOverlay');
        if (!overlay) return;

        document.getElementById('asCloseBtn').addEventListener('click', close);
        document.getElementById('asCancelBtn').addEventListener('click', close);
        document.getElementById('asConfirmBtn').addEventListener('click', _onConfirm);
        document.getElementById('asCalibrationBtn').addEventListener('click', _runCalibration);
        document.getElementById('asDownloadCalibrationBtn').addEventListener('click', _downloadCalibrationReport);

        // Similarity popup buttons
        document.getElementById('asSimilarityCancel').addEventListener('click', _hideSimilarityPopup);
        document.getElementById('asSimilarityProceed').addEventListener('click', _onSimilarityProceed);

        // Technique cards — click to SELECT AND AUTO-TEST
        overlay.querySelectorAll('.as-technique-card').forEach(function (card) {
            card.addEventListener('click', function (e) {
                if (e.target.closest('.as-btn')) return;
                var techId = card.dataset.technique;
                _selectAndAutoTest(techId);
            });
        });

        // Test buttons
        overlay.querySelectorAll('.as-btn[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.stopPropagation();
                if (btn.dataset.action === 'test') _testTechnique(btn.dataset.technique);
            });
        });

        document.addEventListener('keydown', function (e) {
            if (state.isOpen && e.key === 'Escape') {
                var popup = document.getElementById('asSimilarityPopup');
                if (popup && popup.classList.contains('visible')) {
                    _hideSimilarityPopup();
                } else {
                    close();
                }
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════
    // Open / Close
    // ═══════════════════════════════════════════════════════════════

    function open(options) {
        options = options || {};
        buildModal();

        state.refImageSrc = options.refSrc || null;
        state.sampleImageSrc = options.sampleSrc || null;
        state.refFile = options.refFile || null;
        state.sampleFile = options.sampleFile || null;
        state.regionData = options.regionData || null;
        state.isDesktop = options.isDesktop || false;
        state.onApply = (typeof options.onApply === 'function') ? options.onApply : null;
        state.testedTechniques = {};
        state.currentPreviews = null;
        state.currentMetrics = null;
        state.calibrationDone = false;
        state.calibrationResults = {};
        state.calibrationReportUrl = null;
        state.calibrationReportFilename = null;

        var modeSelect = document.getElementById(state.isDesktop ? 'propAlignmentMode' : 'alignment_mode');
        if (modeSelect) {
            state.savedTechnique = modeSelect.value || 'direct';
            state.appliedTechnique = state.savedTechnique;
        }

        var overlay = document.getElementById('alignmentStudioOverlay');
        overlay.style.display = 'flex';
        requestAnimationFrame(function () { overlay.classList.add('visible', 'fade-in'); });
        state.isOpen = true;

        _updateSavedIndicator();
        _updateI18n();
        _showSourceImages();

        // Auto-highlight saved technique
        _highlightSaved();

        // If images are loaded, auto-test current saved technique
        if (_hasImages() && state.savedTechnique && state.savedTechnique !== 'direct') {
            setTimeout(function () { _selectAndAutoTest(state.savedTechnique); }, 400);
        }
    }

    function close() {
        var overlay = document.getElementById('alignmentStudioOverlay');
        if (!overlay) return;
        overlay.classList.remove('visible', 'fade-in');
        setTimeout(function () { overlay.style.display = 'none'; }, 300);
        state.isOpen = false;
    }

    // ═══════════════════════════════════════════════════════════════
    // Technique Selection & Actions
    // ═══════════════════════════════════════════════════════════════

    function _selectAndAutoTest(techId) {
        _selectTechnique(techId);
        // If cached, just show. Otherwise auto-test if images available.
        if (state.testedTechniques[techId]) {
            state.currentPreviews = state.testedTechniques[techId].previews;
            state.currentMetrics = state.testedTechniques[techId].metrics;
            _renderPreview();
            _renderMetrics();
        } else if (_hasImages() && techId !== 'direct') {
            _testTechnique(techId);
        } else if (techId === 'direct') {
            _showSourceImages();
            _renderDirectMetrics();
        }
    }

    function _selectTechnique(techId) {
        state.activeTechnique = techId;
        var overlay = document.getElementById('alignmentStudioOverlay');
        overlay.querySelectorAll('.as-technique-card').forEach(function (card) {
            card.classList.toggle('active', card.dataset.technique === techId);
        });
    }

    function _testTechnique(techId) {
        if (state.isProcessing) return;
        if (!_hasImages()) {
            _showToast(t('align.no.images', 'Please upload both images first'), 'warn');
            return;
        }

        _selectTechnique(techId);
        state.isProcessing = true;

        // Show processing overlay with animated steps
        var processingEl = document.getElementById('asProcessingOverlay');
        var processingText = document.getElementById('asProcessingText');
        var processingStep = document.getElementById('asProcessingStep');
        var processingBar = document.getElementById('asProcessingBarFill');
        processingEl.classList.add('visible');
        processingText.textContent = t('align.processing', 'Processing alignment...');

        // Animate processing steps
        var stepIdx = 0;
        var stepInterval = setInterval(function () {
            if (stepIdx < PROCESSING_STEPS.length) {
                processingStep.textContent = PROCESSING_STEPS[stepIdx];
                processingBar.style.width = ((stepIdx + 1) / PROCESSING_STEPS.length * 100) + '%';
                stepIdx++;
            }
        }, 400);

        var btn = document.querySelector('.as-btn-test[data-technique="' + techId + '"]');
        if (btn) btn.classList.add('processing');

        var formData = new FormData();
        formData.append('mode', techId);
        formData.append('region_data', JSON.stringify(state.regionData || {}));

        _getImageFiles(function (refBlob, sampleBlob) {
            formData.append('ref_image', refBlob, 'ref.png');
            formData.append('sample_image', sampleBlob, 'sample.png');

            fetch('/api/alignment/preview', { method: 'POST', body: formData })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                clearInterval(stepInterval);
                state.isProcessing = false;
                if (btn) btn.classList.remove('processing');

                if (data.success) {
                    // Animate completion
                    processingStep.textContent = 'Complete!';
                    processingBar.style.width = '100%';

                    state.testedTechniques[techId] = { previews: data.previews, metrics: data.metrics };
                    state.currentPreviews = data.previews;
                    state.currentMetrics = data.metrics;

                    // Brief pause to show completion before revealing results
                    setTimeout(function () {
                        processingEl.classList.remove('visible');
                        _renderPreviewAnimated();
                        _renderMetrics();
                        _markCardTested(techId, data.metrics);

                        // BESTCH: check for low similarity and show popup
                        if (techId === 'bestch' && data.metrics && data.metrics.low_similarity) {
                            _showSimilarityPopup(data.metrics);
                        }
                    }, 350);

                    _showToast(t('align.test.success', 'Technique tested successfully'), 'success');
                } else {
                    processingEl.classList.remove('visible');
                    _showToast(data.error || t('align.test.failed', 'Test failed'), 'error');
                }
            })
            .catch(function (err) {
                clearInterval(stepInterval);
                state.isProcessing = false;
                processingEl.classList.remove('visible');
                if (btn) btn.classList.remove('processing');
                _showToast(t('align.test.error', 'Error testing technique: ') + err.message, 'error');
            });
        });
    }

    function _saveTechnique(techId) {
        state.savedTechnique = techId;
        state.appliedTechnique = techId;

        var modeSelect = document.getElementById(state.isDesktop ? 'propAlignmentMode' : 'alignment_mode');
        if (modeSelect) modeSelect.value = techId;

        // Visual feedback
        _highlightSaved();
        _updateSavedIndicator();

        _showToast(t('align.applied', 'Technique saved: ') + _getTechName(techId), 'success');
    }

    function _onConfirm() {
        if (state.activeTechnique && state.activeTechnique !== state.savedTechnique) {
            _saveTechnique(state.activeTechnique);
        }

        // Fire onApply callback with the aligned image previews so the
        // main workspace can update its displayed images.
        if (typeof state.onApply === 'function') {
            var techId = state.savedTechnique || state.activeTechnique;
            var cached = state.testedTechniques[techId] || null;
            state.onApply({
                techId: techId,
                previews: cached ? cached.previews : null,
                metrics:  cached ? cached.metrics  : null,
                regionData: state.regionData,
            });
        }

        var btn = document.getElementById('asConfirmBtn');
        btn.classList.add('confirmed');
        btn.innerHTML = ICONS.check + '<span>' + t('align.confirmed', 'Saved!') + '</span>';
        setTimeout(function () {
            btn.classList.remove('confirmed');
            btn.innerHTML = ICONS.check + '<span>' + t('align.confirm', 'Confirm & Close') + '</span>';
            close();
        }, 800);
    }

    function _highlightSaved() {
        var overlay = document.getElementById('alignmentStudioOverlay');
        if (!overlay) return;
        overlay.querySelectorAll('.as-technique-card').forEach(function (card) {
            card.classList.toggle('saved', card.dataset.technique === state.savedTechnique);
        });
    }

    function _updateSavedIndicator() {
        var el = document.getElementById('asSavedIndicator');
        if (!el) return;
        if (state.savedTechnique && state.savedTechnique !== 'direct') {
            el.innerHTML = ICONS.check + '<span>Saved: ' + _getTechName(state.savedTechnique) + '</span>';
            el.className = 'as-saved-indicator active';
        } else {
            el.innerHTML = '<span>No alignment saved</span>';
            el.className = 'as-saved-indicator';
        }
    }

    function _markCardTested(techId, metrics) {
        var card = document.querySelector('.as-technique-card[data-technique="' + techId + '"]');
        if (!card) return;
        card.classList.add('tested', 'success-pulse');
        setTimeout(function () { card.classList.remove('success-pulse'); }, 800);

        // Show mini-metrics on the card
        var statusEl = document.getElementById('asStatus_' + techId);
        if (statusEl && metrics) {
            var parts = [];
            if (metrics.applied) {
                if (metrics.rotation_deg && Math.abs(metrics.rotation_deg) > 0.01)
                    parts.push(ICONS.rotateCw + ' ' + metrics.rotation_deg + '°');
                if (metrics.translation_x !== undefined && (Math.abs(metrics.translation_x) > 0.1 || Math.abs(metrics.translation_y) > 0.1))
                    parts.push(ICONS.move + ' (' + metrics.translation_x + ', ' + metrics.translation_y + ')px');
                if (metrics.correlation_coefficient !== undefined)
                    parts.push('r=' + metrics.correlation_coefficient);
                if (metrics.alignment_quality !== undefined)
                    parts.push('q=' + metrics.alignment_quality);
                statusEl.innerHTML = '<span class="as-mini-metric success">' + (parts.length > 0 ? parts.join(' | ') : 'Aligned') + '</span>';
            } else {
                statusEl.innerHTML = '<span class="as-mini-metric neutral">' + (metrics.reason || 'No correction needed') + '</span>';
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Preview Rendering
    // ═══════════════════════════════════════════════════════════════

    function _switchPreviewTab(tabId) {
        state.previewTab = tabId;
        var overlay = document.getElementById('alignmentStudioOverlay');
        overlay.querySelectorAll('.as-preview-tab').forEach(function (tab) {
            tab.classList.toggle('active', tab.dataset.preview === tabId);
        });
        _renderPreview();
    }

    function _showSourceImages() {
        if (!state.refImageSrc || !state.sampleImageSrc) return;
        var rd = state.regionData;
        if (rd && rd.use_crop && rd.type && rd.type !== 'full' && rd.width > 0 && rd.height > 0) {
            _showCroppedSourceImages(rd);
            return;
        }
        _renderSourcePanesHTML(state.refImageSrc, state.sampleImageSrc,
            t('align.reference', 'Reference'), t('align.sample', 'Sample'));
    }

    function _showCroppedSourceImages(rd) {
        var area = document.getElementById('asPreviewArea');
        var empty = document.getElementById('asPreviewEmpty');
        if (empty) empty.style.display = 'none';
        var proc = document.getElementById('asProcessingOverlay');
        if (proc) proc.classList.add('visible');

        var pending = 2;
        var refSrc = state.refImageSrc;
        var samSrc = state.sampleImageSrc;

        function done() {
            pending--;
            if (pending > 0) return;
            if (proc) proc.classList.remove('visible');
            _renderSourcePanesHTML(refSrc, samSrc,
                t('align.reference', 'Reference'), t('align.sample', 'Sample'));
        }
        _canvasCrop(state.refImageSrc, rd, function (s) { refSrc = s || state.refImageSrc; done(); });
        _canvasCrop(state.sampleImageSrc, rd, function (s) { samSrc = s || state.sampleImageSrc; done(); });
    }

    function _renderSourcePanesHTML(refSrc, samSrc, refLabel, samLabel) {
        var area = document.getElementById('asPreviewArea');
        var empty = document.getElementById('asPreviewEmpty');
        if (empty) empty.style.display = 'none';
        area.innerHTML = _keepProcessingOverlay() +
            '<div class="as-preview-images as-fade-in">' +
                '<div class="as-preview-pane">' +
                    '<span class="as-preview-label ref">' + refLabel + '</span>' +
                    '<div class="as-preview-img-wrap"><img src="' + refSrc + '" alt="Reference"></div>' +
                '</div>' +
                '<div class="as-preview-pane">' +
                    '<span class="as-preview-label sample">' + samLabel + '</span>' +
                    '<div class="as-preview-img-wrap"><img src="' + samSrc + '" alt="Sample"></div>' +
                '</div>' +
            '</div>';
    }

    function _canvasCrop(src, rd, callback) {
        if (!src || typeof document === 'undefined') { callback(null); return; }
        var img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function () {
            try {
                var x = Math.max(0, Math.round(rd.x || 0));
                var y = Math.max(0, Math.round(rd.y || 0));
                var w = Math.min(Math.round(rd.width || img.naturalWidth), img.naturalWidth - x);
                var h = Math.min(Math.round(rd.height || img.naturalHeight), img.naturalHeight - y);
                if (w <= 0 || h <= 0) { callback(null); return; }
                var canvas = document.createElement('canvas');
                canvas.width = w;
                canvas.height = h;
                var ctx = canvas.getContext('2d');
                if (rd.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
                    ctx.clip();
                }
                ctx.drawImage(img, -x, -y);
                callback(canvas.toDataURL('image/png'));
            } catch (e) { callback(null); }
        };
        img.onerror = function () { callback(null); };
        img.src = src;
    }

    function _renderPreviewAnimated() {
        _renderPreview(true);
    }

    function _renderPreview(animate) {
        if (!state.currentPreviews) return;
        var area = document.getElementById('asPreviewArea');
        var p = state.currentPreviews;
        var m = state.currentMetrics || {};
        var cls = animate ? ' as-slide-in' : '';
        var html = _keepProcessingOverlay();

        // Build transform indicator overlay
        var indicatorHTML = _buildTransformIndicator(m);

        // Use backend-returned reference if available (handles both region crop and BESTCH crop)
        var refSrc = p.ref_source ? 'data:image/png;base64,' + p.ref_source : (state.refImageSrc || '');
        var refLabel = t('align.reference', 'Reference');
        var alignedLabel = t('align.aligned', 'Aligned Sample');
        if (p.ref_cropped) {
            refSrc = 'data:image/png;base64,' + p.ref_cropped;
            refLabel = t('align.ref.cropped', 'Cropped Reference');
            alignedLabel = t('align.sample.cropped', 'Cropped Sample');
        }

        // Side-by-side comparison
        html += '<div class="as-preview-images' + cls + '">' +
            '<div class="as-preview-pane">' +
                '<span class="as-preview-label ref">' + refLabel + '</span>' +
                '<div class="as-preview-img-wrap"><img src="' + refSrc + '" alt="Reference"></div>' +
            '</div>' +
            '<div class="as-preview-vs">' + ICONS.arrowRight + '</div>' +
            '<div class="as-preview-pane">' +
                '<span class="as-preview-label aligned">' + alignedLabel + '</span>' +
                '<div class="as-preview-img-wrap as-aligned-wrap">' +
                    indicatorHTML +
                    '<img class="as-aligned-img' + (animate ? ' as-img-reveal' : '') + '" src="data:image/png;base64,' + p.aligned + '" alt="Aligned">' +
                '</div>' +
            '</div>' +
        '</div>';
        
        area.innerHTML = html;
    }

    function _buildTransformIndicator(m) {
        if (!m || !m.applied) return '';
        var lines = [];
        if (m.rotation_deg && Math.abs(m.rotation_deg) > 0.01)
            lines.push('<div class="as-indicator-item">' + ICONS.rotateCw + '<span>' + m.rotation_deg + '°</span></div>');
        if (m.translation_x !== undefined && (Math.abs(m.translation_x) > 0.1 || Math.abs(m.translation_y) > 0.1))
            lines.push('<div class="as-indicator-item">' + ICONS.move + '<span>(' + m.translation_x + ', ' + m.translation_y + ')px</span></div>');
        if (m.scale_factor !== undefined && Math.abs(m.scale_factor - 1.0) > 0.001)
            lines.push('<div class="as-indicator-item"><span>' + m.scale_factor + 'x</span></div>');
        if (lines.length === 0) return '';
        return '<div class="as-transform-indicator">' + lines.join('') + '</div>';
    }

    function _renderDirectMetrics() {
        var bar = document.getElementById('asMetricsBar');
        if (!bar) return;
        bar.innerHTML = '<span class="as-metric-status not-applied">Direct — No alignment preprocessing</span>';
    }

    function _renderMetrics() {
        var bar = document.getElementById('asMetricsBar');
        if (!bar || !state.currentMetrics) return;
        var m = state.currentMetrics;
        var parts = [];
        var applied = m.applied;

        parts.push('<span class="as-metric-status ' + (applied ? 'applied' : 'not-applied') + '">' +
            (applied ? t('align.status.applied', 'Corrected') : t('align.status.not.applied', 'No correction needed')) + '</span>');

        if (m.rotation_deg !== undefined && m.rotation_deg !== 0) {
            parts.push('<div class="as-metric-sep"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.rotation', 'Rotation') + '</span><span class="as-metric-value">' + m.rotation_deg + '°</span></div>');
        }
        if (m.scale_factor !== undefined && m.scale_factor !== 1) {
            parts.push('<div class="as-metric-sep"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.scale', 'Scale') + '</span><span class="as-metric-value">' + m.scale_factor + 'x</span></div>');
        }
        if (m.translation_x !== undefined && (m.translation_x !== 0 || m.translation_y !== 0)) {
            parts.push('<div class="as-metric-sep"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.shift', 'Shift') + '</span><span class="as-metric-value">(' + m.translation_x + ', ' + m.translation_y + ')px</span></div>');
        }
        if (m.correlation_coefficient !== undefined) {
            parts.push('<div class="as-metric-sep"></div>');
            var ccClass = m.correlation_coefficient > 0.9 ? 'good' : (m.correlation_coefficient > 0.7 ? 'warn' : 'bad');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.correlation', 'Correlation') + '</span><span class="as-metric-value ' + ccClass + '">' + m.correlation_coefficient + '</span></div>');
        }
        if (m.alignment_quality !== undefined) {
            parts.push('<div class="as-metric-sep"></div>');
            var qClass = m.alignment_quality > 0.9 ? 'good' : (m.alignment_quality > 0.7 ? 'warn' : 'bad');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.quality', 'Quality') + '</span><span class="as-metric-value ' + qClass + '">' + m.alignment_quality + '</span></div>');
        }
        if (m.lighting_delta !== undefined && m.lighting_delta !== 0) {
            parts.push('<div class="as-metric-sep"></div>');
            var ldClass = Math.abs(m.lighting_delta) < 5 ? 'good' : (Math.abs(m.lighting_delta) < 15 ? 'warn' : 'bad');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.lighting', 'Lighting \u0394') + '</span><span class="as-metric-value ' + ldClass + '">' + m.lighting_delta + '%</span></div>');
        }
        if (m.good_matches !== undefined) {
            parts.push('<div class="as-metric-sep"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.matches', 'Matches') + '</span><span class="as-metric-value">' + m.good_matches + '</span></div>');
        }
        if (m.similarity !== undefined && m.similarity < 100) {
            parts.push('<div class="as-metric-sep"></div>');
            var simClass = m.similarity > 70 ? 'good' : (m.similarity > 40 ? 'warn' : 'bad');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.bestch.similarity', 'Similarity') + '</span><span class="as-metric-value ' + simClass + '">' + m.similarity + '%</span></div>');
        }
        if (m.area_percent !== undefined && m.area_percent > 0) {
            parts.push('<div class="as-metric-sep"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.bestch.area', 'Area') + '</span><span class="as-metric-value">' + m.area_percent + '%</span></div>');
        }
        if (m.crop_size !== undefined) {
            parts.push('<div class="as-metric-sep"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label">' + t('align.bestch.crop', 'Crop') + '</span><span class="as-metric-value">' + m.crop_size + '</span></div>');
        }
        if (m.reason && !applied) {
            parts.push('<div class="as-metrics-spacer"></div>');
            parts.push('<div class="as-metric"><span class="as-metric-label as-metric-reason">' + m.reason + '</span></div>');
        }
        bar.innerHTML = parts.join('');
    }

    function _keepProcessingOverlay() {
        return '<div class="as-processing-overlay" id="asProcessingOverlay">' +
            '<div class="as-processing-spinner"></div>' +
            '<div class="as-processing-text" id="asProcessingText">Processing...</div>' +
            '<div class="as-processing-step" id="asProcessingStep"></div>' +
            '<div class="as-processing-bar"><div class="as-processing-bar-fill" id="asProcessingBarFill"></div></div>' +
        '</div>';
    }

    // ═══════════════════════════════════════════════════════════════
    // Image Helpers
    // ═══════════════════════════════════════════════════════════════

    function _hasImages() {
        if (state.refFile && state.sampleFile) return true;
        if (state.refImageSrc && state.sampleImageSrc) return true;
        return false;
    }

    function _getImageFiles(callback) {
        if (state.refFile && state.sampleFile) { callback(state.refFile, state.sampleFile); return; }
        var pending = 2, refBlob, sampleBlob;
        function check() { pending--; if (pending === 0) callback(refBlob, sampleBlob); }
        _srcToBlob(state.refImageSrc, function (b) { refBlob = b; check(); });
        _srcToBlob(state.sampleImageSrc, function (b) { sampleBlob = b; check(); });
    }

    function _srcToBlob(src, callback) {
        if (!src) { callback(new Blob()); return; }
        if (src instanceof Blob || src instanceof File) { callback(src); return; }
        fetch(src).then(function (r) { return r.blob(); }).then(callback).catch(function () { callback(new Blob()); });
    }

    function _getTechName(techId) { return t('align.name.' + techId, _formatTechId(techId)); }

    function _showToast(msg, type) {
        if (typeof showToast === 'function') { showToast(msg, type); }
        else if (typeof Desktop !== 'undefined' && Desktop.log) { Desktop.log(msg, type === 'error' ? 'error' : 'info'); }
        else { console.log('[AlignmentStudio] ' + type + ': ' + msg); }
    }

    function _updateI18n() {
        if (typeof I18n === 'undefined') return;
        var overlay = document.getElementById('alignmentStudioOverlay');
        if (overlay) {
            overlay.querySelectorAll('[data-i18n]').forEach(function (el) {
                var key = el.getAttribute('data-i18n');
                var translated = t(key, el.textContent);
                if (translated) el.textContent = translated;
            });
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // BESTCH Similarity Popup
    // ═══════════════════════════════════════════════════════════════

    function _showSimilarityPopup(metrics) {
        var popup = document.getElementById('asSimilarityPopup');
        if (!popup) return;

        var msg = document.getElementById('asSimilarityMsg');
        var details = document.getElementById('asSimilarityDetails');

        var sim = metrics.similarity || 0;
        var area = metrics.area_percent || 0;
        var cropSize = metrics.crop_size || '?';
        var origSize = metrics.original_size || '?';

        msg.textContent = t('align.bestch.low.msg',
            'The similarity between the matched regions is too low for reliable comparison. ' +
            'You can proceed with lower similarity or try another alignment technique.');

        details.innerHTML =
            '<div class="as-similarity-detail-row">' +
                '<span class="as-similarity-detail-label">' + t('align.bestch.similarity', 'Similarity') + '</span>' +
                '<span class="as-similarity-detail-value as-sim-bad">' + sim + '%</span>' +
            '</div>' +
            '<div class="as-similarity-detail-row">' +
                '<span class="as-similarity-detail-label">' + t('align.bestch.area', 'Matched Area') + '</span>' +
                '<span class="as-similarity-detail-value">' + area + '%</span>' +
            '</div>' +
            '<div class="as-similarity-detail-row">' +
                '<span class="as-similarity-detail-label">' + t('align.bestch.crop', 'Crop Size') + '</span>' +
                '<span class="as-similarity-detail-value">' + cropSize + ' ← ' + origSize + '</span>' +
            '</div>';

        popup.classList.add('visible');
    }

    function _hideSimilarityPopup() {
        var popup = document.getElementById('asSimilarityPopup');
        if (popup) popup.classList.remove('visible');
    }

    function _onSimilarityProceed() {
        _hideSimilarityPopup();
        // Force-accept the low similarity BESTCH result
        if (state.currentMetrics) {
            state.currentMetrics.low_similarity = false;
            _showToast(t('align.bestch.proceeding', 'Proceeding with low similarity match'), 'warn');
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // Calibration — Run All Techniques
    // ═══════════════════════════════════════════════════════════════

    function _desktopLog(msg, level) {
        if (typeof Desktop !== 'undefined' && Desktop.log) {
            Desktop.log(msg, level || 'info');
        }
        console.log('[AlignmentStudio] ' + (level || 'info') + ': ' + msg);
    }

    function _buildCalibrationFilename() {
        var now = new Date();
        var pad = function (n) { return n < 10 ? '0' + n : '' + n; };
        var ts = now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate()) +
                 '_' + pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
        return 'SpectraMatch_Calibration_Report_' + ts + '.pdf';
    }

    function _buildCalibrationDisplayName() {
        var now = new Date();
        var lang = (typeof I18n !== 'undefined' && I18n.getLanguage) ? I18n.getLanguage() : 'en';
        var locale = lang === 'tr' ? 'tr-TR' : 'en-US';
        var opts = { year: 'numeric', month: 'short', day: 'numeric' };
        var dateStr = now.toLocaleDateString(locale, opts);
        var label = lang === 'tr' ? 'Kalibrasyon Raporu' : 'Calibration Report';
        return label + ' - Advanced Settings ' + dateStr;
    }

    /**
     * _runCalibration — Iterates through ALL techniques sequentially,
     * testing each one via /api/alignment/preview. Shows progress in the
     * processing overlay. After completion, reveals the Download button.
     */
    function _runCalibration() {
        if (state.isProcessing) return;
        if (!_hasImages()) {
            _showToast(t('align.no.images', 'Please upload both images first'), 'warn');
            _desktopLog('Calibration aborted — no images loaded', 'warn');
            return;
        }

        _desktopLog('Starting calibration — testing all ' + TECHNIQUES.length + ' techniques...', 'info');

        var calBtn = document.getElementById('asCalibrationBtn');
        if (calBtn) {
            calBtn.classList.add('processing');
            calBtn.innerHTML = ICONS.play + '<span>' + t('align.calibrating', 'Calibrating...') + '</span>';
        }

        // Hide download button during new calibration
        var dlBtn = document.getElementById('asDownloadCalibrationBtn');
        if (dlBtn) dlBtn.style.display = 'none';

        state.isProcessing = true;
        state.calibrationDone = false;
        state.calibrationResults = {};

        // Show processing overlay
        var processingEl = document.getElementById('asProcessingOverlay');
        var processingText = document.getElementById('asProcessingText');
        var processingStep = document.getElementById('asProcessingStep');
        var processingBar = document.getElementById('asProcessingBarFill');
        processingEl.classList.add('visible');
        processingText.textContent = t('align.calibrating.all', 'Running calibration on all techniques...');

        var techQueue = TECHNIQUES.slice(); // copy
        var total = techQueue.length;
        var idx = 0;

        function _testNext() {
            if (idx >= total) {
                // All done
                processingStep.textContent = t('align.calibration.complete', 'Calibration complete!');
                processingBar.style.width = '100%';
                _desktopLog('Calibration complete — ' + total + ' techniques tested', 'info');

                setTimeout(function () {
                    processingEl.classList.remove('visible');
                    state.isProcessing = false;
                    state.calibrationDone = true;

                    // Restore calibration button
                    if (calBtn) {
                        calBtn.classList.remove('processing');
                        calBtn.innerHTML = ICONS.play + '<span>' + t('align.calibration', 'Calibration') + '</span>';
                    }

                    // Show download button
                    if (dlBtn) {
                        dlBtn.style.display = '';
                        dlBtn.classList.add('as-fade-in');
                    }

                    _showToast(t('align.calibration.done', 'All techniques tested. You can now download the calibration report.'), 'success');
                }, 500);
                return;
            }

            var tech = techQueue[idx];
            var pct = Math.round(((idx) / total) * 100);
            processingStep.textContent = (idx + 1) + '/' + total + ' — ' + t('align.name.' + tech.id, _formatTechId(tech.id));
            processingBar.style.width = pct + '%';

            _desktopLog('Calibrating [' + (idx + 1) + '/' + total + ']: ' + tech.id, 'info');

            // Direct technique doesn't need server call
            if (tech.id === 'direct') {
                state.calibrationResults['direct'] = {
                    metrics: { applied: false, reason: 'Direct — no alignment', method: 'direct', processing_time_ms: 0 },
                    previews: null
                };
                _markCardTested('direct', { applied: false, reason: 'Direct — no alignment' });
                idx++;
                setTimeout(_testNext, 100);
                return;
            }

            var startTime = performance.now();

            var formData = new FormData();
            formData.append('mode', tech.id);
            formData.append('region_data', JSON.stringify(state.regionData || {}));

            _getImageFiles(function (refBlob, sampleBlob) {
                formData.append('ref_image', refBlob, 'ref.png');
                formData.append('sample_image', sampleBlob, 'sample.png');

                fetch('/api/alignment/preview', { method: 'POST', body: formData })
                .then(function (res) { return res.json(); })
                .then(function (data) {
                    var elapsed = Math.round(performance.now() - startTime);
                    if (data.success) {
                        data.metrics.processing_time_ms = elapsed;
                        state.calibrationResults[tech.id] = {
                            metrics: data.metrics,
                            previews: data.previews
                        };
                        state.testedTechniques[tech.id] = { previews: data.previews, metrics: data.metrics };
                        _markCardTested(tech.id, data.metrics);
                        _desktopLog('  \u2713 ' + tech.id + ': ' + (data.metrics.applied ? 'applied' : 'not applied') + ' (' + elapsed + 'ms)', 'info');
                    } else {
                        state.calibrationResults[tech.id] = {
                            metrics: { applied: false, reason: data.error || 'Failed', processing_time_ms: elapsed },
                            previews: null
                        };
                        _desktopLog('  \u2717 ' + tech.id + ': ' + (data.error || 'failed') + ' (' + elapsed + 'ms)', 'warn');
                    }
                })
                .catch(function (err) {
                    var elapsed = Math.round(performance.now() - startTime);
                    state.calibrationResults[tech.id] = {
                        metrics: { applied: false, reason: 'Error: ' + err.message, processing_time_ms: elapsed },
                        previews: null
                    };
                    _desktopLog('  \u2717 ' + tech.id + ': ' + err.message, 'error');
                })
                .finally(function () {
                    idx++;
                    setTimeout(_testNext, 150);
                });
            });
        }

        _testNext();
    }

    // ═══════════════════════════════════════════════════════════════
    // Download Calibration Report
    // ═══════════════════════════════════════════════════════════════

    function _downloadCalibrationReport() {
        if (!state.calibrationDone || Object.keys(state.calibrationResults).length === 0) {
            _showToast(t('align.calibration.run.first', 'Please run calibration first'), 'warn');
            return;
        }

        _desktopLog('Generating calibration report PDF...', 'info');

        var dlBtn = document.getElementById('asDownloadCalibrationBtn');
        if (dlBtn) {
            dlBtn.classList.add('processing');
            dlBtn.innerHTML = ICONS.download + '<span>' + t('align.report.generating', 'Generating...') + '</span>';
        }

        // Collect all calibration results with metrics and preview images
        var testedData = {};
        var previewImages = {};
        Object.keys(state.calibrationResults).forEach(function (key) {
            var r = state.calibrationResults[key];
            testedData[key] = r.metrics || {};
            if (r.previews && r.previews.aligned) {
                previewImages[key] = r.previews.aligned;
            }
            if (r.previews && r.previews.ref_cropped) {
                previewImages[key + '_ref_cropped'] = r.previews.ref_cropped;
            }
        });

        var reportLang = (typeof I18n !== 'undefined' && I18n.getLanguage) ? I18n.getLanguage() : 'en';

        var formData = new FormData();
        formData.append('tested_techniques', JSON.stringify(testedData));
        formData.append('preview_images', JSON.stringify(previewImages));
        formData.append('saved_technique', state.savedTechnique || 'direct');
        formData.append('region_data', JSON.stringify(state.regionData || {}));
        formData.append('report_lang', reportLang);

        _getImageFiles(function (refBlob, sampleBlob) {
            formData.append('ref_image', refBlob, 'ref.png');
            formData.append('sample_image', sampleBlob, 'sample.png');

            fetch('/api/alignment/processing-report', { method: 'POST', body: formData })
            .then(function (res) {
                if (!res.ok) throw new Error('Report generation failed (' + res.status + ')');
                return res.json();
            })
            .then(function (data) {
                if (!data.success) throw new Error(data.error || 'Unknown error');

                var downloadUrl = data.download_url;
                var filename = data.filename;
                var displayName = _buildCalibrationDisplayName();

                // Store for workspace integration
                state.calibrationReportUrl = downloadUrl;
                state.calibrationReportFilename = filename;

                // Use native save in desktop, or browser download for web
                if (typeof Desktop !== 'undefined' && Desktop.saveAs) {
                    Desktop.saveAs(downloadUrl, filename);
                } else {
                    // Web: fetch the PDF blob from the download URL
                    fetch(downloadUrl)
                    .then(function (r) { return r.blob(); })
                    .then(function (blob) {
                        var a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        setTimeout(function () {
                            document.body.removeChild(a);
                            URL.revokeObjectURL(a.href);
                        }, 200);
                    });
                }

                // Add to workspace panel
                _addToWorkspacePanel(downloadUrl, filename, displayName);

                _desktopLog('Calibration report ready: ' + filename, 'info');
                _showToast(t('align.report.success', 'Calibration report downloaded') + ': ' + filename, 'success');
            })
            .catch(function (err) {
                _desktopLog('Calibration report error: ' + err.message, 'error');
                _showToast(t('align.report.error', 'Error generating report: ') + err.message, 'error');
            })
            .finally(function () {
                if (dlBtn) {
                    dlBtn.classList.remove('processing');
                    dlBtn.innerHTML = ICONS.download + '<span>' + t('align.download.calibration', 'Download Calibration Report') + '</span>';
                }
            });
        });
    }

    function _addToWorkspacePanel(downloadUrl, filename, displayName) {
        var wsDownloads = document.getElementById('wsDownloads');
        if (!wsDownloads) return;

        // Remove "no reports" placeholder if present
        var empty = wsDownloads.querySelector('.ws-download-empty');
        if (empty) empty.remove();

        // Check if calibration link already exists
        var existing = wsDownloads.querySelector('.ws-dl-calibration');
        if (existing) existing.remove();

        var link = document.createElement('a');
        link.className = 'ws-dl-btn ws-dl-calibration';
        link.href = 'javascript:void(0)';
        link.onclick = function () {
            if (typeof Desktop !== 'undefined' && Desktop.saveAs) {
                Desktop.saveAs(downloadUrl, filename);
            } else {
                var a2 = document.createElement('a');
                a2.href = downloadUrl;
                a2.download = filename;
                document.body.appendChild(a2);
                a2.click();
                document.body.removeChild(a2);
            }
        };
        link.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/>' +
            '<line x1="12" y1="15" x2="12" y2="3"/></svg>' + displayName;
        wsDownloads.appendChild(link);

        _desktopLog('Calibration report added to workspace panel: ' + displayName, 'info');
    }

    // ═══════════════════════════════════════════════════════════════
    // Public API
    // ═══════════════════════════════════════════════════════════════

    return {
        open: open,
        close: close,
        isOpen: function () { return state.isOpen; },
        getAppliedTechnique: function () { return state.savedTechnique || state.appliedTechnique || 'direct'; },
        setAppliedTechnique: function (techId) { state.savedTechnique = techId; state.appliedTechnique = techId; },
        runCalibration: _runCalibration,
        downloadCalibrationReport: _downloadCalibrationReport,
    };

})();
