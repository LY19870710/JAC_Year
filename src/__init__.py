#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
JAC_Year v0.2.0 (Linux)
JAC 年度文章抓取与管理系统

架构：
  fetch.py  — 抓取指定年份所有文章（调用 scrape.js 逐期抓取）
  db.py     — SQLite 数据库操作
  classify.py — 研究方向分类（10个方向）
  query.py  — 查询与统计
  server.py — Web 界面（复用 Jarvis 的 Express 改为 Python http.server）
"""
