#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_stats.py — 统计函数测试
"""
import pytest
import sys
import sqlite3
from pathlib import Path

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from stats import get_stats


class TestGetStats:
    """测试统计函数"""

    def test_get_stats_with_empty_db(self):
        """测试空数据库"""
        conn = sqlite3.connect(":memory:")
        conn.execute("""
            CREATE TABLE articles (
                id INTEGER PRIMARY KEY,
                year INTEGER,
                volume INTEGER,
                issue INTEGER,
                month TEXT,
                title TEXT,
                authors TEXT,
                affiliations TEXT,
                corresponding_author TEXT,
                corresponding_email TEXT,
                doi TEXT,
                type TEXT,
                url TEXT,
                research_area_id INTEGER,
                research_area TEXT,
                research_area_zh TEXT
            )
        """)
        
        stats = get_stats(conn)
        assert stats["total"] == 0
        assert stats["years"] == {}
        assert stats["types"] == {}
        assert stats["areas"] == []
        assert stats["top_authors"] == []
        conn.close()

    def test_get_stats_with_data(self):
        """测试有数据的数据库"""
        conn = sqlite3.connect(":memory:")
        conn.execute("""
            CREATE TABLE articles (
                id INTEGER PRIMARY KEY,
                year INTEGER,
                volume INTEGER,
                issue INTEGER,
                month TEXT,
                title TEXT,
                authors TEXT,
                affiliations TEXT,
                corresponding_author TEXT,
                corresponding_email TEXT,
                doi TEXT,
                type TEXT,
                url TEXT,
                research_area_id INTEGER,
                research_area TEXT,
                research_area_zh TEXT
            )
        """)
        
        # 插入测试数据
        test_data = [
            (2025, 1, 1, "Jan", "Title 1", "Author A, Author B", "", "", "", "10.1234/1", "Research Article", "", 1, "UHTC", "超高温陶瓷"),
            (2025, 1, 2, "Feb", "Title 2", "Author A, Author C", "", "", "", "10.1234/2", "Review", "", 2, "TBC", "热障涂层"),
            (2024, 2, 1, "Mar", "Title 3", "Author B, Author D", "", "", "", "10.1234/3", "Research Article", "", 1, "UHTC", "超高温陶瓷"),
        ]
        
        conn.executemany("""
            INSERT INTO articles (year, volume, issue, month, title, authors, affiliations, 
                                corresponding_author, corresponding_email, doi, type, url,
                                research_area_id, research_area, research_area_zh)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, test_data)
        conn.commit()
        
        stats = get_stats(conn)
        assert stats["total"] == 3
        assert stats["years"][2025] == 2
        assert stats["years"][2024] == 1
        assert stats["types"]["Research Article"] == 2
        assert stats["types"]["Review"] == 1
        assert len(stats["top_authors"]) > 0
        conn.close()
