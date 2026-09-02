import re

with open(r'C:\Users\LIYANG\.local\share\mimocode\tool-output\tool_ed48143e30019QoXNKS5HfR4I5', 'r', encoding='utf-8') as f:
    html = f.read()

# 搜索 citation_author_institution
matches = re.findall(r'citation_author_institution.*?content="([^"]+)"', html)
print('=== 作者机构 ===')
for m in matches[:15]:
    print(m[:120])

# 搜索关键词
matches2 = re.findall(r'citation_keywords.*?content="([^"]+)"', html)
print('\n=== 关键词 ===')
for m in matches2:
    print(m)

# 搜索页面中的 class
matches3 = re.findall(r'class="([^"]*(?:affil|institution|author|funding|keyword|abstract)[^"]*)"', html, re.I)
print('\n=== 相关class ===')
for m in set(matches3):
    print(m)
