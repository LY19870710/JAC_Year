# tests/test_basic.py - 学习 pytest 基础语法
import pytest


def add(a, b):
    """简单加法函数"""
    return a + b


def multiply(a, b):
    """简单乘法函数"""
    return a * b


def test_add():
    """测试加法"""
    assert add(2, 3) == 5
    assert add(-1, 1) == 0
    assert add(0, 0) == 0
    assert add(100, 200) == 300


def test_multiply():
    """测试乘法"""
    assert multiply(2, 3) == 6
    assert multiply(-1, 1) == -1
    assert multiply(0, 5) == 0
    assert multiply(10, 10) == 100


def test_string_operations():
    """测试字符串操作"""
    assert "hello".upper() == "HELLO"
    assert "WORLD".lower() == "world"
    assert "  test  ".strip() == "test"


def test_exception():
    """测试异常处理"""
    with pytest.raises(ZeroDivisionError):
        1 / 0
    with pytest.raises(ValueError):
        int("not a number")


def test_assertion_with_message():
    """测试带消息的断言"""
    result = add(2, 2)
    assert result == 4, f"Expected 4, got {result}"


# 参数化测试（pytest 高级功能）


@pytest.mark.parametrize(
    "a,b,expected",
    [
        (1, 2, 3),
        (-1, 1, 0),
        (0, 0, 0),
        (100, 200, 300),
    ],
)
def test_add_parametrized(a, b, expected):
    """参数化测试加法"""
    assert add(a, b) == expected
