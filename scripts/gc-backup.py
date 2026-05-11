"""GoatCounter backup script - JSON stats + CSV raw pageviews."""

import json
import os
import sys
import time
import gzip
from datetime import datetime, timedelta
from urllib.request import Request, urlopen
from urllib.error import HTTPError

GC_CODE = os.environ["GC_CODE"]
GC_TOKEN = os.environ["GC_TOKEN"]
BACKUP_DIR = "data/goatcounter-backup"
API_BASE = f"https://{GC_CODE}.goatcounter.com/api/v0"


def api_get(path, params=None):
    url = f"{API_BASE}{path}"
    if params:
        qs = "&".join(f"{k}={v}" for k, v in params.items() if v)
        url += f"?{qs}"
    req = Request(url, headers={"Authorization": f"Bearer {GC_TOKEN}"})
    try:
        with urlopen(req) as resp:
            return json.loads(resp.read())
    except HTTPError as e:
        print(f"HTTP {e.code}: {e.read().decode()}")
        return None


def api_post(path, body=None):
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
        print(f"HTTP {e.code}: {body_text}")
        return {"error": body_text}, e.code


def backup_hits_json(date_str, days):
    print("=== JSON Stats Backup ===")
    os.makedirs(BACKUP_DIR, exist_ok=True)

    params = {}
    if days and days != "0":
        start = (datetime.utcnow() - timedelta(days=int(days))).strftime(
            "%Y-%m-%dT00:00:00Z"
        )
        params["start"] = start

    all_hits = []
    page = 0
    while True:
        p = {**params, "limit": "100", "offset": str(page * 100)}
        print(f"Fetching hits page {page}...")
        data = api_get("/hits", p)
        if not data:
            print("ERROR: Failed to fetch hits")
            sys.exit(1)

        hits = data.get("hits", [])
        all_hits.extend(hits)
        total = data.get("total", 0)
        more = data.get("more", False)
        print(f"  Got {len(hits)} pages (total={total}, more={more})")

        if not more:
            break
        page += 1

    print("Fetching stats...")
    stats = api_get("/stats", params) or {}

    backup = {
        "date": date_str,
        "days": days,
        "total_pages": len(all_hits),
        "hits": all_hits,
        "stats": stats,
    }

    out_path = f"{BACKUP_DIR}/{date_str}.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(backup, f, ensure_ascii=False, indent=2)

    print(f"Saved {len(all_hits)} pages to {out_path}")
    print("--- Backup Summary ---")
    print(f"Total pages: {len(all_hits)}")
    for h in all_hits[:10]:
        print(f"  {h.get('path', '')} — {h.get('count', 0)} visits")


def backup_csv_raw(date_str):
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
    print(f"Response: {json.dumps(resp)}")

    if status and (status < 200 or status >= 300):
        print("WARN: CSV export failed (enable 'Collect individual pageviews' in settings)")
        return

    export_id = resp.get("id")
    if not export_id:
        print("WARN: Could not get export ID")
        return

    for attempt in range(24):
        time.sleep(5)
        status_resp = api_get(f"/export/{export_id}")
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
            with open(last_file, "w") as f:
                f.write(str(last_hit))

            if num_rows > 0:
                download_url = f"{API_BASE}/export/{export_id}/download"
                req = Request(
                    download_url, headers={"Authorization": f"Bearer {GC_TOKEN}"}
                )
                gz_path = f"{BACKUP_DIR}/{date_str}-raw.csv.gz"
                csv_path = f"{BACKUP_DIR}/{date_str}-raw.csv"

                with urlopen(req) as resp_file, open(gz_path, "wb") as out:
                    out.write(resp_file.read())

                with gzip.open(gz_path, "rb") as gz_in, open(csv_path, "wb") as csv_out:
                    csv_out.write(gz_in.read())
                os.remove(gz_path)

                print(f"CSV saved: {csv_path} ({num_rows} rows)")
                with open(csv_path) as f:
                    for i, line in enumerate(f):
                        if i >= 3:
                            break
                        print(f"  {line.rstrip()}")
            else:
                print("No new raw pageviews to export")
            return

    print("WARN: CSV export timed out")


if __name__ == "__main__":
    date_str = datetime.utcnow().strftime("%Y-%m-%d")
    days = os.environ.get("BACKUP_DAYS", "7")
    backup_hits_json(date_str, days)
    backup_csv_raw(date_str)
