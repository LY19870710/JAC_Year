# pdb 调试教程 - 学习笔记

## 目标
学习 Python 内置调试器 `pdb` 的基本用法（编程系统学习计划 阶段1 任务2）

## 启动 pdb 的两种方式

### 方式1：命令行启动（全面调试）
```bash
python -X utf8 -m pdb script.py
```
- 从脚本第一行开始调试
- 适合从头调试

### 方式2：代码中设置断点（精准调试）⭐
```python
import pdb
pdb.set_trace()  # 在这里暂停
```
- 在指定位置暂停
- 适合调试特定函数/代码块

## 基本命令（必须掌握）

| 命令 | 全称 | 说明 |
|------|------|------|
| `n` | next | 执行下一行（不进入函数） |
| `s` | step | 执行下一行（进入函数） |
| `c` | continue | 继续执行直到下一个断点 |
| `p expr` | print | 打印表达式值 |
| `l` | list | 显示当前行周围的代码 |
| `w` | where | 显示调用栈 |
| `q` | quit | 退出调试器 |

## 高级命令（可选）

| 命令 | 说明 |
|------|------|
| `b line` | 在第line行设置断点 |
| `b func` | 在func函数设置断点 |
| `cl` | 清除所有断点 |
| `disable bp` | 禁用断点bp |
| `enable bp` | 启用断点bp |
| `ignore bp n` | 忽略断点bp共n次 |
| `condition bp expr` | 仅当expr为真时暂停在断点bp |
| `a` | 打印当前函数的参数 |
| `retval` | 打印函数返回值 |

## 示例调试会话

### 脚本：simple_debug.py
```python
def divide(a, b):
    result = a / b  # Bug: 没有处理 b=0
    return result

if __name__ == "__main__":
    import pdb
    pdb.set_trace()  # 在这里开始调试
    result = divide(10, 0)
    print(f"结果: {result}")
```

### 调试过程
```
$ python -X utf8 simple_debug.py
> simple_debug.py(8)<module>()
-> result = divide(10, 0)
(Pdb) n  # 执行下一行（调用divide）
> simple_debug.py(5)divide()
-> result = a / b
(Pdb) p a  # 打印a的值
10
(Pdb) p b  # 打印b的值
0
(Pdb) s  # 进入函数（或直接n执行）
ZeroDivisionError: division by zero
(Pdb) q  # 退出
```

## 实际调试技巧

### 技巧1：条件断点
```python
pdb.set_trace()
if condition:  # 只在condition为真时调试
    pdb.set_trace()
```

### 技巧2：事后调试（Post-mortem debugging）⭐
```bash
python -X utf8 -m pdb -c continue script.py
# 或者脚本崩溃后自动进入pdb
```
- 当脚本崩溃时，自动进入pdb，可以查看崩溃时的变量

### 技巧3：在异常处暂停
```python
import sys
sys.excepthook = lambda t, v, tb: pdb.post_mortem(tb)
```
- 任何未捕获的异常都会自动进入pdb

## 应用到 JAC_Year 项目

### 调试 export_ris.py
```python
# 在 export_ris.py 中添加
import pdb
pdb.set_trace()  # 在生成RIS格式前暂停
```

### 调试 fix_citation.py
```python
# 在 fix_citation.py 中添加
import pdb
pdb.set_trace()  # 在解析作者格式前暂停
```

## 下一步

1. ✅ 理解 pdb 基本命令（n, s, c, p, l, q）
2. ⬜ 实际用 pdb 调试一个脚本（添加 pdb.set_trace()）
3. ⬜ 学会事后调试（python -m pdb -c continue script.py）
4. ⬜ 应用到 JAC_Year 项目（调试 export_ris.py 或 server.py）

---
*创建时间: 2026-05-25 09:15 GMT+8*
