"""Check if content is in the full_text API but needs different parsing."""
import json
import re

with open(r'D:/Claw/JAC_Year/scripts/full_text_api_response.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

obj = data.get('object', {})

# Check contentList more carefully
content_list = obj.get('contentList', '')
print(f"contentList type: {type(content_list)}")
print(f"contentList length: {len(content_list)}")
print(f"contentList value: {repr(content_list[:500])}")

# Maybe contentList is a key to look up content elsewhere?
# Or maybe the trees have content that's not in the top level?

# Let's dump ALL fields that have non-empty string/list/dict values
print("\n=== All non-empty fields ===")
for key, val in obj.items():
    if isinstance(val, str) and val.strip():
        print(f"  {key}: {val[:200]}")
    elif isinstance(val, list) and len(val) > 0:
        print(f"  {key}: list[{len(val)}]")
        # Check first item
        if isinstance(val[0], dict):
            for k2, v2 in val[0].items():
                if isinstance(v2, str) and v2.strip():
                    print(f"    [{k2}]: {v2[:150]}")
    elif isinstance(val, dict) and val:
        print(f"  {key}: dict with keys {list(val.keys())}")

# Let's check if the trees have content at deeper levels
print("\n=== Full tree dump (first 2 nodes) ===")
trees = obj.get('trees', [])
def dump_node(node, indent=0):
    prefix = "  " * indent
    content = node.get('content', '')
    content_text = re.sub(r'<[^>]+>', '', content).strip() if content else ''
    print(f"{prefix}key={node.get('key')}, title={node.get('title')}, content_len={len(content)}, content_text_len={len(content_text)}")
    if content_text:
        print(f"{prefix}  content_text: {content_text[:200]}")
    for child in node.get('children', []):
        dump_node(child, indent + 1)

for tree in trees[:2]:
    dump_node(tree)
