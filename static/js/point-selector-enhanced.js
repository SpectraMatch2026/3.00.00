// ==========================================
// Enhanced Point Selector Module
// Unified sampling configuration for Color Unit and Single Image Unit
// ==========================================

var PointSelectorEnhanced = (function() {
    'use strict';

    // ==========================================
    // State Management
    // ==========================================
    var state = {
        isOpen: false,
        mode: 'color', // 'color' or 'single'
        targetCount: 5,
        points: [], // Array of point objects: {x, y, pixelX, pixelY, isManual, index}
        nextManualReplaceIndex: 0, // For rolling replacement
        imageScale: { x: 1, y: 1 },
        canvases: {
            ref: null,
            sample: null
        },
        contexts: {
            ref: null,
            sample: null
        },
        images: {
            ref: null,
            sample: null
        }
    };

    // ==========================================
    // Point Management
    // ==========================================

    /**
     * Add a point (manual or random)
     * Implements rolling limit: if at capacity, replaces oldest manual point
     */
    function addPoint(x, y, pixelX, pixelY, isManual) {
        var newPoint = {
            x: x, // Normalized 0-1
            y: y, // Normalized 0-1
            pixelX: Math.round(pixelX),
            pixelY: Math.round(pixelY),
            isManual: isManual,
            index: state.points.length + 1
        };

        if (state.points.length < state.targetCount) {
            // Add new point
            state.points.push(newPoint);
            if (isManual) {
                state.nextManualReplaceIndex = 0; // Reset for next cycle
            }
        } else {
            // Rolling replacement - replace oldest manual point
            if (isManual) {
                // Find the index to replace (circular)
                var replaceIdx = state.nextManualReplaceIndex;
                
                // Ensure we're replacing a valid index
                if (replaceIdx >= state.points.length) {
                    replaceIdx = 0;
                }
                
                newPoint.index = replaceIdx + 1;
                state.points[replaceIdx] = newPoint;
                
                // Move to next position for next replacement
                state.nextManualReplaceIndex = (replaceIdx + 1) % state.targetCount;
            } else {
                // Random point - find first random point to replace
                var randomIdx = -1;
                for (var i = 0; i < state.points.length; i++) {
                    if (!state.points[i].isManual) {
                        randomIdx = i;
                        break;
                    }
                }
                
                if (randomIdx !== -1) {
                    newPoint.index = randomIdx + 1;
                    state.points[randomIdx] = newPoint;
                } else {
                    // All points are manual, replace last one
                    newPoint.index = state.points.length;
                    state.points[state.points.length - 1] = newPoint;
                }
            }
        }

        return newPoint;
    }

    /**
     * Remove the last point added
     */
    function undoLastPoint() {
        if (state.points.length > 0) {
            state.points.pop();
            updateUI();
            redrawAllCanvases();
            return true;
        }
        return false;
    }

    /**
     * Clear all points
     */
    function clearAllPoints() {
        state.points = [];
        state.nextManualReplaceIndex = 0;
        updateUI();
        redrawAllCanvases();
    }

    /**
     * Generate random points to fill remaining slots
     */
    function completeWithRandomPoints() {
        var currentCount = state.points.length;
        var needed = state.targetCount - currentCount;

        if (needed <= 0) {
            showMessage('info', I18n.t('all.points.selected') || 'All points already selected');
            return;
        }

        // Get region constraints
        var region = getActiveRegion();
        
        for (var i = 0; i < needed; i++) {
            var point = generateRandomPoint(region);
            if (point) {
                addPoint(point.x, point.y, point.pixelX, point.pixelY, false);
            }
        }

        updateUI();
        redrawAllCanvases();
        showMessage('success', I18n.t('random.points.added') || needed + ' random points added');
    }

    /**
     * Generate a single random point within region constraints
     */
    function generateRandomPoint(region) {
        var maxAttempts = 100;
        var attempts = 0;

        while (attempts < maxAttempts) {
            attempts++;

            // Generate random normalized coordinates
            var x = Math.random();
            var y = Math.random();

            // Validate against region
            if (region && !isPointInRegion(x, y, region)) {
                continue;
            }

            // Convert to pixel coordinates
            var pixelX = x * (state.images.sample ? state.images.sample.naturalWidth : 1000);
            var pixelY = y * (state.images.sample ? state.images.sample.naturalHeight : 1000);

            return { x: x, y: y, pixelX: pixelX, pixelY: pixelY };
        }

        console.warn('Failed to generate random point after ' + maxAttempts + ' attempts');
        return null;
    }

    // ==========================================
    // Region Validation
    // ==========================================

    /**
     * Get the active region definition from RegionSelector
     */
    function getActiveRegion() {
        if (typeof RegionSelector === 'undefined' || !RegionSelector.isPlaced()) {
            return null;
        }

        var cropSettings = RegionSelector.getCropSettings();
        if (!cropSettings || !cropSettings.use_crop) {
            return null;
        }

        return {
            shape: cropSettings.crop_shape,
            centerX: cropSettings.crop_center_x,
            centerY: cropSettings.crop_center_y,
            width: cropSettings.crop_width,
            height: cropSettings.crop_height,
            diameter: cropSettings.crop_diameter
        };
    }

    /**
     * Check if a point (normalized 0-1) is within the region
     */
    function isPointInRegion(normX, normY, region) {
        if (!region) return true;

        var img = state.images.sample || state.images.ref;
        if (!img) return true;

        // Convert normalized to pixel coordinates
        var pixelX = normX * img.naturalWidth;
        var pixelY = normY * img.naturalHeight;

        if (region.shape === 'circle') {
            var dx = pixelX - region.centerX;
            var dy = pixelY - region.centerY;
            var radius = region.diameter / 2;
            return (dx * dx + dy * dy) <= (radius * radius);
        } else {
            // Rectangle
            var halfW = region.width / 2;
            var halfH = region.height / 2;
            return pixelX >= region.centerX - halfW &&
                   pixelX <= region.centerX + halfW &&
                   pixelY >= region.centerY - halfH &&
                   pixelY <= region.centerY + halfH;
        }
    }

    /**
     * Validate all existing points against current region
     * Returns array of invalid point indices
     */
    function validatePointsAgainstRegion() {
        var region = getActiveRegion();
        if (!region) return [];

        var invalidIndices = [];
        state.points.forEach(function(point, idx) {
            if (!isPointInRegion(point.x, point.y, region)) {
                invalidIndices.push(idx);
            }
        });

        return invalidIndices;
    }

    /**
     * Handle region change - check for conflicts
     */
    function handleRegionChange() {
        var invalidIndices = validatePointsAgainstRegion();
        
        if (invalidIndices.length > 0) {
            var message = I18n.t('points.outside.region') || 
                invalidIndices.length + ' point(s) are now outside the selected region.';
            
            showConflictDialog(message, invalidIndices);
        }
    }

    /**
     * Show conflict dialog when points are outside region
     */
    function showConflictDialog(message, invalidIndices) {
        var actions = [
            {
                text: I18n.t('reset.and.regenerate') || 'Reset & Regenerate',
                class: 'btn-primary',
                callback: function() {
                    clearAllPoints();
                    completeWithRandomPoints();
                }
            },
            {
                text: I18n.t('remove.invalid') || 'Remove Invalid Points',
                class: 'btn-secondary',
                callback: function() {
                    // Remove invalid points (reverse order to maintain indices)
                    invalidIndices.sort(function(a, b) { return b - a; });
                    invalidIndices.forEach(function(idx) {
                        state.points.splice(idx, 1);
                    });
                    updateUI();
                    redrawAllCanvases();
                }
            },
            {
                text: I18n.t('keep.all') || 'Keep All',
                class: 'btn-secondary',
                callback: function() {
                    // Do nothing, just close
                }
            }
        ];

        if (typeof showCustomAlert === 'function') {
            showCustomAlert(
                I18n.t('region.conflict') || 'Region Conflict',
                message,
                'warning',
                actions
            );
        }
    }

    // ==========================================
    // Canvas Drawing
    // ==========================================

    /**
     * Draw all points on a canvas
     */
    function drawPointsOnCanvas(canvasType) {
        var canvas = state.canvases[canvasType];
        var ctx = state.contexts[canvasType];
        
        if (!canvas || !ctx) return;

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw each point
        state.points.forEach(function(point, idx) {
            var displayX = point.x * canvas.width;
            var displayY = point.y * canvas.height;

            // Color based on type: green for manual, red for random
            var color = point.isManual ? '#27AE60' : '#E74C3C';
            var radius = 8;

            // Draw circle
            ctx.beginPath();
            ctx.arc(displayX, displayY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Draw number
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText((idx + 1).toString(), displayX, displayY);
        });
    }

    /**
     * Redraw all canvases
     */
    function redrawAllCanvases() {
        drawPointsOnCanvas('ref');
        drawPointsOnCanvas('sample');
    }

    // ==========================================
    // UI Updates
    // ==========================================

    /**
     * Update progress bar and counters
     */
    function updateUI() {
        // Count manual vs random points
        var manualCount = 0;
        var randomCount = 0;
        
        state.points.forEach(function(point) {
            if (point.isManual) {
                manualCount++;
            } else {
                randomCount++;
            }
        });

        var totalCount = state.points.length;

        // Update counter
        var currentEl = document.getElementById('pointCountCurrent');
        var totalEl = document.getElementById('pointCountTotal');
        if (currentEl) currentEl.textContent = totalCount;
        if (totalEl) totalEl.textContent = state.targetCount;

        // Update progress bar
        var progressFill = document.getElementById('pointProgressFill');
        if (progressFill) {
            var manualPercent = (manualCount / state.targetCount) * 100;
            var randomPercent = (randomCount / state.targetCount) * 100;
            
            // Create gradient: green for manual, red for random
            var gradient = 'linear-gradient(to right, #27AE60 0%, #27AE60 ' + manualPercent + '%, #E74C3C ' + manualPercent + '%, #E74C3C ' + (manualPercent + randomPercent) + '%, transparent ' + (manualPercent + randomPercent) + '%)';
            progressFill.style.background = gradient;
            progressFill.style.width = ((totalCount / state.targetCount) * 100) + '%';
        }

        // Update button states
        var undoBtn = document.getElementById('btnUndoPoint');
        var clearBtn = document.getElementById('btnClearPoints');
        var completeBtn = document.getElementById('btnCompleteRandom');
        
        if (undoBtn) undoBtn.disabled = totalCount === 0;
        if (clearBtn) clearBtn.disabled = totalCount === 0;
        if (completeBtn) completeBtn.disabled = totalCount >= state.targetCount;

        // Update status text in settings panel (if exists)
        updateSettingsPanelStatus();
    }

    /**
     * Update status in the settings panel
     */
    function updateSettingsPanelStatus() {
        var isSingle = state.mode === 'single';
        var statusEl = document.getElementById(isSingle ? 'samplingStatusTextSingle' : 'samplingStatusText');
        var countEl = document.getElementById(isSingle ? 'totalSelectedCountSingle' : 'totalSelectedCount');
        
        var manualCount = state.points.filter(function(p) { return p.isManual; }).length;
        var randomCount = state.points.filter(function(p) { return !p.isManual; }).length;
        var totalCount = state.points.length;

        if (countEl) {
            countEl.textContent = totalCount;
        }

        if (statusEl) {
            if (totalCount === 0) {
                statusEl.textContent = I18n.t('incomplete') || 'Incomplete';
                statusEl.className = 'status-incomplete';
            } else if (totalCount < state.targetCount) {
                statusEl.textContent = I18n.t('partial') || 'Partial (' + manualCount + 'M + ' + randomCount + 'R)';
                statusEl.className = 'status-partial';
            } else {
                statusEl.textContent = I18n.t('complete') || 'Complete (' + manualCount + 'M + ' + randomCount + 'R)';
                statusEl.className = 'status-complete';
            }
        }

        // Update progress bars in settings
        var greenBar = document.getElementById(isSingle ? 'progressGreenSingle' : 'progressGreen');
        var redBar = document.getElementById(isSingle ? 'progressRedSingle' : 'progressRed');
        
        if (greenBar && redBar) {
            var manualPercent = (manualCount / state.targetCount) * 100;
            var randomPercent = (randomCount / state.targetCount) * 100;
            greenBar.style.width = manualPercent + '%';
            redBar.style.width = randomPercent + '%';
        }
    }

    /**
     * Show a message in the point selector
     */
    function showMessage(type, message) {
        var hintEl = document.getElementById('pointSelectorHint');
        if (!hintEl) return;

        hintEl.className = 'point-selector-hint point-selector-hint-' + type;
        var textEl = hintEl.querySelector('span');
        if (textEl) {
            textEl.textContent = message;
        }

        // Auto-hide after 3 seconds
        setTimeout(function() {
            hintEl.className = 'point-selector-hint';
        }, 3000);
    }

    // ==========================================
    // Event Handlers
    // ==========================================

    /**
     * Handle click on canvas to add point
     */
    function handleCanvasClick(e, canvasType) {
        var canvas = state.canvases[canvasType];
        if (!canvas) return;

        var rect = canvas.getBoundingClientRect();
        var clickX = e.clientX - rect.left;
        var clickY = e.clientY - rect.top;

        // Convert to normalized coordinates
        var normX = clickX / canvas.width;
        var normY = clickY / canvas.height;

        // Validate against region
        var region = getActiveRegion();
        if (region && !isPointInRegion(normX, normY, region)) {
            showMessage('warning', I18n.t('point.outside.roi') || 'Point must be within the selected region');
            return;
        }

        // Convert to pixel coordinates
        var img = state.images[canvasType] || state.images.sample;
        var pixelX = normX * (img ? img.naturalWidth : 1000);
        var pixelY = normY * (img ? img.naturalHeight : 1000);

        // Add point
        addPoint(normX, normY, pixelX, pixelY, true);

        // Update UI
        updateUI();
        redrawAllCanvases();

        // Show feedback
        if (state.points.length >= state.targetCount) {
            showMessage('success', I18n.t('target.reached') || 'Target count reached!');
        }
    }

    /**
     * Update target count
     */
    function setTargetCount(count) {
        count = parseInt(count) || 5;
        count = Math.max(1, Math.min(100, count)); // Clamp between 1-100
        
        state.targetCount = count;

        // Adjust points if needed
        if (state.points.length > count) {
            // Remove excess points (prioritize removing random ones)
            while (state.points.length > count) {
                var randomIdx = -1;
                for (var i = state.points.length - 1; i >= 0; i--) {
                    if (!state.points[i].isManual) {
                        randomIdx = i;
                        break;
                    }
                }
                
                if (randomIdx !== -1) {
                    state.points.splice(randomIdx, 1);
                } else {
                    state.points.pop();
                }
            }
        }

        updateUI();
        redrawAllCanvases();
    }

    // ==========================================
    // Modal Management
    // ==========================================

    /**
     * Open the point selector modal
     */
    function open(mode) {
        mode = mode || 'color';
        state.mode = mode;
        var isSingle = mode === 'single';

        // Precondition checks
        if (isSingle) {
            if (!AppState.testFile) {
                showPreconditionError(
                    I18n.t('no.image.uploaded') || 'No Image Uploaded',
                    I18n.t('upload.sample.first') || 'Please upload a sample image before selecting points.'
                );
                return;
            }
        } else {
            if (!AppState.refFile || !AppState.testFile) {
                showPreconditionError(
                    I18n.t('images.required') || 'Images Required',
                    I18n.t('upload.both.images') || 'Please upload both reference and sample images before selecting points.'
                );
                return;
            }
        }

        var modal = document.getElementById('pointSelectorModal');
        if (!modal) return;

        state.isOpen = true;

        // Get target count from settings
        var countInput = document.getElementById(isSingle ? 'single_region_count' : 'region_count');
        if (countInput) {
            setTargetCount(parseInt(countInput.value) || 5);
        }

        // Load existing points for this mode
        loadPointsForMode(mode);

        // UI adjustments
        var refPanel = modal.querySelector('.point-selector-image-panel:first-child');
        if (refPanel) {
            refPanel.style.display = isSingle ? 'none' : 'block';
        }

        // Load images
        loadImages();

        // Show modal
        modal.style.display = 'flex';

        updateUI();
    }

    /**
     * Close the point selector modal
     */
    function close() {
        var modal = document.getElementById('pointSelectorModal');
        if (modal) {
            modal.style.display = 'none';
        }
        state.isOpen = false;

        // Save points to AppState
        savePointsToAppState();
    }

    /**
     * Show precondition error with branded modal
     */
    function showPreconditionError(title, message) {
        if (typeof showCustomAlert === 'function') {
            showCustomAlert(title, message, 'error');
        } else {
            alert(message);
        }
    }

    /**
     * Load images into the point selector
     */
    function loadImages() {
        var isSingle = state.mode === 'single';

        // Load reference image (skip if single mode)
        if (!isSingle && AppState.refFile) {
            loadImage('ref', AppState.refFile);
        }

        // Load sample image
        if (AppState.testFile) {
            loadImage('sample', AppState.testFile);
        }
    }

    /**
     * Load a single image
     */
    function loadImage(type, file) {
        var imgEl = document.getElementById('pointSelector' + (type === 'ref' ? 'Ref' : 'Sample') + 'Image');
        var canvasEl = document.getElementById('pointSelector' + (type === 'ref' ? 'Ref' : 'Sample') + 'Canvas');
        var containerEl = document.getElementById('pointSelector' + (type === 'ref' ? 'Ref' : 'Sample') + 'Container');

        if (!imgEl || !canvasEl || !containerEl) return;

        var reader = new FileReader();
        reader.onload = function(e) {
            imgEl.src = e.target.result;
            imgEl.onload = function() {
                setupCanvas(type, imgEl, canvasEl, containerEl);
            };
        };
        reader.readAsDataURL(file);
    }

    /**
     * Setup canvas for interaction
     */
    function setupCanvas(type, img, canvas, container) {
        state.images[type] = img;
        state.canvases[type] = canvas;
        state.contexts[type] = canvas.getContext('2d');

        // Set canvas size to match container
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Calculate scale
        state.imageScale.x = img.naturalWidth / canvas.width;
        state.imageScale.y = img.naturalHeight / canvas.height;

        // Add click handler
        canvas.onclick = function(e) {
            handleCanvasClick(e, type);
        };

        // Draw existing points
        drawPointsOnCanvas(type);

        // Update ROI overlay
        updateROIOverlay();
    }

    /**
     * Update ROI overlay
     */
    function updateROIOverlay() {
        // Implementation would show the region boundary
        // This is a placeholder - actual implementation depends on existing RegionSelector
    }

    /**
     * Load points for the current mode from AppState
     */
    function loadPointsForMode(mode) {
        var isSingle = mode === 'single';
        var savedPoints = isSingle ? AppState.manualSamplePointsSingle : AppState.manualSamplePointsColor;
        
        if (savedPoints && Array.isArray(savedPoints)) {
            state.points = savedPoints.map(function(p) {
                return {
                    x: p.x,
                    y: p.y,
                    pixelX: p.pixelX || Math.round(p.x * 1000),
                    pixelY: p.pixelY || Math.round(p.y * 1000),
                    isManual: p.isManual !== undefined ? p.isManual : true,
                    index: p.index || 0
                };
            });
        } else {
            state.points = [];
        }
    }

    /**
     * Save points to AppState
     */
    function savePointsToAppState() {
        var isSingle = state.mode === 'single';
        
        if (isSingle) {
            AppState.manualSamplePointsSingle = state.points.slice();
            AppState.singleSamplingMode = state.points.length > 0 ? 'manual' : 'random';
        } else {
            AppState.manualSamplePointsColor = state.points.slice();
            AppState.colorSamplingMode = state.points.length > 0 ? 'manual' : 'random';
        }

        // Update settings panel
        updateSettingsPanelStatus();
    }

    // ==========================================
    // Public API
    // ==========================================
    return {
        open: open,
        close: close,
        addPoint: addPoint,
        undoLastPoint: undoLastPoint,
        clearAllPoints: clearAllPoints,
        completeWithRandomPoints: completeWithRandomPoints,
        setTargetCount: setTargetCount,
        handleRegionChange: handleRegionChange,
        getPoints: function() { return state.points.slice(); },
        getState: function() { return state; }
    };
})();
