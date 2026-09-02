import re
import json

with open(r'C:\Users\LIYANG\.local\share\mimocode\tool-output\tool_ed48143e30019QoXNKS5HfR4I5', 'r', encoding='utf-8') as f:
    html = f.read()

# 搜索 fullTextInfo 变量
start = html.find('var fullTextInfo')
if start > 0:
    # 找到结束的分号
    end = html.find(';', start)
    print('=== fullTextInfo 变量 ===')
    print(html[start:end+1][:2000])
else:
    print('未找到 fullTextInfo')

# 搜索 funding-statement
print('\n=== funding-statement 相关 ===')
matches = re.findall(r'fundingStatements.*?\]', html)
for m in matches[:3]:
    print(m[:500])

# 搜索 acknowledgement
print('\n=== acknowledgement 相关 ===')
matches = re.findall(r'acknowledgement.*?["\']', html)
for m in matches[:3]:
    print(m[:300])
