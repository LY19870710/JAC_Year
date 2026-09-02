#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_classify.py — 研究方向分类器测试
"""
import pytest
import sys
from pathlib import Path

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from classify import classify, classify_batch, area_stats, RESEARCH_AREAS


class TestClassify:
    """测试classify函数"""

    def test_uhtc_classification(self):
        """测试超高温陶瓷分类"""
        title = "Ultra-high temperature ceramics for hypersonic applications"
        result = classify(title)
        assert result["id"] == 1
        assert result["name_zh"] == "超高温陶瓷"

    def test_tbc_classification(self):
        """测试热障涂层分类"""
        title = "Thermal barrier coating for gas turbine blades"
        result = classify(title)
        assert result["id"] == 2
        assert result["name_zh"] == "环境/热障涂层"

    def test_cmc_classification(self):
        """测试陶瓷基复合材料分类"""
        title = "Ceramic matrix composite with fiber reinforcement"
        result = classify(title)
        assert result["id"] == 3
        assert result["name_zh"] == "陶瓷基复合材料"

    def test_dielectric_classification(self):
        """测试介电陶瓷分类"""
        title = "Lead-free piezoelectric ceramics for MLCC applications"
        result = classify(title)
        assert result["id"] == 4
        assert result["name_zh"] == "介电/压电/铁电陶瓷"

    def test_other_classification(self):
        """测试未匹配分类"""
        title = "This is a random title with no keywords"
        result = classify(title)
        assert result["id"] == 0
        assert result["name_zh"] == "其他"

    def test_case_insensitive(self):
        """测试大小写不敏感"""
        title = "ULTRA-HIGH TEMPERATURE CERAMICS"
        result = classify(title)
        assert result["id"] == 1

    def test_partial_keyword_match(self):
        """测试部分关键词匹配"""
        title = "Study on sintering behavior of alumina"
        result = classify(title)
        assert result["id"] == 6  # 烧结、制备与致密化


class TestClassifyBatch:
    """测试批量分类函数"""

    def test_batch_classification(self):
        """测试批量分类"""
        articles = [
            {"title": "Ultra-high temperature ceramics"},
            {"title": "Thermal barrier coating"},
            {"title": "Random title"},
        ]
        result = classify_batch(articles)
        assert len(result) == 3
        assert result[0]["research_area_id"] == 1
        assert result[1]["research_area_id"] == 2
        assert result[2]["research_area_id"] == 0

    def test_batch_preserves_original_fields(self):
        """测试批量分类保留原始字段"""
        articles = [{"title": "Test", "doi": "10.1234/test"}]
        result = classify_batch(articles)
        assert result[0]["doi"] == "10.1234/test"
        assert "research_area_id" in result[0]


class TestAreaStats:
    """测试区域统计函数"""

    def test_area_stats(self):
        """测试区域统计"""
        articles = [
            {"research_area": "Ultra-High Temperature Ceramics (UHTC)"},
            {"research_area": "Ultra-High Temperature Ceramics (UHTC)"},
            {"research_area": "Other"},
        ]
        stats = area_stats(articles)
        assert len(stats) > 0
        # 找到UHTC的统计
        uhtc_stat = next(s for s in stats if s["id"] == 1)
        assert uhtc_stat["count"] == 2


class TestResearchAreas:
    """测试研究方向定义"""

    def test_areas_count(self):
        """测试研究方向数量"""
        assert len(RESEARCH_AREAS) == 12

    def test_each_area_has_required_fields(self):
        """测试每个研究方向都有必需字段"""
        for area in RESEARCH_AREAS:
            assert "id" in area
            assert "name" in area
            assert "name_zh" in area
            assert "keywords" in area
            assert len(area["keywords"]) > 0
