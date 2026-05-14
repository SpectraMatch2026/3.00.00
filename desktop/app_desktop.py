"""
SpectraMatch Desktop Application
─────────────────────────────────
Launches the Flask backend in a background thread and opens it
in a native desktop window using pywebview.

All backend logic is imported directly from the parent project —
no code duplication. Any changes to app.py or modules/ are
automatically reflected.
"""

import sys
import os
import threading
import socket
import time
import shutil
import tempfile
import urllib.request

# ── Ensure parent project is on sys.path ──────────────────────────
# When frozen by PyInstaller, _MEIPASS holds the temp extraction folder
if getattr(sys, 'frozen', False):
    BUNDLE_DIR = sys._MEIPASS
    DESKTOP_DIR = os.path.join(BUNDLE_DIR, 'desktop')
    PROJECT_DIR = BUNDLE_DIR
else:
    DESKTOP_DIR = os.path.dirname(os.path.abspath(__file__))
    PROJECT_DIR = os.path.dirname(DESKTOP_DIR)

if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

# ── Resolve paths ─────────────────────────────────────────────────
STATIC_DIR = os.path.join(PROJECT_DIR, 'static')
# Icon: prefer .ico generated from deslogo.png (multi-res, sharpest on Windows)
ICO_PATH = os.path.join(PROJECT_DIR, 'installer', 'spectramatch.ico')
LOGO_PATH = os.path.join(STATIC_DIR, 'images', 'deslogo.png')

if os.path.exists(ICO_PATH):
    ICON_PATH = ICO_PATH
else:
    ICON_PATH = LOGO_PATH

SPLASH_HTML = os.path.join(DESKTOP_DIR, 'splash.html')


# ── JS ↔ Python bridge (exposed as window.pywebview.api) ─────────
class Api:
    """Methods callable from JavaScript via window.pywebview.api.*"""

    def __init__(self, flask_port):
        self._port = flask_port
        self._window = None

    def set_window(self, win):
        self._window = win

    def save_report(self, url_path, default_name):
        """Fetch a report PDF from the Flask server and present a native
        Save-As dialog so the user can choose where to store it."""
        import webview
        try:
            full_url = f'http://127.0.0.1:{self._port}{url_path}'

            # Download to a temp file first
            fd, tmp_path = tempfile.mkstemp(suffix='.pdf')
            os.close(fd)
            urllib.request.urlretrieve(full_url, tmp_path)

            # Show native Save-As dialog
            home = os.path.expanduser('~')
            docs = os.path.join(home, 'Documents')
            save_dir = docs if os.path.isdir(docs) else home

            result = self._window.create_file_dialog(
                webview.SAVE_DIALOG,
                directory=save_dir,
                save_filename=default_name,
                file_types=('PDF Files (*.pdf)',),
            )

            if result:
                save_path = result if isinstance(result, str) else result[0]
                if save_path:
                    shutil.copy2(tmp_path, save_path)
                    os.remove(tmp_path)
                    return {'ok': True, 'path': save_path}

            # User cancelled
            os.remove(tmp_path)
            return {'ok': False, 'reason': 'cancelled'}

        except Exception as e:
            # Clean up temp on error
            try:
                os.remove(tmp_path)
            except Exception:
                pass
            return {'ok': False, 'reason': str(e)}

    def run_thesis_tests(self, current_settings, current_region_data, ref_file_info, sample_file_info):
        """Execute automated thesis testing sequence using current desktop settings.
        
        Runs 3 analyses with different alignment modes using current settings,
        captures real metrics, and creates organized thesis folder structure.
        
        Args:
            current_settings: Current desktop settings from collectSettings()
            current_region_data: Current region data from buildRegionData()
            ref_file_info: Reference file info {path, name, dataUrl} or None
            sample_file_info: Sample file info {path, name, dataUrl} or None
        """
        try:
            import webview
            from desktop.thesis_test_automation import run_thesis_tests

            home = os.path.expanduser('~')
            docs = os.path.join(home, 'Documents')
            save_dir = docs if os.path.isdir(docs) else home

            folder_result = self._window.create_file_dialog(
                webview.FOLDER_DIALOG,
                directory=save_dir,
            )
            if not folder_result:
                return {
                    'success': False,
                    'cancelled': True,
                    'error': 'Folder selection cancelled'
                }

            output_dir = folder_result if isinstance(folder_result, str) else folder_result[0]
            if not output_dir:
                return {
                    'success': False,
                    'cancelled': True,
                    'error': 'No output folder selected'
                }

            return run_thesis_tests(
                self._port,
                current_settings,
                current_region_data,
                ref_file_info,
                sample_file_info,
                output_dir,
            )
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'Failed to run thesis tests: {str(e)}'
            }
    
    def delete_thesis_database(self):
        """Delete the entire thesis folder and all its contents.
        
        Returns:
            dict: Result with success status and message
        """
        try:
            import shutil
            desktop_dir = os.path.dirname(os.path.abspath(__file__))
            project_dir = os.path.dirname(desktop_dir)
            thesis_dir = os.path.join(project_dir, 'thesis')
            
            if os.path.exists(thesis_dir):
                shutil.rmtree(thesis_dir)
                return {
                    'success': True,
                    'message': 'Thesis database deleted successfully'
                }
            else:
                return {
                    'success': True,
                    'message': 'Thesis database folder does not exist'
                }
        except Exception as e:
            import traceback
            traceback.print_exc()
            return {
                'success': False,
                'error': f'Failed to delete thesis database: {str(e)}'
            }


