import re

with open(r'C:\Users\LIYANG\.local\share\mimocode\tool-output\tool_ed48143e30019QoXNKS5HfR4I5', 'r', encoding='utf-8') as f:
    html = f.read()

# 搜索 articleKeyword 变量
start = html.find('var articleKeyword')
if start > 0:
    end = html.find(';', start)
    print('=== articleKeyword ===')
    print(html[start:end+1])

# 搜索 doi 和 articleId
start = html.find('var doi')
if start > 0:
    end = html.find(';', start)
    print('\n=== doi ===')
    print(html[start:end+1])

# 搜索 articleId
start = html.find('var articleId')
if start > 0:
    end = html.find(';', start)
    print('\n=== articleId ===')
    print(html[start:end+1])

# 搜索 API 请求
print('\n=== API 相关 ===')
for m in re.finditer(r'(?:api|article|fulltext|abstract)[^"\']*\.(?:json|do|action|php)', html, re.I):
    print(m.group())

# 搜索 axios 或 fetch 请求
for m in re.finditer(r'(?:axios|fetch|ajax)\s*\(\s*["\']([^"\']+)["\']', html):
    print(m.group(1))
