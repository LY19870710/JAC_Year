# debug_demo.py - 用于学习 pdb 调试

def divide(a, b):
    """除法函数 - 故意有bug"""
    result = a / b  # Bug: 没有处理 b=0 的情况
    return result

def calculate_average(numbers):
    """计算平均值 - 故意有bug"""
    total = sum(numbers)
    count = len(numbers)
    average = total / count  # Bug: 没有处理空列表
    return average

def process_data(data):
    """处理数据 - 故意有bug"""
    result = []
    for item in data:
        # Bug: 没有检查 item 是否为数字
        value = item * 2
        result.append(value)
    return result

if __name__ == "__main__":
    # 测试1: 除零错误
    print("测试1: 除法")
    try:
        result = divide(10, 0)
        print(f"结果: {result}")
    except ZeroDivisionError as e:
        print(f"错误: {e}")

    # 测试2: 空列表
    print("\n测试2: 计算平均值")
    try:
        avg = calculate_average([])
        print(f"平均值: {avg}")
    except ZeroDivisionError as e:
        print(f"错误: {e}")

    # 测试3: 非数字类型
    print("\n测试3: 处理数据")
    try:
        result = process_data([1, 2, "3", 4])
        print(f"结果: {result}")
    except TypeError as e:
        print(f"错误: {e}")

    print("\n调试完成！")
