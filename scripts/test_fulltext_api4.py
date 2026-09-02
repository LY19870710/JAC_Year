"""Check all content fields in the API response."""
import requests
import json
import re

# Load the saved response
with open(r'D:/Claw/JAC_Year/scripts/full_text_api_response.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

obj = data.get('object', {})

# Check images
images = obj.get('images', [])
print(f"=== Images: {len(images)} ===")
for i, img in enumerate(images[:3]):
    if isinstance(img, dict):
        print(f"  [{i}] keys: {list(img.keys())}")
        for k, v in img.items():
            if isinstance(v, str) and len(v) > 100:
                print(f"    {k}: {v[:100]}...")
            else:
                print(f"    {k}: {v}")
    else:
        print(f"  [{i}] {str(img)[:200]}")

# Check tables
tables = obj.get('tables', [])
print(f"\n=== Tables: {len(tables)} ===")
for i, tab in enumerate(tables[:2]):
    if isinstance(tab, dict):
        print(f"  [{i}] keys: {list(tab.keys())}")
        for k, v in tab.items():
            if isinstance(v, str) and len(v) > 200:
                print(f"    {k}: {v[:200]}...")
            else:
                print(f"    {k}: {v}")
    else:
        print(f"  [{i}] {str(tab)[:200]}")

# Check notes
notes = obj.get('notes', [])
print(f"\n=== Notes: {len(notes)} ===")
for i, note in enumerate(notes):
    if isinstance(note, dict):
        print(f"  [{i}] keys: {list(note.keys())}")
        for k, v in note.items():
            if isinstance(v, str) and len(v) > 200:
                print(f"    {k}: {v[:200]}...")
            else:
                print(f"    {k}: {v}")
    else:
        print(f"  [{i}] {str(note)[:200]}")

# Check figImages
fig_imgs = obj.get('figImages', [])
print(f"\n=== FigImages: {len(fig_imgs)} ===")
for i, fig in enumerate(fig_imgs[:3]):
    if isinstance(fig, dict):
        print(f"  [{i}] keys: {list(fig.keys())}")
        for k, v in fig.items():
            if isinstance(v, str) and len(v) > 100:
                print(f"    {k}: {v[:100]}...")
            else:
                print(f"    {k}: {v}")
    else:
        print(f"  [{i}] {str(fig)[:200]}")

# Check fullTextUrl
print(f"\n=== fullTextUrl ===")
print(f"  {obj.get('fullTextUrl', '')}")

# Check imgKeyList
img_keys = obj.get('imgKeyList', [])
print(f"\n=== ImgKeyList: {len(img_keys)} ===")
for k in img_keys[:5]:
    print(f"  {k}")

# Check tabKeyList
tab_keys = obj.get('tabKeyList', [])
print(f"\n=== TabKeyList: {len(tab_keys)} ===")
for k in tab_keys:
    print(f"  {k}")