def find_free_port(start=5199):
    """Find an available TCP port starting from *start*."""
    for port in range(start, start + 100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('127.0.0.1', port))
                return port
        except OSError:
            continue
    raise RuntimeError('No free port found')


def start_flask(port):
    """Import and run the Flask app on the given port (blocking)."""
    from app import app
    app.run(host='127.0.0.1', port=port, debug=False, use_reloader=False, threaded=True)


def wait_for_server(port, timeout=30):
    """Block until the Flask server responds on *port*."""
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with socket.create_connection(('127.0.0.1', port), timeout=1):
                return True
        except OSError:
            time.sleep(0.3)
    return False


def main():
    import webview  # pywebview

    port = find_free_port()
    flask_url = f'http://127.0.0.1:{port}'

    # ── JS API bridge ─────────────────────────────────────────
    api = Api(port)

    # ── Start Flask in a daemon thread ────────────────────────
    flask_thread = threading.Thread(target=start_flask, args=(port,), daemon=True)
    flask_thread.start()

    # ── Create the desktop window ─────────────────────────────
    # Show splash while Flask boots
    splash_uri = f'file:///{SPLASH_HTML.replace(os.sep, "/")}'

    window = webview.create_window(
        title='SpectraMatch Desktop',
        url=splash_uri,
        js_api=api,
        width=1380,
        height=860,
        min_size=(1024, 700),
        text_select=True,
        zoomable=True,
        maximized=True,
    )

    # Give the API object a reference to the window
    api.set_window(window)

    def on_shown():
        """Called once the window is visible — wait for Flask, then navigate."""
        if wait_for_server(port):
            window.load_url(flask_url + '/desktop')
        else:
            window.load_html(
                '<html><body style="background:#0a0e1a;color:#e04050;'
                'display:flex;align-items:center;justify-content:center;'
                'height:100vh;font-family:Segoe UI,sans-serif;font-size:18px;">'
                '<div style="text-align:center">'
                '<h2>⚠ Backend failed to start</h2>'
                '<p style="color:#8fa8ff;margin-top:12px;">Check that all Python '
                'dependencies are installed:<br><code>pip install -r requirements.txt '
                'pywebview</code></p></div></body></html>'
            )

    window.events.shown += on_shown

    # ── Start the GUI event loop (blocking) ───────────────────
    webview.start(
        debug=('--dev' in sys.argv),
        gui='edgechromium',          # Use Edge/Chromium backend on Windows
        icon=ICON_PATH,
    )


if __name__ == '__main__':
    main()
