// ==========================================
// Region Validation Module
// Strict validation for point selection within analysis regions
// ==========================================

/**
 * Check if a point (in pixel coordinates) is within the selected analysis region
 * @param {number} pixelX - X coordinate in image pixels
 * @param {number} pixelY - Y coordinate in image pixels
 * @param {number} imageWidth - Natural image width
 * @param {number} imageHeight - Natural image height
 * @returns {boolean} - True if point is valid, false otherwise
 */
function isPointInSelectedRegion(pixelX, pixelY, imageWidth, imageHeight) {
    // If processing full image (no region selected), all points are valid
    if (AppState.processFullImage) {
        return true;
    }

    // Get region settings from RegionSelector
    if (typeof RegionSelector === 'undefined' || !RegionSelector.isPlaced()) {
        // No region defined, allow all points
        return true;
    }

    var cropSettings = RegionSelector.getCropSettings();
    if (!cropSettings || !cropSettings.use_crop) {
        return true;
    }

    // Get region parameters
    var shape = cropSettings.crop_shape; // 'circle', 'square', or 'rectangle'
    var centerX = cropSettings.crop_center_x;
    var centerY = cropSettings.crop_center_y;

    // Validate based on shape
    if (shape === 'polygon') {
        // Pen (freehand) polygon — use ray-casting
        var poly = cropSettings.polygon;
        if (!poly || poly.length < 4) return true;
        var inside = false;
        for (var i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            var xi = poly[i][0], yi = poly[i][1], xj = poly[j][0], yj = poly[j][1];
            if (((yi > pixelY) !== (yj > pixelY)) && (pixelX < (xj - xi) * (pixelY - yi) / (yj - yi) + xi)) inside = !inside;
        }
        return inside;
    } else if (shape === 'circle') {
        var diameter = cropSettings.crop_diameter;
        var radius = diameter / 2;
        
        // Calculate distance from center
        var dx = pixelX - centerX;
        var dy = pixelY - centerY;
        var distance = Math.sqrt(dx * dx + dy * dy);
        
        return distance <= radius;
    } else {
        // Rectangle or Square
        var width = cropSettings.crop_width;
        var height = cropSettings.crop_height;
        var halfW = width / 2;
        var halfH = height / 2;
        
        // Check if point is within rectangle bounds
        return pixelX >= centerX - halfW &&
               pixelX <= centerX + halfW &&
               pixelY >= centerY - halfH &&
               pixelY <= centerY + halfH;
    }
}

/**
 * Draw region overlay with dimmed areas outside the target region
 * @param {HTMLCanvasElement} canvas - Canvas to draw on
 * @param {Object} imageInfo - Image information (dimensions, scale)
 */
function drawRegionOverlay(canvas, imageInfo) {
    if (!canvas || !imageInfo) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear any existing overlay
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // If processing full image, no overlay needed
    if (AppState.processFullImage) {
        return;
    }

    // Get region settings
    if (typeof RegionSelector === 'undefined' || !RegionSelector.isPlaced()) {
        return;
    }

    var cropSettings = RegionSelector.getCropSettings();
    if (!cropSettings || !cropSettings.use_crop) {
        return;
    }

    // Draw dimmed overlay over entire image
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'; // Dark semi-transparent overlay
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Cut out the target region (clear it to show the image)
    ctx.globalCompositeOperation = 'destination-out';

    var shape = cropSettings.crop_shape;
    var centerX = cropSettings.crop_center_x / imageInfo.scaleX;
    var centerY = cropSettings.crop_center_y / imageInfo.scaleY;

    if (shape === 'circle') {
        var diameter = cropSettings.crop_diameter;
        var radius = (diameter / 2) / imageInfo.scaleX;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.fill();
    } else {
        // Rectangle or Square
        var width = cropSettings.crop_width / imageInfo.scaleX;
        var height = cropSettings.crop_height / imageInfo.scaleY;
        
        ctx.fillRect(
            centerX - width / 2,
            centerY - height / 2,
            width,
            height
        );
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';

    // Draw highlight border around the target region
    ctx.strokeStyle = '#22c55e'; // Green highlight
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]); // Dashed line

    if (shape === 'circle') {
        var diameter = cropSettings.crop_diameter;
        var radius = (diameter / 2) / imageInfo.scaleX;
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
    } else {
        var width = cropSettings.crop_width / imageInfo.scaleX;
        var height = cropSettings.crop_height / imageInfo.scaleY;
        
        ctx.strokeRect(
            centerX - width / 2,
            centerY - height / 2,
            width,
            height
        );
    }

    ctx.setLineDash([]); // Reset dash
}

/**
 * Update region overlays on both ref and sample canvases
 */
function updateRegionOverlays() {
    // Create overlay canvases if they don't exist
    var refContainer = document.getElementById('pointSelectorRefContainer');
    var sampleContainer = document.getElementById('pointSelectorSampleContainer');

    if (refContainer && PointSelectorState.refImageInfo) {
        var refOverlayCanvas = document.getElementById('refRegionOverlay');
        if (!refOverlayCanvas) {
            refOverlayCanvas = document.createElement('canvas');
            refOverlayCanvas.id = 'refRegionOverlay';
            refOverlayCanvas.style.position = 'absolute';
            refOverlayCanvas.style.pointerEvents = 'none';
            refOverlayCanvas.style.zIndex = '1';
            refContainer.appendChild(refOverlayCanvas);
        }
        
        // Match canvas size and position to main canvas
        var refCanvas = PointSelectorState.refCanvas;
        if (refCanvas) {
            refOverlayCanvas.style.left = refCanvas.style.left;
            refOverlayCanvas.style.top = refCanvas.style.top;
            refOverlayCanvas.style.width = refCanvas.style.width;
            refOverlayCanvas.style.height = refCanvas.style.height;
            refOverlayCanvas.width = refCanvas.width;
            refOverlayCanvas.height = refCanvas.height;
            
            drawRegionOverlay(refOverlayCanvas, PointSelectorState.refImageInfo);
        }
    }

    if (sampleContainer && PointSelectorState.sampleImageInfo) {
        var sampleOverlayCanvas = document.getElementById('sampleRegionOverlay');
        if (!sampleOverlayCanvas) {
            sampleOverlayCanvas = document.createElement('canvas');
            sampleOverlayCanvas.id = 'sampleRegionOverlay';
            sampleOverlayCanvas.style.position = 'absolute';
            sampleOverlayCanvas.style.pointerEvents = 'none';
            sampleOverlayCanvas.style.zIndex = '1';
            sampleContainer.appendChild(sampleOverlayCanvas);
        }
        
        // Match canvas size and position to main canvas
        var sampleCanvas = PointSelectorState.sampleCanvas;
        if (sampleCanvas) {
            sampleOverlayCanvas.style.left = sampleCanvas.style.left;
            sampleOverlayCanvas.style.top = sampleCanvas.style.top;
            sampleOverlayCanvas.style.width = sampleCanvas.style.width;
            sampleOverlayCanvas.style.height = sampleCanvas.style.height;
            sampleOverlayCanvas.width = sampleCanvas.width;
            sampleOverlayCanvas.height = sampleCanvas.height;
            
            drawRegionOverlay(sampleOverlayCanvas, PointSelectorState.sampleImageInfo);
        }
    }
}
