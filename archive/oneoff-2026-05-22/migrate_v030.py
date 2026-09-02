#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""JAC_Year v0.3.0 - 数据库迁移脚本"""
import sqlite3
import sys
import os

if sys.platform == 'win32':
    os.environ['PYTHONIOENCODING'] = 'utf-8'
    sys.stdout.reconfigure(encoding='utf-8')

conn = sqlite3.connect('jac_articles.db')
cur = conn.cursor()

# 1. 添加 funding 字段
try:
    cur.execute("ALTER TABLE articles ADD COLUMN funding TEXT DEFAULT ''")
    print('[OK] Added: funding')
except Exception as e:
    print(f'[SKIP] funding: {e}')

# 2. 添加 corresponding_json 字段（JSON格式的通讯作者-邮箱对应关系）
try:
    cur.execute("ALTER TABLE articles ADD COLUMN corresponding_json TEXT DEFAULT '[]'")
    print('[OK] Added: corresponding_json')
except Exception as e:
    print(f'[SKIP] corresponding_json: {e}')

conn.commit()

# 验证
cur.execute("PRAGMA table_info(articles)")
cols = [r[1] for r in cur.fetchall()]
print(f'\n当前字段: {cols}')

conn.close()
print('\n数据库迁移完成')
