/**
 * Region Selector Module
 * Modern UI for selecting analysis regions on images
 * Features: click-to-place, drag-to-move, wheel-to-resize, dimming effect
 */

var RegionSelector = (function () {
    'use strict';

    // State
    var state = {
        isPlaced: false,
        isDragging: false,
        shape: 'circle', // 'circle', 'square', 'rectangle'
        // Dimensions for each shape type (in NATURAL/ORIGINAL image pixels)
        circleDiameter: 100,
        squareSize: 100,
        rectangleWidth: 150,
        rectangleHeight: 100,
        // Current effective size (for backward compatibility)
        size: 100,
        width: 100,
        height: 100,
        // CRITICAL: Position in NATURAL/ORIGINAL image pixel coordinates
        centerPixelX: 0,
        centerPixelY: 0,
        // Image dimensions for coordinate conversion
        refImageWidth: 0,
        refImageHeight: 0,
        testImageWidth: 0,
        testImageHeight: 0,
        // Original image dimensions (actual file dimensions)
        refOriginalWidth: 0,
        refOriginalHeight: 0,
        testOriginalWidth: 0,
        testOriginalHeight: 0,
        // Drag offset
        dragOffsetX: 0,
        dragOffsetY: 0,
        // Active panel being interacted with
        activePanel: null,
        // Enabled state
        enabled: true,
        // Pen (freehand) state
        penPoints: [],
        penDrawing: false,
        penClosed: false,
        penActivePanel: null
    };

    // DOM elements cache
    var elements = {
        refPanel: null,
        testPanel: null,
        refImage: null,
        testImage: null,
        refContainer: null,
        testContainer: null,
        refOverlay: null,
        testOverlay: null,
        refDimmer: null,
        testDimmer: null,
        sizeSlider: null,
        sizeValue: null
    };

    /**
     * Initialize the region selector
     */
    function init() {
        cacheElements();
        createDimmerElements();
        bindEvents();
        updateSizeDisplay();

        // Initial state - not placed until user clicks
        hideSelection();

    }

    /**
     * Cache DOM elements
     */
    function cacheElements() {
        elements.refPanel = document.getElementById('refPanelContent');
        elements.testPanel = document.getElementById('testPanelContent');
        elements.refImage = document.getElementById('refPreview');
        elements.testImage = document.getElementById('testPreview');
        elements.refContainer = elements.refPanel;
        elements.testContainer = elements.testPanel;
        elements.refOverlay = document.getElementById('refOverlay');
        elements.testOverlay = document.getElementById('testOverlay');
        elements.sizeSlider = document.getElementById('shapeSize');
        elements.sizeValue = document.getElementById('sizeValue');
    }

    /**
     * Create dimmer overlay elements for both panels
     */
    function createDimmerElements() {
        // Create dimmer for reference panel
        if (elements.refPanel && !document.getElementById('refDimmer')) {
            elements.refDimmer = document.createElement('div');
            elements.refDimmer.id = 'refDimmer';
            elements.refDimmer.className = 'region-dimmer';
            elements.refPanel.appendChild(elements.refDimmer);
        }

        // Create dimmer for test panel
        if (elements.testPanel && !document.getElementById('testDimmer')) {
            elements.testDimmer = document.createElement('div');
            elements.testDimmer.id = 'testDimmer';
            elements.testDimmer.className = 'region-dimmer';
            elements.testPanel.appendChild(elements.testDimmer);
        }
    }

    /**
     * Bind all event listeners
     * CRITICAL: Click on IMAGE, drag on OVERLAY, wheel on both
     */
    function bindEvents() {
        // Reference image events
        if (elements.refImage) {
            elements.refImage.addEventListener('click', handleImageClick);
            elements.refImage.addEventListener('mousedown', handleImageMouseDown);
            elements.refImage.addEventListener('wheel', handleWheel, { passive: false });
            elements.refImage.style.cursor = 'crosshair';
        }

        // Test image events
        if (elements.testImage) {
            elements.testImage.addEventListener('click', handleImageClick);
            elements.testImage.addEventListener('mousedown', handleImageMouseDown);
            elements.testImage.addEventListener('wheel', handleWheel, { passive: false });
            elements.testImage.style.cursor = 'crosshair';
        }
        
        // Overlay events for dragging and resizing - attach after overlays are created
        if (elements.refOverlay) {
            elements.refOverlay.addEventListener('mousedown', handleOverlayMouseDown);
            elements.refOverlay.addEventListener('wheel', handleWheel, { passive: false });
        }
        if (elements.testOverlay) {
            elements.testOverlay.addEventListener('mousedown', handleOverlayMouseDown);
            elements.testOverlay.addEventListener('wheel', handleWheel, { passive: false });
        }

        // Global mouse events for dragging
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Global pen (freehand) drawing events
        document.addEventListener('mousemove', _penMouseMove);
        document.addEventListener('mouseup', _penMouseUp);

        // Size slider
        if (elements.sizeSlider) {
            elements.sizeSlider.addEventListener('input', handleSliderChange);
        }

        // Shape radio buttons
        var shapeRadios = document.querySelectorAll('input[name="shapeType"]');
        shapeRadios.forEach(function (radio) {
            radio.addEventListener('change', handleShapeChange);
        });

        // Process full image checkbox
        var fullImageCheckbox = document.getElementById('processFullImage');
        if (fullImageCheckbox) {
            fullImageCheckbox.addEventListener('change', handleFullImageToggle);
        }

        // Listen for image load to get dimensions
        if (elements.refImage) {
            elements.refImage.addEventListener('load', function () {
                updateImageDimensions('ref');
            });
        }
        if (elements.testImage) {
            elements.testImage.addEventListener('load', function () {
                updateImageDimensions('test');
            });
        }
    }

    /**
     * Update image dimensions when images are loaded
     * CRITICAL: Initialize pixel coordinates to center of image
     */
    function updateImageDimensions(type) {
        if (type === 'ref' && elements.refImage) {
            state.refImageWidth = elements.refImage.clientWidth;
            state.refImageHeight = elements.refImage.clientHeight;
            state.refOriginalWidth = elements.refImage.naturalWidth;
            state.refOriginalHeight = elements.refImage.naturalHeight;
            
            // Initialize center position if not yet placed
            if (!state.isPlaced && state.centerPixelX === 0 && state.centerPixelY === 0) {
                state.centerPixelX = Math.round(state.refOriginalWidth / 2);
                state.centerPixelY = Math.round(state.refOriginalHeight / 2);
            }
        } else if (type === 'test' && elements.testImage) {
            state.testImageWidth = elements.testImage.clientWidth;
            state.testImageHeight = elements.testImage.clientHeight;
            state.testOriginalWidth = elements.testImage.naturalWidth;
            state.testOriginalHeight = elements.testImage.naturalHeight;
        }

        // Update selection if placed
        if (state.isPlaced) {
            updateSelectionDisplay();
        }
    }

    /**
     * Handle click on IMAGE to place selection
     * CRITICAL: Event is on image element, so all clicks are valid
     */
    function handleImageClick(e) {
        if (!state.enabled) return;

        // Ignore clicks on overlay or handles
        if (e.target.classList.contains('region-overlay') ||
            e.target.classList.contains('region-handle')) {
            return;
        }

        var image = e.currentTarget;
        if (!image || image.style.display === 'none') return;

        // Get image bounds
        var imgRect = image.getBoundingClientRect();
        var naturalWidth = image.naturalWidth || imgRect.width;
        var naturalHeight = image.naturalHeight || imgRect.height;

        // Calculate click position relative to image (display coordinates)
        var displayX = e.clientX - imgRect.left;
        var displayY = e.clientY - imgRect.top;

        // Convert to natural/original pixel coordinates
        var scaleX = naturalWidth / imgRect.width;
        var scaleY = naturalHeight / imgRect.height;
        
        var pixelX = Math.round(displayX * scaleX);
        var pixelY = Math.round(displayY * scaleY);

        // Pen mode is handled by mousedown, not click
        if (state.shape === 'pen') return;

        // CRITICAL: Constrain center position within image bounds considering region size
        var dimensions = getCurrentDimensions();
        var halfWidth = dimensions.width / 2;
        var halfHeight = dimensions.height / 2;
        
        // Ensure region stays completely within image
        pixelX = Math.max(halfWidth, Math.min(naturalWidth - halfWidth, pixelX));
        pixelY = Math.max(halfHeight, Math.min(naturalHeight - halfHeight, pixelY));

        // Store in pixel coordinates
        state.centerPixelX = pixelX;
        state.centerPixelY = pixelY;

        state.isPlaced = true;
        showSelection();
        updateSelectionDisplay();
    }

    /**
     * Handle mousedown on IMAGE — used for pen (freehand) drawing start
     * This fires immediately on press, unlike click which fires on release
     */
    function handleImageMouseDown(e) {
        if (!state.enabled) return;
        if (state.shape !== 'pen') return;

        var image = e.currentTarget;
        if (!image || image.style.display === 'none') return;

        e.preventDefault();
        e.stopPropagation();

        var imgRect = image.getBoundingClientRect();
        var naturalWidth = image.naturalWidth || imgRect.width;
        var naturalHeight = image.naturalHeight || imgRect.height;

        var scaleX = naturalWidth / imgRect.width;
        var scaleY = naturalHeight / imgRect.height;

        var pixelX = Math.round((e.clientX - imgRect.left) * scaleX);
        var pixelY = Math.round((e.clientY - imgRect.top) * scaleY);
        pixelX = Math.max(0, Math.min(naturalWidth, pixelX));
        pixelY = Math.max(0, Math.min(naturalHeight, pixelY));

        state.penPoints = [{x: pixelX, y: pixelY}];
        state.penDrawing = true;
        state.penClosed = false;
        state.penActivePanel = image.closest('.panel-content');
        state.isPlaced = true;
        showSelection();
        _penRenderAll();
    }

    /**
     * Handle mouse down on overlay for dragging
     */
    function handleOverlayMouseDown(e) {
        if (!state.enabled || !state.isPlaced) return;

        e.preventDefault();
        e.stopPropagation();
        
        state.isDragging = true;
        
        // Find parent panel to get image reference
        var overlay = e.currentTarget;
        var panel = overlay.closest('.panel-content');
        state.activePanel = panel;

        var rect = overlay.getBoundingClientRect();
        state.dragOffsetX = e.clientX - rect.left - rect.width / 2;
        state.dragOffsetY = e.clientY - rect.top - rect.height / 2;

        document.body.style.cursor = 'grabbing';
        overlay.classList.add('dragging');
    }

    /**
     * Handle mouse move for dragging
     * CRITICAL: Convert to pixel coordinates and constrain within bounds
     */
    function handleMouseMove(e) {
        if (!state.isDragging || !state.activePanel) return;

        var image = state.activePanel.querySelector('.image-preview');
        if (!image || image.style.display === 'none') return;

        var imgRect = image.getBoundingClientRect();
        var naturalWidth = image.naturalWidth || imgRect.width;
        var naturalHeight = image.naturalHeight || imgRect.height;

        // Calculate new position (display coordinates)
        var displayX = e.clientX - imgRect.left - state.dragOffsetX;
        var displayY = e.clientY - imgRect.top - state.dragOffsetY;

        // Convert to pixel coordinates
        var scaleX = naturalWidth / imgRect.width;
        var scaleY = naturalHeight / imgRect.height;
        
        var pixelX = Math.round(displayX * scaleX);
        var pixelY = Math.round(displayY * scaleY);

        // CRITICAL: Constrain within image bounds considering region size
        var dimensions = getCurrentDimensions();
        var halfWidth = dimensions.width / 2;
        var halfHeight = dimensions.height / 2;
        
        // Ensure region stays completely within image
        pixelX = Math.max(halfWidth, Math.min(naturalWidth - halfWidth, pixelX));
        pixelY = Math.max(halfHeight, Math.min(naturalHeight - halfHeight, pixelY));

        // Store in pixel coordinates
        state.centerPixelX = pixelX;
        state.centerPixelY = pixelY;

        updateSelectionDisplay();
    }

    /**
     * Handle mouse up to end dragging
     */
    function handleMouseUp(e) {
        if (state.isDragging) {
            state.isDragging = false;
            state.activePanel = null;
            document.body.style.cursor = '';

            var overlays = document.querySelectorAll('.region-overlay');
            overlays.forEach(function (o) { o.classList.remove('dragging'); });
        }
    }

    /**
     * Handle mouse wheel for resizing
     */
    function handleWheel(e) {
        if (!state.enabled || !state.isPlaced) return;
        // No wheel resize in pen mode
        if (state.shape === 'pen') return;

        // Only resize if over image area
        var panel = e.currentTarget;
        var image = panel.querySelector('.image-preview');
        if (!image || image.style.display === 'none') return;

        e.preventDefault();

        // Calculate delta
        var delta = e.deltaY > 0 ? -10 : 10;

        // Update the appropriate dimension based on shape
        var maxDims = getMaxDimensions();
        switch (state.shape) {
            case 'circle':
                state.circleDiameter = Math.max(20, Math.min(maxDims.minDim, state.circleDiameter + delta));
                break;
            case 'square':
                state.squareSize = Math.max(20, Math.min(maxDims.minDim, state.squareSize + delta));
                break;
            case 'rectangle':
                // For rectangle, scale both dimensions proportionally
                var ratio = state.rectangleHeight / state.rectangleWidth;
                state.rectangleWidth = Math.max(20, Math.min(maxDims.width, state.rectangleWidth + delta));
                state.rectangleHeight = Math.max(20, Math.min(maxDims.height, Math.round(state.rectangleWidth * ratio)));
                break;
        }

        // Update slider if present
        if (elements.sizeSlider) {
            var currentDim = getCurrentDimensions();
            elements.sizeSlider.value = currentDim.width;
        }

        // Also update AppState
        if (typeof AppState !== 'undefined') {
            AppState.shapeSize = getCurrentDimensions().width;
        }

        updateSizeDisplay();
        updateSelectionDisplay();
        syncSettingsInputs();

        // Update shape preview in app.js
        if (typeof updateShapePreview === 'function') {
            updateShapePreview();
        }
    }

    /**
     * Handle slider change
     */
    function handleSliderChange(e) {
        if (state.shape === 'pen') return;
        var newSize = parseInt(e.target.value);

        // Update the appropriate dimension based on shape
        switch (state.shape) {
            case 'circle':
                state.circleDiameter = newSize;
                break;
            case 'square':
                state.squareSize = newSize;
                break;
            case 'rectangle':
                // For rectangle via slider, scale both proportionally
                var ratio = state.rectangleHeight / state.rectangleWidth;
                state.rectangleWidth = newSize;
                state.rectangleHeight = Math.round(newSize * ratio);
                break;
        }

        // Also update AppState
        if (typeof AppState !== 'undefined') {
            AppState.shapeSize = newSize;
        }

        updateSizeDisplay();
        updateSelectionDisplay();
        syncSettingsInputs();

        // Update shape preview in app.js
        if (typeof updateShapePreview === 'function') {
            updateShapePreview();
        }
    }

    /**
     * Sync settings inputs in the modal with current state
     */
    function syncSettingsInputs() {
        var circleInput = document.getElementById('region_circle_diameter');
        var squareInput = document.getElementById('region_square_size');
        var rectWidthInput = document.getElementById('region_rect_width');
        var rectHeightInput = document.getElementById('region_rect_height');

        if (circleInput) circleInput.value = state.circleDiameter;
        if (squareInput) squareInput.value = state.squareSize;
        if (rectWidthInput) rectWidthInput.value = state.rectangleWidth;
        if (rectHeightInput) rectHeightInput.value = state.rectangleHeight;
    }

    /**
     * Handle shape change
     */
    function handleShapeChange(e) {
        state.shape = e.target.value;

        // Also update AppState
        if (typeof AppState !== 'undefined') {
            AppState.shapeType = state.shape;
        }

        updateSizeDisplay();
        updateSelectionDisplay();
        syncSettingsInputs();

        // Update shape preview in app.js
        if (typeof updateShapePreview === 'function') {
            updateShapePreview();
        }
    }

    /**
     * Handle full image toggle
     */
    function handleFullImageToggle(e) {
        state.enabled = !e.target.checked;

        if (state.enabled) {
            if (state.isPlaced) {
                showSelection();
            }
        } else {
            hideSelection();
        }
    }

    /**
     * Update the size display
     */
    function updateSizeDisplay() {
        if (elements.sizeValue) {
            var pxText = typeof I18n !== 'undefined' ? I18n.t('px') : 'px';
            var dimensions = getCurrentDimensions();

            if (state.shape === 'rectangle' && dimensions.width !== dimensions.height) {
                // Show width × height for rectangles
                elements.sizeValue.innerHTML = dimensions.width + '×' + dimensions.height + ' <span data-i18n="px">' + pxText + '</span>';
            } else {
                // Show single dimension for circles and squares
                elements.sizeValue.innerHTML = dimensions.width + ' <span data-i18n="px">' + pxText + '</span>';
            }
        }

        // Update slider value
        if (elements.sizeSlider) {
            var dimensions = getCurrentDimensions();
            elements.sizeSlider.value = dimensions.width;
        }
    }

    /**
     * Show the selection overlays
     */
    function showSelection() {
        if (!state.enabled) return;

        // Pen mode uses its own canvas — skip standard overlays and dimmers
        if (state.shape === 'pen') {
            if (elements.refOverlay) elements.refOverlay.classList.remove('placed');
            if (elements.testOverlay) elements.testOverlay.classList.remove('placed');
            if (elements.refDimmer) elements.refDimmer.classList.remove('active');
            if (elements.testDimmer) elements.testDimmer.classList.remove('active');
            return;
        }

        // Show overlays
        if (elements.refOverlay) {
            elements.refOverlay.style.display = '';
            elements.refOverlay.classList.add('placed');
        }
        if (elements.testOverlay) {
            elements.testOverlay.style.display = '';
            elements.testOverlay.classList.add('placed');
        }

        // Show dimmers
        if (elements.refDimmer) {
            elements.refDimmer.classList.add('active');
        }
        if (elements.testDimmer) {
            elements.testDimmer.classList.add('active');
        }

        updateSelectionDisplay();
    }

    /**
     * Hide the selection overlays
     */
    function hideSelection() {
        // Hide overlays
        if (elements.refOverlay) {
            elements.refOverlay.classList.remove('placed');
        }
        if (elements.testOverlay) {
            elements.testOverlay.classList.remove('placed');
        }

        // Hide dimmers
        if (elements.refDimmer) {
            elements.refDimmer.classList.remove('active');
        }
        if (elements.testDimmer) {
            elements.testDimmer.classList.remove('active');
        }
    }

    /**
     * Get maximum allowed dimensions based on loaded images
     */
    function getMaxDimensions() {
        var imgW = 500, imgH = 500;
        if (elements.refImage && elements.refImage.naturalWidth && elements.refImage.style.display !== 'none') {
            imgW = elements.refImage.naturalWidth;
            imgH = elements.refImage.naturalHeight;
        }
        if (elements.testImage && elements.testImage.naturalWidth && elements.testImage.style.display !== 'none') {
            imgW = Math.min(imgW, elements.testImage.naturalWidth);
            imgH = Math.min(imgH, elements.testImage.naturalHeight);
        }
        return { width: imgW, height: imgH, minDim: Math.min(imgW, imgH) };
    }

    /**
     * Get current effective dimensions based on shape type
     */
    function getCurrentDimensions() {
        switch (state.shape) {
            case 'circle':
                return { width: state.circleDiameter, height: state.circleDiameter };
            case 'square':
                return { width: state.squareSize, height: state.squareSize };
            case 'rectangle':
                return { width: state.rectangleWidth, height: state.rectangleHeight };
            default:
                return { width: state.size, height: state.size };
        }
    }

    /**
     * Update the selection display on both images
     */
    function updateSelectionDisplay() {
        if (!state.isPlaced) return;
        // Pen mode uses its own canvas rendering
        if (state.shape === 'pen') { _penRenderAll(); return; }

        var dimensions = getCurrentDimensions();
        state.width = dimensions.width;
        state.height = dimensions.height;
        state.size = Math.max(dimensions.width, dimensions.height);

        // Update reference overlay
        updateSingleOverlay(
            elements.refOverlay,
            elements.refDimmer,
            elements.refImage
        );

        // Update test overlay
        updateSingleOverlay(
            elements.testOverlay,
            elements.testDimmer,
            elements.testImage
        );
    }

    /**
     * Update a single overlay and dimmer
     * CRITICAL: Convert pixel coordinates to display coordinates for rendering
     * Maintains perfect circles and squares using uniform scaling
     * FIXED: Accounts for image position within panel-content for wide images
     */
    function updateSingleOverlay(overlay, dimmer, image) {
        if (!overlay || !image || image.style.display === 'none') return;

        var imgWidth = image.clientWidth;
        var imgHeight = image.clientHeight;
        var naturalWidth = image.naturalWidth || imgWidth;
        var naturalHeight = image.naturalHeight || imgHeight;

        if (imgWidth === 0 || imgHeight === 0 || naturalWidth === 0 || naturalHeight === 0) return;

        // CRITICAL: Get the image's actual position within the panel-content
        // For wide images, the image may not fill the entire panel
        var imageOffsetLeft = image.offsetLeft || 0;
        var imageOffsetTop = image.offsetTop || 0;

        // Calculate scale factors (natural to display) - MUST be uniform for aspect-ratio preserving display
        // For images with width:100%; height:auto; both scales should be equal
        var scaleX = imgWidth / naturalWidth;
        var scaleY = imgHeight / naturalHeight;

        var isCircle = state.shape === 'circle';
        var isSquare = state.shape === 'square';
        var isRectangle = state.shape === 'rectangle';

        // Get the overlay dimensions in NATURAL pixels
        var naturalOverlayWidth, naturalOverlayHeight;

        if (isCircle) {
            naturalOverlayWidth = state.circleDiameter;
            naturalOverlayHeight = state.circleDiameter;
        } else if (isSquare) {
            naturalOverlayWidth = state.squareSize;
            naturalOverlayHeight = state.squareSize;
        } else {
            // Rectangle
            naturalOverlayWidth = state.rectangleWidth;
            naturalOverlayHeight = state.rectangleHeight;
        }

        // Calculate display dimensions and position
        // Use independent scaling for all shapes to match the actual image display
        var displayOverlayWidth = naturalOverlayWidth * scaleX;
        var displayOverlayHeight = naturalOverlayHeight * scaleY;
        
        // For circles, ensure we maintain a perfect circle by using the smaller dimension
        if (isCircle) {
            var minDisplayDim = Math.min(displayOverlayWidth, displayOverlayHeight);
            displayOverlayWidth = minDisplayDim;
            displayOverlayHeight = minDisplayDim;
        }
        
        // For squares, ensure we maintain a perfect square
        if (isSquare) {
            var minDisplayDim = Math.min(displayOverlayWidth, displayOverlayHeight);
            displayOverlayWidth = minDisplayDim;
            displayOverlayHeight = minDisplayDim;
        }

        // Convert center pixel coordinates to display coordinates
        // CRITICAL: Use the actual scale factors, then add image offset
        var x = state.centerPixelX * scaleX;
        var y = state.centerPixelY * scaleY;

        // CRITICAL: Position overlay so its CENTER is at (x, y) relative to IMAGE
        // Then add the image's offset within the panel
        var overlayLeft = imageOffsetLeft + x - (displayOverlayWidth / 2);
        var overlayTop = imageOffsetTop + y - (displayOverlayHeight / 2);

        // Update overlay position and size (in display coordinates)
        overlay.style.left = overlayLeft + 'px';
        overlay.style.top = overlayTop + 'px';
        overlay.style.width = displayOverlayWidth + 'px';
        overlay.style.height = displayOverlayHeight + 'px';
        overlay.style.borderRadius = isCircle ? '50%' : '4px';
        overlay.style.opacity = '1';

        // Update dimension label on the overlay
        updateOverlayDimensionLabel(overlay, naturalOverlayWidth, naturalOverlayHeight, isCircle, isSquare);

        // Update dimmer to match the image exactly, not the panel
        if (dimmer) {
            // CRITICAL: Size and position dimmer to match image exactly
            dimmer.style.left = imageOffsetLeft + 'px';
            dimmer.style.top = imageOffsetTop + 'px';
            dimmer.style.width = imgWidth + 'px';
            dimmer.style.height = imgHeight + 'px';
            
            // Now update the mask (coordinates are relative to the dimmer, which matches the image)
            updateDimmerMask(dimmer, x, y, displayOverlayWidth, displayOverlayHeight, imgWidth, imgHeight, isCircle, isSquare);
        }
    }

    /**
     * Create or update a dimension label inside the overlay element
     * Shows W × H for rectangles, diameter for circles, side for squares
     */
    function updateOverlayDimensionLabel(overlay, natW, natH, isCircle, isSquare) {
        var label = overlay.querySelector('.region-dim-label');
        if (!label) {
            label = document.createElement('div');
            label.className = 'region-dim-label';
            label.style.cssText = 'position:absolute;bottom:4px;left:50%;transform:translateX(-50%);' +
                'background:rgba(0,102,204,0.85);color:#fff;font-size:10px;font-weight:600;' +
                'padding:2px 6px;border-radius:3px;white-space:nowrap;pointer-events:none;' +
                'font-family:system-ui,-apple-system,sans-serif;line-height:14px;z-index:10;' +
                'letter-spacing:0.3px;';
            overlay.appendChild(label);
        }
        var text;
        if (isCircle) {
            text = '\u2300 ' + Math.round(natW) + ' px';
        } else if (isSquare) {
            text = Math.round(natW) + ' px';
        } else {
            text = Math.round(natW) + ' \u00d7 ' + Math.round(natH) + ' px';
        }
        label.textContent = text;
    }

    /**
     * Update the dimmer mask using CSS clip-path
     * CRITICAL: Use pixel-based coordinates to maintain perfect shapes
     */
    function updateDimmerMask(dimmer, x, y, width, height, imgWidth, imgHeight, isCircle, isSquare) {
        var halfWidth = width / 2;
        var halfHeight = height / 2;

        if (isCircle) {
            // CRITICAL: Create PERFECT circular cutout using pixel-based radius
            // For circles, width === height due to uniform scaling
            var centerXPercent = (x / imgWidth) * 100;
            var centerYPercent = (y / imgHeight) * 100;
            
            // Use pixel radius to maintain perfect circle regardless of image aspect ratio
            var radiusPixels = halfWidth; // Same as halfHeight for circles
            
            // Create perfect circle using circle() instead of ellipse
            dimmer.style.maskImage = 'radial-gradient(circle ' + radiusPixels + 'px at ' +
                centerXPercent + '% ' + centerYPercent + '%, transparent 99%, black 100%)';
            dimmer.style.webkitMaskImage = dimmer.style.maskImage;
            dimmer.style.clipPath = 'none';
            dimmer.style.webkitClipPath = 'none';
        } else {
            // CRITICAL: Use PIXEL coordinates for squares and rectangles
            // Percentage-based coordinates get distorted by image aspect ratio
            var left = Math.max(0, x - halfWidth);
            var top = Math.max(0, y - halfHeight);
            var right = Math.min(imgWidth, x + halfWidth);
            var bottom = Math.min(imgHeight, y + halfHeight);

            // Use pixel-based polygon for perfect rectangular cutout
            var clipPath = 'polygon(' +
                '0px 0px, ' + imgWidth + 'px 0px, ' + imgWidth + 'px ' + imgHeight + 'px, 0px ' + imgHeight + 'px, 0px 0px, ' +  // Outer rectangle
                left + 'px ' + top + 'px, ' +           // Inner rectangle (cutout)
                left + 'px ' + bottom + 'px, ' +
                right + 'px ' + bottom + 'px, ' +
                right + 'px ' + top + 'px, ' +
                left + 'px ' + top + 'px)';

            dimmer.style.clipPath = clipPath;
            dimmer.style.webkitClipPath = clipPath;
            dimmer.style.maskImage = 'none';
            dimmer.style.webkitMaskImage = 'none';
        }
    }

    /**
     * Get crop settings for backend
     * CRITICAL: Return exact pixel coordinates - no conversion needed
     * FIXED: Ensures coordinates are clipped to actual image bounds
     */
    function getCropSettings() {
        if (!state.isPlaced || !state.enabled) {
            return {
                use_crop: false
            };
        }

        // Get natural image dimensions for clipping
        var naturalWidth = state.refOriginalWidth || 0;
        var naturalHeight = state.refOriginalHeight || 0;
        
        // Fallback to test image if ref not available
        if (naturalWidth === 0 || naturalHeight === 0) {
            naturalWidth = state.testOriginalWidth || 1000;
            naturalHeight = state.testOriginalHeight || 1000;
        }

        // CRITICAL: Coordinates are already in NATURAL/ORIGINAL pixel coordinates
        var centerX = state.centerPixelX;
        var centerY = state.centerPixelY;

        // Get current dimensions (already in NATURAL coordinates)
        var dimensions = getCurrentDimensions();
        var cropWidth = dimensions.width;
        var cropHeight = dimensions.height;

        // CRITICAL: Clip dimensions to image bounds
        cropWidth = Math.min(cropWidth, naturalWidth);
        cropHeight = Math.min(cropHeight, naturalHeight);

        // CRITICAL: Ensure center is within valid bounds (considering region size)
        var halfW = cropWidth / 2;
        var halfH = cropHeight / 2;
        centerX = Math.max(halfW, Math.min(naturalWidth - halfW, centerX));
        centerY = Math.max(halfH, Math.min(naturalHeight - halfH, centerY));

        // Calculate Top-Left coordinates for backend
        var cropX = Math.round(centerX - halfW);
        var cropY = Math.round(centerY - halfH);

        // Final clipping to ensure non-negative values
        cropX = Math.max(0, cropX);
        cropY = Math.max(0, cropY);

        return {
            use_crop: true,
            crop_shape: state.shape === 'circle' ? 'circle' : 'rectangle',
            crop_center_x: Math.round(centerX),
            crop_center_y: Math.round(centerY),
            crop_x: cropX,
            crop_y: cropY,
            crop_diameter: state.shape === 'circle' ? cropWidth : Math.max(cropWidth, cropHeight),
            crop_width: Math.round(cropWidth),
            crop_height: Math.round(cropHeight)
        };
    }

    /**
     * Reset the selection
     */
    function reset() {
        state.isPlaced = false;
        // Initialize to center of image (will be set properly on first click)
        state.centerPixelX = 0;
        state.centerPixelY = 0;
        hideSelection();
    }

    /**
     * Set enabled state
     */
    function setEnabled(enabled) {
        state.enabled = enabled;
        if (!enabled) {
            hideSelection();
        } else if (state.isPlaced) {
            showSelection();
        }
    }

    /**
     * Set shape
     */
    function setShape(shape) {
        state.shape = shape;
        updateSizeDisplay();
        updateSelectionDisplay();
    }

    /**
     * Set size (backward compatibility - sets the current shape's primary dimension)
     */
    function setSize(size) {
        switch (state.shape) {
            case 'circle':
                state.circleDiameter = size;
                break;
            case 'square':
                state.squareSize = size;
                break;
            case 'rectangle':
                state.rectangleWidth = size;
                break;
        }
        state.size = size;
        updateSizeDisplay();
        updateSelectionDisplay();
    }

    /**
     * Set circle diameter
     */
    function setCircleDiameter(diameter) {
        state.circleDiameter = diameter;
        if (state.shape === 'circle') {
            updateSizeDisplay();
            updateSelectionDisplay();
        }
    }

    /**
     * Set square size
     */
    function setSquareSize(size) {
        state.squareSize = size;
        if (state.shape === 'square') {
            updateSizeDisplay();
            updateSelectionDisplay();
        }
    }

    /**
     * Set rectangle dimensions
     */
    function setRectangleDimensions(width, height) {
        state.rectangleWidth = width;
        state.rectangleHeight = height;
        if (state.shape === 'rectangle') {
            updateSizeDisplay();
            updateSelectionDisplay();
        }
    }

    /**
     * Get current state (for settings sync)
     */
    function getState() {
        return {
            shape: state.shape,
            circleDiameter: state.circleDiameter,
            squareSize: state.squareSize,
            rectangleWidth: state.rectangleWidth,
            rectangleHeight: state.rectangleHeight
        };
    }

    /**
     * Check if selection is placed
     */
    function isPlaced() {
        return state.isPlaced && state.enabled;
    }

    /**
     * Refresh dimensions (call after images load)
     */
    function refreshDimensions() {
        updateImageDimensions('ref');
        updateImageDimensions('test');
    }

    /* ═══════════════════════════════════════════
       PEN (FREEHAND) DRAWING SUPPORT
       ═══════════════════════════════════════════ */
    var PEN_CLOSE_DIST = 15;

    function _penMouseMove(e) {
        if (!state.penDrawing || state.shape !== 'pen') return;
        var image = _penGetImage();
        if (!image) return;
        var imgRect = image.getBoundingClientRect();
        var scaleX = (image.naturalWidth || imgRect.width) / imgRect.width;
        var scaleY = (image.naturalHeight || imgRect.height) / imgRect.height;
        var px = Math.round((e.clientX - imgRect.left) * scaleX);
        var py = Math.round((e.clientY - imgRect.top) * scaleY);
        px = Math.max(0, Math.min(image.naturalWidth || imgRect.width, px));
        py = Math.max(0, Math.min(image.naturalHeight || imgRect.height, py));
        state.penPoints.push({x: px, y: py});
        _penRenderAll();
    }

    function _penMouseUp(e) {
        if (!state.penDrawing || state.shape !== 'pen') return;
        state.penDrawing = false;
        if (state.penPoints.length < 10) {
            state.penPoints = []; state.penClosed = false;
            _penRenderAll();
            return;
        }
        var first = state.penPoints[0], last = state.penPoints[state.penPoints.length - 1];
        var dx = first.x - last.x, dy = first.y - last.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        var imgW = state.refOriginalWidth || state.testOriginalWidth || 1000;
        var threshold = Math.max(PEN_CLOSE_DIST, imgW * 0.02);
        if (dist <= threshold) {
            state.penPoints.push({x: first.x, y: first.y});
            state.penClosed = true;
            _penRenderAll();
        } else {
            state.penClosed = false;
            _penRenderAll();
            // Show warning using custom modal if available, else alert
            var t = (typeof I18n !== 'undefined') ? I18n.t.bind(I18n) : function(k) { return k; };
            if (typeof showCustomAlert === 'function') {
                showCustomAlert(t('pen.not.closed'), t('pen.close.warning'), 'warning');
            } else {
                alert(t('pen.close.warning'));
            }
        }
    }

    function _penGetImage() {
        if (state.penActivePanel) {
            return state.penActivePanel.querySelector('.image-preview');
        }
        return elements.refImage || elements.testImage;
    }

    function _penRenderAll() {
        _penRenderOnPanel(elements.refPanel, elements.refImage, elements.refOverlay, elements.refDimmer);
        _penRenderOnPanel(elements.testPanel, elements.testImage, elements.testOverlay, elements.testDimmer);
    }

    function _penRenderOnPanel(panel, image, overlay, dimmer) {
        if (!panel || !image || image.style.display === 'none') return;
        var canvas = _penGetCanvas(panel);
        if (!canvas) return;

        var imgW = image.clientWidth, imgH = image.clientHeight;
        var natW = image.naturalWidth || imgW, natH = image.naturalHeight || imgH;
        if (imgW === 0 || imgH === 0) return;

        var imageOffsetLeft = image.offsetLeft || 0;
        var imageOffsetTop = image.offsetTop || 0;
        var dpr = window.devicePixelRatio || 1;

        canvas.width = imgW * dpr;
        canvas.height = imgH * dpr;
        canvas.style.width = imgW + 'px';
        canvas.style.height = imgH + 'px';
        canvas.style.left = imageOffsetLeft + 'px';
        canvas.style.top = imageOffsetTop + 'px';
        canvas.style.display = '';

        var ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        var scaleX = imgW / natW, scaleY = imgH / natH;

        // Hide standard overlays when pen is active
        if (overlay) overlay.style.display = 'none';
        if (dimmer) dimmer.classList.remove('active');

        var pts = state.penPoints;
        if (pts.length < 2) {
            // Show hint
            ctx.fillStyle = 'rgba(0,0,0,0.12)';
            ctx.fillRect(0, 0, imgW, imgH);
            var t = (typeof I18n !== 'undefined') ? I18n.t.bind(I18n) : function(k) { return k; };
            ctx.font = 'bold 13px system-ui,-apple-system,sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = 'rgba(0,120,212,0.9)';
            ctx.fillText(t('pen.draw.hint'), imgW / 2, imgH / 2);
            return;
        }

        // If closed, draw dimmed area outside polygon
        if (state.penClosed && pts.length > 2) {
            ctx.fillStyle = 'rgba(0,0,0,0.45)';
            ctx.fillRect(0, 0, imgW, imgH);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
            for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
            ctx.closePath(); ctx.fill();
            ctx.globalCompositeOperation = 'source-over';
        }

        // Draw the freehand path
        ctx.strokeStyle = state.penClosed ? '#0078d4' : '#e74c3c';
        ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (!state.penClosed) ctx.setLineDash([6, 4]);
        ctx.beginPath();
        ctx.moveTo(pts[0].x * scaleX, pts[0].y * scaleY);
        for (var i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x * scaleX, pts[i].y * scaleY);
        if (state.penClosed) ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Start point indicator
        ctx.fillStyle = state.penClosed ? '#27ae60' : '#e74c3c';
        ctx.beginPath(); ctx.arc(pts[0].x * scaleX, pts[0].y * scaleY, 5, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke();

        // Status label
        var t = (typeof I18n !== 'undefined') ? I18n.t.bind(I18n) : function(k) { return k; };
        var statusText = state.penClosed ? t('pen.complete') : (state.penDrawing ? t('pen.drawing') : t('pen.not.closed'));
        ctx.font = 'bold 11px system-ui,-apple-system,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        var tw = ctx.measureText(statusText).width;
        var lx = imgW / 2, ly = imgH - 24;
        ctx.fillStyle = state.penClosed ? 'rgba(39,174,96,0.85)' : 'rgba(231,76,60,0.85)';
        var pd = 5;
        ctx.beginPath();
        var bx = lx - tw / 2 - pd, by = ly - 2, bw = tw + pd * 2, bh = 18;
        ctx.moveTo(bx + 3, by); ctx.arcTo(bx + bw, by, bx + bw, by + bh, 3);
        ctx.arcTo(bx + bw, by + bh, bx, by + bh, 3); ctx.arcTo(bx, by + bh, bx, by, 3);
        ctx.arcTo(bx, by, bx + bw, by, 3); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillText(statusText, lx, ly);
    }

    function _penGetCanvas(panel) {
        if (!panel) return null;
        var canvas = panel.querySelector('.pen-draw-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.className = 'pen-draw-canvas';
            canvas.style.cssText = 'position:absolute;top:0;left:0;z-index:12;pointer-events:none;';
            panel.appendChild(canvas);
        }
        return canvas;
    }

    function _penClearCanvases() {
        document.querySelectorAll('.pen-draw-canvas').forEach(function(c) {
            c.width = 0; c.height = 0; c.style.display = 'none';
        });
    }

    function _penPointInPolygon(px, py, pts) {
        var inside = false;
        for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            var xi = pts[i].x, yi = pts[i].y, xj = pts[j].x, yj = pts[j].y;
            if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    }

    /* Override setShape to clear pen state when switching away */
    var _origSetShape = setShape;
    function setShapeWithPen(shape) {
        if (state.shape === 'pen' && shape !== 'pen') {
            state.penPoints = []; state.penDrawing = false; state.penClosed = false;
            _penClearCanvases();
            // Re-show standard overlays
            if (elements.refOverlay) elements.refOverlay.style.display = '';
            if (elements.testOverlay) elements.testOverlay.style.display = '';
        }
        if (shape === 'pen') {
            state.penPoints = []; state.penDrawing = false; state.penClosed = false;
            _penRenderAll();
        }
        state.shape = shape;
        updateSizeDisplay();
        updateSelectionDisplay();
    }

    /* Override getCropSettings for pen polygon */
    var _origGetCropSettings = getCropSettings;
    function getCropSettingsWithPen() {
        if (state.shape === 'pen') {
            if (!state.penClosed || state.penPoints.length < 10) {
                return { use_crop: false };
            }
            var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            state.penPoints.forEach(function(p) {
                if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y;
                if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y;
            });
            return {
                use_crop: true,
                crop_shape: 'polygon',
                polygon: state.penPoints.map(function(p) { return [p.x, p.y]; }),
                crop_x: Math.max(0, Math.round(minX)),
                crop_y: Math.max(0, Math.round(minY)),
                crop_width: Math.round(maxX - minX),
                crop_height: Math.round(maxY - minY),
                crop_center_x: Math.round((minX + maxX) / 2),
                crop_center_y: Math.round((minY + maxY) / 2),
                crop_diameter: Math.max(Math.round(maxX - minX), Math.round(maxY - minY))
            };
        }
        return _origGetCropSettings();
    }

    /* Override reset to clear pen state */
    var _origReset = reset;
    function resetWithPen() {
        state.penPoints = []; state.penDrawing = false; state.penClosed = false;
        _penClearCanvases();
        _origReset();
    }

    // Public API
    return {
        init: init,
        getCropSettings: getCropSettingsWithPen,
        reset: resetWithPen,
        setEnabled: setEnabled,
        setShape: setShapeWithPen,
        setSize: setSize,
        setCircleDiameter: setCircleDiameter,
        setSquareSize: setSquareSize,
        setRectangleDimensions: setRectangleDimensions,
        getState: function() {
            var s = getState();
            s.penPoints = state.penPoints;
            s.penClosed = state.penClosed;
            return s;
        },
        isPlaced: isPlaced,
        isEnabled: function() { return state.enabled; },
        getShape: function() { return state.shape; },
        getCurrentDimensions: getCurrentDimensions,
        refreshDimensions: refreshDimensions,
        showSelection: showSelection,
        hideSelection: hideSelection,
        isPenClosed: function() { return state.penClosed; },
        getPenPoints: function() { return state.penPoints; }
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Delay initialization to ensure other scripts have loaded
    setTimeout(function () {
        RegionSelector.init();
    }, 100);
});
