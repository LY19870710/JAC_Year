"""Test the fullTextUrl to get contentList."""
import requests
import json

# The fullTextUrl from the API response
full_text_url = "https://wqketang.cn-beijing.oss.aliyuncs.com/other/journal_prod/2026-06-23/dce925e9-49c0-44f3-a28c-1e23394da41e.gif?Expires=1783060508&OSSAccessKeyId=STS.NYzWbQCsLF8B6hd8nHpKvVqf2&Signature=tIm0A5U3VG18Y%2B0Qx5NHEM8W7s%3D&security-token=CAISywJ1q6Ft5B2yfSjIr5rPHNjlrqxt8fqpNE7V3G4dfMRaubTN0Dz2IHtKenhsBOsbtfk1mG5W5%2FgZlqJ9SptIAEfJa9d99MydcaYB%2BdGT1fau5Jko1beHewHKeTOZsebWZ%2BLmNqC%2FHt6md1HDkAJq3LL%2Bbk%2FMdle5MJqP%2B%2FUFB5ZtKWveVzddA8pMLQZPsdITMWCrVcygKRn3mGHdfiEK00he8TouufTinpHMskGA1Aell7Mvyt6vcsT%2BXa5FJ4xiVtq55utye5fa3TRYgxowr%2Fwo0v0YpGya5YzHXwcPskvdKZbo78UqLQlla6w%2BGqFJqvPxr%2Fp8t%2Fx5fWJKAezhVgs8cVM8JOjIqKOscIsiBmqCpTsA4gzSyCaJL7f%2FhREKa7znWGyxgyLY25K9yOXNh%2FA7x25WFZknm%2BbJoNLmr0pOOvEup%2BwbXAfUTzDnGoABYTb1nNdhFt4rLJ2zojKzgEdmidDJuJ8tCpMzAWGzzp%2Bxzztyexc1VPrwAsiLY%2F%2BUgFo3Lkxic0byM236fzh3KuweEIkdLIJwBcJBgYDXDSKsO%2FVlC649nNs0pDb4yzEv4PNKKmglvksLydtUFOhq40X7WPGosqbxRiQBoYbW9swgAA%3D%3D"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    "Referer": "https://www.sciopen.com/article/10.26599/JAC.2026.9221301",
}

print(f"Fetching: {full_text_url[:100]}...")
resp = requests.get(full_text_url, headers=HEADERS, timeout=30)
print(f"Status: {resp.status_code}")
print(f"Content-Type: {resp.headers.get('content-type', 'unknown')}")
print(f"Content-Length: {len(resp.text)}")
print(f"\n=== Response (first 3000 chars) ===")
print(resp.text[:3000])

# Try to parse as JSON
try:
    data = json.loads(resp.text)
    print(f"\n=== Parsed JSON ===")
    print(f"Type: {type(data)}")
    if isinstance(data, list):
        print(f"Length: {len(data)}")
        if data:
            print(f"First item keys: {list(data[0].keys()) if isinstance(data[0], dict) else type(data[0])}")
            print(f"First item: {json.dumps(data[0], ensure_ascii=False)[:500]}")
    elif isinstance(data, dict):
        print(f"Keys: {list(data.keys())}")
except json.JSONDecodeError:
    print("\nNot valid JSON - might be a different format")
    # Check if it starts with specific characters
    print(f"First 50 chars: {repr(resp.text[:50])}")
