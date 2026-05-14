/**
 * Textile QC System - Main Application
 * Version 3.0.0 - With SPACTRA Studio
 */

// Application State
var AppState = {
    sessionId: null,
    refFile: null,
    testFile: null,
    sampleFile: null, // Alias for testFile for clarity
    shapeType: 'circle',
    shapeSize: 100,
    processFullImage: true,
    analyzeSingleImage: false,
    pdfFilename: null,
    settingsPdfFilename: null,
    settings: {},
    isProcessing: false,
    // Manual sampling state
    manualSamplePoints: [],
    samplingMode: 'random' // 'random' or 'manual'
};

var IlluminantTabOriginalParent = null;
var IlluminantTabOriginalNextSibling = null;

// Point Selector State
var PointSelectorState = {
    isOpen: false,
    mode: 'color', // 'color' or 'single'
    points: [],
    targetCount: 5,
    nextReplaceIndex: 0,
    refCanvas: null,
    refCtx: null,
    sampleCanvas: null,
    sampleCtx: null,
    imageScale: { x: 1, y: 1 }
};

// Help dialog state
var currentHelpType = null;

// Initialize Application
document.addEventListener('DOMContentLoaded', function () {

    initFileInputs();
    initShapeControls();
    initSingleImageMode();

    initSingleImageReportSections();
    initButtons();
    initModal();
    initOverlayTracking();
    loadDefaultSettings();
    initHelpAndFeedbackHandlers();
    initDatasheetDownload();

    initReadyToTest();
    initSamplingModeSelector();
    initPointSelectorModal();
    initFeedbackSidebar();
    initDevelopmentModal();
    initContactPopup();
    initModalRegionControls();  // Initialize modal region controls
    initSamplingSettings(); // Initialize Sampling Count listener
    initLanguageDropdown(); // Initialize language dropdown
    initReportLanguageDropdown(); // Initialize report language dropdown

});

function initSingleImageReportSections() {
    var grid = document.getElementById('singleReportSectionsGrid');
    if (!grid) return;

    var items = [
        { key: 'rgb', labelKey: 'rgb.values', defaultChecked: true },
        { key: 'lab', labelKey: 'lab.values', defaultChecked: true },
        { key: 'xyz', labelKey: 'xyz.values', defaultChecked: true },
        { key: 'cmyk', labelKey: 'cmyk.values', defaultChecked: true },
        { key: 'spectral', labelKey: 'spectral.proxy', defaultChecked: true },
        { key: 'histograms', labelKey: 'rgb.histograms', defaultChecked: true },
        { key: 'fourier', labelKey: 'fourier.analysis', defaultChecked: true },
        { key: 'recommendations_color', labelKey: 'recommendations', defaultChecked: true }
    ];

    grid.innerHTML = '';
    items.forEach(function (it) {
        var row = document.createElement('div');
        row.className = 'setting-row';

        var labelWrap = document.createElement('div');
        labelWrap.className = 'setting-label';

        var label = document.createElement('label');
        label.setAttribute('data-i18n', it.labelKey);
        label.textContent = I18n.t(it.labelKey);
        labelWrap.appendChild(label);

        var toggleLabel = document.createElement('label');
        toggleLabel.className = 'modern-checkbox';

        var input = document.createElement('input');
        input.type = 'checkbox';
        input.id = 'sec_single_' + it.key;
        input.checked = it.defaultChecked;

        var checkmark = document.createElement('span');
        checkmark.className = 'checkmark';
        checkmark.innerHTML = '<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';

        toggleLabel.appendChild(input);
        toggleLabel.appendChild(checkmark);

        row.appendChild(labelWrap);
        row.appendChild(toggleLabel);
        grid.appendChild(row);
    });

    document.addEventListener('languageChanged', function () {
        I18n.translatePage();
    });
}

function initSingleIlluminantSettingsEmbed() {
    var mount = document.getElementById('singleIlluminantSettingsMount');
    var src = document.getElementById('tab-illuminant');
    if (!mount || !src) return;

    if (!AppState.analyzeSingleImage) return;

    if (mount.getAttribute('data-mounted') === 'true') return;

    if (!IlluminantTabOriginalParent) {
        IlluminantTabOriginalParent = src.parentElement;
        IlluminantTabOriginalNextSibling = src.nextSibling;
    }

    var moved = src;
    moved.style.display = 'block';
    moved.classList.remove('active');
    moved.classList.remove('tab-content');

    var header = moved.querySelector('h3[data-i18n="global.report.illuminant"]');
    if (header) {
        header.setAttribute('data-i18n', 'illuminant.settings');
        header.textContent = I18n.t('illuminant.settings');
    }

    mount.innerHTML = '';
    mount.appendChild(moved);
    mount.setAttribute('data-mounted', 'true');
}

function restoreIlluminantTabLocation() {
    var src = document.getElementById('tab-illuminant');
    if (!src) return;

    var mount = document.getElementById('singleIlluminantSettingsMount');

    if (!IlluminantTabOriginalParent) {
        return;
    }

    var currentParent = src.parentElement;
    if (currentParent && currentParent.id === 'singleIlluminantSettingsMount') {
        if (IlluminantTabOriginalNextSibling && IlluminantTabOriginalNextSibling.parentElement === IlluminantTabOriginalParent) {
            IlluminantTabOriginalParent.insertBefore(src, IlluminantTabOriginalNextSibling);
        } else {
            IlluminantTabOriginalParent.appendChild(src);
        }
        src.style.display = '';
        src.classList.add('tab-content');

        var header = src.querySelector('h3[data-i18n="illuminant.settings"]');
        if (header) {
            header.setAttribute('data-i18n', 'global.report.illuminant');
            header.textContent = I18n.t('global.report.illuminant') || header.textContent;
        }

        if (mount) mount.setAttribute('data-mounted', 'false');
    }
}

// Language Switcher (Toggle Switch)


function updateDynamicTranslations() {
    // Update size value display
    var sizeValue = document.getElementById('sizeValue');
    if (sizeValue) {
        var size = AppState.shapeSize || 100;
        sizeValue.innerHTML = size + ' <span data-i18n="px">px</span>';
        // Re-translate px text
        var pxSpan = sizeValue.querySelector('span[data-i18n="px"]');
        if (pxSpan) pxSpan.textContent = I18n.t('px');
    }

    // Update operator name placeholder
    var operatorInput = document.getElementById('operator_name');
    if (operatorInput && !operatorInput.value) {
        operatorInput.placeholder = I18n.t('operator');
    }

    // Update single image mode label if active
    if (AppState.analyzeSingleImage) {
        var testPanel = document.querySelector('.viewer-panel:last-child');
        var testTitle = testPanel ? testPanel.querySelector('.panel-title') : null;
        var testTitleText = testTitle ? testTitle.querySelector('span:last-child') : null;
        if (testTitleText) {
            testTitleText.textContent = I18n.t('image.to.analyze');
        }
    }

    // Update help dialog if it's open
    if (currentHelpType) {
        var bodyEl = document.getElementById('helpDialogBody');
        var downloadBtn = document.getElementById('helpDialogDownload');
        if (bodyEl) {
            var content = getHelpContent(currentHelpType);
            if (content) {
                bodyEl.innerHTML = content.body;
            }
        }
        if (downloadBtn) {
            var btnSpan = downloadBtn.querySelector('span[data-i18n]');
            if (btnSpan) {
                btnSpan.textContent = I18n.t('download.this.format');
            }
        }
    }



    // Update samples language note

}

// File Input Handlers
function initFileInputs() {
    var refInput = document.getElementById('refInput');
    var testInput = document.getElementById('testInput');

    if (refInput) {
        refInput.addEventListener('change', function (e) {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], 'reference');
        });
    }

    if (testInput) {
        testInput.addEventListener('change', function (e) {
            if (e.target.files[0]) handleFileUpload(e.target.files[0], 'sample');
        });
    }
}

function handleFileUpload(file, type) {
    if (!file) return;

    // Validate file type
    if (!file.type.match('image.*')) {
        showCustomAlert(I18n.t('error') || 'Error', I18n.t('error.reading.file') + ' (Invalid file type)', 'error');
        return;
    }

    var reader = new FileReader();
    reader.onload = function (e) {
        try {
            if (type === 'reference') {
                AppState.refFile = file;
                showImagePreview('ref', e.target.result, file.name);
            } else {
                AppState.testFile = file;
                showImagePreview('test', e.target.result, file.name);
            }
            updateButtonStates();
        } catch (err) {
            console.error("Error in handleFileUpload onload:", err);
            showCustomAlert(I18n.t('error') || 'Error', "Error displaying image: " + err.message, 'error');
        }
    };
    reader.onerror = function (err) {
        console.error("FileReader Error:", err);
        showCustomAlert(I18n.t('error') || 'Error', I18n.t('error.reading.file') || 'Error reading file.', 'error');
    };
    reader.readAsDataURL(file);
}

function showImagePreview(prefix, src, fileName) {
    try {
        var preview = document.getElementById(prefix + 'Preview');
        var placeholder = document.getElementById(prefix + 'Placeholder');
        var infoEmpty = document.getElementById(prefix + 'InfoEmpty');
        var infoName = document.getElementById(prefix + 'InfoName');
        var infoDimensions = document.getElementById(prefix + 'Info');

        if (preview && placeholder) {
            var img = new Image();
            img.onload = function () {
                try {
                    preview.src = src;
                    preview.style.display = 'block';
                    placeholder.style.display = 'none';

                    // Update dimensions
                    if (infoDimensions && img.width && img.height) {
                        infoDimensions.textContent = img.width + '×' + img.height;
                        infoDimensions.style.display = 'inline-block';
                    }

                    // Update filename (truncate to 20 chars max)
                    if (infoName && fileName) {
                        var displayName = fileName;
                        if (displayName.length > 20) {
                            displayName = displayName.substring(0, 17) + '...';
                        }
                        infoName.textContent = displayName;
                        infoName.title = fileName; // Full name on hover
                    }

                    // Hide empty text
                    if (infoEmpty) infoEmpty.style.display = 'none';

                    // Show action buttons (delete/replace)
                    var btnDelete = document.getElementById('btnDelete' + (prefix === 'ref' ? 'Ref' : 'Test'));
                    var btnReplace = document.getElementById('btnReplace' + (prefix === 'ref' ? 'Ref' : 'Test'));
                    if (btnDelete) btnDelete.style.display = 'inline-flex';
                    if (btnReplace) btnReplace.style.display = 'inline-flex';

                    // Refresh RegionSelector dimensions after image loads
                    setTimeout(function () {
                        if (typeof RegionSelector !== 'undefined') {
                            RegionSelector.refreshDimensions();
                        }
                        // Update modal region controls to reflect new image dimensions
                        if (typeof updateModalRegionControls === 'function') {
                            updateModalRegionControls();
                        }
                        // Update main page slider limits to match image dimensions
                        if (typeof updateMainPageSliderLimits === 'function') {
                            updateMainPageSliderLimits();
                        }
                    }, 100);
                } catch (innerErr) {
                    console.error("Error in img.onload:", innerErr);
                }
            };
            img.onerror = function () {
                console.error("Image object failed to load src");
            };
            img.src = src;
        } else {
                }
    } catch (e) {
        console.error("Error in showImagePreview:", e);
        throw e;
    }
}

// Shape Controls
function initShapeControls() {
    // Initialize shape dropdown
    initShapeDropdown();
    
    var radios = document.querySelectorAll('input[name="shapeType"]');
    radios.forEach(function (radio) {
        radio.addEventListener('change', function (e) {
            AppState.shapeType = e.target.value;
            updateShapeOptions();
            // Pen mode: disable/dim size controls
            _togglePenSizeControls(e.target.value === 'pen');
            // Show/hide inline height slider for rectangle
            _toggleInlineHeightGroup(e.target.value);
            // Sync with RegionSelector
            if (typeof RegionSelector !== 'undefined') {
                RegionSelector.setShape(e.target.value);
            }
            // Sync with settings modal
            syncRegionShapeSettings(e.target.value);
            // Sync with modal region controls
            syncMainPageToModal();
            // Update slider limits based on new shape
            updateMainPageSliderLimits();
            // Update shape preview
            updateShapePreview();
        });
    });

    var fullImageCheckbox = document.getElementById('processFullImage');
    if (fullImageCheckbox) {
        // Set initial state to match AppState
        fullImageCheckbox.checked = AppState.processFullImage;

        // Initialize shape controls based on initial state
        toggleShapeControls(!AppState.processFullImage);
        if (typeof RegionSelector !== 'undefined') {
            RegionSelector.setEnabled(!AppState.processFullImage);
        }

        fullImageCheckbox.addEventListener('change', function (e) {
            AppState.processFullImage = e.target.checked;
            toggleShapeControls(!e.target.checked);
            // Sync with RegionSelector
            if (typeof RegionSelector !== 'undefined') {
                RegionSelector.setEnabled(!e.target.checked);
            }
            // Update shape preview
            updateShapePreview();
        });
    }

    var sizeSlider = document.getElementById('shapeSize');
    var sizeValue = document.getElementById('sizeValue');
    if (sizeSlider && sizeValue) {
        sizeSlider.addEventListener('input', function (e) {
            AppState.shapeSize = parseInt(e.target.value);
            sizeValue.innerHTML = AppState.shapeSize + ' <span data-i18n="px">px</span>';
            // Re-translate px text
            var pxSpan = sizeValue.querySelector('span[data-i18n="px"]');
            if (pxSpan) pxSpan.textContent = I18n.t('px');
            // For rectangle, update width via RegionSelector
            if (AppState.shapeType === 'rectangle' && typeof RegionSelector !== 'undefined') {
                var curH = (RegionSelector.getState && RegionSelector.getState().rectangleHeight) || AppState.rectangleHeight || 100;
                AppState.rectangleWidth = AppState.shapeSize;
                RegionSelector.setRectangleDimensions(AppState.shapeSize, curH);
            } else if (typeof RegionSelector !== 'undefined') {
                RegionSelector.setSize(AppState.shapeSize);
            }
            // Sync with modal
            syncMainPageToModal();
            // Update shape preview
            updateShapePreview();
        });
    }

    // Height slider (for rectangle)
    var heightSlider = document.getElementById('shapeHeight');
    var heightValue = document.getElementById('heightValue');
    if (heightSlider && heightValue) {
        heightSlider.addEventListener('input', function (e) {
            var h = parseInt(e.target.value);
            AppState.rectangleHeight = h;
            heightValue.innerHTML = h + ' <span data-i18n="px">px</span>';
            var pxSpan = heightValue.querySelector('span[data-i18n="px"]');
            if (pxSpan) pxSpan.textContent = I18n.t('px');
            if (typeof RegionSelector !== 'undefined') {
                var curW = (RegionSelector.getState && RegionSelector.getState().rectangleWidth) || AppState.rectangleWidth || AppState.shapeSize || 150;
                RegionSelector.setRectangleDimensions(curW, h);
            }
            syncMainPageToModal();
            updateShapePreview();
        });
    }

    // Initialize region shape settings in modal
    initRegionShapeSettings();

    // Initialize shape preview
    initShapePreview();

    // Initialize hint icon
    initHintIcon();

    updateShapeOptions();
}

// Shape Dropdown
function initShapeDropdown() {
    var dropdownBtn = document.getElementById('shapeDropdownBtn');
    var dropdownMenu = document.getElementById('shapeDropdownMenu');
    var dropdownIcon = document.getElementById('shapeDropdownIcon');
    var dropdownLabel = document.getElementById('shapeDropdownLabel');
    var dropdownItems = document.querySelectorAll('.shape-dropdown-item');

    if (!dropdownBtn || !dropdownMenu) return;

    // Shape icon SVGs
    var shapeIcons = {
        circle: '<circle cx="12" cy="12" r="10"></circle>',
        square: '<rect x="3" y="3" width="18" height="18" rx="2"></rect>',
        rectangle: '<rect x="2" y="6" width="20" height="12" rx="2"></rect>',
        pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle>'
    };

    // Toggle dropdown
    dropdownBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        dropdownMenu.classList.toggle('show');
        dropdownBtn.classList.toggle('open');
    });

    // Handle item selection
    dropdownItems.forEach(function(item) {
        item.addEventListener('click', function() {
            var shape = this.getAttribute('data-shape');
            var radio = this.querySelector('input[type="radio"]');
            
            if (radio) {
                radio.checked = true;
                radio.dispatchEvent(new Event('change', { bubbles: true }));
            }

            // Update dropdown button
            if (dropdownIcon && shapeIcons[shape]) {
                dropdownIcon.innerHTML = shapeIcons[shape];
            }
            if (dropdownLabel) {
                dropdownLabel.setAttribute('data-i18n', shape);
                dropdownLabel.textContent = I18n.t(shape);
            }

            // Update active state
            dropdownItems.forEach(function(i) { i.classList.remove('active'); });
            this.classList.add('active');

            // Close dropdown
            dropdownMenu.classList.remove('show');
            dropdownBtn.classList.remove('open');
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!dropdownBtn.contains(e.target) && !dropdownMenu.contains(e.target)) {
            dropdownMenu.classList.remove('show');
            dropdownBtn.classList.remove('open');
        }
    });

    // Close on escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            dropdownMenu.classList.remove('show');
            dropdownBtn.classList.remove('open');
        }
    });
}

// Hint Icon (Question Mark)
function initHintIcon() {
    var hintIcon = document.getElementById('regionHintIcon');
    if (hintIcon) {
        // Toggle on click
        hintIcon.addEventListener('click', function (e) {
            e.stopPropagation();
            hintIcon.classList.toggle('active');
        });

        // Close when clicking outside
        document.addEventListener('click', function (e) {
            if (!hintIcon.contains(e.target)) {
                hintIcon.classList.remove('active');
            }
        });

        // Close on escape key
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                hintIcon.classList.remove('active');
            }
        });
    }
}

function updateShapeOptions() {
    // Update dropdown menu items
    var dropdownItems = document.querySelectorAll('.shape-dropdown-item');
    dropdownItems.forEach(function(item) {
        var shape = item.getAttribute('data-shape');
        if (shape) {
            item.classList.toggle('active', AppState.shapeType === shape);
        }
    });
    
    // Update dropdown button display
    var dropdownIcon = document.getElementById('shapeDropdownIcon');
    var dropdownLabel = document.getElementById('shapeDropdownLabel');
    
    if (dropdownIcon && dropdownLabel) {
        var shapeIcons = {
            circle: '<circle cx="12" cy="12" r="10"></circle>',
            square: '<rect x="3" y="3" width="18" height="18" rx="2"></rect>',
            rectangle: '<rect x="2" y="6" width="20" height="12" rx="2"></rect>',
            pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle>'
        };
        
        if (shapeIcons[AppState.shapeType]) {
            dropdownIcon.innerHTML = shapeIcons[AppState.shapeType];
        }
        dropdownLabel.setAttribute('data-i18n', AppState.shapeType);
        dropdownLabel.textContent = I18n.t(AppState.shapeType);
    }
}

function toggleShapeControls(enabled) {
    // Toggle dropdown button
    var dropdownBtn = document.getElementById('shapeDropdownBtn');
    if (dropdownBtn) {
        dropdownBtn.disabled = !enabled;
        dropdownBtn.classList.toggle('disabled', !enabled);
    }
    
    // Toggle slider container
    var sliderContainer = document.getElementById('sizeSliderContainer');
    if (sliderContainer) sliderContainer.classList.toggle('disabled', !enabled);

    updateOverlayVisibility();
}

/* Disable / dim size controls when Pen (freehand) tool is active */
function _togglePenSizeControls(isPen) {
    var sizeSlider = document.getElementById('shapeSize');
    var sizeValue = document.getElementById('sizeValue');
    var sizeLabel = document.getElementById('shapeSizeLabel');
    var hintIcon = document.getElementById('regionHintIcon');
    var heightSlider = document.getElementById('shapeHeight');
    var heightValue = document.getElementById('heightValue');
    var heightGroup = document.getElementById('inlineHeightGroup');

    if (sizeSlider) { sizeSlider.disabled = isPen; sizeSlider.style.opacity = isPen ? '0.35' : ''; sizeSlider.style.pointerEvents = isPen ? 'none' : ''; }
    if (sizeValue) { sizeValue.style.opacity = isPen ? '0.35' : ''; }
    if (sizeLabel) { sizeLabel.style.opacity = isPen ? '0.35' : ''; }
    if (hintIcon) { hintIcon.style.opacity = isPen ? '0.35' : ''; hintIcon.style.pointerEvents = isPen ? 'none' : ''; }
    if (heightSlider) { heightSlider.disabled = isPen; heightSlider.style.opacity = isPen ? '0.35' : ''; heightSlider.style.pointerEvents = isPen ? 'none' : ''; }
    if (heightValue) { heightValue.style.opacity = isPen ? '0.35' : ''; }
    if (isPen && heightGroup) { heightGroup.style.display = 'none'; }
}

/* Show/hide inline height group and update label based on shape */
function _toggleInlineHeightGroup(shape) {
    var heightGroup = document.getElementById('inlineHeightGroup');
    var sizeLabel = document.getElementById('shapeSizeLabel');
    var isRect = shape === 'rectangle';

    if (heightGroup) heightGroup.style.display = isRect ? '' : 'none';
    if (sizeLabel) {
        sizeLabel.setAttribute('data-i18n', isRect ? 'width.px' : 'size.px');
        sizeLabel.textContent = I18n.t(isRect ? 'width.px' : 'size.px');
    }

    // Sync height slider value from RegionSelector state
    if (isRect) {
        var heightSlider = document.getElementById('shapeHeight');
        var heightValue = document.getElementById('heightValue');
        var h = 100;
        if (typeof RegionSelector !== 'undefined' && RegionSelector.getState) {
            h = RegionSelector.getState().rectangleHeight || 100;
        } else if (AppState.rectangleHeight) {
            h = AppState.rectangleHeight;
        }
        if (heightSlider) heightSlider.value = h;
        if (heightValue) heightValue.innerHTML = h + ' <span data-i18n="px">' + I18n.t('px') + '</span>';
    }
}

// Region Shape Settings (in Modal)
function initRegionShapeSettings() {
    // Handle region shape radio buttons in modal
    var regionShapeRadios = document.querySelectorAll('input[name="region_shape"]');
    regionShapeRadios.forEach(function (radio) {
        radio.addEventListener('change', function (e) {
            var shape = e.target.value;
            AppState.shapeType = shape;

            // Update radio card styling
            updateRegionShapeCards(shape);

            // Show/hide dimension settings
            showRegionDimensionSettings(shape);

            // Sync with inline controls
            syncInlineShapeControls(shape);

            // Sync with RegionSelector
            if (typeof RegionSelector !== 'undefined') {
                RegionSelector.setShape(shape);
            }

            // Update shape preview
            updateShapePreview();
        });
    });

    // Handle dimension inputs
    var circleDiameterInput = document.getElementById('region_circle_diameter');
    var squareSizeInput = document.getElementById('region_square_size');
    var rectWidthInput = document.getElementById('region_rect_width');
    var rectHeightInput = document.getElementById('region_rect_height');

    // Helper: clamp and apply region shape dimension on blur/Enter
    function applyRegionShapeDimension(inputEl, shape, dimension) {
        var raw = parseInt(inputEl.value);
        var value = isNaN(raw) ? 10 : Math.max(10, raw);
        // Clamp to image max
        var dims = calculateMaxDimensions();
        if (shape === 'circle' || shape === 'square') {
            value = Math.min(value, dims.minDimension);
        } else if (dimension === 'width') {
            value = Math.min(value, dims.width);
        } else if (dimension === 'height') {
            value = Math.min(value, dims.height);
        }
        inputEl.value = value;
        if (shape === 'circle') {
            if (typeof RegionSelector !== 'undefined') RegionSelector.setCircleDiameter(value);
            if (AppState.shapeType === 'circle') syncSizeSlider(value);
        } else if (shape === 'square') {
            if (typeof RegionSelector !== 'undefined') RegionSelector.setSquareSize(value);
            if (AppState.shapeType === 'square') syncSizeSlider(value);
        } else if (shape === 'rectangle') {
            var w = dimension === 'width' ? value : (parseInt(rectWidthInput.value) || 150);
            var h = dimension === 'height' ? value : (parseInt(rectHeightInput.value) || 100);
            if (typeof RegionSelector !== 'undefined') RegionSelector.setRectangleDimensions(w, h);
            if (AppState.shapeType === 'rectangle') syncSizeSlider(w);
        }
        updateShapePreview();
    }

    function bindRegionShapeInput(el, shape, dimension) {
        if (!el) return;
        el.addEventListener('blur', function () { applyRegionShapeDimension(el, shape, dimension); });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); applyRegionShapeDimension(el, shape, dimension); el.blur(); }
        });
    }

    bindRegionShapeInput(circleDiameterInput, 'circle');
    bindRegionShapeInput(squareSizeInput, 'square');
    bindRegionShapeInput(rectWidthInput, 'rectangle', 'width');
    bindRegionShapeInput(rectHeightInput, 'rectangle', 'height');
}

function updateRegionShapeCards(shape) {
    var cards = document.querySelectorAll('.radio-option-card');
    cards.forEach(function (card) {
        var radio = card.querySelector('input[type="radio"]');
        if (radio) {
            card.classList.toggle('active', radio.value === shape);
        }
    });
}

function showRegionDimensionSettings(shape) {
    var circleSettings = document.getElementById('circleDimensionSettings');
    var squareSettings = document.getElementById('squareDimensionSettings');
    var rectangleSettings = document.getElementById('rectangleDimensionSettings');

    if (circleSettings) circleSettings.style.display = shape === 'circle' ? 'block' : 'none';
    if (squareSettings) squareSettings.style.display = shape === 'square' ? 'block' : 'none';
    if (rectangleSettings) rectangleSettings.style.display = shape === 'rectangle' ? 'block' : 'none';
}

