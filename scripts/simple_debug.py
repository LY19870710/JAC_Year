# simple_debug.py - 用于 pdb 调试学习（单bug）

def divide(a, b):
    """除法函数"""
    result = a / b  # Bug: 没有处理 b=0
    return result

def calculate(numbers):
    """计算总和"""
    total = sum(numbers)
    return total

if __name__ == "__main__":
    # 测试1: 正常情况
    print("测试1: 正常除法")
    result = divide(10, 2)
    print(f"结果: {result}")

    # 测试2: 除零错误
    print("\n测试2: 除零错误")
    result = divide(10, 0)  # 这里会报错
    print(f"结果: {result}")

    # 测试3: 计算列表
    print("\n测试3: 计算列表")
    numbers = [1, 2, 3, 4, 5]
    total = calculate(numbers)
    print(f"总和: {total}")
