import re

with open(r'C:\Users\LIYANG\.local\share\mimocode\tool-output\tool_ed48143e30019QoXNKS5HfR4I5', 'r', encoding='utf-8') as f:
    html = f.read()

# 搜索 Funding 相关内容
print('=== Funding 内容 ===')
# 找到 Funding 相关的HTML
start = html.find("Funding")
while start > 0 and start < len(html):
    context = html[max(0,start-100):start+500]
    if '<' in context[:50]:  # 只找HTML标签中的
        print(context[:400])
        print('---')
    start = html.find("Funding", start + 1)
    if start - html.find("Funding") > 5000:
        break

# 搜索 Acknowledgements
print('\n=== Acknowledgements 内容 ===')
start = html.find("Acknowledgements")
while start > 0 and start < len(html):
    context = html[max(0,start-100):start+500]
    if '<' in context[:50]:
        print(context[:400])
        print('---')
    start = html.find("Acknowledgements", start + 1)
    if start - html.find("Acknowledgements") > 5000:
        break

# 搜索所有 script 中的数据
print('\n=== Script 中的 funding 数据 ===')
for m in re.finditer(r'<script[^>]*>(.*?)</script>', html, re.S):
    content = m.group(1)
    if 'fund' in content.lower() or 'acknowledg' in content.lower():
        print(content[:500])
        print('---')
