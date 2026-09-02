"""Test the full_text API endpoint."""
import requests
import json

BASE_URL = "https://www.sciopen.com"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Referer": "https://www.sciopen.com/article/10.26599/JAC.2026.9221301",
}

doi = "10.26599/JAC.2026.9221301"

# Try the full_text API
url = f"{BASE_URL}/article/full_text?doi={doi}"
print(f"Fetching: {url}")
resp = requests.get(url, headers=HEADERS, timeout=30)
print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type', 'unknown')}")
print(f"Content-Length: {len(resp.text)}")
print(f"\n=== Response (first 3000 chars) ===")
print(resp.text[:3000])

# Also try the reference list API
print("\n\n=== Reference list API ===")
ref_url = f"{BASE_URL}/article/reference/list?doi={doi}"
print(f"Fetching: {ref_url}")
resp2 = requests.get(ref_url, headers=HEADERS, timeout=30)
print(f"Status: {resp2.status_code}")
print(f"Content-Length: {len(resp2.text)}")
print(f"Response: {resp2.text[:2000]}")

# Try article info API
print("\n\n=== Article info API ===")
info_url = f"{BASE_URL}/article/info?doi={doi}"
print(f"Fetching: {info_url}")
resp3 = requests.get(info_url, headers=HEADERS, timeout=30)
print(f"Status: {resp3.status_code}")
print(f"Content-Length: {len(resp3.text)}")
print(f"Response: {resp3.text[:2000]}")
