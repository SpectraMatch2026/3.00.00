from __future__ import annotations

import argparse
import base64
import json
import shutil
import subprocess
import time
from pathlib import Path

import requests
import websocket


CHROME = Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe")
PROFILE_DIR = Path(r"C:\Users\gh\Desktop\SPECTRAMATCH_PROJECT\tmp_browser_profile")
NORMAL_UA = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/135.0.0.0 Safari/537.36"
)


def wait_for_page(port: int, timeout_s: float = 30.0) -> dict:
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            targets = requests.get(f"http://127.0.0.1:{port}/json/list", timeout=2).json()
        except Exception:
            time.sleep(0.5)
            continue
        for target in targets:
            if target.get("type") == "page":
                return target
        time.sleep(0.5)
    raise RuntimeError("No page target available through CDP")


def cdp_send(ws: websocket.WebSocket, msg_id: int, method: str, params: dict | None = None) -> dict:
    ws.send(json.dumps({"id": msg_id, "method": method, "params": params or {}}))
    while True:
        resp = json.loads(ws.recv())
        if resp.get("id") == msg_id:
            return resp


def print_url_to_pdf(url: str, output: Path, port: int) -> None:
    profile_dir = PROFILE_DIR.parent / f"{PROFILE_DIR.name}_{port}"
    if profile_dir.exists():
        shutil.rmtree(profile_dir, ignore_errors=True)
    profile_dir.mkdir(parents=True, exist_ok=True)
    output.parent.mkdir(parents=True, exist_ok=True)

    proc = subprocess.Popen(
        [
            str(CHROME),
            "--headless=new",
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            "--disable-blink-features=AutomationControlled",
            f"--user-agent={NORMAL_UA}",
            "--window-size=1400,2200",
            f"--user-data-dir={profile_dir}",
            url,
        ]
    )

    try:
        page = wait_for_page(port)
        ws = websocket.create_connection(
            page["webSocketDebuggerUrl"],
            timeout=20,
            origin=f"http://127.0.0.1:{port}",
        )

        try:
            msg_id = 1
            cdp_send(ws, msg_id, "Page.enable")
            msg_id += 1
            time.sleep(8)
            title = cdp_send(ws, msg_id, "Runtime.evaluate", {"expression": "document.title", "returnByValue": True})
            msg_id += 1
            body = cdp_send(
                ws,
                msg_id,
                {
                    "expression": "document.body.innerText.slice(0,1000)",
                    "returnByValue": True,
                },
            )
            msg_id += 1
            title_value = ((title.get("result") or {}).get("result") or {}).get("value", "")
            body_value = ((body.get("result") or {}).get("result") or {}).get("value", "")
            print(f"TITLE: {title_value.encode('ascii', 'ignore').decode()}")
            print(f"BODY: {body_value.encode('ascii', 'ignore').decode()}")
            resp = cdp_send(
                ws,
                msg_id,
                "Page.printToPDF",
                {
                    "printBackground": True,
                    "paperWidth": 8.27,
                    "paperHeight": 11.69,
                    "marginTop": 0.4,
                    "marginBottom": 0.4,
                    "marginLeft": 0.4,
                    "marginRight": 0.4,
                },
            )
            if "result" not in resp or "data" not in resp["result"]:
                raise RuntimeError(f"CDP print failed: {resp}")
            output.write_bytes(base64.b64decode(resp["result"]["data"]))
        finally:
            ws.close()
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except Exception:
            proc.kill()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("url")
    parser.add_argument("output")
    parser.add_argument("--port", type=int, default=9224)
    args = parser.parse_args()

    print_url_to_pdf(args.url, Path(args.output), args.port)
    print(Path(args.output))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
