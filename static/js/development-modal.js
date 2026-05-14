// ==========================================
// Development Modal
// ==========================================
function initDevelopmentModal() {
    var modal = document.getElementById('developmentModal');
    var closeBtn = document.getElementById('btnDevelopmentClose');
    var colabBtn = document.getElementById('btnDevelopmentColab');
    var downloadCodeBtn = document.getElementById('btnDevelopmentDownloadCode');
    var logoButtons = document.querySelectorAll('.btn-logo-download');

    if (!modal) return;

    // Close button
    if (closeBtn) {
        closeBtn.addEventListener('click', hideDevelopmentModal);
    }

    // Close on overlay click
    modal.addEventListener('click', function (e) {
        if (e.target === modal) {
            hideDevelopmentModal();
        }
    });

    // Google Colab button
    if (colabBtn) {
        colabBtn.addEventListener('click', function () {
            window.open('https://colab.research.google.com/', '_blank');
        });
    }

    // Download code button
    if (downloadCodeBtn) {
        downloadCodeBtn.addEventListener('click', function () {
            downloadSourceCode('py');
            // Also show code in modal
            loadSourceCodeInModal();
        });
    }

    // Copy code button will be initialized when code section is shown

    // Logo download buttons
    logoButtons.forEach(function (btn) {
        btn.addEventListener('click', function () {
            var logoName = btn.getAttribute('data-logo');
            downloadLogo(logoName);
        });
    });

    // Escape key closes modal
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && modal.style.display !== 'none') {
            hideDevelopmentModal();
        }
    });
}

function showDevelopmentModal() {
    var modal = document.getElementById('developmentModal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    // Apply translations
    I18n.translatePage();
}

function hideDevelopmentModal() {
    var modal = document.getElementById('developmentModal');
    if (!modal) return;

    modal.style.display = 'none';
    document.body.style.overflow = '';
}

function downloadLogo(logoName) {
    var downloadUrl = '/api/download/logo/' + logoName;

    var a = document.createElement('a');
    a.href = downloadUrl;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function loadSourceCodeInModal() {
    var codeSection = document.getElementById('developmentCodeSection');
    var codeContent = document.getElementById('developmentCodeContent');

    if (!codeSection || !codeContent) return;

    // Show loading state
    codeContent.textContent = 'Loading source code...';
    codeSection.style.display = 'block';

    // Fetch the TextileQC_Analysis.py content
    fetch('/api/source/textileqc/raw')
        .then(function (response) {
            if (!response.ok) throw new Error('Failed to load source code');
            return response.text();
        })
        .then(function (text) {
            codeContent.textContent = text;
            codeSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

            // Initialize copy button after code is loaded
            var copyCodeBtn = document.getElementById('btnCopyCode');
            if (copyCodeBtn && !copyCodeBtn.hasAttribute('data-initialized')) {
                copyCodeBtn.setAttribute('data-initialized', 'true');
                copyCodeBtn.addEventListener('click', function () {
                    copySourceCode();
                });
            }
        })
        .catch(function (error) {
            console.error('Error loading source code:', error);
            codeContent.textContent = 'Error loading source code. Please use the download button.';
        });
}

function copySourceCode() {
    var codeContent = document.getElementById('developmentCodeContent');
    if (!codeContent) return;

    var text = codeContent.textContent;

    // Use modern clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () {
            showCopySuccess();
        }).catch(function (err) {
            console.error('Failed to copy:', err);
            fallbackCopyTextToClipboard(text);
        });
    } else {
        fallbackCopyTextToClipboard(text);
    }
}

function fallbackCopyTextToClipboard(text) {
    var textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        var successful = document.execCommand('copy');
        if (successful) {
            showCopySuccess();
        } else {
            alert('Failed to copy code. Please select and copy manually.');
        }
    } catch (err) {
        console.error('Fallback copy failed:', err);
        alert('Failed to copy code. Please select and copy manually.');
    }

    document.body.removeChild(textArea);
}

function showCopySuccess() {
    var copyBtn = document.getElementById('btnCopyCode');
    if (!copyBtn) return;

    var originalText = copyBtn.innerHTML;
    copyBtn.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>✓ ' + I18n.t('development.copied') + '</span>';
    copyBtn.style.background = 'linear-gradient(135deg, #27AE60, #2ECC71)';
    copyBtn.style.color = '#ffffff';
    copyBtn.style.borderColor = '#27AE60';

    setTimeout(function () {
        copyBtn.innerHTML = originalText;
        copyBtn.style.background = '';
        copyBtn.style.color = '';
        copyBtn.style.borderColor = '';
    }, 2000);
}