// Modal Region Controls (Advanced Settings)
function initModalRegionControls() {
    // Initialize modal shape selector
    var modalShapeRadios = document.querySelectorAll('input[name="modalShapeType"]');
    modalShapeRadios.forEach(function (radio) {
        radio.addEventListener('change', function (e) {
            var shape = e.target.value;
            AppState.shapeType = shape;

            // Update modal UI
            updateModalShapeOptions(shape);
            updateModalDimensionInputs(shape);

            // Sync with main page
            syncModalToMainPage();

            // Update RegionSelector
            if (typeof RegionSelector !== 'undefined') {
                RegionSelector.setShape(shape);
            }

            // Update shape preview
            updateShapePreview();
        });
    });

    // Initialize dimension inputs
    var circleDiameter = document.getElementById('modalCircleDiameter');
    var squareSide = document.getElementById('modalSquareSide');
    var rectWidth = document.getElementById('modalRectangleWidth');
    var rectHeight = document.getElementById('modalRectangleHeight');

    // Helper: clamp and apply a modal dimension input on blur/Enter
    function applyModalDimension(inputEl, shape, dimension) {
        var raw = parseInt(inputEl.value);
        var value = validateDimensionInput(shape, isNaN(raw) ? 10 : raw, dimension);
        inputEl.value = value;
        if (shape === 'circle') {
            AppState.shapeSize = value;
            syncModalToMainPage();
            if (typeof RegionSelector !== 'undefined') RegionSelector.setSize(value);
        } else if (shape === 'square') {
            AppState.shapeSize = value;
            syncModalToMainPage();
            if (typeof RegionSelector !== 'undefined') RegionSelector.setSize(value);
        } else if (shape === 'rectangle') {
            var w = dimension === 'width' ? value : (parseInt(rectWidth.value) || 150);
            var h = dimension === 'height' ? value : (parseInt(rectHeight.value) || 100);
            AppState.rectangleWidth = w;
            AppState.rectangleHeight = h;
            syncModalToMainPage();
            if (typeof RegionSelector !== 'undefined') RegionSelector.setRectangleDimensions(w, h);
        }
        updateShapePreview();
    }

    // Bind blur + Enter for each dimension input (let user type freely)
    function bindDimensionInput(el, shape, dimension) {
        if (!el) return;
        el.addEventListener('blur', function () { applyModalDimension(el, shape, dimension); });
        el.addEventListener('keydown', function (e) {
            if (e.key === 'Enter') { e.preventDefault(); applyModalDimension(el, shape, dimension); el.blur(); }
        });
    }

    bindDimensionInput(circleDiameter, 'circle');
    bindDimensionInput(squareSide, 'square');
    bindDimensionInput(rectWidth, 'rectangle', 'width');
    bindDimensionInput(rectHeight, 'rectangle', 'height');

    // Initialize with current state
    updateModalRegionControls();
}

function updateModalShapeOptions(shape) {
    var circleOption = document.getElementById('modalCircleOption');
    var squareOption = document.getElementById('modalSquareOption');
    var rectangleOption = document.getElementById('modalRectangleOption');
    var penOption = document.getElementById('modalPenOption');

    if (circleOption) circleOption.classList.toggle('active', shape === 'circle');
    if (squareOption) squareOption.classList.toggle('active', shape === 'square');
    if (rectangleOption) rectangleOption.classList.toggle('active', shape === 'rectangle');
    if (penOption) penOption.classList.toggle('active', shape === 'pen');
}

function updateModalDimensionInputs(shape) {
    var circleGroup = document.getElementById('modalCircleDimension');
    var squareGroup = document.getElementById('modalSquareDimension');
    var rectangleGroup = document.getElementById('modalRectangleDimension');
    var penGroup = document.getElementById('modalPenDimension');

    if (circleGroup) circleGroup.style.display = shape === 'circle' ? 'flex' : 'none';
    if (squareGroup) squareGroup.style.display = shape === 'square' ? 'flex' : 'none';
    if (rectangleGroup) rectangleGroup.style.display = shape === 'rectangle' ? 'flex' : 'none';
    if (penGroup) penGroup.style.display = shape === 'pen' ? 'flex' : 'none';
}

function calculateMaxDimensions() {
    var refPreview = document.getElementById('refPreview');
    var testPreview = document.getElementById('testPreview');

    // Check if both images are loaded
    var refLoaded = refPreview && refPreview.complete && refPreview.style.display !== 'none' && refPreview.naturalWidth;
    var testLoaded = testPreview && testPreview.complete && testPreview.style.display !== 'none' && testPreview.naturalWidth;

    if (refLoaded && testLoaded) {
        // BOTH images loaded - use SMALLER dimensions to ensure region fits on both
        var minWidth = Math.min(refPreview.naturalWidth, testPreview.naturalWidth);
        var minHeight = Math.min(refPreview.naturalHeight, testPreview.naturalHeight);
        var minDisplayWidth = Math.min(refPreview.clientWidth, testPreview.clientWidth);
        var minDisplayHeight = Math.min(refPreview.clientHeight, testPreview.clientHeight);

        return {
            width: minWidth,
            height: minHeight,
            minDimension: Math.min(minWidth, minHeight),
            displayWidth: minDisplayWidth,
            displayHeight: minDisplayHeight
        };
    } else if (refLoaded) {
        // Only reference image loaded
        return {
            width: refPreview.naturalWidth,
            height: refPreview.naturalHeight,
            minDimension: Math.min(refPreview.naturalWidth, refPreview.naturalHeight),
            displayWidth: refPreview.clientWidth,
            displayHeight: refPreview.clientHeight
        };
    } else if (testLoaded) {
        // Only test image loaded
        return {
            width: testPreview.naturalWidth,
            height: testPreview.naturalHeight,
            minDimension: Math.min(testPreview.naturalWidth, testPreview.naturalHeight),
            displayWidth: testPreview.clientWidth,
            displayHeight: testPreview.clientHeight
        };
    }

    // Default fallback - no images loaded
    return {
        width: 500,
        height: 500,
        minDimension: 500,
        displayWidth: 400,
        displayHeight: 400
    };
}

function validateDimensionInput(shape, value, dimension) {
    var min = 10;
    var max = calculateMaxDimensions();
    var maxValue;

    switch (shape) {
        case 'circle':
        case 'square':
            maxValue = max.minDimension;
            break;
        case 'rectangle':
            if (dimension === 'width') {
                maxValue = max.width;
            } else if (dimension === 'height') {
                maxValue = max.height;
            } else {
                maxValue = max.minDimension;
            }
            break;
        default:
            maxValue = 500;
    }

    // Clamp value between min and max
    return Math.max(min, Math.min(maxValue, value));
}

function syncModalToMainPage() {
    // Sync shape selection
    var shape = AppState.shapeType;
    var mainRadio = document.querySelector('input[name="shapeType"][value="' + shape + '"]');
    if (mainRadio) {
        mainRadio.checked = true;
        updateShapeOptions();
        _togglePenSizeControls(shape === 'pen');
    }

    // Sync size slider
    var sizeSlider = document.getElementById('shapeSize');
    var sizeValue = document.getElementById('sizeValue');
    var size = AppState.shapeSize || 100;

    if (sizeSlider) {
        sizeSlider.value = size;
    }
    if (sizeValue) {
        var pxText = typeof I18n !== 'undefined' ? I18n.t('px') : 'px';
        sizeValue.innerHTML = size + ' <span data-i18n="px">' + pxText + '</span>';
    }
}

function syncMainPageToModal() {
    // Sync shape to modal
    var shape = AppState.shapeType;
    var modalRadio = document.querySelector('input[name="modalShapeType"][value="' + shape + '"]');
    if (modalRadio) {
        modalRadio.checked = true;
        updateModalShapeOptions(shape);
        updateModalDimensionInputs(shape);
    }

    // Sync dimensions to modal
    var size = AppState.shapeSize || 100;
    var circleDiameter = document.getElementById('modalCircleDiameter');
    var squareSide = document.getElementById('modalSquareSide');
    var rectWidth = document.getElementById('modalRectangleWidth');
    var rectHeight = document.getElementById('modalRectangleHeight');

    if (circleDiameter && shape === 'circle') {
        circleDiameter.value = size;
    }
    if (squareSide && shape === 'square') {
        squareSide.value = size;
    }
    if (rectWidth && shape === 'rectangle') {
        rectWidth.value = AppState.rectangleWidth || 150;
    }
    if (rectHeight && shape === 'rectangle') {
        rectHeight.value = AppState.rectangleHeight || 100;
    }
}

function updateModalRegionControls() {
    // Update max values when images change
    var dims = calculateMaxDimensions();

    var circleDiameter = document.getElementById('modalCircleDiameter');
    var squareSide = document.getElementById('modalSquareSide');
    var rectWidth = document.getElementById('modalRectangleWidth');
    var rectHeight = document.getElementById('modalRectangleHeight');

    if (circleDiameter) {
        circleDiameter.max = dims.minDimension;
    }
    if (squareSide) {
        squareSide.max = dims.minDimension;
    }
    if (rectWidth) {
        rectWidth.max = dims.width;
    }
    if (rectHeight) {
        rectHeight.max = dims.height;
    }

    // Sync current values
    syncMainPageToModal();
}

// Main Page Slider Limits (Adaptive)
function updateMainPageSliderLimits() {
    var slider = document.getElementById('shapeSize');
    if (!slider) return;

    var dims = calculateMaxDimensions();
    var shape = AppState.shapeType || 'circle';

    // Determine max based on shape
    var maxValue;
    switch (shape) {
        case 'circle':
        case 'square':
            maxValue = dims.minDimension;
            break;
        case 'rectangle':
            // For rectangle slider, use the larger dimension as max
            maxValue = Math.max(dims.width, dims.height);
            break;
        default:
            maxValue = dims.minDimension;
    }

    // Update slider attributes
    slider.min = 10;  // Always 10 after image load
    slider.max = maxValue;

    // Ensure current value is within new limits
    var currentValue = parseInt(slider.value) || 100;
    if (currentValue < 10) {
        slider.value = 10;
        AppState.shapeSize = 10;
    } else if (currentValue > maxValue) {
        slider.value = maxValue;
        AppState.shapeSize = maxValue;
    }

    // Update display
    var sizeValue = document.getElementById('sizeValue');
    if (sizeValue) {
        var pxText = typeof I18n !== 'undefined' ? I18n.t('px') : 'px';
        sizeValue.innerHTML = slider.value + ' <span data-i18n="px">' + pxText + '</span>';
    }
}

function syncRegionShapeSettings(shape) {
    // Sync modal radio buttons
    var modalRadio = document.querySelector('input[name="region_shape"][value="' + shape + '"]');
    if (modalRadio) {
        modalRadio.checked = true;
        updateRegionShapeCards(shape);
        showRegionDimensionSettings(shape);
    }
}

function syncInlineShapeControls(shape) {
    var inlineRadio = document.querySelector('input[name="shapeType"][value="' + shape + '"]');
    if (inlineRadio) {
        inlineRadio.checked = true;
        updateShapeOptions();
    }
    _toggleInlineHeightGroup(shape);
}

function syncSizeSlider(value) {
    var sizeSlider = document.getElementById('shapeSize');
    var sizeValue = document.getElementById('sizeValue');

    if (sizeSlider) {
        sizeSlider.value = value;
    }
    if (sizeValue) {
        var pxText = typeof I18n !== 'undefined' ? I18n.t('px') : 'px';
        sizeValue.innerHTML = value + ' <span data-i18n="px">' + pxText + '</span>';
    }
    AppState.shapeSize = value;

    // Update shape preview
    updateShapePreview();
}

// Shape Preview
function updateShapePreview() {
    var preview = document.getElementById('shapePreview');
    var shapeName = document.getElementById('previewShapeName');
    var dimensions = document.getElementById('previewDimensions');
    var container = document.getElementById('shapePreviewContainer');

    if (!preview || !shapeName || !dimensions) return;

    // Get current shape and dimensions from RegionSelector if available
    var shape = AppState.shapeType || 'circle';
    var width, height;

    if (typeof RegionSelector !== 'undefined' && RegionSelector.getState) {
        var state = RegionSelector.getState();
        shape = state.shape;

        switch (shape) {
            case 'circle':
                width = state.circleDiameter;
                height = state.circleDiameter;
                break;
            case 'square':
                width = state.squareSize;
                height = state.squareSize;
                break;
            case 'rectangle':
                width = state.rectangleWidth;
                height = state.rectangleHeight;
                break;
            default:
                width = 100;
                height = 100;
        }
    } else {
        // Fallback to input values
        var circleInput = document.getElementById('region_circle_diameter');
        var squareInput = document.getElementById('region_square_size');
        var rectWidthInput = document.getElementById('region_rect_width');
        var rectHeightInput = document.getElementById('region_rect_height');

        switch (shape) {
            case 'circle':
                width = circleInput ? parseInt(circleInput.value) || 100 : 100;
                height = width;
                break;
            case 'square':
                width = squareInput ? parseInt(squareInput.value) || 100 : 100;
                height = width;
                break;
            case 'rectangle':
                width = rectWidthInput ? parseInt(rectWidthInput.value) || 150 : 150;
                height = rectHeightInput ? parseInt(rectHeightInput.value) || 100 : 100;
                break;
            default:
                width = 100;
                height = 100;
        }
    }

    // Only show preview for circle shape
    if (container) {
        if (shape === 'circle') {
            container.classList.remove('hidden');
        } else {
            container.classList.add('hidden');
            return;
        }
    }

    // Calculate preview size
    var maxSize = 50;
    var scale = Math.min(maxSize / width, maxSize / height);
    var previewWidth = Math.round(width * scale);
    var previewHeight = Math.round(height * scale);

    // Update preview element
    preview.style.width = previewWidth + 'px';
    preview.style.height = previewHeight + 'px';
    preview.className = 'shape-preview ' + shape;

    var shapeKey = shape;
    var translatedName = typeof I18n !== 'undefined' ? I18n.t(shapeKey) : shape.charAt(0).toUpperCase() + shape.slice(1);
    shapeName.textContent = translatedName;
    shapeName.setAttribute('data-i18n', shapeKey);

    if (width === height) {
        dimensions.textContent = width + ' px';
    } else {
        dimensions.textContent = width + ' × ' + height + ' px';
    }

    checkRegionConflicts();
}

function checkRegionConflicts() {
    if (PointSelectorState.points.length === 0) return;

    var conflictsFound = false;
    var pointsToReplace = [];

    var useCrop = false;
    if (typeof RegionSelector !== 'undefined' && RegionSelector.isPlaced() && !AppState.processFullImage) {
        useCrop = true;
    }

    if (!useCrop) return; // Full image allows everything

    var rsState = RegionSelector.getState();
    var imgW = rsState.refOriginalWidth || 1000;
    var imgH = rsState.refOriginalHeight || 1000;

    var centerX = rsState.posX; // 0-1
    var centerY = rsState.posY; // 0-1

    var dim = RegionSelector.getCurrentDimensions(); // Pixels

    // Normalized bounds
    var dimXnorm = dim.width / imgW;
    var dimYnorm = dim.height / imgH;

    var halfW = dimXnorm / 2;
    var halfH = dimYnorm / 2;

    PointSelectorState.points.forEach(function (p, index) {
        // p.x, p.y are normalized 0-1
        var inside = false;

        if (rsState.shape === 'circle') {
            var dx = (p.x - centerX) * (imgW / imgH); // Correct aspect ratio for distance? 
            // Wait, normalized circle is ellipse. Distance in pixels is safer.
            // Convert point to pixels
            var px = p.x * imgW;
            var py = p.y * imgH;

            var cx = centerX * imgW;
            var cy = centerY * imgH;

            var rad = dim.width / 2;
            var dist = Math.sqrt(Math.pow(px - cx, 2) + Math.pow(py - cy, 2));
            if (dist <= rad) inside = true;
        } else {
            // Rect
            var left = centerX - halfW;
            var right = centerX + halfW;
            var top = centerY - halfH;
            var bottom = centerY + halfH;

            if (p.x >= left && p.x <= right && p.y >= top && p.y <= bottom) inside = true;
        }

        if (!inside) {
            conflictsFound = true;
            pointsToReplace.push(index);
        }
    });

    if (conflictsFound) {
        // Show dialog and auto-replace
        showConflictDialog(pointsToReplace.length);

        // Replace logic
        // Remove invalid points
        // Generate new random points to replace them
        var countToReplace = pointsToReplace.length;

        // Filter points (keep valid ones)
        var validPoints = PointSelectorState.points.filter(function (p, i) {
            return !pointsToReplace.includes(i);
        });

        PointSelectorState.points = validPoints;

        // Generate replacements (RANDOM)
        generateRandomPoints(countToReplace);

        // Update UI if open
        if (PointSelectorState.isOpen) {
            drawPointsOnCanvas('ref');
            drawPointsOnCanvas('sample');
        }
        updateSamplingProgress();
    }
}

