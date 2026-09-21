import re

with open('D:/Claw/JAC_Year/index.html', 'r', encoding='utf-8') as f:
    html = f.read()

# Find and replace the stripHtml function
pattern = r'function stripHtml\(text\) \{\s+if \(!text\) return \'\';\s+return text\.replace\(/<[^>\]\+>\>/g.*?\.trim\(\);\s+\}'
new_func = '''function stripHtml(text) {
  if (!text) return '';
  return text.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\\//g, '/').replace(/\s+/g, ' ').trim();
}'''

match = re.search(pattern, html, re.DOTALL)
if match:
    print("Found:", repr(match.group()[:150]))
    html = html[:match.start()] + new_func + html[match.end():]
    with open('D:/Claw/JAC_Year/index.html', 'w', encoding='utf-8') as f:
        f.write(html)
    print("Replaced")
else:
    print("Not found")
