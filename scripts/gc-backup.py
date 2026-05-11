"""GoatCounter backup script - JSON page views + CSV raw pageviews."""

import csv
import gzip
import io
import json
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from urllib.request import Request, urlopen
from urllib.error import HTTPError

GC_CODE = os.environ["GC_CODE"]
GC_TOKEN = os.environ["GC_TOKEN"]
BACKUP_DIR = "data/goatcounter-backup"
API_BASE = f"https://{GC_CODE}.goatcounter.com/api/v0"
COUNTER_BASE = f"https://{GC_CODE}.goatcounter.com/counter"


def api_get_json(path):
    """GET request to GoatCounter API, returns parsed JSON or None."""
    url = f"{API_BASE}{path}"
    req = Request(url, headers={"Authorization": f"Bearer {GC_TOKEN}"})
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        print(f"  HTTP {e.code}: {e.read().decode()[:200]}")
        return None


def api_post(path, body=None):
    """POST request to GoatCounter API."""
    url = f"{API_BASE}{path}"
    data = json.dumps(body or {}).encode()
    req = Request(url, data=data, headers={
        "Authorization": f"Bearer {GC_TOKEN}",
        "Content-Type": "application/json",
    })
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read()), resp.status
    except HTTPError as e:
        body_text = e.read().decode()
        print(f"  HTTP {e.code}: {body_text[:200]}")
        return {"error": body_text}, e.code


def counter_json(path):
    """Get page view count from GoatCounter public counter endpoint."""
    url = f"{COUNTER_BASE}/{path}.json"
    req = Request(url, headers={"Authorization": f"Bearer {GC_TOKEN}"})
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except Exception:
        return None


def backup_page_views_json(date_str):
    """Backup page view counts via counter JSON endpoint."""
    print("=== JSON Page Views Backup ===")
    os.makedirs(BACKUP_DIR, exist_ok=True)

    # Get all known paths from the site
    # Scan content directory for Hugo page paths
    page_paths = ["/"]
    for root, dirs, files in os.walk("content"):
        for f in files:
            if not f.endswith(".md"):
                continue
            rel = os.path.relpath(os.path.join(root, f), "content")
            rel = "/" + rel.replace("\\", "/").replace(".md", "/")
            # Skip standalone pages that have their own slug
            page_paths.append(rel)

    # Also add the TOTAL path for site-wide count
    page_paths.append("TOTAL")

    print(f"Fetching view counts for {len(page_paths)} paths...")
    results = []
    for path in page_paths:
        display = path
        api_path = path.rstrip("/")
        if path == "TOTAL":
            api_path = "TOTAL"
        data = counter_json(api_path)
        if data and data.get("count"):
            count_str = data.get("count", "0")
            count = int(count_str.replace(",", ""))
            results.append({"path": display, "views": count})
            print(f"  {display} — {count_str} views")

    results.sort(key=lambda x: x["views"], reverse=True)

    total_views = sum(r["views"] for r in results if r["path"] != "TOTAL")

    backup = {
        "date": date_str,
        "total_views": total_views,
        "total_pages": len([r for r in results if r["path"] != "TOTAL"]),
        "pages": results,
    }

    out_path = f"{BACKUP_DIR}/{date_str}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(results)} entries to {out_path}")


def backup_csv_raw(date_str):
    """Backup raw pageviews via Export API (requires Individual pageviews enabled)."""
    print("\n=== CSV Raw Pageviews Backup ===")

    last_file = f"{BACKUP_DIR}/.last-export"
    body = {"format": "csv"}
    if os.path.exists(last_file):
        with open(last_file) as f:
            last_id = f.read().strip()
        if last_id and last_id != "0":
            body["start_from_hit_id"] = int(last_id)
            print(f"Incremental export from hit_id={last_id}")

    print("Creating export...")
    resp, status = api_post("/export", body)
    print(f"  Response: {json.dumps(resp)[:300]}")

    if not status or status < 200 or status >= 300:
        print("WARN: CSV export failed (enable 'Collect individual pageviews' in settings)")
        return

    export_id = resp.get("id")
    if not export_id:
        print("WARN: Could not get export ID")
        return

    print(f"  Export ID: {export_id}")
    for attempt in range(24):
        time.sleep(5)
        status_resp = api_get_json(f"/export/{export_id}")
        if not status_resp:
            continue
        finished = status_resp.get("finished_at")
        error = status_resp.get("error")
        num_rows = status_resp.get("num_rows", 0)
        print(f"  Attempt {attempt + 1}: finished={bool(finished)} rows={num_rows}")

        if error:
            print(f"ERROR: Export failed: {error}")
            return

        if finished:
            last_hit = status_resp.get("last_hit_id", 0)
            os.makedirs(BACKUP_DIR, exist_ok=True)
            with open(last_file, "w") as f:
                f.write(str(last_hit))

            if num_rows > 0:
                download_url = f"{API_BASE}/export/{export_id}/download"
                req = Request(download_url, headers={"Authorization": f"Bearer {GC_TOKEN}"})
                gz_path = f"{BACKUP_DIR}/{date_str}-raw.csv.gz"
                csv_path = f"{BACKUP_DIR}/{date_str}-raw.csv"

                with urlopen(req) as resp_file, open(gz_path, "wb") as out:
                    out.write(resp_file.read())

                with gzip.open(gz_path, "rb") as gz_in, open(csv_path, "wb") as csv_out:
                    csv_out.write(gz_in.read())
                os.remove(gz_path)

                print(f"  CSV saved: {csv_path} ({num_rows} rows)")
                with open(csv_path) as f:
                    for i, line in enumerate(f):
                        if i >= 3:
                            break
                        print(f"    {line.rstrip()}")
            else:
                print("  No new raw pageviews to export")
            return

    print("WARN: CSV export timed out")


if __name__ == "__main__":
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    backup_page_views_json(date_str)
    backup_csv_raw(date_str)