function showConflictDialog(count) {
    // Check if dialog already exists
    if (document.getElementById('conflictDialog')) return;

    var dialog = document.createElement('div');
    dialog.id = 'conflictDialog';
    dialog.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);animation:fadeIn 0.2s;';

    var content = document.createElement('div');
    content.style.cssText = 'background:white;padding:24px;border-radius:12px;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.2);transform:translateY(0);animation:slideUp 0.2s;';

    content.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <div style="width:40px;height:40px;background:#fff7ed;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#ea580c;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            </div>
            <h3 style="margin:0;font-size:1.1rem;color:#1e293b;">Region Conflict Resolved</h3>
        </div>
        <p style="color:#64748b;font-size:0.95rem;line-height:1.5;margin-bottom:20px;">
            Some previously selected points were outside the new analysis region and were replaced with points inside it. You can review or update them in Advanced Settings.
        </p>
        <div style="display:flex;justify-content:flex-end;">
            <button id="btnDismissConflict" style="padding:10px 20px;background:#0066cc;color:white;border:none;border-radius:6px;font-weight:600;cursor:pointer;">OK</button>
        </div>
    `;

    dialog.appendChild(content);
    document.body.appendChild(dialog);

    document.getElementById('btnDismissConflict').onclick = function () {
        dialog.remove();
    };
}

// Initialize shape preview on page load
function initShapePreview() {
    updateShapePreview();

    // Listen for process full image toggle
    var fullImageCheckbox = document.getElementById('processFullImage');
    if (fullImageCheckbox) {
        fullImageCheckbox.addEventListener('change', function (e) {
            AppState.processFullImage = e.target.checked; // Sync state
            updateShapePreview();
        });
    }
}

// Overlay Tracking
function initOverlayTracking() {
    var refPanel = document.getElementById('refPanelContent');
    var testPanel = document.getElementById('testPanelContent');

    var panels = AppState.analyzeSingleImage ? [testPanel] : [refPanel, testPanel];

    panels.forEach(function (panel) {
        if (!panel) return;

        panel.addEventListener('mousemove', function (e) {
            if (AppState.processFullImage) return;
            var rect = panel.getBoundingClientRect();
            moveOverlays(e.clientX - rect.left, e.clientY - rect.top);
        });

        panel.addEventListener('mouseenter', function () {
            if (!AppState.processFullImage) setOverlaysOpacity(1);
        });

        panel.addEventListener('mouseleave', function () {
            setOverlaysOpacity(0);
        });
    });
}

function moveOverlays(x, y) {
    var overlayIds = AppState.analyzeSingleImage ? ['testOverlay'] : ['refOverlay', 'testOverlay'];
    overlayIds.forEach(function (id) {
        var overlay = document.getElementById(id);
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.left = x + 'px';
            overlay.style.top = y + 'px';
        }
    });
}

function setOverlaysOpacity(opacity) {
    var overlayIds = AppState.analyzeSingleImage ? ['testOverlay'] : ['refOverlay', 'testOverlay'];
    overlayIds.forEach(function (id) {
        var overlay = document.getElementById(id);
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.opacity = opacity;
        }
    });
}

function updateOverlayShape() {
    var isCircle = AppState.shapeType === 'circle';
    var overlayIds = AppState.analyzeSingleImage ? ['testOverlay'] : ['refOverlay', 'testOverlay'];
    overlayIds.forEach(function (id) {
        var overlay = document.getElementById(id);
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.borderRadius = isCircle ? '50%' : '0';
        }
    });
}

function updateOverlaySize() {
    var size = AppState.shapeSize;
    var overlayIds = AppState.analyzeSingleImage ? ['testOverlay'] : ['refOverlay', 'testOverlay'];
    overlayIds.forEach(function (id) {
        var overlay = document.getElementById(id);
        if (overlay && overlay.style.display !== 'none') {
            overlay.style.width = size + 'px';
            overlay.style.height = size + 'px';
        }
    });
}

// Button Handlers
function initButtons() {
    var btnSettings = document.getElementById('btnAdvancedSettings');
    if (btnSettings) btnSettings.addEventListener('click', openModal);

    var btnProcess = document.getElementById('btnStartProcessing');
    if (btnProcess) btnProcess.addEventListener('click', startProcessing);

    var thesisDesktopOverlay = document.getElementById('thesisDesktopOverlay');
    if (thesisDesktopOverlay) {
        thesisDesktopOverlay.addEventListener('click', function (e) {
            if (e.target === thesisDesktopOverlay) {
                closeThesisDesktopModal();
            }
        });
    }

    var closeThesisDesktopOverlay = document.getElementById('closeThesisDesktopOverlay');
    if (closeThesisDesktopOverlay) {
        closeThesisDesktopOverlay.addEventListener('click', closeThesisDesktopModal);
    }

    var btnDelete = document.getElementById('btnDeleteImages');
    if (btnDelete) btnDelete.addEventListener('click', deleteImages);

    // Image action buttons
    var btnDeleteRef = document.getElementById('btnDeleteRef');
    if (btnDeleteRef) btnDeleteRef.addEventListener('click', function() { deleteImage('reference'); });
    
    var btnDeleteTest = document.getElementById('btnDeleteTest');
    if (btnDeleteTest) btnDeleteTest.addEventListener('click', function() { deleteImage('sample'); });
    
    var btnReplaceRef = document.getElementById('btnReplaceRef');
    if (btnReplaceRef) btnReplaceRef.addEventListener('click', function() { replaceImage('reference'); });
    
    var btnReplaceTest = document.getElementById('btnReplaceTest');
    if (btnReplaceTest) btnReplaceTest.addEventListener('click', function() { replaceImage('sample'); });

    var btnDownload = document.getElementById('btnDownload');
    if (btnDownload) btnDownload.addEventListener('click', downloadReport);

    var btnDownloadDropdown = document.getElementById('btnDownloadDropdown');
    if (btnDownloadDropdown) {
        btnDownloadDropdown.addEventListener('click', function (e) {
            e.stopPropagation();
            var menu = document.getElementById('downloadDropdownMenu');
            if (menu) menu.classList.toggle('show');
        });
    }

    // Datasheet download items - direct download on click
    var datasheetItems = document.querySelectorAll('.datasheet-dropdown .dropdown-item[data-type]');
    datasheetItems.forEach(function(item) {
        item.addEventListener('click', function(e) {
            // Don't download if clicking the help button
            if (e.target.classList.contains('btn-help') || e.target.closest('.btn-help')) {
                return;
            }
            var type = this.getAttribute('data-type');
            downloadDatasheet(type);
        });
    });

    // Datasheet help buttons - open modal
    var datasheetHelpBtns = document.querySelectorAll('.btn-help[data-help="datasheet"]');
    datasheetHelpBtns.forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            var type = this.getAttribute('data-type');
            openDatasheetModal(type);
        });
    });

    // Datasheet modal download button
    var btnDownloadDatasheetPDF = document.getElementById('btnDownloadDatasheetPDF');
    if (btnDownloadDatasheetPDF) {
        btnDownloadDatasheetPDF.addEventListener('click', function() {
            var modal = document.getElementById('datasheetModal');
            var type = modal ? modal.getAttribute('data-datasheet-type') : 'en';
            downloadDatasheet(type);
            closeDatasheetModal();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', function (e) {
        var downloadMenu = document.getElementById('downloadDropdownMenu');
        var downloadToggle = document.getElementById('btnDownloadDropdown');
        if (downloadMenu && downloadMenu.classList.contains('show')) {
            if (!downloadMenu.contains(e.target) && e.target !== downloadToggle && !downloadToggle.contains(e.target)) {
                downloadMenu.classList.remove('show');
            }
        }

        var datasheetMenu = document.getElementById('datasheetDropdown');
        var datasheetToggle = document.getElementById('btnDatasheetDownload');
        if (datasheetMenu && (datasheetMenu.classList.contains('show') || datasheetMenu.classList.contains('active'))) {
            if (!datasheetMenu.contains(e.target) && e.target !== datasheetToggle && !datasheetToggle.contains(e.target)) {
                datasheetMenu.classList.remove('show');
                datasheetMenu.classList.remove('active');
            }
        }
    });

    var btnDownloadColor = document.getElementById('btnDownloadColor');
    if (btnDownloadColor) {
        btnDownloadColor.addEventListener('click', function (e) {
            e.preventDefault();
            if (AppState.colorReportUrl) {
                var fn = AppState.fnColor || 'Color_Report.pdf';
                window.open(AppState.colorReportUrl + '?fn=' + encodeURIComponent(fn), '_blank');
            }
        });
    }

    var btnDownloadPattern = document.getElementById('btnDownloadPattern');
    if (btnDownloadPattern) {
        btnDownloadPattern.addEventListener('click', function (e) {
            e.preventDefault();
            if (AppState.patternReportUrl) {
                var fn = AppState.fnPattern || 'Pattern_Report.pdf';
                window.open(AppState.patternReportUrl + '?fn=' + encodeURIComponent(fn), '_blank');
            }
        });
    }

    var btnDownloadSettings = document.getElementById('btnDownloadSettings');
    if (btnDownloadSettings) btnDownloadSettings.addEventListener('click', downloadSettings);

    // Initialize Sampling Settings Logic
    initSamplingSettings();
}

function updateButtonStates() {
    var hasImages = AppState.analyzeSingleImage
        ? AppState.testFile
        : (AppState.refFile && AppState.testFile);
    var btnProcess = document.getElementById('btnStartProcessing');
    var btnDelete = document.getElementById('btnDeleteImages');

    if (btnProcess) btnProcess.disabled = false;
    if (btnDelete) btnDelete.disabled = !hasImages || AppState.isProcessing;
}

// Single Image Mode
function initSingleImageMode() {
    var checkbox = document.getElementById('singleImageModeToggle');
    if (!checkbox) return;

    checkbox.addEventListener('change', function (e) {
        AppState.analyzeSingleImage = e.target.checked;
        /* Preserve Full Image state — single mode must NOT alter it */
        var savedFullImage = AppState.processFullImage;
        toggleSingleImageMode(e.target.checked);
        /* Restore in case anything changed it */
        AppState.processFullImage = savedFullImage;
        var fullImageCheckbox = document.getElementById('processFullImage');
        if (fullImageCheckbox) fullImageCheckbox.checked = savedFullImage;
        updateButtonStates();
    });
}

function toggleSingleImageMode(enabled) {
    var imageViewer = document.querySelector('.image-viewer');
    var refPanel = document.querySelector('.viewer-panel:first-child');
    var testPanel = document.querySelector('.viewer-panel:last-child');
    var testTitle = testPanel ? testPanel.querySelector('.panel-title') : null;
    var testTitleText = testTitle ? testTitle.querySelector('span:last-child') : null;
    var refInput = document.getElementById('refInput');
    var refPlaceholder = document.getElementById('refPlaceholder');

    if (!imageViewer || !refPanel || !testPanel) return;

    if (enabled) {
        // Add single image mode class
        imageViewer.classList.add('single-image-mode');

        // Disable reference input
        if (refInput) refInput.disabled = true;
        if (refPlaceholder) refPlaceholder.style.pointerEvents = 'none';

        // Hide reference panel with animation
        refPanel.classList.add('hiding');

        // Update test panel title
        if (testTitleText) {
            testTitleText.setAttribute('data-i18n', 'image.to.analyze');
            testTitleText.textContent = I18n.t('image.to.analyze');

            // Update dot color
            var dot = testTitle.querySelector('.dot');
            if (dot) {
                dot.classList.remove('sample');
                dot.classList.add('single');
            }
        }

        // Center test panel after animation
        setTimeout(function () {
            testPanel.classList.add('centering');
            refPanel.style.display = 'none';
            // Reinitialize overlay tracking for single image mode
            initOverlayTracking();
        }, 500);

    } else {
        // Remove single image mode
        imageViewer.classList.remove('single-image-mode');

        // Enable reference input
        if (refInput) refInput.disabled = false;
        if (refPlaceholder) refPlaceholder.style.pointerEvents = '';

        // Show reference panel
        refPanel.style.display = '';
        refPanel.classList.remove('hiding');

        // Reset test panel
        testPanel.classList.remove('centering');

        // Reset test panel title
        if (testTitleText) {
            testTitleText.setAttribute('data-i18n', 'sample.image');
            testTitleText.textContent = I18n.t('sample.image');

            // Reset dot color
            var dot = testTitle.querySelector('.dot');
            if (dot) {
                dot.classList.remove('single');
                dot.classList.add('sample');
            }
        }

        // Reinitialize overlay tracking for dual image mode
        setTimeout(function () {
            initOverlayTracking();
        }, 500);
    }

    // Update Settings Tabs Visibility
    updateSettingsTabsVisibility(enabled);

    // Update overlay visibility
    updateOverlayVisibility();
}

function updateSettingsTabsVisibility(singleMode) {
    var tabColor = document.querySelector('.tab[data-tab="color"]');
    var tabPattern = document.querySelector('.tab[data-tab="pattern"]');
    var tabSingle = document.getElementById('tabBtnSingle');
    var tabReports = document.querySelector('.tab[data-tab="reports"]');
    var tabIlluminant = document.querySelector('.tab[data-tab="illuminant"]');

    if (singleMode) {
        if (tabColor) tabColor.style.display = 'none';
        if (tabPattern) tabPattern.style.display = 'none';
        if (tabSingle) {
            tabSingle.style.display = 'inline-block';
            // If we are currently on color or pattern, switch to single
            var activeTab = document.querySelector('.modal-tabs .tab.active');
            if (activeTab && (activeTab.dataset.tab === 'color' || activeTab.dataset.tab === 'pattern')) {
                switchSettingsTab('single');
            }
        }

        // Disable dual-mode report sections tab in single image mode
        if (tabReports) {
            tabReports.classList.add('tab-disabled');
            tabReports.setAttribute('aria-disabled', 'true');
            tabReports.disabled = true;
        }

        // Keep illuminant tab accessible in single image mode but disable test illuminants
        if (tabIlluminant) {
            tabIlluminant.classList.remove('tab-disabled');
            tabIlluminant.removeAttribute('aria-disabled');
            tabIlluminant.disabled = false;
        }
        // Disable test illuminant checkboxes in single image mode
        document.querySelectorAll('input[name="test_illuminant"]').forEach(function(el) {
            if (!el._savedSingleCheck) el._savedSingleCheck = el.checked;
            el.checked = false;
            el.disabled = true;
            var lbl = el.closest('label');
            if (lbl) lbl.style.opacity = '0.4';
        });
    } else {
        if (tabColor) tabColor.style.display = '';
        if (tabPattern) tabPattern.style.display = '';
        if (tabSingle) {
            tabSingle.style.display = 'none';
            // If we are currently on single, switch to general
            var activeTab = document.querySelector('.modal-tabs .tab.active');
            if (activeTab && activeTab.dataset.tab === 'single') {
                switchSettingsTab('general');
            }
        }

        if (tabReports) {
            tabReports.classList.remove('tab-disabled');
            tabReports.removeAttribute('aria-disabled');
            tabReports.disabled = false;
        }

        if (tabIlluminant) {
            tabIlluminant.classList.remove('tab-disabled');
            tabIlluminant.removeAttribute('aria-disabled');
            tabIlluminant.disabled = false;
        }
        // Re-enable test illuminant checkboxes
        document.querySelectorAll('input[name="test_illuminant"]').forEach(function(el) {
            el.disabled = false;
            if (el._savedSingleCheck !== undefined) { el.checked = el._savedSingleCheck; delete el._savedSingleCheck; }
            var lbl = el.closest('label');
            if (lbl) lbl.style.opacity = '';
        });
    }
}

function updateOverlayVisibility() {
    var refOverlay = document.getElementById('refOverlay');
    var testOverlay = document.getElementById('testOverlay');

    if (AppState.analyzeSingleImage) {
        if (refOverlay) refOverlay.style.display = 'none';
        if (testOverlay) testOverlay.style.display = AppState.processFullImage ? 'none' : '';
    } else {
        if (refOverlay) refOverlay.style.display = AppState.processFullImage ? 'none' : '';
        if (testOverlay) testOverlay.style.display = AppState.processFullImage ? 'none' : '';
    }
}

// Processing - Sequential Step Execution
function startProcessing() {
    showThesisDesktopModal();
}

function showThesisDesktopModal() {
    var overlay = document.getElementById('thesisDesktopOverlay');
    if (!overlay) return;
    overlay.style.display = 'flex';
    document.body.classList.add('modal-open');
}

function closeThesisDesktopModal() {
    var overlay = document.getElementById('thesisDesktopOverlay');
    if (!overlay) return;
    overlay.style.display = 'none';
    document.body.classList.remove('modal-open');
}

// Sequential step execution - each step completes before next begins
function executeSequentialSteps() {
    var settings = collectSettings();

    // Get crop settings from RegionSelector
    var regionData = { type: 'full' };

    // Region logic: 
    // 1. If explicit region placed via interaction, use it.
    // 2. If 'Process Entire Image' is OFF, but no manual region placed, use DEFAULT centered region based on settings.
    // 3. Otherwise (Full Image ON), use full.

    if (typeof RegionSelector !== 'undefined' && RegionSelector.isPlaced() && !AppState.processFullImage) {
        var cropSettings = RegionSelector.getCropSettings();
        // Use these settings for the backend
        // CRITICAL: Include use_crop flag so backend processes region_geometry correctly
        regionData = {
            type: cropSettings.crop_shape === 'circle' ? 'circle' : 'rect',
            x: cropSettings.crop_x,
            y: cropSettings.crop_y,
            width: cropSettings.crop_width,
            height: cropSettings.crop_height,
            use_crop: true
        };
    } else if (!AppState.processFullImage) {
        // Fallback: use default centered shape as shown in the preview
        var shape = AppState.shapeType || 'circle';
        var width = 100;
        var height = 100;

        // Logic mirroring getShapeDimensions from preview
        if (typeof RegionSelector !== 'undefined' && RegionSelector.getState) {
            var rsState = RegionSelector.getState();
            switch (shape) {
                case 'circle': width = rsState.circleDiameter; height = rsState.circleDiameter; break;
                case 'square': width = rsState.squareSize; height = rsState.squareSize; break;
                case 'rectangle': width = rsState.rectangleWidth; height = rsState.rectangleHeight; break;
            }
        } else {
            // Fallback to reading inputs directly
            var circleInput = document.getElementById('region_circle_diameter');
            var squareInput = document.getElementById('region_square_size');
            var rectWidthInput = document.getElementById('region_rect_width');
            var rectHeightInput = document.getElementById('region_rect_height');

            switch (shape) {
                case 'circle': width = circleInput ? parseInt(circleInput.value) || 100 : 100; height = width; break;
                case 'square': width = squareInput ? parseInt(squareInput.value) || 100 : 100; height = width; break;
                case 'rectangle': width = rectWidthInput ? parseInt(rectWidthInput.value) || 150 : 150; height = rectHeightInput ? parseInt(rectHeightInput.value) || 100 : 100; break;
            }
        }

        // Use natural image dimensions to calculate center crop coordinates
        var imgEl = AppState.analyzeSingleImage ? document.getElementById('testPreview') : document.getElementById('refPreview');
        if (imgEl && imgEl.naturalWidth) {
            var natW = imgEl.naturalWidth;
            var natH = imgEl.naturalHeight;

            var centerX = Math.round(natW / 2);
            var centerY = Math.round(natH / 2);

            // Calculate top-left x,y
            var startX = Math.round(centerX - (width / 2));
            var startY = Math.round(centerY - (height / 2));

            regionData = {
                type: shape === 'circle' ? 'circle' : 'rect',
                x: startX,
                y: startY,
                width: width,
                height: height,
                use_crop: true
            };
        } else {
            // If we can't get dimensions, we might be stuck. Default to full to avoid crash, but warn?
                    regionData = { type: 'full' };
        }
    }

    // Store settings for API call (visual progress only uses this)
    ProgressState.analysisSettings = settings;

    // Build the FormData for the stateless API
    var formData = new FormData();
    if (AppState.analyzeSingleImage) {
        // In single mode, we only care about 'sample_image' but we can send it as both just in case,
        // though backend prioritizes sample_image if single_image_mode is true.
        // formData.append('ref_image', AppState.testFile); // Not needed for single mode backend
        formData.append('sample_image', AppState.testFile);
        formData.append('single_image_mode', 'true');
    } else {
        formData.append('ref_image', AppState.refFile);
        formData.append('sample_image', AppState.testFile);
        formData.append('single_image_mode', 'false');
    }

    formData.append('settings', JSON.stringify(settings));
    formData.append('region_data', JSON.stringify(regionData));

    // Show progress modal
    showProgressModal();

    // Trigger the analysis
    // We pass formData to the analysis function
    runSequentialAnalysis(formData)
        .then(function (result) {
            AppState.isProcessing = false;
            AppState.pdfUrl = result.pdf_url;
            AppState.fnFull = result.fn_full || '';
            AppState.fnColor = result.fn_color || '';
            AppState.fnPattern = result.fn_pattern || '';
            AppState.fnReceipt = result.fn_receipt || '';

            setTimeout(function () {
                hideProgressModal();
                displayResults(result);
                updateButtonStates();
            }, 600);
        })
        .catch(function (error) {
            console.error('Processing error:', error);
            markStepFailed(ProgressState.currentStepId || 'enhance', error.message);
            AppState.isProcessing = false;

            setTimeout(function () {
                hideProgressModal();
                updateButtonStates();
                showCustomAlert(I18n.t('analysis.failed') || 'Analysis Error', error.message || 'Unknown error occurred', 'error');
            }, 1500);
        });
}

// Run analysis with sequential step progression
function runSequentialAnalysis(formData) {
    return new Promise(function (resolve, reject) {
        var settings = ProgressState.analysisSettings;
        var enabledAnalysisSteps = ProgressState.steps;

        // Track which step we're simulating
        var currentStepIndex = 0;
        var analysisComplete = false;
        var analysisResult = null;
        var analysisError = null;

        // Function to advance to next step (sequential)
        function advanceToNextStep() {
            if (analysisError) {
                reject(analysisError);
                return;
            }

            // If analysis is complete and all steps done, resolve
            if (analysisComplete && currentStepIndex >= enabledAnalysisSteps.length) {
                resolve(analysisResult);
                return;
            }

            // If we have more steps to show
            if (currentStepIndex < enabledAnalysisSteps.length) {
                var step = enabledAnalysisSteps[currentStepIndex];

                // Activate current step (shows spinner)
                activateStep(step.id);

                // Calculate step duration based on weight
                var baseDuration = 600;
                var stepDuration = baseDuration + (step.weight * 20);

                // If this is the last step (report), wait for actual completion
                if (step.id === 'report') {
                    // Check periodically if analysis is done
                    var checkInterval = setInterval(function () {
                        if (analysisComplete || analysisError) {
                            clearInterval(checkInterval);
                            if (analysisError) {
                                reject(analysisError);
                            } else {
                                markStepComplete(step.id);
                                setTimeout(function () {
                                    resolve(analysisResult);
                                }, 300);
                            }
                        }
                    }, 200);
                } else {
                    // For non-final steps, complete after duration
                    setTimeout(function () {
                        markStepComplete(step.id);
                        currentStepIndex++;

                        // Small delay before next step starts
                        setTimeout(advanceToNextStep, 150);
                    }, stepDuration);
                }
            }
        }

        // Start the API call in parallel
        var controller = new AbortController();
        var timeoutId = setTimeout(function () {
            controller.abort();
        }, 300000); // 5 minute timeout

        fetch('/api/analyze', {
            method: 'POST',
            body: formData,
            signal: controller.signal
        })
            .then(function (response) {
                clearTimeout(timeoutId);

                if (!response.ok) {
                    if (response.status === 413) {
                        throw new Error('File too large (Max 100MB)');
                    }
                    return response.json().then(function(data) {
                        throw new Error(data.error || 'Analysis failed');
                    }).catch(function() {
                        throw new Error('Server Error: ' + response.status + ' ' + response.statusText);
                    });
                }

                return response.json();
            })
            .then(function (data) {
                if (data.error) {
                    throw new Error(data.error);
                }
                
                analysisResult = data;
                
                AppState.pdfUrl = data.pdf_url;
                AppState.receiptUrl = data.receipt_url;
                AppState.colorReportUrl = data.color_report_url;
                AppState.patternReportUrl = data.pattern_report_url;
                AppState.fnFull = data.fn_full || '';
                AppState.fnColor = data.fn_color || '';
                AppState.fnPattern = data.fn_pattern || '';
                AppState.fnReceipt = data.fn_receipt || '';
                analysisComplete = true;
            })
            .catch(function (error) {
                clearTimeout(timeoutId);
                console.error("Analysis Error:", error);

                if (error.name === 'AbortError') {
                    analysisError = new Error('Analysis timeout - File might be too large or connection slow');
                } else if (error.message === 'Failed to fetch') {
                    analysisError = new Error('Upload failed. Check connection or file size (Max 100MB).');
                } else {
                    analysisError = new Error(error.message || 'Unknown error during analysis');
                }
            });

        // Start sequential step progression
        advanceToNextStep();
    });
}



// Progress Modal - Sequential Steps with Green Checkmarks

// Progress state management
var ProgressState = {
    steps: [],
    currentStepIndex: 0,
    currentStepId: null,
    completedCount: 0,
    totalSteps: 0,
    hasError: false,
    analysisSettings: null
};

// Get enabled steps based on user settings
function getEnabledSteps() {
    var settings = collectSettings();
    var steps = [];

    // Step 1: Upload (always)
    steps.push({ id: 'upload', label: I18n.t('upload.images'), weight: 10 });

    // Step 2: Alignment Preprocessing (when a non-direct mode is active)
    if (settings.alignment_mode && settings.alignment_mode !== 'direct') {
        steps.push({ id: 'alignment', label: I18n.t('align.step.preprocessing') || 'Alignment Preprocessing', weight: 12 });
    }

    // Step 3: Color Analysis (if enabled)
    if (settings.enable_color_unit) {
        steps.push({ id: 'color', label: I18n.t('color.analysis.step'), weight: 25 });
    }

    // Step 4: Pattern Analysis (if enabled)
    if (settings.enable_pattern_unit) {
        steps.push({ id: 'pattern', label: I18n.t('pattern.analysis.step'), weight: 25 });
    }

    // Step 5: Pattern Repetition (if enabled)
    if (settings.enable_pattern_repetition) {
        steps.push({ id: 'repetition', label: I18n.t('pattern.repetition.step'), weight: 20 });
    }

    // Step 6: Calculate Scores (always)
    steps.push({ id: 'scoring', label: I18n.t('calculate.scores'), weight: 10 });

    // Step 7: Generate Report (always)
    steps.push({ id: 'report', label: I18n.t('generate.report'), weight: 10 });

    return steps;
}

// Show compact progress modal
function showProgressModal() {
    var overlay = document.getElementById('loadingOverlay');
    var content = document.querySelector('.loading-content');

    // Initialize state
    ProgressState.steps = getEnabledSteps();
    ProgressState.totalSteps = ProgressState.steps.length;
    ProgressState.currentStepIndex = 0;
    ProgressState.currentStepId = null;
    ProgressState.completedCount = 0;
    ProgressState.hasError = false;

    // Build steps HTML with neutral circles
    var stepsHtml = ProgressState.steps.map(function (step, index) {
        return '<div class="step" data-step="' + step.id + '" data-index="' + index + '">' +
            '<span class="step-icon-wrapper"><span class="step-icon">○</span></span>' +
            '<span class="step-label">' + step.label + '</span>' +
            '</div>';
    }).join('');

    if (content) {
        content.innerHTML =
            '<div class="progress-modal">' +
            '<div class="progress-logo-container">' +
            '<video class="progress-logo-video" autoplay loop muted playsinline>' +
            '<source src="/static/Animation/Loading_Logo.mp4" type="video/mp4">' +
            '</video>' +
            '</div>' +
            '<div class="progress-percentage-large" id="progressPercentage">0%</div>' +
            '<div class="progress-bar-container">' +
            '<div class="progress-bar-fill" id="progressBarFill"></div>' +
            '</div>' +
            '<div class="progress-steps" id="progressSteps">' +
            stepsHtml +
            '</div>' +
            '</div>';
    }

    if (overlay) overlay.style.display = 'flex';
}

// Hide progress modal
function hideProgressModal() {
    var overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Calculate progress percentage based on completed steps
function calculateProgress() {
    if (ProgressState.totalSteps === 0) return 0;

    var totalWeight = 0;
    var completedWeight = 0;

    ProgressState.steps.forEach(function (step) {
        totalWeight += step.weight;
        var stepEl = document.querySelector('.step[data-step="' + step.id + '"]');
        if (stepEl) {
            if (stepEl.classList.contains('completed')) {
                completedWeight += step.weight;
            } else if (stepEl.classList.contains('active')) {
                completedWeight += step.weight * 0.4; // 40% while running
            }
        }
    });

    return Math.round((completedWeight / totalWeight) * 100);
}

// Update progress bar and percentage display
function updateProgressUI() {
    var percentage = calculateProgress();
    var bar = document.getElementById('progressBarFill');
    var pct = document.getElementById('progressPercentage');

    if (bar) bar.style.width = percentage + '%';
    if (pct) pct.textContent = percentage + '%';
}

// Activate a step - shows spinner (running state)
function activateStep(stepId) {
    ProgressState.currentStepId = stepId;
    var stepEl = document.querySelector('.step[data-step="' + stepId + '"]');

    if (stepEl && !stepEl.classList.contains('completed')) {
        // Update icon to spinner
        var icon = stepEl.querySelector('.step-icon');
        if (icon) icon.textContent = '◌';

        stepEl.classList.add('active');
        updateProgressUI();
    }
}

// Mark step as complete - turns GREEN with checkmark ✓
function markStepComplete(stepId) {
    var stepEl = document.querySelector('.step[data-step="' + stepId + '"]');

    if (stepEl) {
        stepEl.classList.remove('active');
        stepEl.classList.add('completed');

        // Change icon to checkmark
        var icon = stepEl.querySelector('.step-icon');
        if (icon) icon.textContent = '✓';

        ProgressState.completedCount++;
        updateProgressUI();
    }
}

// Mark step as failed - turns RED with X
function markStepFailed(stepId, errorMessage) {
    var stepEl = document.querySelector('.step[data-step="' + stepId + '"]');

    if (stepEl) {
        stepEl.classList.remove('active');
        stepEl.classList.add('failed');

        // Change icon to X
        var icon = stepEl.querySelector('.step-icon');
        if (icon) icon.textContent = '✗';
    }

    ProgressState.hasError = true;
}

// Legacy compatibility functions
function updateProgress(step, percentage, status) {
    activateStep(step);
}

function completeStep(step) {
    markStepComplete(step);
}

function failStep(step, errorMessage) {
    markStepFailed(step, errorMessage);
}

function completeAllSteps() {
    ProgressState.steps.forEach(function (step) {
        markStepComplete(step.id);
    });

    var bar = document.getElementById('progressBarFill');
    var pct = document.getElementById('progressPercentage');

    if (bar) {
        bar.style.width = '100%';
        bar.classList.add('complete');
    }
    if (pct) pct.textContent = '100%';
}

// Results Display
function displayResults(data) {
    var resultsSection = document.getElementById('resultsSection');
    if (resultsSection) {
        resultsSection.style.display = 'block';
        resultsSection.scrollIntoView({ behavior: 'smooth' });
    }

    // Handle Single Image Mode Display
    var scoreGrid = document.querySelector('.results-grid');
    if (AppState.analyzeSingleImage) {
        // Hide score grid in single mode
        if (scoreGrid) scoreGrid.style.display = 'none';

        // Hide Decision Badge or set to "COMPLETE"
        var badge = document.getElementById('decisionBadge');
        if (badge) {
            badge.textContent = "ANALYSIS COMPLETE";
            badge.className = 'decision-badge accept'; // Use green style
            badge.style.width = 'auto';
            badge.style.padding = '0.5rem 2rem';
        }

    } else {
        // Show score grid in dual mode
        if (scoreGrid) scoreGrid.style.display = 'grid';

        // Decision badge with translation
        var badge = document.getElementById('decisionBadge');
        if (badge) {
            // Translate the decision text based on current language
            var decisionText = data.decision;
            if (data.decision === 'ACCEPT') {
                decisionText = I18n.t('decision.accept');
                badge.className = 'decision-badge accept';
            } else if (data.decision.indexOf('CONDITIONAL') >= 0) {
                decisionText = I18n.t('decision.conditional');
                badge.className = 'decision-badge conditional';
            } else {
                decisionText = I18n.t('decision.reject');
                badge.className = 'decision-badge reject';
            }
            badge.textContent = decisionText;
        }

        // Update Color Score label based on scoring method
        var colorLabel = document.querySelector('[data-i18n="color.score"]');
        if (colorLabel && data.color_method_label) {
            colorLabel.textContent = I18n.t('color.score') + ' (' + _formatColorMethodLabel(data.color_method_label) + ')';
        }
        // Update Pattern Score label based on scoring method
        var patternLabel = document.querySelector('[data-i18n="pattern.score"]');
        if (patternLabel && data.pattern_method_label) {
            patternLabel.textContent = I18n.t('pattern.score') + ' (' + data.pattern_method_label + ')';
        }

        // Animate scores with actual values from analysis
        animateScore('colorScore', 'colorBar', data.color_score || 0, _getColorScorePresentation(data));
        animateScore('patternScore', 'patternBar', data.pattern_score || 0);
        animateScore('overallScore', 'overallBar', data.overall_score || 0, {
            displayValue: Number(data.overall_score || 0),
            displayDecimals: 1,
            visualPct: Number(data.overall_score || 0)
        });
    }

    // Enable download buttons
    var btnDownload = document.getElementById('btnDownload');
    if (btnDownload) btnDownload.disabled = false;

    var btnDropdown = document.getElementById('btnDownloadDropdown');
    if (btnDropdown) btnDropdown.disabled = false;

    // Show file size
    var fileSizeEl = document.getElementById('reportFileSize');
    if (fileSizeEl && data.report_size) {
        fileSizeEl.textContent = data.report_size;
    }

    var btnDownloadSettings = document.getElementById('btnDownloadSettings');
    if (btnDownloadSettings) btnDownloadSettings.disabled = false;

    // Build detailed results panel
    buildDetailedResults(data);
}

function _getColorScorePresentation(data) {
    var isRawDeltaE = data && data.color_score_format === 'raw_value';
    var displayValue = Number(data && data.color_score !== undefined ? data.color_score : 0);
    if (!isFinite(displayValue)) displayValue = 0;

    var visualPct = Number(data && data.color_score_visual_pct !== undefined ? data.color_score_visual_pct : displayValue);
    if (!isFinite(visualPct)) visualPct = 0;
    visualPct = Math.max(0, Math.min(100, visualPct));

    var status = String((data && data.color_status) || '').toUpperCase();
    return {
        displayValue: displayValue,
        displayDecimals: isRawDeltaE ? 2 : 1,
        visualPct: isRawDeltaE ? visualPct : Math.max(0, Math.min(100, displayValue)),
        barClass: isRawDeltaE ? (status === 'PASS' ? 'success' : (status === 'CONDITIONAL' ? 'warning' : 'danger')) : '',
        gaugeClass: isRawDeltaE ? (status === 'PASS' ? 'good' : (status === 'CONDITIONAL' ? 'warn' : 'bad')) : ''
    };
}

function _formatColorMethodLabel(label) {
    return label === 'DELTAE2000' ? 'ΔE₀₀' : label;
}

function animateScore(valueId, barId, score, options) {
    options = options || {};
    var valueEl = document.getElementById(valueId);
    var barEl = document.getElementById(barId);
    var displayValue = Number(options.displayValue !== undefined ? options.displayValue : (score || 0));
    var displayDecimals = options.displayDecimals !== undefined ? options.displayDecimals : 1;
    var visualPct = Number(options.visualPct !== undefined ? options.visualPct : (score || 0));
    var barClass = options.barClass || '';

    if (!isFinite(displayValue)) displayValue = 0;
    if (!isFinite(visualPct)) visualPct = 0;
    visualPct = Math.max(0, Math.min(100, visualPct));

    if (valueEl) {
        var current = 0;
        var step = displayValue === 0 ? 0 : Math.max(Math.abs(displayValue) / 30, 1 / Math.pow(10, displayDecimals));
        var interval = setInterval(function () {
            current += step;
            if (current >= displayValue) {
                current = displayValue;
                clearInterval(interval);
            }
            valueEl.textContent = current.toFixed(displayDecimals);
        }, 25);
        if (displayValue === 0) valueEl.textContent = displayValue.toFixed(displayDecimals);
    }

    if (barEl) {
        setTimeout(function () {
            barEl.style.width = visualPct + '%';
            barEl.className = 'bar-fill';
            if (barClass) {
                barEl.classList.add(barClass);
            } else if (visualPct >= 70) {
                barEl.classList.add('success');
            } else if (visualPct >= 50) {
                barEl.classList.add('warning');
            } else {
                barEl.classList.add('danger');
            }
        }, 100);
    }
}

// Detailed Results Panel Builder

function buildDetailedResults(data) {
    var area = document.getElementById('webResultsDetail');
    if (!area) return;
    var t = function(k) { return I18n.t(k); };
    var isSingle = !!data.single_image_mode;
    var imgs = data.images || {};
    var html = '';

    if (!isSingle) {

        /* ══════════════════════════════════════
           REPORT SUMMARY — expanded by default
           ══════════════════════════════════════ */
        html += _wrptColStart('summary-detail', t('rpt.report.summary'), _wrptIcon('summary'));

        /* Decision banner */
        var dec = (data.decision || '').toUpperCase();
        var decCls = dec === 'ACCEPT' ? 'good' : (dec === 'REJECT' ? 'bad' : 'warn');
        html += '<div class="wrpt-decision-banner ' + decCls + '">';
        html += '<span class="wrpt-decision-label">' + dec + '</span>';
        if (data.report_id) html += '<span class="wrpt-decision-id">' + data.report_id + '</span>';
        html += '</div>';

        /* Score overview row */
        html += '<div class="wrpt-scores-row">';
        html += _wrptScoreGauge(t('color.score'), data.color_score, _formatColorMethodLabel(data.color_method_label), _getColorScorePresentation(data));
        html += _wrptScoreGauge(t('pattern.score'), data.pattern_score, data.pattern_method_label);
        html += _wrptScoreGauge(t('overall.score'), data.overall_score, '');
        html += '</div>';

        /* Summary metric cards */
        html += '<div class="wrpt-summary-grid">';
        html += _wrptSummaryCard(_wrptSvg('bar'), t('rpt.color.scoring'), _formatColorMethodLabel(data.color_method_label || 'DELTAE2000'), '');
        html += _wrptSummaryCard(_wrptSvg('grid'), t('rpt.pattern.scoring'), data.pattern_method_label || 'All (Average)', '');
        if (data.csi_value !== undefined) {
            var csiMeta = data.csi_details || {};
            var csiC = csiMeta.status === 'PASS' ? 'good' : (csiMeta.status === 'CONDITIONAL' ? 'warn' : 'bad');
            html += _wrptSummaryCard(_wrptSvg('clock'), t('rpt.csi.color.similarity'), data.csi_value.toFixed(2), csiC);
        }
        if (data.mean_de00 !== undefined) {
            var deC = data.mean_de00 <= 2 ? 'good' : (data.mean_de00 <= 5 ? 'warn' : 'bad');
            html += _wrptSummaryCard(_wrptSvg('pulse'), t('rpt.mean.de2000'), data.mean_de00.toFixed(4), deC);
        }
        if (data.report_size) {
            html += _wrptSummaryCard(_wrptSvg('file'), t('rpt.report.size'), data.report_size, '');
        }
        var sm = data.structural_meta;
        if (sm && sm.change_percentage !== undefined) {
            var chC = sm.change_percentage <= 1 ? 'good' : (sm.change_percentage <= 5 ? 'warn' : 'bad');
            html += _wrptSummaryCard(_wrptSvg('eye'), t('rpt.structural.change'), sm.change_percentage.toFixed(2) + '%', chC);
        }
        html += '</div>';

        /* Color Averages comparison */
        var ca = data.color_averages;
        if (ca && ca.ref_rgb && ca.sam_rgb) {
            html += '<div class="wrpt-section-title">' + t('rpt.color.comparison') + '</div>';
            html += '<div class="wrpt-color-compare">';
            html += '<div class="wrpt-color-swatch-block">';
            html += '<div class="wrpt-swatch" style="background:rgb(' + ca.ref_rgb[0] + ',' + ca.ref_rgb[1] + ',' + ca.ref_rgb[2] + ')"></div>';
            html += '<div class="wrpt-swatch-label">' + t('rpt.reference') + '</div>';
            html += '<div class="wrpt-swatch-info">RGB: ' + ca.ref_rgb[0] + ', ' + ca.ref_rgb[1] + ', ' + ca.ref_rgb[2] + '</div>';
            if (ca.ref_lab) html += '<div class="wrpt-swatch-info">L*a*b*: ' + ca.ref_lab[0] + ', ' + ca.ref_lab[1] + ', ' + ca.ref_lab[2] + '</div>';
            html += '</div>';
            html += '<div class="wrpt-color-arrow">\u2194</div>';
            html += '<div class="wrpt-color-swatch-block">';
            html += '<div class="wrpt-swatch" style="background:rgb(' + ca.sam_rgb[0] + ',' + ca.sam_rgb[1] + ',' + ca.sam_rgb[2] + ')"></div>';
            html += '<div class="wrpt-swatch-label">' + t('rpt.sample') + '</div>';
            html += '<div class="wrpt-swatch-info">RGB: ' + ca.sam_rgb[0] + ', ' + ca.sam_rgb[1] + ', ' + ca.sam_rgb[2] + '</div>';
            if (ca.sam_lab) html += '<div class="wrpt-swatch-info">L*a*b*: ' + ca.sam_lab[0] + ', ' + ca.sam_lab[1] + ', ' + ca.sam_lab[2] + '</div>';
            html += '</div>';
            html += '</div>';
        }

        html += _wrptColEnd();

        /* ══════════════════════════════════════
           COLOR ANALYSIS DETAILS
           ══════════════════════════════════════ */
        html += _wrptColStart('color-detail', t('rpt.color.analysis.details'), _wrptIcon('color'));

        html += '<div class="wrpt-kpi-row">';
        if (data.mean_de00 !== undefined) {
            var cSt = data.color_status || '';
            var cStC = cSt === 'PASS' ? 'good' : (cSt === 'FAIL' ? 'bad' : 'warn');
            html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">' + t('rpt.mean.de00') + '</span><span class="wrpt-kpi-value">' + data.mean_de00.toFixed(4) + '</span></div>';
            if (data.csi_value !== undefined) {
                var csiMeta2 = data.csi_details || {};
                var csi2 = csiMeta2.status === 'PASS' ? 'good' : (csiMeta2.status === 'CONDITIONAL' ? 'warn' : 'bad');
                html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">CSI</span><span class="wrpt-kpi-value ' + csi2 + '">' + data.csi_value.toFixed(4) + '</span></div>';
            }
            html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">' + t('rpt.method') + '</span><span class="wrpt-kpi-value">' + _formatColorMethodLabel(data.color_method_label || 'DELTAE2000') + '</span></div>';
            html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">' + t('rpt.status') + '</span><span class="wrpt-status-badge ' + cStC + '">' + cSt + '</span></div>';
        }
        html += '</div>';
        if (data.csi_details && data.csi_details.pixel_count !== undefined) {
            html += '<div class="wrpt-info-note">&#9432; ' + t('rpt.csi.note') + ' ' + t('rpt.pixel.count') + ': ' + Number(data.csi_details.pixel_count || 0).toLocaleString() + '</div>';
        }
        if (data.color_method_label === 'DELTAE2000') {
            html += '<div class="wrpt-info-note">&#9432; ' + t('rpt.deltaep2000.note') + '</div>';
        }

        if (data.color_regions && data.color_regions.length) {
            html += '<div class="wrpt-section-title">' + t('rpt.regional.color.metrics') + '</div>';
            html += '<div style="overflow-x:auto">';
            html += '<table class="wrpt-table"><thead><tr><th>#</th><th>' + t('rpt.position') + '</th><th>\u0394E76</th><th>\u0394E94</th><th>\u0394E00</th><th>' + t('rpt.status') + '</th><th>' + t('rpt.ref.lab') + '</th><th>' + t('rpt.sam.lab') + '</th></tr></thead><tbody>';
            data.color_regions.forEach(function(r) {
                var sc = r.status === 'PASS' ? 'good' : (r.status === 'FAIL' ? 'bad' : 'warn');
                var refC = 'rgb(' + r.ref_rgb[0] + ',' + r.ref_rgb[1] + ',' + r.ref_rgb[2] + ')';
                var samC = 'rgb(' + r.sam_rgb[0] + ',' + r.sam_rgb[1] + ',' + r.sam_rgb[2] + ')';
                html += '<tr><td>' + r.id + '</td><td>(' + r.pos[0] + ', ' + r.pos[1] + ')</td>';
                html += '<td>' + r.de76.toFixed(2) + '</td><td>' + r.de94.toFixed(2) + '</td>';
                html += '<td class="' + sc + '">' + r.de00.toFixed(2) + '</td>';
                html += '<td><span class="wrpt-status-badge ' + sc + '">' + r.status + '</span></td>';
                html += '<td><span class="wrpt-color-chip" style="background:' + refC + '"></span>' + r.ref_lab[0].toFixed(1) + ', ' + r.ref_lab[1].toFixed(1) + ', ' + r.ref_lab[2].toFixed(1) + '</td>';
                html += '<td><span class="wrpt-color-chip" style="background:' + samC + '"></span>' + r.sam_lab[0].toFixed(1) + ', ' + r.sam_lab[1].toFixed(1) + ', ' + r.sam_lab[2].toFixed(1) + '</td></tr>';
            });
            html += '</tbody></table></div>';
        }

        /* ΔE Summary Statistics */
        var deStats = data.de_statistics;
        if (deStats && (deStats.de76 || deStats.de94 || deStats.de00)) {
            html += '<div class="wrpt-section-title">' + t('rpt.de.summary.stats') + '</div>';
            html += '<div style="overflow-x:auto">';
            html += '<table class="wrpt-table"><thead><tr><th>' + t('rpt.metric') + '</th><th>' + t('rpt.average') + '</th><th>' + t('rpt.std.dev') + '</th><th>' + t('rpt.min') + '</th><th>' + t('rpt.max') + '</th></tr></thead><tbody>';
            if (deStats.de76) html += '<tr><td>\u0394E76</td><td>' + deStats.de76.mean.toFixed(4) + '</td><td>' + deStats.de76.std.toFixed(4) + '</td><td>' + deStats.de76.min.toFixed(4) + '</td><td>' + deStats.de76.max.toFixed(4) + '</td></tr>';
            if (deStats.de94) html += '<tr><td>\u0394E94</td><td>' + deStats.de94.mean.toFixed(4) + '</td><td>' + deStats.de94.std.toFixed(4) + '</td><td>' + deStats.de94.min.toFixed(4) + '</td><td>' + deStats.de94.max.toFixed(4) + '</td></tr>';
            if (deStats.de00) {
                var de00C = deStats.de00.mean <= 2 ? 'good' : (deStats.de00.mean <= 5 ? 'warn' : 'bad');
                html += '<tr class="wrpt-highlight-row"><td><strong>\u0394E2000</strong></td><td class="' + de00C + '"><strong>' + deStats.de00.mean.toFixed(4) + '</strong></td><td>' + deStats.de00.std.toFixed(4) + '</td><td>' + deStats.de00.min.toFixed(4) + '</td><td>' + deStats.de00.max.toFixed(4) + '</td></tr>';
            }
            html += '</tbody></table></div>';
        }

        /* Illuminant Analysis */
        if (data.illuminant_data && data.illuminant_data.length) {
            html += '<div class="wrpt-section-title">' + t('rpt.illuminant.analysis') + '</div>';
            html += '<div style="overflow-x:auto">';
            html += '<table class="wrpt-table"><thead><tr><th>' + t('rpt.illuminant') + '</th><th>' + t('rpt.mean.de00') + '</th><th>CSI</th><th>' + t('rpt.status') + '</th></tr></thead><tbody>';
            data.illuminant_data.forEach(function(ill) {
                var iSc = ill.status === 'PASS' ? 'good' : (ill.status === 'FAIL' ? 'bad' : 'warn');
                html += '<tr><td>' + ill.illuminant + '</td><td>' + ill.mean_de00.toFixed(4) + '</td><td>' + ill.csi.toFixed(4) + '</td>';
                html += '<td><span class="wrpt-status-badge ' + iSc + '">' + ill.status + '</span></td></tr>';
            });
            html += '</tbody></table></div>';
        }

        var colorImgs = [
            {key: 'heatmap', title: t('rpt.de.heatmap'), caption: t('rpt.de.heatmap.caption')},
            {key: 'spectral', title: t('rpt.spectral'), caption: t('rpt.spectral.caption')},
            {key: 'histograms', title: t('rpt.histograms'), caption: t('rpt.histograms.caption')},
            {key: 'lab_scatter', title: t('rpt.lab.scatter'), caption: t('rpt.lab.scatter.caption')},
            {key: 'lab_bars', title: t('rpt.lab.bars'), caption: t('rpt.lab.bars.caption')}
        ];
        html += _wrptGallery(imgs, colorImgs);

        html += _wrptColEnd();

        /* ══════════════════════════════════════
           PATTERN ANALYSIS DETAILS
           ══════════════════════════════════════ */
        html += _wrptColStart('pattern-detail', t('rpt.pattern.analysis.details'), _wrptIcon('pattern'));

        html += '<div class="wrpt-kpi-row">';
        if (data.pattern_composite !== undefined) {
            var pSt = data.pattern_final_status || '';
            var pStC = pSt === 'PASS' ? 'good' : (pSt === 'FAIL' ? 'bad' : 'warn');
            html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">' + t('rpt.composite') + '</span><span class="wrpt-kpi-value">' + data.pattern_composite.toFixed(1) + '%</span></div>';
            html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">' + t('rpt.method') + '</span><span class="wrpt-kpi-value">' + (data.pattern_method_label || 'All') + '</span></div>';
            html += '<div class="wrpt-kpi"><span class="wrpt-kpi-label">' + t('rpt.status') + '</span><span class="wrpt-status-badge ' + pStC + '">' + pSt + '</span></div>';
        }
        var sm2 = data.structural_meta;
        html += '</div>';

        if (data.pattern_details) {
            html += '<div class="wrpt-section-title">' + t('rpt.individual.method.scores') + '</div>';
            var ps = data.pattern_details;
            html += '<div class="wrpt-pattern-grid">';
            for (var k in ps) {
                var detail = ps[k] || {};
                var pv = detail.normalized_score !== undefined ? detail.normalized_score : 0;
                var pc = detail.status === 'PASS' ? 'good' : (detail.status === 'CONDITIONAL' ? 'warn' : 'bad');
                var displayValue = detail.value_format === 'unit_interval'
                    ? Number(detail.value || 0).toFixed(4)
                    : Number(detail.value || 0).toFixed(1) + '%';
                html += '<div class="wrpt-pattern-card"><div class="wrpt-pattern-name">' + k + '</div><div class="wrpt-pattern-val ' + pc + '">' + displayValue + '</div><div class="wrpt-mini-bar"><div class="wrpt-mini-fill ' + pc + '" style="width:' + Math.min(100, pv) + '%"></div></div></div>';
            }
            html += '</div>';
        }

        if (sm2) {
            html += '<div class="wrpt-section-title">' + t('rpt.structural.difference') + '</div>';
            html += '<div class="wrpt-stat-row"><span class="wrpt-stat-label">' + t('rpt.changed.pixels') + '</span><span class="wrpt-stat-value">' + (sm2.changed_pixels !== undefined ? sm2.changed_pixels.toLocaleString() : '\u2014') + '</span></div>';
        }

        html += '<div class="wrpt-section-title">' + t('rpt.difference.maps') + '</div>';
        html += _wrptGallery(imgs, [
            {key: 'structural_ssim', title: t('rpt.ssim.map'), caption: t('rpt.ssim.map.caption')},
            {key: 'gradient_similarity', title: t('rpt.gradient.map'), caption: t('rpt.gradient.map.caption')},
            {key: 'phase_correlation', title: t('rpt.phase.map'), caption: t('rpt.phase.map.caption')}
        ]);

        html += '<div class="wrpt-section-title">' + t('rpt.boundary.detection') + '</div>';
        html += _wrptGallery(imgs, [
            {key: 'gradient_boundary', title: t('rpt.gradient.boundary'), caption: t('rpt.gradient.boundary.caption')},
            {key: 'gradient_filled', title: t('rpt.gradient.filled'), caption: t('rpt.gradient.filled.caption')},
            {key: 'phase_boundary', title: t('rpt.phase.boundary'), caption: t('rpt.phase.boundary.caption')},
            {key: 'phase_filled', title: t('rpt.phase.filled'), caption: t('rpt.phase.filled.caption')}
        ]);

        var bm = data.boundary_metrics || {};
        if (bm.gradient || bm.phase) {
            html += '<table class="wrpt-table"><thead><tr><th>' + t('rpt.boundary.detection') + '</th><th>' + t('rpt.changed.area') + ' (%)</th><th>' + t('rpt.weighted.severity') + ' (%)</th><th>' + t('rpt.detected.regions') + '</th></tr></thead><tbody>';
            if (bm.gradient) {
                html += '<tr><td>' + t('rpt.gradient.boundary') + '</td><td>' + bm.gradient.changed_area_pct.toFixed(2) + '%</td><td>' + bm.gradient.weighted_severity.toFixed(2) + '%</td><td>' + bm.gradient.region_count + '</td></tr>';
            }
            if (bm.phase) {
                html += '<tr><td>' + t('rpt.phase.boundary') + '</td><td>' + bm.phase.changed_area_pct.toFixed(2) + '%</td><td>' + bm.phase.weighted_severity.toFixed(2) + '%</td><td>' + bm.phase.region_count + '</td></tr>';
            }
            html += '</tbody></table>';
        }

        html += '<div class="wrpt-section-title">' + t('rpt.structural.analysis') + '</div>';
        html += _wrptGallery(imgs, [
            {key: 'structural_subplot', title: t('rpt.multi.method'), caption: t('rpt.multi.method.caption')},
            {key: 'structural_pure', title: t('rpt.pure.diff'), caption: t('rpt.pure.diff.caption')}
        ]);

        html += _wrptColEnd();

        /* ══════════════════════════════════════
           TEXTURE & FREQUENCY ANALYSIS
           ══════════════════════════════════════ */
        var hasTex = imgs.fourier_spectrum || imgs.glcm_heatmap;
        if (hasTex) {
            html += _wrptColStart('texture-detail', t('rpt.texture.frequency'), _wrptIcon('texture'));
            html += _wrptGallery(imgs, [
                {key: 'fourier_spectrum', title: t('rpt.fourier'), caption: t('rpt.fourier.caption')},
                {key: 'glcm_heatmap', title: t('rpt.glcm'), caption: t('rpt.glcm.caption')}
            ]);
            html += _wrptColEnd();
        }

    } else {
        /* ══════════════════════════════════════
           SINGLE IMAGE ANALYSIS
           ══════════════════════════════════════ */
        html += _wrptColStart('single-detail', t('rpt.single.image.analysis'), _wrptIcon('single'));
        html += '<div class="wrpt-stat-row"><span class="wrpt-stat-label">' + t('rpt.mode') + '</span><span class="wrpt-stat-value">' + t('rpt.single.image.mode') + '</span></div>';
        html += _wrptGallery(imgs, [
            {key: 'histogram_single', title: t('rpt.histogram.single'), caption: t('rpt.histogram.single.caption')},
            {key: 'spectral_single', title: t('rpt.spectral.single'), caption: t('rpt.spectral.single.caption')},
            {key: 'fourier_single', title: t('rpt.fourier.single'), caption: t('rpt.fourier.single.caption')}
        ]);
        html += _wrptColEnd();
    }

    area.innerHTML = html;

    /* Wire collapsible toggles */
    area.querySelectorAll('.wrpt-collapse-hdr').forEach(function(hdr) {
        hdr.addEventListener('click', function() {
            var body = this.nextElementSibling;
            var icon = this.querySelector('.wrpt-collapse-icon');
            var isOpen = body.style.display !== 'none';
            body.style.display = isOpen ? 'none' : '';
            if (icon) icon.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(90deg)';
            this.classList.toggle('open', !isOpen);
        });
    });

    /* Wire image lightbox */
    area.querySelectorAll('.wrpt-img-thumb').forEach(function(img) {
        img.addEventListener('click', function() { _wrptLightbox(this.src, this.alt); });
    });
}

/* ── Collapsible helpers ── */
function _wrptColStart(id, title, icon) {
    return '<div class="wrpt-collapse" id="' + id + '"><div class="wrpt-collapse-hdr">' +
        '<svg class="wrpt-collapse-icon" width="12" height="12" viewBox="0 0 10 10"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
        (icon || '') + ' <span>' + title + '</span></div><div class="wrpt-collapse-body" style="display:none">';
}
function _wrptColStartOpen(id, title, icon) {
    return '<div class="wrpt-collapse" id="' + id + '"><div class="wrpt-collapse-hdr open">' +
        '<svg class="wrpt-collapse-icon" width="12" height="12" viewBox="0 0 10 10" style="transform:rotate(90deg)"><path d="M3 1l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>' +
        (icon || '') + ' <span>' + title + '</span></div><div class="wrpt-collapse-body">';
}
function _wrptColEnd() { return '</div></div>'; }

/* ── Score gauge ── */
function _wrptScoreGauge(label, score, sublabel, options) {
    options = options || {};
    var displayValue = Number(options.displayValue !== undefined ? options.displayValue : (score || 0));
    var displayDecimals = options.displayDecimals !== undefined ? options.displayDecimals : 1;
    var pct = Number(options.visualPct !== undefined ? options.visualPct : (score || 0));
    if (!isFinite(displayValue)) displayValue = 0;
    if (!isFinite(pct)) pct = 0;
    var s = displayValue.toFixed(displayDecimals);
    pct = Math.min(100, Math.max(0, pct));
    var cls = options.gaugeClass || (pct >= 75 ? 'good' : (pct >= 50 ? 'warn' : 'bad'));
    return '<div class="wrpt-score-gauge"><div class="wrpt-gauge-ring ' + cls + '">' +
        '<svg viewBox="0 0 36 36"><path class="wrpt-gauge-bg" d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke="#eee" stroke-width="3"/>' +
        '<path class="wrpt-gauge-fill" d="M18 2.0845a15.9155 15.9155 0 0 1 0 31.831a15.9155 15.9155 0 0 1 0-31.831" fill="none" stroke-width="3" stroke-dasharray="' + pct + ', 100"/></svg>' +
        '<span class="wrpt-gauge-val">' + s + '</span></div>' +
        '<div class="wrpt-gauge-label">' + label + '</div>' +
        (sublabel ? '<div class="wrpt-gauge-sub">' + sublabel + '</div>' : '') + '</div>';
}

/* ── Summary card ── */
function _wrptSummaryCard(iconHtml, title, value, cls) {
    return '<div class="wrpt-summary-card"><div class="wrpt-summary-icon">' + iconHtml + '</div>' +
        '<div class="wrpt-summary-body"><div class="wrpt-summary-title">' + title + '</div>' +
        '<div class="wrpt-summary-val ' + (cls || '') + '">' + value + '</div></div></div>';
}

/* ── Image gallery ── */
function _wrptGallery(imgs, defs) {
    var hasAny = false;
    for (var i = 0; i < defs.length; i++) { if (imgs[defs[i].key]) { hasAny = true; break; } }
    if (!hasAny) return '';
    var h = '<div class="wrpt-gallery">';
    for (var i = 0; i < defs.length; i++) {
        var d = defs[i], url = imgs[d.key];
        if (!url) continue;
        h += '<div class="wrpt-gallery-item">';
        h += '<div class="wrpt-gallery-title">' + d.title + '</div>';
        h += '<img class="wrpt-img-thumb" src="' + url + '" alt="' + d.title + '" loading="lazy">';
        h += '<div class="wrpt-gallery-caption">' + d.caption + '</div>';
        h += '</div>';
    }
    h += '</div>';
    return h;
}

/* ── Lightbox ── */
function _wrptLightbox(src, alt) {
    var existing = document.getElementById('wrptLightbox');
    if (existing) existing.remove();
    var lb = document.createElement('div');
    lb.id = 'wrptLightbox';
    lb.className = 'wrpt-lightbox';
    lb.innerHTML = '<div class="wrpt-lb-backdrop"></div><div class="wrpt-lb-content"><div class="wrpt-lb-close">&times;</div><img src="' + src + '" alt="' + (alt || '') + '">' + (alt ? '<div class="wrpt-lb-label">' + alt + '</div>' : '') + '</div>';
    document.body.appendChild(lb);
    lb.querySelector('.wrpt-lb-backdrop').addEventListener('click', function() { lb.remove(); });
    lb.querySelector('.wrpt-lb-close').addEventListener('click', function() { lb.remove(); });
    document.addEventListener('keydown', function onEsc(e) { if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', onEsc); } });
}

/* ── SVG icons ── */
function _wrptIcon(type) {
    if (type === 'color') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 8v8M8 12h8"/></svg>';
    if (type === 'pattern') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 3v18"/></svg>';
    if (type === 'summary') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>';
    if (type === 'texture') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 3l18 18"/><path d="M21 3L3 21"/></svg>';
    return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>';
}
function _wrptSvg(type) {
    if (type === 'bar') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>';
    if (type === 'grid') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>';
    if (type === 'clock') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>';
    if (type === 'pulse') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>';
    if (type === 'file') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';
    if (type === 'eye') return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
    return '';
}

// Custom Modals (Alerts & Confirms)

function showCustomAlert(title, message, type, callback) {
    type = type || 'info'; // info, success, warning, error

    var overlay = document.getElementById('customModalOverlay');
    var iconEl = document.getElementById('customModalIcon');
    var titleEl = document.getElementById('customModalTitle');
    var bodyEl = document.getElementById('customModalBody');
    var footerEl = document.getElementById('customModalFooter');

    if (!overlay) {
        alert(message); // Fallback
        if (callback) callback();
        return;
    }

    // Set Icon
    iconEl.className = 'custom-modal-icon ' + type;
    var iconSvg = '';
    if (type === 'success') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    else if (type === 'error') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    else if (type === 'warning') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    else iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    iconEl.innerHTML = iconSvg;

    // Set Content
    titleEl.textContent = title;
    bodyEl.innerHTML = message; // Allow HTML in message

    // Set Footer (Single OK Button)
    footerEl.innerHTML = '';
    var btnOk = document.createElement('button');
    btnOk.className = 'custom-modal-btn primary';
    btnOk.textContent = 'OK';
    btnOk.onclick = function () {
        closeCustomModal();
        if (callback) callback();
    };
    footerEl.appendChild(btnOk);

    // Show
    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden'; // Prevent scrolling
    btnOk.focus();
}

function showCustomConfirm(title, message, type, confirmText, cancelText, onConfirm) {
    type = type || 'warning';

    var overlay = document.getElementById('customModalOverlay');
    var iconEl = document.getElementById('customModalIcon');
    var titleEl = document.getElementById('customModalTitle');
    var bodyEl = document.getElementById('customModalBody');
    var footerEl = document.getElementById('customModalFooter');

    if (!overlay) {
        if (confirm(message)) {
            if (onConfirm) onConfirm();
        }
        return;
    }

    // Set Icon (same logic as alert)
    iconEl.className = 'custom-modal-icon ' + type;
    var iconSvg = '';
    if (type === 'success') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    else if (type === 'error') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>';
    else if (type === 'warning') iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>';
    else iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';

    iconEl.innerHTML = iconSvg;

    titleEl.textContent = title;
    bodyEl.innerHTML = message;

    footerEl.innerHTML = '';

    // Cancel Button
    var btnCancel = document.createElement('button');
    btnCancel.className = 'custom-modal-btn secondary';
    btnCancel.textContent = cancelText || 'Cancel';
    btnCancel.onclick = function () {
        closeCustomModal();
    };
    footerEl.appendChild(btnCancel);

    // Confirm Button
    var btnConfirm = document.createElement('button');
    btnConfirm.className = 'custom-modal-btn ' + (type === 'error' ? 'danger' : 'primary');
    btnConfirm.textContent = confirmText || 'Confirm';
    btnConfirm.onclick = function () {
        closeCustomModal();
        if (onConfirm) onConfirm();
    };
    footerEl.appendChild(btnConfirm);

    overlay.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    btnConfirm.focus(); // Focus confirm for safety
    if (type === 'error' || type === 'warning') btnCancel.focus();
    else btnConfirm.focus();
}

function closeCustomModal() {
    var overlay = document.getElementById('customModalOverlay');
    if (overlay) overlay.style.display = 'none';
    document.body.style.overflow = '';

    // Cleanup icon classes to avoid style bleeding
    var iconEl = document.getElementById('customModalIcon');
    if (iconEl) iconEl.className = 'custom-modal-icon';
}

// Delete Images
function deleteImages() {
    showCustomConfirm(
        I18n.t('delete.images') || 'Delete Images',
        I18n.t('delete.confirm') || 'Are you sure you want to delete all uploaded images?',
        'error',
        I18n.t('delete') || 'Delete',
        I18n.t('cancel') || 'Cancel',
        function () {
            // Confirm Logic
            AppState.sessionId = null;
            AppState.refFile = null;
            AppState.testFile = null;
            AppState.sampleFile = null;
            AppState.pdfFilename = null;
            AppState.settingsPdfFilename = null;

            ['ref', 'test'].forEach(function (type) {
                var preview = document.getElementById(type + 'Preview');
                var placeholder = document.getElementById(type + 'Placeholder');
                var infoEmpty = document.getElementById(type + 'InfoEmpty');
                var infoName = document.getElementById(type + 'InfoName');
                var infoDimensions = document.getElementById(type + 'Info');
                var input = document.getElementById(type + 'Input');

                if (preview) preview.style.display = 'none';
                if (placeholder) placeholder.style.display = 'flex';
                if (infoEmpty) infoEmpty.style.display = '';
                if (infoName) infoName.textContent = '';
                if (infoDimensions) infoDimensions.style.display = 'none';
                if (input) input.value = '';
            });

            // Clear results
            document.getElementById('resultsSection').style.display = 'none';
            document.getElementById('btnDownload').disabled = true;
            document.getElementById('btnDownloadDropdown').disabled = true;

            // Clear points
            if (typeof clearAllPoints === 'function') {
                clearAllPoints();
            }
            if (typeof clearManualPoints === 'function') {
                clearManualPoints();
            }

            updateButtonStates();

        }
    );
}

// Delete Single Image
function deleteImage(type) {
    var prefix = type === 'reference' ? 'ref' : 'test';
    var imageLabel = type === 'reference' ? (I18n.t('reference.image') || 'Reference Image') : (I18n.t('sample.image') || 'Sample Image');
    
    showCustomConfirm(
        I18n.t('delete.image') || 'Delete Image',
        (I18n.t('delete.image.confirm') || 'Are you sure you want to delete the {image}?').replace('{image}', imageLabel),
        'error',
        I18n.t('delete') || 'Delete',
        I18n.t('cancel') || 'Cancel',
        function () {
            // Clear the specific image
            if (type === 'reference') {
                AppState.refFile = null;
            } else {
                AppState.testFile = null;
                AppState.sampleFile = null;
            }

            var preview = document.getElementById(prefix + 'Preview');
            var placeholder = document.getElementById(prefix + 'Placeholder');
            var infoEmpty = document.getElementById(prefix + 'InfoEmpty');
            var infoName = document.getElementById(prefix + 'InfoName');
            var infoDimensions = document.getElementById(prefix + 'Info');
            var input = document.getElementById(prefix + 'Input');
            var btnDelete = document.getElementById('btnDelete' + (prefix === 'ref' ? 'Ref' : 'Test'));
            var btnReplace = document.getElementById('btnReplace' + (prefix === 'ref' ? 'Ref' : 'Test'));

            if (preview) preview.style.display = 'none';
            if (placeholder) placeholder.style.display = 'flex';
            if (infoEmpty) infoEmpty.style.display = '';
            if (infoName) infoName.textContent = '';
            if (infoDimensions) infoDimensions.style.display = 'none';
            if (input) input.value = '';
            if (btnDelete) btnDelete.style.display = 'none';
            if (btnReplace) btnReplace.style.display = 'none';

            // Clear results if both images are deleted
            if (!AppState.refFile && !AppState.testFile) {
                document.getElementById('resultsSection').style.display = 'none';
                document.getElementById('btnDownload').disabled = true;
                document.getElementById('btnDownloadDropdown').disabled = true;
            }

            // Clear points
            if (typeof clearAllPoints === 'function') {
                clearAllPoints();
            }
            if (typeof clearManualPoints === 'function') {
                clearManualPoints();
            }

            // Reset region selector
            if (typeof RegionSelector !== 'undefined') {
                RegionSelector.reset();
            }

            updateButtonStates();
        }
    );
}

// Replace Single Image
function replaceImage(type) {
    var inputId = type === 'reference' ? 'refInput' : 'testInput';
    var input = document.getElementById(inputId);
    if (input) {
        input.click();
    }
}

var resultsSection = document.getElementById('resultsSection');
if (resultsSection) resultsSection.style.display = 'none';

['colorScore', 'patternScore', 'overallScore'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.textContent = '--';
});

['colorBar', 'patternBar', 'overallBar'].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.style.width = '0%';
});

var btnDownload = document.getElementById('btnDownload');
if (btnDownload) btnDownload.disabled = true;

// Reset region selector
if (typeof RegionSelector !== 'undefined') {
    RegionSelector.reset();
}


updateButtonStates();


// Downloads
function downloadReport() {
    if (AppState.pdfUrl) {
        var fn = AppState.fnFull || 'SpectraMatch_Report.pdf';
        var a = document.createElement('a');
        a.href = AppState.pdfUrl + '?fn=' + encodeURIComponent(fn);
        a.download = fn;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else if (AppState.sessionId && AppState.pdfFilename) {
        window.open('/api/download/' + AppState.sessionId + '/' + AppState.pdfFilename, '_blank');
    }
}

function downloadSettings() {
    // Check if receipt is available from analysis
    if (AppState.receiptUrl) {
        var fn = AppState.fnReceipt || 'Configuration_Receipt.pdf';
        var a = document.createElement('a');
        a.href = AppState.receiptUrl + '?fn=' + encodeURIComponent(fn);
        a.download = fn;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } else {
        // Warning if analysis not run
        showCustomAlert(I18n.t('warning') || 'Warning', I18n.t('please.run.analysis.first') || 'Please run analysis first to generate the receipt.', 'warning');
    }
}

// Datasheet Functions
function downloadDatasheet(type) {
    var filename = type === 'en' ? 'Datasheet_EN.pdf' : 'Datasheet_TR.pdf';
    var url = '/static/DataSheets/' + filename;
    
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // Close dropdown
    var menu = document.getElementById('datasheetDropdown');
    if (menu) { menu.classList.remove('show'); menu.classList.remove('active'); }
}

function openDatasheetModal(datasheetType) {
    var modal = document.getElementById('datasheetModal');
    if (modal) {
        // Store the datasheet type for download buttons
        modal.setAttribute('data-datasheet-type', datasheetType);
        
        modal.style.display = 'flex';
    }
    
    // Close dropdown
    var menu = document.getElementById('datasheetDropdown');
    if (menu) { menu.classList.remove('show'); menu.classList.remove('active'); }
}

function closeDatasheetModal() {
    var modal = document.getElementById('datasheetModal');
    if (modal) modal.style.display = 'none';
}

// Modal
// Track if modal event listeners are already initialized to prevent duplicates
var modalEventListenersInitialized = false;

function initModal() {
    // Prevent duplicate event listener attachment
    if (modalEventListenersInitialized) return;
    modalEventListenersInitialized = true;

    var closeBtn = document.getElementById('closeModal');
    var saveBtn = document.getElementById('btnSaveSettings');
    var resetBtn = document.getElementById('btnResetSettings');
    var overlay = document.getElementById('settingsModal');

    // Close button (X)
    if (closeBtn) closeBtn.addEventListener('click', function () {
        closeModal();
    });

    // Click outside modal to close
    if (overlay) {
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) closeModal();
        });
    }

    // Escape key to close modal - only if modal is actually visible
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
            var modal = document.getElementById('settingsModal');
            if (modal && modal.style.display === 'flex') {
                closeModal();
            }
        }
    });
}

function openModal() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Sync modal region controls with current state
    if (typeof updateModalRegionControls === 'function') {
        updateModalRegionControls();
    }
}

// Comprehensive modal close with complete cleanup
function closeModal() {
    var modal = document.getElementById('settingsModal');
    if (modal) modal.style.display = 'none';

    // CRITICAL: Multi-layer scroll restoration
    document.body.style.overflow = '';
    document.body.style.removeProperty('overflow');
    document.documentElement.style.overflow = '';
    document.documentElement.style.removeProperty('overflow');

    // Force browser reflow to ensure changes are applied
    void document.body.offsetHeight;

    // Re-enable all interactions
    document.body.style.pointerEvents = '';
    document.body.style.userSelect = '';

    // Reinitialize overlays to ensure they work correctly
    setTimeout(function () {
        if (typeof initOverlayTracking === 'function') {
            initOverlayTracking();
        }
        // Refresh RegionSelector if it exists
        if (typeof RegionSelector !== 'undefined' && RegionSelector.refreshDimensions) {
            RegionSelector.refreshDimensions();
        }
    }, 100);
}

// Save Settings function (called from HTML onclick)
function saveSettings() {
    // Collect all settings from the modal
    AppState.settings = collectSettings();

    // Save timezone offset to localStorage
    var timezoneOffset = document.getElementById('timezone_offset');
    if (timezoneOffset) {
        localStorage.setItem('textile_qc_timezone_offset', timezoneOffset.value);
    }

    // Sync modal dimensions back to main page
    if (typeof syncModalToMainPage === 'function') {
        syncModalToMainPage();
    }

    // Close modal with full cleanup
    closeModal();

}

// Reset Settings function (called from HTML onclick)
function resetSettings() {
    // Load default settings
    if (typeof loadDefaultSettings === 'function') {
        loadDefaultSettings();
    }
    // Don't close modal - let user review defaults before saving
}


// SPACTRA Studio (v3.0.0)

// ─────────────────────────────────────────────────────────────────────
// Auto-apply alignment to workspace when the technique dropdown changes.
// Calls /api/alignment/preview with the current images + region, then
// swaps the displayed ref/sample previews so points can be placed on
// the aligned result. Switching back to "direct" restores originals.
// ─────────────────────────────────────────────────────────────────────
var _alignmentAutoApply = {
    inFlight: null,
    lastMode: null,
};

function _getWorkspaceImageEls() {
    return {
        ref: document.getElementById('refPreview') || document.getElementById('ref_image_preview'),
        sample: document.getElementById('testPreview')
                || document.getElementById('samplePreview')
                || document.getElementById('sample_image_preview'),
    };
}

function _restoreOriginalPreviews() {
    var els = _getWorkspaceImageEls();
    function _setFromFile(el, file) {
        if (!el || !file) return;
        var r = new FileReader();
        r.onload = function (e) { el.src = e.target.result; el.style.display = ''; };
        r.readAsDataURL(file);
    }
    _setFromFile(els.ref, AppState.refFile);
    _setFromFile(els.sample, AppState.testFile || AppState.sampleFile);
}

function applyAlignmentToWorkspace(mode) {
    mode = mode || 'direct';
    if (_alignmentAutoApply.lastMode === mode && mode === 'direct') return;
    _alignmentAutoApply.lastMode = mode;

    if (mode === 'direct') {
        _restoreOriginalPreviews();
        return;
    }

    var refFile = AppState.refFile;
    var sampleFile = AppState.testFile || AppState.sampleFile;
    if (!refFile || !sampleFile) return; // need both

    // Build region data — same logic as openAlignmentStudio
    var regionData = null;
    if (typeof RegionSelector !== 'undefined' &&
        typeof RegionSelector.isPlaced === 'function' && RegionSelector.isPlaced() &&
        !AppState.processFullImage) {
        var cs = RegionSelector.getCropSettings();
        if (cs && cs.use_crop) {
            regionData = {
                type: cs.crop_shape === 'circle' ? 'circle' : 'rect',
                x: cs.crop_x, y: cs.crop_y,
                width: cs.crop_width, height: cs.crop_height,
                use_crop: true
            };
        }
    }

    var fd = new FormData();
    fd.append('mode', mode);
    fd.append('ref_image', refFile, refFile.name || 'ref.png');
    fd.append('sample_image', sampleFile, sampleFile.name || 'sample.png');
    fd.append('region_data', JSON.stringify(regionData || {}));

    if (_alignmentAutoApply.inFlight) {
        try { _alignmentAutoApply.inFlight.abort(); } catch (e) {}
    }
    var ctrl = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    _alignmentAutoApply.inFlight = ctrl;

    fetch('/api/alignment/preview', {
        method: 'POST',
        body: fd,
        signal: ctrl ? ctrl.signal : undefined,
    })
    .then(function (r) { return r.json(); })
    .then(function (data) {
        _alignmentAutoApply.inFlight = null;
        if (!data || !data.success || !data.previews) return;
        var els = _getWorkspaceImageEls();
        var p = data.previews;
        var newRefSrc = p.ref_cropped
            ? 'data:image/png;base64,' + p.ref_cropped
            : (p.ref_source ? 'data:image/png;base64,' + p.ref_source : null);
        var alignedSrc = p.aligned ? 'data:image/png;base64,' + p.aligned : null;
        if (els.ref && newRefSrc) { els.ref.src = newRefSrc; els.ref.style.display = ''; }
        if (els.sample && alignedSrc) { els.sample.src = alignedSrc; els.sample.style.display = ''; }
    })
    .catch(function () { _alignmentAutoApply.inFlight = null; });
}

function initAlignmentAutoApply() {
    var sel = document.getElementById('alignment_mode');
    if (!sel || sel.dataset.autoApplyBound === '1') return;
    sel.dataset.autoApplyBound = '1';
    sel.addEventListener('change', function () {
        applyAlignmentToWorkspace(this.value);
    });
}
document.addEventListener('DOMContentLoaded', initAlignmentAutoApply);

function openAlignmentStudio() {
    if (typeof AlignmentStudio === 'undefined') {
        console.error('AlignmentStudio module not loaded');
        return;
    }

    // Validate images before opening — mirrors desktop behaviour
    var isSingle = !!(AppState && AppState.analyzeSingleImage);
    var hasRef = !!(AppState && AppState.refFile);
    var hasSample = !!(AppState && (AppState.testFile || AppState.sampleFile));
    if (isSingle ? !hasSample : (!hasRef || !hasSample)) {
        var titleKey = (typeof I18n !== 'undefined') ? (I18n.t('align.images.required.title') || 'Images Required') : 'Images Required';
        var msgKey   = (typeof I18n !== 'undefined') ? (I18n.t('align.images.required.msg')   || I18n.t('align.no.images') || 'Please upload both images first') : 'Please upload both images first';
        showCustomAlert(titleKey, msgKey, 'warning');
        return;
    }

    // Get image sources from the current page
    var refImg = document.getElementById('refPreview') || document.getElementById('ref_image_preview');
    var sampleImg = document.getElementById('testPreview') || document.getElementById('samplePreview') || document.getElementById('sample_image_preview');

    var refSrc = null;
    var sampleSrc = null;
    var refFile = null;
    var sampleFile = null;

    if (refImg && refImg.src && refImg.style.display !== 'none') {
        refSrc = refImg.src;
    }
    if (sampleImg && sampleImg.src && sampleImg.style.display !== 'none') {
        sampleSrc = sampleImg.src;
    }

    // Try to get file objects from AppState
    if (typeof AppState !== 'undefined') {
        refFile = AppState.refFile || null;
        sampleFile = AppState.sampleFile || AppState.testFile || null;
    }

    // Fallback: create object URLs from file objects when img src is unavailable
    if (!refSrc && refFile) {
        try { refSrc = URL.createObjectURL(refFile); } catch (e) {}
    }
    if (!sampleSrc && sampleFile) {
        try { sampleSrc = URL.createObjectURL(sampleFile); } catch (e) {}
    }

    // Build region data — mirrors executeSequentialSteps() logic
    var regionData = null;
    if (typeof RegionSelector !== 'undefined' &&
        typeof RegionSelector.isPlaced === 'function' && RegionSelector.isPlaced() &&
        !AppState.processFullImage) {
        var cropSettings = RegionSelector.getCropSettings();
        if (cropSettings && cropSettings.use_crop) {
            regionData = {
                type: cropSettings.crop_shape === 'circle' ? 'circle' : 'rect',
                x: cropSettings.crop_x,
                y: cropSettings.crop_y,
                width: cropSettings.crop_width,
                height: cropSettings.crop_height,
                use_crop: true
            };
        }
    }

    AlignmentStudio.open({
        refSrc: refSrc,
        sampleSrc: sampleSrc,
        refFile: refFile,
        sampleFile: sampleFile,
        regionData: regionData,
        isDesktop: false,
        onApply: function (applyData) {
            var techId = applyData.techId;
            var previews = applyData.previews;
            if (!previews || techId === 'direct') return;

            var alignedSrc = previews.aligned
                ? 'data:image/png;base64,' + previews.aligned : null;
            var newRefSrc = previews.ref_cropped
                ? 'data:image/png;base64,' + previews.ref_cropped
                : (previews.ref_source
                    ? 'data:image/png;base64,' + previews.ref_source : null);

            var refImgEl = document.getElementById('refPreview') ||
                           document.getElementById('ref_image_preview');
            var samImgEl = document.getElementById('testPreview') ||
                           document.getElementById('samplePreview') ||
                           document.getElementById('sample_image_preview');

            if (refImgEl && newRefSrc) {
                refImgEl.src = newRefSrc;
                refImgEl.style.display = '';
            }
            if (samImgEl && alignedSrc) {
                samImgEl.src = alignedSrc;
                samImgEl.style.display = '';
            }
        },
    });
}

// Report Language Selector


function loadDefaultSettings() {
    // Load timezone from localStorage if available
    var savedTimezone = localStorage.getItem('textile_qc_timezone_offset');
    var timezoneSelect = document.getElementById('timezone_offset');
    if (timezoneSelect && savedTimezone !== null) {
        timezoneSelect.value = savedTimezone;
    } else if (timezoneSelect && savedTimezone === null) {
        // Set default to UTC+3 only if no saved value exists
        timezoneSelect.value = '3';
    }
    
    // defaults are set in HTML or via resetSettings
    // We can just ensure AppState is synced with current inputs
    AppState.settings = collectSettings();
}

// Settings
function collectSettings() {
    // Get sampling mode
    // If not explicitly tracked in AppState, infer or default to 'random'
    // BUT we must adhere to what the Point Selector decided.
    var samplingMode = AppState.samplingMode || 'random';

    var isSingleMode = !!AppState.analyzeSingleImage;

    function getSingleSection(key, def) {
        var el = document.getElementById('sec_single_' + key);
        if (el) return el.checked;
        return def;
    }

    return {
        // General Settings
        operator: getVal('operator_name', 'Operator'),
        timezone_offset: getNum('timezone_offset', 3),
        report_lang: localStorage.getItem('textile_qc_report_lang') || 'tr',
        alignment_mode: getVal('alignment_mode', 'direct'),

        // Analysis Unit Toggles
        enable_color_unit: true,
        enable_pattern_unit: true,
        enable_pattern_repetition: false,

        // Color Unit Tab Inputs
        color_scoring_method: getVal('color_scoring_method', 'delta_e'),
        color_threshold_pass: getNum('color_pass_thresh', 2.0),
        color_threshold_conditional: getNum('color_cond_thresh', 5.0),
        global_threshold_de: getNum('color_global_thresh', 5.0),
        csi_good: getNum('csi_good_thresh', 2.0),
        csi_warn: getNum('csi_warn_thresh', 5.0),
        region_count: isSingleMode ? getNum('single_region_count', 5) : getNum('region_count', 5),

        // Illuminant Settings
        primary_illuminant: getVal('primary_illuminant', 'D65'),
        test_illuminants: isSingleMode ? [getVal('primary_illuminant', 'D65')] : getMultiCheck('test_illuminant'),

        // Pattern Unit Tab Inputs
        pattern_scoring_method: getVal('pattern_scoring_method', 'all'),
        ssim_pass: getNum('ssim_pass', 0.85),
        ssim_cond: getNum('ssim_cond', 0.70),
        grad_pass: getNum('grad_pass', 85.0),
        grad_cond: getNum('grad_cond', 70.0),

        phase_pass: getNum('phase_pass', 85.0),
        phase_cond: getNum('phase_cond', 70.0),
        structural_pass: getNum('structural_pass', 85.0),
        structural_cond: getNum('structural_cond', 70.0),
        global_pattern_threshold: getNum('pattern_global_thresh', 75.0),

        // Diff-map sensitivity (G_e, F_e) and boundary extraction sensitivity (G'_e, F'_e)
        gradient_diff_sensitivity:     getNum('grad_diff_sens', 7),
        phase_diff_sensitivity:        getNum('phase_diff_sens', 7),
        gradient_boundary_sensitivity: getNum('grad_bound_sens', 4),
        phase_boundary_sensitivity:    getNum('phase_bound_sens', 8),
        structural_sensitivity:        getNum('structural_sens', 10),

        // Sections - Color
        section_color_spaces: getCheck('sec_color_spaces', true),
        section_rgb: getCheck('sec_rgb', true),
        section_lab: getCheck('sec_lab', true),
        section_xyz: getCheck('sec_xyz', true),
        section_cmyk: getCheck('sec_cmyk', true),
        section_diff_metrics: getCheck('sec_diff_metrics', true),
        section_stats: getCheck('sec_stats', true),
        section_detailed_lab: getCheck('sec_detailed_lab', true),
        section_visualizations: getCheck('sec_visualizations', true),
        section_spectral: getCheck('sec_spectral', true),
        section_visual_diff: getCheck('sec_visual_diff', true),

        // Sections - Pattern
        enable_ssim: getCheck('enable_ssim', true),
        enable_gradient: getCheck('enable_gradient', true),

        enable_phase: getCheck('enable_phase', true),

        enable_grad_bound: getCheck('enable_grad_bound', true),
        enable_phase_bound: getCheck('enable_phase_bound', true),
        enable_summary: getCheck('enable_summary', true),
        enable_concl: getCheck('enable_concl', true),
        enable_rec: getCheck('enable_rec', true),

        // Legacy / Standard options required by backend structure
        thresholds: {
            'pass': getNum('color_pass_thresh', 2.0),
            'conditional': getNum('color_cond_thresh', 5.0),
            'Structural SSIM': { 'pass': getNum('ssim_pass', 0.85), 'conditional': getNum('ssim_cond', 0.70) },
            'Gradient Similarity': { 'pass': getNum('grad_pass', 85.0), 'conditional': getNum('grad_cond', 70.0) },

            'Phase Correlation': { 'pass': getNum('phase_pass', 85.0), 'conditional': getNum('phase_cond', 70.0) },
            'Structural Match': { 'pass': getNum('structural_pass', 85.0), 'conditional': getNum('structural_cond', 70.0) }
        },
        csi_thresholds: {
            'good': getNum('csi_good_thresh', 2.0),
            'warn': getNum('csi_warn_thresh', 5.0)
        },
        global_threshold: getNum('pattern_global_thresh', 75.0), // Pattern global

        sections: {
            // Map simplified keys to what backends expect
            'color_spaces': isSingleMode ? getSingleSection('color_spaces', true) : getCheck('sec_color_spaces', true),
            'rgb': isSingleMode ? getSingleSection('rgb', true) : getCheck('sec_rgb', true),
            'lab': isSingleMode ? getSingleSection('lab', true) : getCheck('sec_lab', true),
            'xyz': isSingleMode ? getSingleSection('xyz', true) : getCheck('sec_xyz', true),
            'cmyk': isSingleMode ? getSingleSection('cmyk', true) : getCheck('sec_cmyk', true),
            'diff_metrics': isSingleMode ? getSingleSection('diff_metrics', true) : getCheck('sec_diff_metrics', true),
            'stats': isSingleMode ? getSingleSection('stats', true) : getCheck('sec_stats', true),
            'detailed_lab': isSingleMode ? getSingleSection('detailed_lab', true) : getCheck('sec_detailed_lab', true),
            'visualizations': isSingleMode ? getSingleSection('visualizations', true) : getCheck('sec_visualizations', true),
            'spectral': isSingleMode ? getSingleSection('spectral', true) : getCheck('sec_spectral', true),
            'histograms': isSingleMode ? getSingleSection('histograms', true) : getCheck('sec_histograms', true),
            'visual_diff': isSingleMode ? getSingleSection('visual_diff', true) : getCheck('sec_visual_diff', true),
            'csi_under_heatmap': getCheck('sec_csi_heatmap', false),
            // Sections - Legacy mappings
            'illuminant_analysis': isSingleMode ? false : getCheck('sec_illuminant_analysis', true),
            'recommendations_color': isSingleMode ? getSingleSection('recommendations_color', true) : getCheck('sec_recommendations', true),
            'exec_summary': isSingleMode ? getSingleSection('exec_summary', true) : getCheck('sec_exec_summary', true),
            'visual_comparison': isSingleMode ? getSingleSection('visual_comparison', true) : getCheck('sec_visual_comparison', true),

            'ssim': getCheck('enable_ssim', true),
            'gradient': getCheck('enable_gradient', true),
            'phase': getCheck('enable_phase', true),
            'structural': getCheck('enable_structural', true),
            'fourier': isSingleMode ? getSingleSection('fourier', true) : getCheck('enable_fourier', true),
            'glcm': getCheck('enable_glcm', true),
            'gradient_boundary': getCheck('enable_grad_bound', true),
            'phase_boundary': getCheck('enable_phase_bound', true),
            'summary': getCheck('enable_summary', true),
            'conclusion': getCheck('enable_concl', true),
            'recommendations_pattern': getCheck('enable_rec', true),
        },

        // Dynamic Sampling Data
        sampling_points: AppState.analyzeSingleImage
            ? (AppState.manualSamplePointsSingle || [])
            : (AppState.manualSamplePointsColor || []),

        sampling_mode: AppState.analyzeSingleImage
            ? (AppState.singleSamplingMode || 'random')
            : (AppState.colorSamplingMode || 'random'),

        lab_thresholds: {
            dl: getNum('lab_thresh_dl', 1.0),
            da: getNum('lab_thresh_da', 1.0),
            db: getNum('lab_thresh_db', 1.0),
            magnitude: getNum('lab_thresh_mag', 2.0)
        }
    };
}

function getNum(id, def) { var el = document.getElementById(id); if (!el) return def; var v = parseFloat(el.value); return isNaN(v) ? def : v; }
function getCheck(id, def) { var el = document.getElementById(id); return el ? el.checked : def; }
function getVal(id, def) { var el = document.getElementById(id); return el ? el.value : def; }
function getMultiCheck(name) { var values = []; document.querySelectorAll('input[name="' + name + '"]:checked').forEach(function (el) { values.push(el.value); }); return values; }


function completeRandomly(mode) {
    if (mode) PointSelectorState.mode = mode;

    var isSingle = PointSelectorState.mode === 'single';
    
    // Precondition checks - ensure required images are uploaded
    if (isSingle) {
        if (!AppState.testFile) {
            showCustomAlert(
                I18n.t('error') || 'Error',
                I18n.t('upload.sample.first') || 'Please upload a sample image before generating points.',
                'error'
            );
            return;
        }
    } else {
        if (!AppState.refFile || !AppState.testFile) {
            showCustomAlert(
                I18n.t('error') || 'Error',
                I18n.t('upload.both.images') || 'Please upload both reference and sample images before generating points.',
                'error'
            );
            return;
        }
    }
    
    var countId = isSingle ? 'single_region_count' : 'region_count';

    var total = parseInt(document.getElementById(countId).value) || 5;
    var currentCount = PointSelectorState.points.length;
    var needed = total - currentCount;

    if (needed > 0) {
        generateRandomPoints(needed);
        updateSamplingProgress();
        if (PointSelectorState.isOpen) {
            drawPointsOnCanvas('ref');
            drawPointsOnCanvas('sample');
        }
    } else {
        showCustomAlert(
            I18n.t('info') || 'Info',
            I18n.t('all.points.already.selected') || 'All points are already selected.',
            'info'
        );
    }
}

function openPointSelector(mode) {
    mode = mode || 'color';
    PointSelectorState.mode = mode;
    var isSingle = mode === 'single';

    // Precondition checks - ensure required images are uploaded
    if (isSingle) {
        if (!AppState.testFile) {
            showCustomAlert(
                I18n.t('error') || 'Error',
                I18n.t('upload.sample.first') || 'Please upload a sample image before selecting points.',
                'error'
            );
            return;
        }
    } else {
        if (!AppState.refFile || !AppState.testFile) {
            showCustomAlert(
                I18n.t('error') || 'Error',
                I18n.t('upload.both.images') || 'Please upload both reference and sample images before selecting points.',
                'error'
            );
            return;
        }
    }

    var modal = document.getElementById('pointSelectorModal');
    if (!modal) return;

    PointSelectorState.isOpen = true;

    // UI Adjustments for Single Mode
    var refPanel = modal.querySelector('.point-selector-image-panel:first-child');
    if (refPanel) {
        refPanel.style.display = isSingle ? 'none' : 'block';
    }

    updateSamplingProgress();

    // Load images
    loadImagesIntoPointSelector();

    modal.style.display = 'flex';
}

function saveAndClosePointSelector() {
    if (PointSelectorState.points.length > 0) {
        confirmPoints();
    } else {
        closePointSelector();
    }
}

function closePointSelector() {
    var modal = document.getElementById('pointSelectorModal');
    if (modal) {
        modal.style.display = 'none';
    }
    PointSelectorState.isOpen = false;
}

function initSamplingModeSelector() {
    var samplingInputs = document.querySelectorAll('input[name="samplingMode"]');
    if (samplingInputs.length === 0) return;

    samplingInputs.forEach(function (input) {
        input.addEventListener('change', function () {
            if (this.checked) {
                AppState.samplingMode = this.value;
                // Optional: trigger UI updates if needed
                // updateSamplingUI();
            }
        });
    });
}

function initPointSelectorModal() {
    var closeBtn = document.getElementById('closePointSelector');
    if (closeBtn) {
        closeBtn.addEventListener('click', closePointSelector);
    }

    // Close on overlay click (if implemented, but modal structure suggests content takes full space or overlay is separate)
    var modal = document.getElementById('pointSelectorModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closePointSelector();
            }
        });
    }
}

function loadImagesIntoPointSelector() {
    var refImg = document.getElementById('pointSelectorRefImage');
    var sampleImg = document.getElementById('pointSelectorSampleImage');
    var refCanvas = document.getElementById('pointSelectorRefCanvas');
    var sampleCanvas = document.getElementById('pointSelectorSampleCanvas');
    var refContainer = document.getElementById('pointSelectorRefContainer');
    var sampleContainer = document.getElementById('pointSelectorSampleContainer');

    var isSingle = PointSelectorState.mode === 'single';

    // Load reference image (Skip if Single Mode)
    if (!isSingle && AppState.refFile && refImg) {
        var refReader = new FileReader();
        refReader.onload = function (e) {
            refImg.src = e.target.result;
            refImg.onload = function () {
                setupPointSelectorCanvas('ref', refImg, refCanvas, refContainer);
            };
        };
        refReader.readAsDataURL(AppState.refFile);
    }

    // Load sample image
    if (AppState.testFile && sampleImg) {
        var sampleReader = new FileReader();
        sampleReader.onload = function (e) {
            sampleImg.src = e.target.result;
            sampleImg.onload = function () {
                setupPointSelectorCanvas('sample', sampleImg, sampleCanvas, sampleContainer);
            };
        };
        sampleReader.readAsDataURL(AppState.testFile);
    }
}

function setupPointSelectorCanvas(type, img, canvas, container) {
    if (!canvas || !container || !img) return;

    // CRITICAL: Get the ACTUAL rendered size of the image (not container)
    // The image may be scaled down to fit within the container
    var imgRect = img.getBoundingClientRect();
    var containerRect = container.getBoundingClientRect();
    
    // Calculate the actual displayed dimensions of the image
    var displayedWidth = img.offsetWidth;
    var displayedHeight = img.offsetHeight;
    
    // Calculate the image offset within the container (for centering)
    var offsetX = (containerRect.width - displayedWidth) / 2;
    var offsetY = (containerRect.height - displayedHeight) / 2;
    
    // Position canvas to exactly match the image position within the container
    canvas.style.left = offsetX + 'px';
    canvas.style.top = offsetY + 'px';
    canvas.style.width = displayedWidth + 'px';
    canvas.style.height = displayedHeight + 'px';
    
    // Set canvas internal resolution to match displayed size for crisp rendering
    canvas.width = displayedWidth;
    canvas.height = displayedHeight;

    // CRITICAL: Calculate scale factor from displayed size to natural (original) image size
    // This is a UNIFORM scale since the image maintains aspect ratio
    var scaleX = img.naturalWidth / displayedWidth;
    var scaleY = img.naturalHeight / displayedHeight;
    
    // Store image info for coordinate calculations
    var imageInfo = {
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        displayedWidth: displayedWidth,
        displayedHeight: displayedHeight,
        offsetX: offsetX,
        offsetY: offsetY,
        scaleX: scaleX,
        scaleY: scaleY
    };

    if (type === 'ref') {
        PointSelectorState.refCanvas = canvas;
        PointSelectorState.refCtx = canvas.getContext('2d');
        PointSelectorState.refImageInfo = imageInfo;
        PointSelectorState.imageScale = { x: scaleX, y: scaleY };

        // Add click handler to the IMAGE, not container
        img.onclick = function (e) {
            handlePointSelectorClick(e, 'ref', img);
        };
    } else {
        PointSelectorState.sampleCanvas = canvas;
        PointSelectorState.sampleCtx = canvas.getContext('2d');
        PointSelectorState.sampleImageInfo = imageInfo;
        // Update scale for sample (primary for coordinate calculation)
        PointSelectorState.imageScale = { x: scaleX, y: scaleY };

        // Add click handler to the IMAGE, not container
        img.onclick = function (e) {
            handlePointSelectorClick(e, 'sample', img);
        };
    }
    

    // Redraw existing points
    redrawPointMarkers();
    
    // Update region overlays to show dimmed areas outside target region
    if (typeof updateRegionOverlays === 'function') {
        updateRegionOverlays();
    }
}

function handlePointSelectorClick(e, source, imgElement) {
    // CRITICAL: Get click position relative to the IMAGE element, not container
    var img = imgElement || e.currentTarget;
    var imgRect = img.getBoundingClientRect();

    // Click position relative to the displayed image
    var clickX = e.clientX - imgRect.left;
    var clickY = e.clientY - imgRect.top;
    
    // Ensure click is within image bounds
    if (clickX < 0 || clickY < 0 || clickX > imgRect.width || clickY > imgRect.height) {
            return;
    }

    // Get the correct image info based on source
    var imageInfo = (source === 'ref') ? PointSelectorState.refImageInfo : PointSelectorState.sampleImageInfo;
    if (!imageInfo) {
        console.error('Image info not available for', source);
        return;
    }

    // CRITICAL: Convert display coordinates to ACTUAL image pixel coordinates
    // Using the scale factors calculated from natural vs displayed size
    var pixelX = Math.round(clickX * imageInfo.scaleX);
    var pixelY = Math.round(clickY * imageInfo.scaleY);
    
    // Validate pixel coordinates are within image bounds
    pixelX = Math.max(0, Math.min(imageInfo.naturalWidth - 1, pixelX));
    pixelY = Math.max(0, Math.min(imageInfo.naturalHeight - 1, pixelY));

    // STRICT REQUIREMENT: Validate point is within selected analysis region
    if (!isPointInSelectedRegion(pixelX, pixelY, imageInfo.naturalWidth, imageInfo.naturalHeight)) {
        var message = I18n.t('point.outside.region') || 'Point must be inside the selected analysis region. Please click within the highlighted area.';
        showCustomAlert(
            I18n.t('invalid.point') || 'Invalid Point',
            message,
            'warning'
        );
            return;
    }

    // Normalized coordinates (0-1) based on actual image dimensions
    var normalizedX = pixelX / imageInfo.naturalWidth;
    var normalizedY = pixelY / imageInfo.naturalHeight;
    
    // Display coordinates (for drawing on canvas - relative to displayed image)
    var displayX = clickX;
    var displayY = clickY;


    var newPoint = {
        x: normalizedX,
        y: normalizedY,
        pixelX: pixelX,
        pixelY: pixelY,
        displayX: displayX,
        displayY: displayY,
        index: -1,
        isManual: true
    };

    if (PointSelectorState.points.length < PointSelectorState.targetCount) {
        // Add new
        newPoint.index = PointSelectorState.points.length + 1;
        PointSelectorState.points.push(newPoint);
        PointSelectorState.nextReplaceIndex = 0;
    } else {
        // Replace existing (Circular)
        var idx = PointSelectorState.nextReplaceIndex;
        if (typeof idx === 'undefined' || idx >= PointSelectorState.points.length) idx = 0;

        newPoint.index = idx + 1;
        PointSelectorState.points[idx] = newPoint;
        PointSelectorState.nextReplaceIndex = (idx + 1) % PointSelectorState.targetCount;
    }

    // Update UI
    updateSamplingProgress();

    // Redraw
    drawPointsOnCanvas('ref');
    drawPointsOnCanvas('sample');

    updatePointSelectorButtons();

    // Check if we have all points
    if (PointSelectorState.points.length >= PointSelectorState.targetCount) {
        showPointSelectorHint('success', I18n.t('all.points.selected') || 'Target count reached! Settings saved.');
    }
}

function updatePointSelectorROI() {
    var refROI = document.getElementById('pointSelectorRefROI');
    var sampleROI = document.getElementById('pointSelectorSampleROI');

    // Clear existing ROI
    if (refROI) refROI.innerHTML = '';
    if (sampleROI) sampleROI.innerHTML = '';

    // If full image mode or no region selected, no ROI overlay
    if (AppState.processFullImage) return;

    if (typeof RegionSelector !== 'undefined' && RegionSelector.isPlaced()) {
        var cropSettings = RegionSelector.getCropSettings();
        if (!cropSettings.use_crop) return;

        // Show ROI on both images
        showROIOverlay(refROI, cropSettings, 'pointSelectorRefImage');
        showROIOverlay(sampleROI, cropSettings, 'pointSelectorSampleImage');
    }
}

function showROIOverlay(roiElement, cropSettings, imgId) {
    if (!roiElement) return;

    var img = document.getElementById(imgId);
    var container = roiElement.parentElement;
    if (!img || !container) return;

    var containerWidth = container.clientWidth;
    var containerHeight = container.clientHeight;

    var scaleX = containerWidth / img.naturalWidth;
    var scaleY = containerHeight / img.naturalHeight;

    var centerX = cropSettings.crop_center_x * scaleX;
    var centerY = cropSettings.crop_center_y * scaleY;

    // Create clear zone element
    var clearZone = document.createElement('div');
    clearZone.className = 'roi-clear-zone';

    if (cropSettings.crop_shape === 'circle') {
        var diameter = cropSettings.crop_diameter * Math.min(scaleX, scaleY);
        clearZone.classList.add('circle');
        clearZone.style.width = diameter + 'px';
        clearZone.style.height = diameter + 'px';
        clearZone.style.left = (centerX - diameter / 2) + 'px';
        clearZone.style.top = (centerY - diameter / 2) + 'px';
    } else {
        var width = cropSettings.crop_width * scaleX;
        var height = cropSettings.crop_height * scaleY;
        clearZone.style.width = width + 'px';
        clearZone.style.height = height + 'px';
        clearZone.style.left = (centerX - width / 2) + 'px';
        clearZone.style.top = (centerY - height / 2) + 'px';
    }

    roiElement.appendChild(clearZone);
    roiElement.classList.add('has-roi');
}

function updatePointCounter() {
    var current = document.getElementById('pointCountCurrent');
    var total = document.getElementById('pointCountTotal');
    var progress = document.getElementById('pointProgressFill');

    var count = PointSelectorState.points.length;
    var target = PointSelectorState.targetCount;

    if (current) current.textContent = count;
    if (total) total.textContent = target;
    if (progress) progress.style.width = (count / target * 100) + '%';
    
    // Also update the settings panel status bar
    updateSettingsPanelStatus();
}

// Alias for updatePointCounter
function updateSamplingProgress() {
    updatePointCounter();
}

// Update the status bar in the settings panel
function updateSettingsPanelStatus() {
    var isSingle = PointSelectorState.mode === 'single';
    
    // Count manual vs random points
    var manualCount = 0;
    var randomCount = 0;
    PointSelectorState.points.forEach(function(point) {
        if (point.isManual) {
            manualCount++;
        } else {
            randomCount++;
        }
    });
    
    var totalCount = PointSelectorState.points.length;
    var targetCount = PointSelectorState.targetCount;
    
    // Select the appropriate elements based on mode
    var suffix = isSingle ? 'Single' : '';
    var totalSelectedEl = document.getElementById('totalSelectedCount' + suffix);
    var targetDisplayEl = document.getElementById('targetCountDisplay' + suffix);
    var statusTextEl = document.getElementById('samplingStatusText' + suffix);
    var progressGreenEl = document.getElementById('progressGreen' + suffix);
    var progressYellowEl = document.getElementById('progressYellow' + suffix);
    var manualCountEl = document.getElementById('manualCountVal' + suffix);
    var randomCountEl = document.getElementById('randomCountVal' + suffix);
    
    // Update counters
    if (totalSelectedEl) totalSelectedEl.textContent = totalCount;
    if (targetDisplayEl) targetDisplayEl.textContent = targetCount;
    if (manualCountEl) manualCountEl.textContent = manualCount;
    if (randomCountEl) randomCountEl.textContent = randomCount;
    
    // Update status text
    if (statusTextEl) {
        if (totalCount === 0) {
            statusTextEl.textContent = I18n.t('incomplete') || 'Incomplete';
            statusTextEl.className = '';
        } else if (totalCount < targetCount) {
            statusTextEl.textContent = I18n.t('partial') || 'Partial';
            statusTextEl.className = 'status-partial';
        } else {
            statusTextEl.textContent = I18n.t('complete') || 'Complete';
            statusTextEl.className = 'status-complete';
        }
    }
    
    // Update progress bars (green for manual, orange for random)
    if (progressGreenEl && progressYellowEl) {
        var manualPercent = (manualCount / targetCount) * 100;
        var randomPercent = (randomCount / targetCount) * 100;
        progressGreenEl.style.width = manualPercent + '%';
        progressYellowEl.style.width = randomPercent + '%';
    }
}

// Generate random sampling points
function generateRandomPoints(count) {
    if (!count || count <= 0) return;
    
    var isSingle = PointSelectorState.mode === 'single';
    
    // Get the actual image element and its info
    var img = isSingle ? 
        document.getElementById('pointSelectorSampleImage') :
        document.getElementById('pointSelectorRefImage');
    
    var imageInfo = isSingle ? 
        PointSelectorState.sampleImageInfo : 
        PointSelectorState.refImageInfo;
    
    if (!img || !img.naturalWidth || !img.naturalHeight) {
        console.error('Cannot generate random points: image not loaded');
        return;
    }
    
    var imageWidth = img.naturalWidth;
    var imageHeight = img.naturalHeight;
    
    // Get region bounds for smart random generation
    var regionBounds = getRegionBounds(imageWidth, imageHeight);
    
    var generatedCount = 0;
    var maxAttempts = count * 100; // Prevent infinite loop
    var attempts = 0;
    
    while (generatedCount < count && attempts < maxAttempts) {
        attempts++;
        
        var pixelX, pixelY;
        
        if (regionBounds) {
            // Generate within region bounds for efficiency
            if (regionBounds.shape === 'circle') {
                // Generate random point within circle using polar coordinates
                var angle = Math.random() * 2 * Math.PI;
                var radius = Math.sqrt(Math.random()) * regionBounds.radius;
                pixelX = Math.round(regionBounds.centerX + radius * Math.cos(angle));
                pixelY = Math.round(regionBounds.centerY + radius * Math.sin(angle));
            } else {
                // Rectangle or square - generate within bounds
                pixelX = Math.round(regionBounds.minX + Math.random() * (regionBounds.maxX - regionBounds.minX));
                pixelY = Math.round(regionBounds.minY + Math.random() * (regionBounds.maxY - regionBounds.minY));
            }
        } else {
            // No region defined - generate anywhere in image (with margin)
            pixelX = Math.round(imageWidth * (Math.random() * 0.8 + 0.1));
            pixelY = Math.round(imageHeight * (Math.random() * 0.8 + 0.1));
        }
        
        // STRICT VALIDATION: Ensure point is within selected region
        if (!isPointInSelectedRegion(pixelX, pixelY, imageWidth, imageHeight)) {
            continue; // Retry
        }
        
        // Calculate normalized and display coordinates
        var x = pixelX / imageWidth;
        var y = pixelY / imageHeight;
        
        var displayX, displayY;
        if (imageInfo) {
            displayX = pixelX / imageInfo.scaleX;
            displayY = pixelY / imageInfo.scaleY;
        } else {
            displayX = x * (img.offsetWidth || imageWidth);
            displayY = y * (img.offsetHeight || imageHeight);
        }
        
        var newPoint = {
            x: x,
            y: y,
            pixelX: pixelX,
            pixelY: pixelY,
            displayX: displayX,
            displayY: displayY,
            index: PointSelectorState.points.length + 1,
            isManual: false
        };
        
        PointSelectorState.points.push(newPoint);
        generatedCount++;
    }
    
    if (generatedCount < count) {
        } else {
        }
}

// Helper function to get region bounds for efficient random point generation
function getRegionBounds(imageWidth, imageHeight) {
    if (AppState.processFullImage) {
        return null;
    }
    
    if (typeof RegionSelector === 'undefined' || !RegionSelector.isPlaced()) {
        return null;
    }
    
    var cropSettings = RegionSelector.getCropSettings();
    if (!cropSettings || !cropSettings.use_crop) {
        return null;
    }
    
    var shape = cropSettings.crop_shape;
    var centerX = cropSettings.crop_center_x;
    var centerY = cropSettings.crop_center_y;
    
    if (shape === 'circle') {
        var diameter = cropSettings.crop_diameter;
        var radius = diameter / 2;
        return {
            shape: 'circle',
            centerX: centerX,
            centerY: centerY,
            radius: radius
        };
    } else {
        // Rectangle or square
        var width = cropSettings.crop_width;
        var height = cropSettings.crop_height;
        var halfW = width / 2;
        var halfH = height / 2;
        
        return {
            shape: 'rectangle',
            minX: Math.max(0, centerX - halfW),
            maxX: Math.min(imageWidth, centerX + halfW),
            minY: Math.max(0, centerY - halfH),
            maxY: Math.min(imageHeight, centerY + halfH)
        };
    }
}

function redrawPointMarkers() {
    // Legacy function support (now handled by drawPointsOnCanvas called in various places)
    // But we keep it as a wrapper for both
    drawPointsOnCanvas('ref');
    drawPointsOnCanvas('sample');
}

function drawPointsOnCanvas(type) {
    // type = 'ref' or 'sample'
    var canvas = (type === 'ref') ? PointSelectorState.refCanvas : PointSelectorState.sampleCanvas;
    var ctx = (type === 'ref') ? PointSelectorState.refCtx : PointSelectorState.sampleCtx;
    var imageInfo = (type === 'ref') ? PointSelectorState.refImageInfo : PointSelectorState.sampleImageInfo;

    if (!canvas || !ctx) return;

    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw points from State
    PointSelectorState.points.forEach(function (point, i) {
        point.index = i + 1; // Update index to match visual order
        
        // Calculate display position from pixel coordinates using inverse scale
        // This ensures consistency between where point was clicked and where it's drawn
        var displayX, displayY;
        if (point.displayX !== undefined && point.displayY !== undefined) {
            // Use stored display coordinates if available
            displayX = point.displayX;
            displayY = point.displayY;
        } else if (imageInfo) {
            // Calculate from pixel coordinates
            displayX = point.pixelX / imageInfo.scaleX;
            displayY = point.pixelY / imageInfo.scaleY;
        } else {
            // Fallback to normalized coordinates
            displayX = point.x * canvas.width;
            displayY = point.y * canvas.height;
        }
        
        drawPointMarkerAtPosition(ctx, displayX, displayY, point.index, point.isManual);
    });
}

// New function: Draw point at specific display coordinates
function drawPointMarkerAtPosition(ctx, x, y, index, isManual) {
    if (!ctx) return;

    // Color scheme: Green for manual, Orange for random
    var mainColor = isManual ? '#22c55e' : '#f97316';
    var ringColor = isManual ? 'rgba(34, 197, 94, 0.3)' : 'rgba(249, 115, 22, 0.3)';

    // Draw outer glow ring
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.fillStyle = ringColor;
    ctx.fill();

    // Draw main circle
    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.fillStyle = mainColor;
    ctx.fill();
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw number label
    ctx.fillStyle = 'white';
    ctx.font = 'bold 10px Inter, Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index.toString(), x, y);
}

// Legacy function - kept for backward compatibility
function drawPointMarker(ctx, point, canvasWidth, canvasHeight) {
    if (!ctx || !canvasWidth || !canvasHeight) return;

    var x = point.x * canvasWidth;
    var y = point.y * canvasHeight;
    drawPointMarkerAtPosition(ctx, x, y, point.index, point.isManual);
}

function updatePointSelectorButtons() {
    var undoBtn = document.getElementById('btnUndoPoint');
    var confirmBtn = document.getElementById('btnConfirmPoints');

    var hasPoints = PointSelectorState.points.length > 0;
    var hasAllPoints = PointSelectorState.points.length >= PointSelectorState.targetCount;

    if (undoBtn) undoBtn.disabled = !hasPoints;
    if (confirmBtn) confirmBtn.disabled = !hasPoints;
}

function showPointSelectorHint(type, message) {
    var hint = document.getElementById('pointSelectorHint');
    if (!hint) return;

    hint.className = 'point-selector-hint ' + type;
    var span = hint.querySelector('span');
    if (span) span.textContent = message;
}

function undoLastPoint() {
    if (PointSelectorState.points.length > 0) {
        PointSelectorState.points.pop();
        updatePointCounter();
        redrawPointMarkers();
        updatePointSelectorButtons();
        showPointSelectorHint('', I18n.t('click.anywhere.hint') || 'Click anywhere on either image to place a sample point.');
    }
}

function clearAllPoints() {
    PointSelectorState.points = [];
    updatePointCounter();
    redrawPointMarkers();
    updatePointSelectorButtons();
    showPointSelectorHint('', I18n.t('click.anywhere.hint') || 'Click anywhere on either image to place a sample point.');
}

function confirmPoints() {
    if (PointSelectorState.points.length === 0) return;

    var isSingle = PointSelectorState.mode === 'single';

    // Save to PointSelectorState storage
    if (isSingle) {
        PointSelectorState.pointsSingle = PointSelectorState.points.slice();
    } else {
        PointSelectorState.pointsColor = PointSelectorState.points.slice();
    }

    // Save points to AppState (pixel coordinates for backend)
    // CRITICAL: Validate that all points have pixel coordinates and include isManual flag
    var mappedPoints = PointSelectorState.points.map(function (p) {
        // Safety check: ensure pixel coordinates exist
        if (p.pixelX === undefined || p.pixelY === undefined) {
            console.error('Point missing pixel coordinates:', p);
            // Fallback: calculate from normalized coordinates if possible
            var img = isSingle ? document.getElementById('pointSelectorSampleImage') : document.getElementById('pointSelectorRefImage');
            if (img && img.naturalWidth && img.naturalHeight) {
                return {
                    x: Math.round(p.x * img.naturalWidth),
                    y: Math.round(p.y * img.naturalHeight),
                    isManual: p.isManual !== undefined ? p.isManual : true
                };
            }
            // Last resort: return normalized coordinates (will likely fail)
            return { x: p.x, y: p.y, isManual: p.isManual !== undefined ? p.isManual : true };
        }
        return { 
            x: p.pixelX, 
            y: p.pixelY,
            isManual: p.isManual !== undefined ? p.isManual : true
        };
    });

    if (isSingle) {
        AppState.manualSamplePointsSingle = mappedPoints;
        AppState.singleSamplingMode = 'manual'; // Explicitly set mode
    } else {
        AppState.manualSamplePointsColor = mappedPoints;
        AppState.colorSamplingMode = 'manual';
    }

    // Update status display (for the Settings Modal UI)
    updateManualPointsStatus();

    // Close modal
    closePointSelector();
}

function updateManualPointsStatus() {
    // Update Color Status
    var statusEl = document.getElementById('manualPointsStatus'); // Defaults to color one
    var statusText = statusEl ? statusEl.querySelector('.status-text') : null;
    var clearBtn = document.getElementById('btnClearPoints');

    var countColor = AppState.manualSamplePointsColor ? AppState.manualSamplePointsColor.length : 0;

    if (countColor > 0) {
        if (statusEl) statusEl.classList.add('has-points');
        if (statusText) statusText.textContent = countColor + ' points selected';
        if (clearBtn) clearBtn.style.display = 'flex';
    } else {
        if (statusEl) statusEl.classList.remove('has-points');
        if (statusText) statusText.textContent = 'No points selected';
        if (clearBtn) clearBtn.style.display = 'none';
    }

}

function clearManualPoints() {
    AppState.manualSamplePoints = [];
    PointSelectorState.points = [];
    updateManualPointsStatus();
}

/* ═══ Coordinate Entry Functions ═══ */

function addCoordPoint(mode) {
    var isSingle = (mode === 'single');
    var xEl = document.getElementById(isSingle ? 'coordXSingle' : 'coordX');
    var yEl = document.getElementById(isSingle ? 'coordYSingle' : 'coordY');
    var fbEl = document.getElementById(isSingle ? 'coordFeedbackSingle' : 'coordFeedback');
    if (!xEl || !yEl) return;

    var x = parseInt(xEl.value, 10);
    var y = parseInt(yEl.value, 10);

    function showFeedback(msgKey, cls) {
        if (!fbEl) return;
        fbEl.textContent = I18n.t(msgKey) || msgKey;
        fbEl.className = 'coord-feedback ' + cls;
        clearTimeout(fbEl._timer);
        fbEl._timer = setTimeout(function() { fbEl.textContent = ''; fbEl.className = 'coord-feedback'; }, 3000);
    }

    if (isNaN(x) || isNaN(y) || x < 0 || y < 0) {
        showFeedback('coord.invalid', 'error'); return;
    }

    var dims = calculateMaxDimensions();
    if (x >= dims.width || y >= dims.height) {
        showFeedback('coord.invalid', 'error'); return;
    }

    var targetCount = parseInt(document.getElementById(isSingle ? 'single_region_count' : 'region_count').value, 10) || 5;
    var pointsArr = isSingle
        ? (AppState.manualSamplePointsSingle || [])
        : (AppState.manualSamplePointsColor || []);

    if (pointsArr.length >= targetCount) {
        showFeedback('coord.limit.reached', 'warn'); return;
    }

    for (var i = 0; i < pointsArr.length; i++) {
        if (pointsArr[i].x === x && pointsArr[i].y === y) {
            showFeedback('coord.duplicate', 'warn'); return;
        }
    }

    pointsArr.push({ x: x, y: y, isManual: true });
    if (isSingle) {
        AppState.manualSamplePointsSingle = pointsArr;
        AppState.singleSamplingMode = 'manual';
    } else {
        AppState.manualSamplePointsColor = pointsArr;
        AppState.colorSamplingMode = 'manual';
    }

    _syncCoordPointsToSelector(isSingle, pointsArr, targetCount);
    showFeedback('coord.point.added', 'success');
    xEl.value = '';
    yEl.value = '';
    xEl.focus();
    renderCoordPointsList(isSingle);
    updateSettingsPanelStatus();
}

function _syncCoordPointsToSelector(isSingle, pointsArr, targetCount) {
    PointSelectorState.mode = isSingle ? 'single' : 'color';
    PointSelectorState.targetCount = targetCount;
    var existingRandom = PointSelectorState.points.filter(function(p) { return !p.isManual; });
    var manualPts = pointsArr.map(function(p, idx) {
        return {
            x: p.x, y: p.y,
            pixelX: p.x, pixelY: p.y,
            displayX: p.x, displayY: p.y,
            index: idx + 1,
            isManual: true
        };
    });
    PointSelectorState.points = manualPts.concat(existingRandom);
    if (isSingle) {
        PointSelectorState.pointsSingle = PointSelectorState.points.slice();
    } else {
        PointSelectorState.pointsColor = PointSelectorState.points.slice();
    }
}

function removeCoordPoint(mode, index) {
    var isSingle = (mode === 'single');
    var pointsArr = isSingle
        ? (AppState.manualSamplePointsSingle || [])
        : (AppState.manualSamplePointsColor || []);

    if (index >= 0 && index < pointsArr.length) {
        pointsArr.splice(index, 1);
    }
    if (isSingle) {
        AppState.manualSamplePointsSingle = pointsArr;
        if (pointsArr.length === 0) AppState.singleSamplingMode = 'random';
    } else {
        AppState.manualSamplePointsColor = pointsArr;
        if (pointsArr.length === 0) AppState.colorSamplingMode = 'random';
    }

    var targetCount = parseInt(document.getElementById(isSingle ? 'single_region_count' : 'region_count').value, 10) || 5;
    _syncCoordPointsToSelector(isSingle, pointsArr, targetCount);
    renderCoordPointsList(isSingle);
    updateSettingsPanelStatus();
}

function clearCoordPoints(mode) {
    var isSingle = (mode === 'single');
    if (isSingle) {
        AppState.manualSamplePointsSingle = [];
        AppState.singleSamplingMode = 'random';
    } else {
        AppState.manualSamplePointsColor = [];
        AppState.colorSamplingMode = 'random';
    }
    var targetCount = parseInt(document.getElementById(isSingle ? 'single_region_count' : 'region_count').value, 10) || 5;
    _syncCoordPointsToSelector(isSingle, [], targetCount);
    renderCoordPointsList(isSingle);
    updateSettingsPanelStatus();
}

function renderCoordPointsList(isSingle) {
    var listEl = document.getElementById(isSingle ? 'coordPointsListSingle' : 'coordPointsList');
    var clearBtn = document.getElementById(isSingle ? 'coordClearAllSingle' : 'coordClearAll');
    var pointsArr = isSingle
        ? (AppState.manualSamplePointsSingle || [])
        : (AppState.manualSamplePointsColor || []);

    if (!listEl) return;

    if (pointsArr.length === 0) {
        listEl.innerHTML = '<div class="coord-empty-state">' + (I18n.t('coord.no.points') || 'No coordinate points added yet.') + '</div>';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }

    if (clearBtn) clearBtn.style.display = '';
    var modeStr = isSingle ? "'single'" : "undefined";
    var html = '';
    for (var i = 0; i < pointsArr.length; i++) {
        var p = pointsArr[i];
        html += '<div class="coord-point-chip">'
            + '<span><span class="coord-chip-idx">' + (i + 1) + '</span>'
            + '<span class="coord-chip-label">(' + p.x + ', ' + p.y + ')</span></span>'
            + '<button class="coord-chip-remove" onclick="removeCoordPoint(' + modeStr + ',' + i + ')" title="Remove">'
            + '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'
            + '</button></div>';
    }
    listEl.innerHTML = html;
}

// Settings Modal Logic (Refined)

function switchSettingsTab(tabName) {
    // Buttons
    var buttons = document.querySelectorAll('.modal-tabs .tab');
    buttons.forEach(function (btn) {
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Content
    var contents = document.querySelectorAll('.modal-body .tab-content');
    contents.forEach(function (content) {
        content.style.display = 'none';
        content.classList.remove('active');
    });

    var activeContent = document.getElementById('tab-' + tabName);
    if (activeContent) {
        activeContent.style.display = 'block';
        activeContent.classList.add('active');
    }
}



function proceedResetSettings() {
    // General
    var opName = document.getElementById('operator_name'); if (opName) opName.value = "Unknown";
    var tz = document.getElementById('timezone_offset'); 
    if (tz) {
        tz.value = "3"; // Reset to default UTC+3
        localStorage.setItem('textile_qc_timezone_offset', '3'); // Save default to localStorage
    }

    // Color
    var csm = document.getElementById('color_scoring_method'); if (csm) csm.value = "delta_e";
    var cp = document.getElementById('color_pass_thresh'); if (cp) cp.value = "2.0";
    var cc = document.getElementById('color_cond_thresh'); if (cc) cc.value = "5.0";
    var cg = document.getElementById('color_global_thresh'); if (cg) cg.value = "5.0";
    var csg = document.getElementById('csi_good_thresh'); if (csg) csg.value = "2.0";
    var csw = document.getElementById('csi_warn_thresh'); if (csw) csw.value = "5.0";
    var rc = document.getElementById('region_count'); if (rc) rc.value = "5";
    var src = document.getElementById('single_region_count'); if (src) src.value = "5";

    var colorChecks = ['sec_color_spaces', 'sec_exec_summary', 'sec_visual_comparison', 'sec_rgb', 'sec_lab', 'sec_xyz', 'sec_cmyk', 'sec_diff_metrics', 'sec_stats', 'sec_detailed_lab', 'sec_visualizations', 'sec_spectral', 'sec_histograms', 'sec_visual_diff', 'sec_illuminant_analysis', 'sec_recommendations'];
    colorChecks.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.checked = true;
    });

    var csiCheck = document.getElementById('sec_csi_heatmap');
    if (csiCheck) csiCheck.checked = false;


    // Illuminant
    var primIll = document.getElementById('primary_illuminant'); if (primIll) primIll.value = "D65";
    document.querySelectorAll('input[name="test_illuminant"]').forEach(function (el) {
        el.checked = (el.value === 'D65' || el.value === 'D50' || el.value === 'TL84');
    });
    var secIll = document.getElementById('sec_illuminant_analysis'); if (secIll) secIll.checked = true;

    // Pattern
    var psm = document.getElementById('pattern_scoring_method'); if (psm) psm.value = "all";
    var sp = document.getElementById('ssim_pass'); if (sp) sp.value = "0.85";
    var sc = document.getElementById('ssim_cond'); if (sc) sc.value = "0.70";
    var gp = document.getElementById('grad_pass'); if (gp) gp.value = "85.0";
    var gc = document.getElementById('grad_cond'); if (gc) gc.value = "70.0";

    var pp = document.getElementById('phase_pass'); if (pp) pp.value = "85.0";
    var pc = document.getElementById('phase_cond'); if (pc) pc.value = "70.0";
    var stp = document.getElementById('structural_pass'); if (stp) stp.value = "85.0";
    var stc = document.getElementById('structural_cond'); if (stc) stc.value = "70.0";
    var pt = document.getElementById('pattern_global_thresh'); if (pt) pt.value = "75.0";

    // Diff sensitivity sliders (G_e, F_e)
    var gds = document.getElementById('grad_diff_sens'); if (gds) { gds.value = '7'; var gdsv = document.getElementById('grad_diff_sens_val'); if (gdsv) gdsv.textContent = '7'; }
    var pds = document.getElementById('phase_diff_sens'); if (pds) { pds.value = '7'; var pdsv = document.getElementById('phase_diff_sens_val'); if (pdsv) pdsv.textContent = '7'; }
    // Boundary extraction sensitivity sliders (G'_e, F'_e)
    var gbs = document.getElementById('grad_bound_sens'); if (gbs) { gbs.value = '4'; var gbsv = document.getElementById('grad_bound_sens_val'); if (gbsv) gbsv.textContent = '4'; }
    var pbs = document.getElementById('phase_bound_sens'); if (pbs) { pbs.value = '8'; var pbsv = document.getElementById('phase_bound_sens_val'); if (pbsv) pbsv.textContent = '8'; }
    // Structural sensitivity slider (Y_e)
    var ss = document.getElementById('structural_sens'); if (ss) { ss.value = '10'; var ssv = document.getElementById('structural_sens_val'); if (ssv) ssv.textContent = '10'; }

    var patternChecks = ['enable_ssim', 'enable_gradient', 'enable_phase', 'enable_grad_bound', 'enable_phase_bound', 'enable_summary', 'enable_concl', 'enable_rec', 'enable_structural', 'enable_fourier', 'enable_glcm'];
    patternChecks.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.checked = true;
    });

    // Single Image Report Sections
    var singleChecks = ['sec_single_rgb', 'sec_single_lab', 'sec_single_xyz', 'sec_single_cmyk', 'sec_single_spectral', 'sec_single_illuminant_analysis'];
    singleChecks.forEach(function (id) {
        var el = document.getElementById(id);
        if (el) el.checked = true;
    });

    // Reset sampling state
    AppState.manualSamplePointsSingle = [];
    AppState.manualSamplePointsColor = [];
    AppState.singleSamplingMode = undefined;
    AppState.colorSamplingMode = undefined;
    PointSelectorState.points = [];
    PointSelectorState.pointsSingle = [];
    PointSelectorState.pointsColor = [];
    renderCoordPointsList(true);
    renderCoordPointsList(false);
    updateSettingsPanelStatus();
}


function initSamplingSettings() {
    var counts = [
        { id: 'region_count', mode: 'color' },
        { id: 'single_region_count', mode: 'single' }
    ];

    counts.forEach(function (c) {
        var input = document.getElementById(c.id);
        if (input) {
            input.addEventListener('change', function () {
                var val = parseInt(this.value);
                if (isNaN(val) || val < 1) val = 1;
                if (val > 100) val = 100;
                this.value = val;

                if (PointSelectorState.mode === c.mode) {
                    updateSamplingCount(val);
                }
            });
        }
    });

    ['coordX', 'coordY'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') addCoordPoint(); });
    });
    ['coordXSingle', 'coordYSingle'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('keydown', function(e) { if (e.key === 'Enter') addCoordPoint('single'); });
    });
}

function updateSamplingCount(newCount) {
    // Update State Target
    PointSelectorState.targetCount = newCount;

    // Update simple UI displays
    var totalCountEl = document.getElementById('pointCountTotal');
    if (totalCountEl) totalCountEl.textContent = newCount;

    // Update target count display based on active mode
    var isSingle = PointSelectorState.mode === 'single';
    var suffix = isSingle ? 'Single' : '';
    var targetDisplay = document.getElementById('targetCountDisplay' + suffix);
    if (targetDisplay) targetDisplay.textContent = newCount;

    // Adjust points array
    while (PointSelectorState.points.length > newCount) {
        // Find last random point
        var lastRandomIdx = -1;
        for (var i = PointSelectorState.points.length - 1; i >= 0; i--) {
            if (!PointSelectorState.points[i].isManual) {
                lastRandomIdx = i;
                break;
            }
        }

        if (lastRandomIdx !== -1) {
            PointSelectorState.points.splice(lastRandomIdx, 1);
        } else {
            PointSelectorState.points.pop();
        }
    }

    // Reset circular cursor if needed
    if (PointSelectorState.points.length >= newCount) {
        PointSelectorState.nextReplaceIndex = PointSelectorState.points.length % newCount;
    }

    // Update UI
    updateSamplingProgress();

    // If modal is open, redraw canvas
    if (PointSelectorState.isOpen) {
        drawPointsOnCanvas('ref');
        drawPointsOnCanvas('sample');
    }
}


// Feedback Sidebar
function initFeedbackSidebar() {
    var sidebar = document.getElementById('feedbackSidebar');
    var overlay = document.getElementById('feedbackOverlay');
    var openBtn = document.getElementById('btnFeedbackHeader');
    var closeBtn = document.getElementById('feedbackSidebarClose');
    var form = document.getElementById('feedbackForm');
    var successMsg = document.getElementById('feedbackSuccessMessage');
    var newBtn = document.getElementById('btnFeedbackNew');
    var formContent = document.getElementById('feedbackFormContent');
    var anonymousToggle = document.getElementById('anonymousToggle');
    var personalFields = document.getElementById('personalFields');
    var messageTextarea = document.getElementById('message');
    var charCount = document.getElementById('charCount');
    var submitBtn = document.getElementById('feedbackSubmitBtn');

    if (!sidebar || !openBtn) return;

    function openSidebar() {
        sidebar.classList.add('active');
        if (overlay) overlay.classList.add('active');
    }

    function closeSidebar() {
        sidebar.classList.remove('active');
        if (overlay) overlay.classList.remove('active');
    }

    openBtn.addEventListener('click', openSidebar);
    if (closeBtn) closeBtn.addEventListener('click', closeSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);

    // Anonymous toggle: hide/show personal fields
    if (anonymousToggle && personalFields) {
        anonymousToggle.addEventListener('change', function () {
            personalFields.style.display = this.checked ? 'none' : '';
        });
    }

    // Character count for message textarea
    if (messageTextarea && charCount) {
        messageTextarea.addEventListener('input', function () {
            charCount.textContent = '(' + this.value.length + '/2000)';
        });
    }

    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault();
            var msg = (messageTextarea ? messageTextarea.value : '').trim();
            if (!msg) {
                var errEl = document.getElementById('messageError');
                if (errEl) { errEl.textContent = 'Please enter a message.'; errEl.style.display = 'block'; }
                return;
            }
            var errEl2 = document.getElementById('messageError');
            if (errEl2) errEl2.style.display = 'none';

            var isAnonymous = anonymousToggle && anonymousToggle.checked;

            var payload = {
                access_key: '5176da08-b0a1-4245-8fb0-4fbf75e8e6d0',
                subject: 'SpectraMatch Feedback (' + (document.getElementById('feedbackType') ? document.getElementById('feedbackType').value : 'note') + ')',
                message: msg,
                feedback_type: document.getElementById('feedbackType') ? document.getElementById('feedbackType').value : 'note',
                source: 'web',
                anonymous: isAnonymous ? 'Yes' : 'No'
            };

            if (!isAnonymous) {
                var fn = document.getElementById('firstName');
                var ln = document.getElementById('lastName');
                var em = document.getElementById('email');
                var ph = document.getElementById('phone');
                if (fn && fn.value.trim()) payload.first_name = fn.value.trim();
                if (ln && ln.value.trim()) payload.last_name = ln.value.trim();
                if (em && em.value.trim()) payload.email = em.value.trim();
                if (ph && ph.value.trim()) payload.phone = ph.value.trim();
                payload.from_name = ((fn ? fn.value.trim() : '') + ' ' + (ln ? ln.value.trim() : '')).trim() || 'Anonymous';
            } else {
                payload.from_name = 'Anonymous User';
            }

            // Disable submit button during request
            if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.6'; }

            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify(payload)
            })
            .then(function (res) { return res.json(); })
            .then(function (data) {
                if (data.success) {
                    if (formContent) formContent.style.display = 'none';
                    if (successMsg) successMsg.style.display = 'block';
                    // Hide the entire form area above the button too
                    var formGroups = form.querySelectorAll('.form-group, .feedback-note, .feedback-anonymous-toggle, .feedback-fields-group, .feedback-attachment-note');
                    formGroups.forEach(function (el) { el.style.display = 'none'; });
                } else {
                    alert('Failed to send feedback. Please try again.');
                }
            })
            .catch(function () {
                alert('Network error. Please check your connection and try again.');
            })
            .finally(function () {
                if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = ''; }
            });
        });
    }

    if (newBtn) {
        newBtn.addEventListener('click', function () {
            if (form) form.reset();
            // Restore all form elements visibility
            var formGroups = form.querySelectorAll('.form-group, .feedback-note, .feedback-anonymous-toggle, .feedback-fields-group, .feedback-attachment-note');
            formGroups.forEach(function (el) { el.style.display = ''; });
            if (formContent) formContent.style.display = 'block';
            if (successMsg) successMsg.style.display = 'none';
            if (personalFields) personalFields.style.display = '';
            if (charCount) charCount.textContent = '(0/2000)';
        });
    }
}

// Datasheet Download
function initDatasheetDownload() {
    var btn = document.getElementById('btnDatasheetDownload');
    var dropdown = document.getElementById('datasheetDropdown');

    if (!btn || !dropdown) return;

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        // Mutual exclusion: close RTT dropdown when Datasheet opens
        var rttDropdown = document.getElementById('rttDropdown');
        if (rttDropdown) rttDropdown.classList.remove('active');
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    // Handle items
    var items = dropdown.querySelectorAll('.dropdown-item');
    items.forEach(function (item) {
        item.addEventListener('click', function () {
            var type = this.getAttribute('data-type');
                });
    });
}

// Ready-to-Test Images
function _showRttLoader() {
    var overlay = document.getElementById('rttLoaderOverlay');
    if (overlay) overlay.classList.add('active');
}

function _hideRttLoader() {
    var overlay = document.getElementById('rttLoaderOverlay');
    if (overlay) overlay.classList.remove('active');
}

function _waitForPreviewLoad(prefix, cb) {
    var preview = document.getElementById(prefix + 'Preview');
    if (!preview) { cb(); return; }
    if (preview.complete && preview.naturalWidth > 0 && preview.src && preview.style.display !== 'none') {
        cb(); return;
    }
    var done = false;
    function finish() { if (!done) { done = true; cb(); } }
    preview.addEventListener('load', finish, { once: true });
    preview.addEventListener('error', finish, { once: true });
    setTimeout(finish, 8000);
}

function initReadyToTest() {
    var btn = document.getElementById('btnReadyToTest');
    var dropdown = document.getElementById('rttDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        // Mutual exclusion: close Datasheet dropdown when RTT opens
        var dsDropdown = document.getElementById('datasheetDropdown');
        if (dsDropdown) dsDropdown.classList.remove('active');
        dropdown.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') dropdown.classList.remove('active');
    });

    var items = dropdown.querySelectorAll('.rtt-item');
    items.forEach(function (item) {
        item.addEventListener('click', function () {
            dropdown.classList.remove('active');
            var refName = this.getAttribute('data-ref');
            var sampleName = this.getAttribute('data-sample');
            var singleName = this.getAttribute('data-single');

            if (refName && sampleName) {
                // Dual mode pair — ensure single image mode is OFF
                var singleToggle = document.getElementById('singleImageModeToggle');
                if (singleToggle && singleToggle.checked) {
                    singleToggle.checked = false;
                    singleToggle.dispatchEvent(new Event('change'));
                }
                _showRttLoader();
                _fetchReadyImage(refName, function (file) {
                    handleFileUpload(file, 'reference');
                    _fetchReadyImage(sampleName, function (file2) {
                        handleFileUpload(file2, 'sample');
                        _waitForPreviewLoad('ref', function () {
                            _waitForPreviewLoad('test', function () {
                                _hideRttLoader();
                                                        });
                        });
                    });
                });
            } else if (singleName) {
                // Single image — ensure single image mode is ON
                var singleToggle = document.getElementById('singleImageModeToggle');
                if (singleToggle && !singleToggle.checked) {
                    singleToggle.checked = true;
                    singleToggle.dispatchEvent(new Event('change'));
                }
                _showRttLoader();
                _fetchReadyImage(singleName, function (file) {
                    handleFileUpload(file, 'sample');
                    _waitForPreviewLoad('test', function () {
                        _hideRttLoader();
                                        });
                });
            }
        });
    });
}

function _fetchReadyImage(filename, cb) {
    fetch('/static/READYTOTEST/' + filename)
        .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.blob(); })
        .then(function (blob) {
            var file = new File([blob], 'Test' + filename, { type: blob.type || 'image/png' });
            cb(file);
        })
        .catch(function (err) { console.error('RTT: Error loading ' + filename, err); _hideRttLoader(); });
}

// Language Dropdown
function initLanguageDropdown() {
    var btn = document.getElementById('btnLangDropdown');
    var dropdown = document.getElementById('langDropdown');

    if (!btn || !dropdown) return;

    // Toggle dropdown
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        btn.classList.toggle('active');
        dropdown.classList.toggle('active');
    });

    // Close when clicking outside
    document.addEventListener('click', function (e) {
        if (!dropdown.contains(e.target) && !btn.contains(e.target)) {
            btn.classList.remove('active');
            dropdown.classList.remove('active');
        }
    });

    // Handle language selection
    var items = dropdown.querySelectorAll('.lang-dropdown-item');
    items.forEach(function (item) {
        item.addEventListener('click', function () {
            var lang = this.getAttribute('data-lang');
            if (lang && typeof I18n !== 'undefined') {
                I18n.setLanguage(lang);
                I18n.updateLanguageDropdown();
                
                // Close dropdown
                btn.classList.remove('active');
                dropdown.classList.remove('active');
                
                // Update dynamic translations
                if (typeof updateDynamicTranslations === 'function') {
                    updateDynamicTranslations();
                }
            }
        });
    });
    
    // Initialize dropdown state on load
    if (typeof I18n !== 'undefined') {
        I18n.updateLanguageDropdown();
    }
}

// Report Language Dropdown
function initReportLanguageDropdown() {
    var container = document.querySelector('.report-lang-dropdown-container');
    var btn = document.getElementById('btnReportLangDropdown');
    var dropdown = document.getElementById('reportLangDropdown');
    var items = document.querySelectorAll('.report-lang-dropdown-item');
    var flagImg = document.getElementById('currentReportLangFlag');
    var langText = document.getElementById('currentReportLangText');

    if (!btn || !dropdown) return;

    // Load saved report language
    var savedLang = localStorage.getItem('textile_qc_report_lang') || 'tr';
    updateReportLangDisplay(savedLang);

    // Toggle dropdown
    btn.addEventListener('click', function(e) {
        e.stopPropagation();
        container.classList.toggle('open');
    });

    // Handle item selection
    items.forEach(function(item) {
        item.addEventListener('click', function() {
            var lang = this.getAttribute('data-lang');
            
            // Update active state
            items.forEach(function(i) { i.classList.remove('active'); });
            this.classList.add('active');
            
            // Save and update display
            localStorage.setItem('textile_qc_report_lang', lang);
            updateReportLangDisplay(lang);
            
            // Close dropdown
            container.classList.remove('open');
        });
    });

    // Close on outside click
    document.addEventListener('click', function(e) {
        if (!container.contains(e.target)) {
            container.classList.remove('open');
        }
    });

    function updateReportLangDisplay(lang) {
        if (lang === 'tr') {
            flagImg.src = '/static/images/tr.svg';
            langText.textContent = 'Türkçe';
        } else {
            flagImg.src = '/static/images/uk.svg';
            langText.textContent = 'English';
        }
        
        // Update active state in dropdown
        items.forEach(function(item) {
            if (item.getAttribute('data-lang') === lang) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }
}

// Help Handlers
function initHelpAndFeedbackHandlers() {
    var helpBtns = document.querySelectorAll('[data-help]');
    helpBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            var helpKey = this.getAttribute('data-help');
            
            // Skip datasheet help buttons - they have their own handler
            if (helpKey === 'datasheet') {
                return;
            }
            
            if (typeof showCustomAlert === 'function') {
                showCustomAlert("Help Info", "Information for " + helpKey, 'info');
            }
        });
    });
}

// Download Fallback Dialog
var _dlFallbackTimer = null;

function showDownloadFallback(e) {
    // Let the default link navigate (starts the real download)
    // Then show the fallback dialog after a short delay
    var overlay = document.getElementById('dlFallbackOverlay');
    if (!overlay) return;

    // Reset state
    var TOTAL = 20;
    var remaining = TOTAL;
    var circumference = 2 * Math.PI * 36; // r=36
    var ring = document.getElementById('dlRingFg');
    var label = document.getElementById('dlFallbackSeconds');

    if (ring) {
        ring.style.transition = 'none';
        ring.setAttribute('stroke-dashoffset', '0');
    }
    if (label) label.textContent = remaining;

    // Show dialog after 500ms so the browser can start the download
    setTimeout(function () {
        overlay.style.display = 'flex';
        // Apply i18n if available
        if (typeof applyTranslations === 'function') applyTranslations();

        // Start countdown
        if (ring) {
            ring.style.transition = 'stroke-dashoffset 1s linear';
        }

        _dlFallbackTimer = setInterval(function () {
            remaining--;
            if (label) label.textContent = Math.max(remaining, 0);
            if (ring) {
                var offset = circumference * ((TOTAL - remaining) / TOTAL);
                ring.setAttribute('stroke-dashoffset', offset.toString());
            }
            if (remaining <= 0) {
                closeDlFallback();
            }
        }, 1000);
    }, 500);
}

function closeDlFallback() {
    if (_dlFallbackTimer) {
        clearInterval(_dlFallbackTimer);
        _dlFallbackTimer = null;
    }
    var overlay = document.getElementById('dlFallbackOverlay');
    if (overlay) overlay.style.display = 'none';
}

// Settings Input Validation
(function enforceSettingsLimits() {
    document.addEventListener('change', function(e) {
        var el = e.target;
        if (el.tagName !== 'INPUT' || el.type !== 'number') return;
        var min = parseFloat(el.min);
        var max = parseFloat(el.max);
        var val = parseFloat(el.value);
        if (isNaN(val)) { el.value = el.defaultValue; return; }
        if (!isNaN(min) && val < min) el.value = min;
        if (!isNaN(max) && val > max) el.value = max;
    });
})();

// Contact Popup
function initContactPopup() {
    var btn = document.getElementById('footerContactBtn');
    var popup = document.getElementById('contactPopup');
    var closeBtn = document.getElementById('contactPopupClose');

    if (!btn || !popup) return;

    function openPopup() {
        popup.style.display = 'flex';
    }

    function closePopup() {
        popup.style.display = 'none';
    }

    btn.addEventListener('click', openPopup);
    if (closeBtn) closeBtn.addEventListener('click', closePopup);

    popup.addEventListener('click', function (e) {
        if (e.target === popup) {
            closePopup();
        }
    });
}

/* ══════════════════════════════════════════════════════════════════════════
   CAMERA CAPTURE STUDIO
   ══════════════════════════════════════════════════════════════════════════ */
var CameraStudio = (function () {
    var _stream = null;
    var _target = null; // 'reference' or 'sample'
    var _mirrored = false;
    var _rotation = 0;
    var _flipH = false;
    var _brightness = 0;
    var _contrast = 0;
    var _capturedDataUrl = null;
    var _cropState = null;
    var _cropCleanup = null;
    var _devices = [];
    var _statusKey = 'cam.requesting';

    function _tr(key) {
        return (typeof I18n !== 'undefined' && I18n.t) ? I18n.t(key) : key;
    }

    function _el(id) { return document.getElementById(id); }

    function _setStatus(key, visible) {
        var statusEl = _el('camStatusMsg');
        if (!statusEl) return;
        if (key) {
            _statusKey = key;
            statusEl.textContent = _tr(key);
        }
        if (typeof visible !== 'undefined') {
            statusEl.style.display = visible ? '' : 'none';
        }
    }

    function _syncTranslations() {
        var overlay = _el('camStudioOverlay');
        if (!overlay || !overlay.classList.contains('active')) return;

        var badge = _el('camTargetBadge');
        if (badge) {
            badge.textContent = _target === 'reference' ? _tr('rpt.reference') : _tr('rpt.sample');
        }

        var statusEl = _el('camStatusMsg');
        if (statusEl) {
            _setStatus(_statusKey, statusEl.style.display !== 'none');
        }

        var sel = _el('camDeviceSelect');
        if (!sel) return;
        if (!_devices.length && sel.options.length) {
            sel.options[0].textContent = _tr('cam.no.cameras');
            return;
        }
        Array.prototype.forEach.call(sel.options, function (opt) {
            var fallbackIndex = opt.getAttribute('data-fallback-index');
            if (fallbackIndex) {
                opt.textContent = _tr('cam.select.camera') + ' ' + fallbackIndex;
            }
        });
    }

    function open(target) {
        _target = target;
        _mirrored = false;
        _rotation = 0;
        _flipH = false;
        _brightness = 0;
        _contrast = 0;
        _capturedDataUrl = null;
        _cropState = null;
        if (_cropCleanup) {
            _cropCleanup();
            _cropCleanup = null;
        }

        var overlay = _el('camStudioOverlay');
        overlay.classList.add('active');

        var badge = _el('camTargetBadge');
        badge.textContent = target === 'reference' ? _tr('rpt.reference') : _tr('rpt.sample');

        _statusKey = 'cam.requesting';
        _setStatus('cam.requesting', true);
        _el('camVideo').classList.remove('active');
        _el('camCapturedImg').style.display = 'none';
        _el('camCropOverlay').style.display = 'none';
        _el('camAdjustBar').style.display = 'none';
        _el('camCaptureBtn').style.display = '';
        _el('camRetakeBtn').style.display = 'none';
        _el('camUseBtn').style.display = 'none';
        _el('camBrightness').value = 0;
        _el('camContrast').value = 0;

        _enumerateAndStart();
    }

    function close() {
        _stopStream();
        _el('camStudioOverlay').classList.remove('active');
        _capturedDataUrl = null;
        _cropState = null;
        if (_cropCleanup) {
            _cropCleanup();
            _cropCleanup = null;
        }
    }

    function _stopStream() {
        if (_stream) {
            _stream.getTracks().forEach(function (t) { t.stop(); });
            _stream = null;
        }
        var v = _el('camVideo');
        v.srcObject = null;
        v.classList.remove('active');
    }

    function _enumerateAndStart() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            _setStatus('cam.not.supported', true);
            return;
        }

        navigator.mediaDevices.getUserMedia({ video: true })
            .then(function (stream) {
                stream.getTracks().forEach(function (t) { t.stop(); });
                return navigator.mediaDevices.enumerateDevices();
            })
            .then(function (devices) {
                _devices = devices.filter(function (d) { return d.kind === 'videoinput'; });
                var sel = _el('camDeviceSelect');
                sel.innerHTML = '';
                if (_devices.length === 0) {
                    var o = document.createElement('option');
                    o.textContent = _tr('cam.no.cameras');
                    sel.appendChild(o);
                    _setStatus('cam.no.cameras', true);
                    return;
                }
                _devices.forEach(function (d, i) {
                    var o = document.createElement('option');
                    o.value = d.deviceId;
                    if (d.label) {
                        o.textContent = d.label;
                    } else {
                        o.setAttribute('data-fallback-index', String(i + 1));
                        o.textContent = _tr('cam.select.camera') + ' ' + (i + 1);
                    }
                    sel.appendChild(o);
                });
                _startCamera(_devices[0].deviceId);
            })
            .catch(function () {
                _setStatus('cam.permission.denied', true);
            });
    }

    function _startCamera(deviceId) {
        _stopStream();
        _setStatus('cam.requesting', true);

        var constraints = { video: { deviceId: { exact: deviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } } };
        navigator.mediaDevices.getUserMedia(constraints)
            .then(function (stream) {
                _stream = stream;
                var v = _el('camVideo');
                v.srcObject = stream;
                v.classList.add('active');
                v.classList.toggle('mirrored', _mirrored);
                _setStatus('cam.requesting', false);
            })
            .catch(function () {
                _setStatus('cam.permission.denied', true);
            });
    }

    function _capture() {
        var v = _el('camVideo');
        if (!v.videoWidth) return;

        var c = _el('camCaptureCanvas');
        c.width = v.videoWidth;
        c.height = v.videoHeight;
        var ctx = c.getContext('2d');
        if (_mirrored) {
            ctx.translate(c.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(v, 0, 0, c.width, c.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        _capturedDataUrl = c.toDataURL('image/png');
        _stopStream();

        var img = _el('camCapturedImg');
        img.src = _capturedDataUrl;
        img.style.display = '';

        _el('camCaptureBtn').style.display = 'none';
        _el('camRetakeBtn').style.display = '';
        _el('camUseBtn').style.display = '';
        _el('camAdjustBar').style.display = 'flex';

        _initCrop();
    }

    function _retake() {
        _capturedDataUrl = null;
        _cropState = null;
        if (_cropCleanup) {
            _cropCleanup();
            _cropCleanup = null;
        }
        _rotation = 0;
        _flipH = false;
        _brightness = 0;
        _contrast = 0;
        _el('camBrightness').value = 0;
        _el('camContrast').value = 0;

        _el('camCapturedImg').style.display = 'none';
        _el('camCropOverlay').style.display = 'none';
        _el('camAdjustBar').style.display = 'none';
        _el('camCaptureBtn').style.display = '';
        _el('camRetakeBtn').style.display = 'none';
        _el('camUseBtn').style.display = 'none';

        var sel = _el('camDeviceSelect');
        _startCamera(sel.value);
    }

    function _initCrop() {
        var overlay = _el('camCropOverlay');
        var box = _el('camCropBox');
        var area = _el('camPreviewArea');
        if (!overlay || !box || !area) return;
        if (_cropCleanup) {
            _cropCleanup();
            _cropCleanup = null;
        }

        overlay.style.display = 'block';
        overlay.style.touchAction = 'none';
        box.style.touchAction = 'none';

        var pad = 30;
        var aw = area.clientWidth;
        var ah = area.clientHeight;
        box.style.left = pad + 'px';
        box.style.top = pad + 'px';
        box.style.width = Math.max(120, aw - pad * 2) + 'px';
        box.style.height = Math.max(120, ah - pad * 2) + 'px';

        _cropState = { dragging: false, resizing: null, sx: 0, sy: 0, ox: 0, oy: 0, ow: 0, oh: 0 };

        var handles = box.querySelectorAll('.cam-crop-handle');
        function clampRect(rect) {
            var minSize = 40;
            var areaW = area.clientWidth;
            var areaH = area.clientHeight;

            rect.width = Math.max(minSize, rect.width);
            rect.height = Math.max(minSize, rect.height);
            rect.left = Math.max(0, Math.min(rect.left, areaW - rect.width));
            rect.top = Math.max(0, Math.min(rect.top, areaH - rect.height));

            if (rect.left + rect.width > areaW) rect.width = areaW - rect.left;
            if (rect.top + rect.height > areaH) rect.height = areaH - rect.top;

            rect.width = Math.max(minSize, rect.width);
            rect.height = Math.max(minSize, rect.height);
            return rect;
        }

        function applyRect(rect) {
            box.style.left = rect.left + 'px';
            box.style.top = rect.top + 'px';
            box.style.width = rect.width + 'px';
            box.style.height = rect.height + 'px';
        }

        function startInteraction(e, resizeDir) {
            e.preventDefault();
            e.stopPropagation();
            _cropState.dragging = !resizeDir;
            _cropState.resizing = resizeDir || null;
            _cropState.sx = e.clientX;
            _cropState.sy = e.clientY;
            _cropState.ox = box.offsetLeft;
            _cropState.oy = box.offsetTop;
            _cropState.ow = box.offsetWidth;
            _cropState.oh = box.offsetHeight;
        }

        function onBoxPointerDown(e) {
            if (e.target.classList.contains('cam-crop-handle')) return;
            startInteraction(e, null);
        }

        function onHandlePointerDown(e) {
            var match = this.className.match(/cam-crop-(nw|ne|sw|se|n|e|s|w)\b/);
            startInteraction(e, match ? match[1] : null);
        }

        function onPointerMove(e) {
            if (!_cropState) return;

            if (_cropState.dragging) {
                var dx = e.clientX - _cropState.sx;
                var dy = e.clientY - _cropState.sy;
                applyRect(clampRect({
                    left: _cropState.ox + dx,
                    top: _cropState.oy + dy,
                    width: _cropState.ow,
                    height: _cropState.oh
                }));
                return;
            }

            if (!_cropState.resizing) return;

            var dx2 = e.clientX - _cropState.sx;
            var dy2 = e.clientY - _cropState.sy;
            var dir = _cropState.resizing;
            var rect = {
                left: _cropState.ox,
                top: _cropState.oy,
                width: _cropState.ow,
                height: _cropState.oh
            };

            if (dir.indexOf('e') >= 0) rect.width = _cropState.ow + dx2;
            if (dir.indexOf('s') >= 0) rect.height = _cropState.oh + dy2;
            if (dir.indexOf('w') >= 0) {
                rect.left = _cropState.ox + dx2;
                rect.width = _cropState.ow - dx2;
            }
            if (dir.indexOf('n') >= 0) {
                rect.top = _cropState.oy + dy2;
                rect.height = _cropState.oh - dy2;
            }

            applyRect(clampRect(rect));
        }

        function onPointerUp() {
            if (_cropState) {
                _cropState.dragging = false;
                _cropState.resizing = null;
            }
        }

        box.addEventListener('pointerdown', onBoxPointerDown);
        handles.forEach(function (h) {
            h.addEventListener('pointerdown', onHandlePointerDown);
        });
        document.addEventListener('pointermove', onPointerMove);
        document.addEventListener('pointerup', onPointerUp);
        document.addEventListener('pointercancel', onPointerUp);

        _cropCleanup = function () {
            box.removeEventListener('pointerdown', onBoxPointerDown);
            handles.forEach(function (h) {
                h.removeEventListener('pointerdown', onHandlePointerDown);
            });
            document.removeEventListener('pointermove', onPointerMove);
            document.removeEventListener('pointerup', onPointerUp);
            document.removeEventListener('pointercancel', onPointerUp);
        };
    }

    function _applyAdjustments(srcDataUrl, cb) {
        var img = new Image();
        img.onload = function () {
            var w = img.naturalWidth;
            var h = img.naturalHeight;
            var c = document.createElement('canvas');
            var ctx = c.getContext('2d');

            var rads = _rotation * Math.PI / 180;
            var absW = (_rotation % 180 === 0) ? w : h;
            var absH = (_rotation % 180 === 0) ? h : w;
            c.width = absW;
            c.height = absH;

            ctx.translate(absW / 2, absH / 2);
            ctx.rotate(rads);
            if (_flipH) ctx.scale(-1, 1);
            ctx.drawImage(img, -w / 2, -h / 2, w, h);
            ctx.setTransform(1, 0, 0, 1, 0, 0);

            if (_brightness !== 0 || _contrast !== 0) {
                var imageData = ctx.getImageData(0, 0, c.width, c.height);
                var d = imageData.data;
                var bFactor = _brightness * 2.55;
                var cFactor = (_contrast + 100) / 100;
                cFactor *= cFactor;
                for (var i = 0; i < d.length; i += 4) {
                    for (var ch = 0; ch < 3; ch++) {
                        var v = d[i + ch] + bFactor;
                        v = ((v / 255 - 0.5) * cFactor + 0.5) * 255;
                        d[i + ch] = Math.max(0, Math.min(255, v));
                    }
                }
                ctx.putImageData(imageData, 0, 0);
            }

            cb(c.toDataURL('image/png'), c.width, c.height);
        };
        img.src = srcDataUrl;
    }

    function _useImage() {
        if (!_capturedDataUrl) return;

        _applyAdjustments(_capturedDataUrl, function (adjustedUrl, fullW, fullH) {
            var area = _el('camPreviewArea');
            var box = _el('camCropBox');
            var imgEl = _el('camCapturedImg');
            var imgRect = imgEl.getBoundingClientRect();
            var areaRect = area.getBoundingClientRect();

            var dispX = imgRect.left - areaRect.left;
            var dispY = imgRect.top - areaRect.top;
            var dispW = imgRect.width;
            var dispH = imgRect.height;

            var bx = box.offsetLeft - dispX;
            var by = box.offsetTop - dispY;
            var bw = box.offsetWidth;
            var bh = box.offsetHeight;

            var scaleX = fullW / dispW;
            var scaleY = fullH / dispH;
            var sx = Math.max(0, Math.round(bx * scaleX));
            var sy = Math.max(0, Math.round(by * scaleY));
            var sw = Math.min(fullW - sx, Math.round(bw * scaleX));
            var sh = Math.min(fullH - sy, Math.round(bh * scaleY));

            if (sw < 10 || sh < 10) { sw = fullW; sh = fullH; sx = 0; sy = 0; }

            var cropCanvas = document.createElement('canvas');
            cropCanvas.width = sw;
            cropCanvas.height = sh;
            var cropCtx = cropCanvas.getContext('2d');

            var tmpImg = new Image();
            tmpImg.onload = function () {
                cropCtx.drawImage(tmpImg, sx, sy, sw, sh, 0, 0, sw, sh);
                var finalUrl = cropCanvas.toDataURL('image/png');

                var blob = _dataUrlToBlob(finalUrl);
                var file = new File([blob], 'camera_capture.png', { type: 'image/png' });

                if (_target === 'reference') {
                    handleFileUpload(file, 'reference');
                } else {
                    handleFileUpload(file, 'sample');
                }

                close();
            };
            tmpImg.src = adjustedUrl;
        });
    }

    function _dataUrlToBlob(dataUrl) {
        var parts = dataUrl.split(',');
        var mime = parts[0].match(/:(.*?);/)[1];
        var raw = atob(parts[1]);
        var arr = new Uint8Array(raw.length);
        for (var i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
        return new Blob([arr], { type: mime });
    }

    function init() {
        var closeBtn = _el('camCloseBtn');
        var cancelBtn = _el('camCancelBtn');
        var captureBtn = _el('camCaptureBtn');
        var retakeBtn = _el('camRetakeBtn');
        var useBtn = _el('camUseBtn');
        var mirrorBtn = _el('camMirrorBtn');
        var deviceSel = _el('camDeviceSelect');
        var overlay = _el('camStudioOverlay');

        if (!overlay) return;

        if (closeBtn) closeBtn.addEventListener('click', close);
        if (cancelBtn) cancelBtn.addEventListener('click', close);
        if (captureBtn) captureBtn.addEventListener('click', _capture);
        if (retakeBtn) retakeBtn.addEventListener('click', _retake);
        if (useBtn) useBtn.addEventListener('click', _useImage);

        if (mirrorBtn) mirrorBtn.addEventListener('click', function () {
            _mirrored = !_mirrored;
            _el('camVideo').classList.toggle('mirrored', _mirrored);
        });

        if (deviceSel) deviceSel.addEventListener('change', function () {
            if (this.value) _startCamera(this.value);
        });

        _el('camRotateLeft').addEventListener('click', function () {
            _rotation = (_rotation - 90 + 360) % 360;
            _updateCapturedPreview();
        });
        _el('camRotateRight').addEventListener('click', function () {
            _rotation = (_rotation + 90) % 360;
            _updateCapturedPreview();
        });
        _el('camFlipH').addEventListener('click', function () {
            _flipH = !_flipH;
            _updateCapturedPreview();
        });
        _el('camBrightness').addEventListener('input', function () {
            _brightness = parseInt(this.value);
            _updateCapturedPreview();
        });
        _el('camContrast').addEventListener('input', function () {
            _contrast = parseInt(this.value);
            _updateCapturedPreview();
        });

        document.addEventListener('languageChanged', _syncTranslations);

        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) close();
        });
    }

    function _updateCapturedPreview() {
        if (!_capturedDataUrl) return;
        _applyAdjustments(_capturedDataUrl, function (url) {
            _el('camCapturedImg').src = url;
        });
    }

    return { open: open, close: close, init: init };
})();

function openCameraStudio(target) {
    CameraStudio.open(target);
}

document.addEventListener('DOMContentLoaded', function () {
    CameraStudio.init();
});
