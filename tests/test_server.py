#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
test_server.py — Web服务器核心函数测试
"""
import pytest
import sys
from pathlib import Path

# 添加src到路径
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))
from server import extract_institution


class TestExtractInstitution:
    """测试机构提取函数"""

    def test_simple_institution(self):
        """测试简单机构提取"""
        aff = "Tsinghua University, Beijing, China"
        short, original = extract_institution(aff)
        assert short == "Tsinghua University"
        assert original == aff

    def test_multiple_institutions(self):
        """测试多个机构提取 - 只返回最后一个"""
        aff = "School of Materials Science and Engineering, Gyeongsang National University, Gyeongsangnam-do 52828, Republic of Korea"
        short, original = extract_institution(aff)
        assert short == "Gyeongsang National University"

    def test_institution_with_number_prefix(self):
        """测试带数字前缀的机构"""
        aff = "1Department of Materials Science, Stanford University, USA"
        short, original = extract_institution(aff)
        assert "Stanford University" in short

    def test_institution_with_noise(self):
        """测试带噪音的机构"""
        aff = "Key Laboratory of Advanced Ceramics, Shanghai, China"
        short, original = extract_institution(aff)
        assert "Key Laboratory of Advanced Ceramics" in short

    def test_empty_input(self):
        """测试空输入"""
        short, original = extract_institution("")
        assert short == ""
        assert original == ""

    def test_noise_only(self):
        """测试纯噪音输入"""
        aff = "Ltd."
        short, original = extract_institution(aff)
        assert short == ""

    def test_institution_with_city_zip(self):
        """测试带城市邮编的机构"""
        aff = "Henan University, Kaifeng 475004, China"
        short, original = extract_institution(aff)
        assert "Henan University" in short

    def test_multiple_commas(self):
        """测试多个逗号分隔"""
        aff = "School of Materials, University of Science and Technology Beijing, Beijing 100083, China"
        short, original = extract_institution(aff)
        assert "University of Science and Technology Beijing" in short

    def test_contributed_equally_noise(self):
        """测试"contributed equally"噪音"""
        aff = "contributed equally, Department of Chemistry, MIT, USA"
        short, original = extract_institution(aff)
        assert "MIT" in short

    def test_institution_with_ltd(self):
        """测试带Ltd.的机构"""
        aff = "Advanced Materials Ltd., Tokyo, Japan"
        short, original = extract_institution(aff)
        assert "Advanced Materials" in short

    def test_chinese_institution(self):
        """测试中文机构"""
        aff = "中国科学院化学研究所, 北京 100190, 中国"
        short, original = extract_institution(aff)
        assert "中国科学院化学研究所" in short

    def test_complex_institution(self):
        """测试复杂机构"""
        aff = "State Key Laboratory of Fine Chemicals, Dalian University of Technology, Dalian 116024, China"
        short, original = extract_institution(aff)
        assert "Dalian University of Technology" in short


class TestEscFunction:
    """测试HTML转义函数"""

    def test_esc_basic(self):
        """测试基本转义"""
        from server import esc
        assert esc("<script>") == "&lt;script&gt;"
        assert esc("a&b") == "a&amp;b"
        assert esc('"test"') == "&quot;test&quot;"

    def test_esc_none(self):
        """测试None处理"""
        from server import esc
        assert esc(None) == ""

    def test_esc_empty_string(self):
        """测试空字符串"""
        from server import esc
        assert esc("") == ""
