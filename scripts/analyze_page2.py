import re
from html.parser import HTMLParser

with open(r'C:\Users\LIYANG\.local\share\mimocode\tool-output\tool_ed48143e30019QoXNKS5HfR4I5', 'r', encoding='utf-8') as f:
    html = f.read()

# 搜索作者机构相关的HTML
print('=== art-authors-unit 相关HTML ===')
start = html.find('art-authors-unit')
if start > 0:
    print(html[start-50:start+500])

print('\n=== v4-art-keyword 相关HTML ===')
start = html.find('v4-art-keyword')
if start > 0:
    print(html[start-50:start+300])

print('\n=== v4-art-abstract 相关HTML ===')
start = html.find('v4-art-abstract')
if start > 0:
    print(html[start-50:start+300])

# 搜索funding相关
print('\n=== funding 相关HTML ===')
for m in re.finditer(r'(?:fund|acknowledg|sponsor)[^<]{0,200}', html, re.I):
    print(m.group()[:150])
    print('---')
