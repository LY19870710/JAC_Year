# JAC Year Manager

JAC (Journal of Advanced Ceramics) 年度文章管理系统

## 功能

- 抓取每年所有文章元数据
- Web 界面搜索和筛选（年份/作者/机构/类型/研究方向）
- 统计报表（年度发文量、类型分布、机构排名、研究方向分布）
- **数据导出**：CSV / XLSX / JSON / RIS（支持当前筛选条件导出）
- SQLite 本地持久化存储
- **用户认证**：可选的HTTP基本认证
- **数据备份**：数据库备份与恢复工具

## 快速开始

### 安装依赖
```bash
# Python依赖（无额外依赖，使用标准库）
# 如需导出XLSX，安装openpyxl
pip install openpyxl
```

### 抓取数据
```bash
# 抓取指定年份（需要Node.js环境和sciopen-scraper）
python src/fetch.py 2025

# 抓取详情页（机构信息）
python src/fetch.py 2025 --detail
```

### 启动 Web 服务
```bash
# 启动服务
python src/server.py

# 或使用一键启动脚本（Windows）
一键启动.bat

# 访问 http://localhost:3000
```

### 用户认证（可选）
```bash
# 启用认证
set AUTH_ENABLED=true
set AUTH_USER=admin
set AUTH_PASS=your_password
python src/server.py
```

### 数据备份
```bash
# 创建备份
python scripts/backup.py backup

# 列出备份
python scripts/backup.py list

# 恢复备份
python scripts/backup.py restore backups/jac_articles_20260617_120000.db
```

## Web 界面

- **/** - 搜索首页（含全量导出入口）
- **/search** - 搜索结果（导出按钮自动继承筛选条件）
- **/stats** - 统计报表
- **/api/articles** - 文章列表API
- **/api/stats** - 统计数据API
- **/api/export?format=csv|xlsx|json** - 数据导出 API
- **/api/export-ris** - RIS格式导出（EndNote导入用）

## 导出 API

```
GET /api/export?format=csv        # 带 BOM 的 CSV，Excel 打开无乱码
GET /api/export?format=xlsx        # Excel 文件，预设列宽
GET /api/export?format=json       # JSON，含 total + articles 数组
GET /api/export-ris               # RIS格式，可导入EndNote

# 携带筛选条件
GET /api/export?format=xlsx&year=2025&type=Research Article
GET /api/export-ris?year=2025&area=1
```

导出字段：DOI、标题、作者、通讯作者、通讯邮箱、通讯机构、机构、年份、卷、期、类型、研究方向、关键词、摘要、资助信息、引用、收到日期、接受日期、发表日期、URL

## 项目结构

```
JAC_Year/
├── src/
│   ├── server.py         # Python Web 服务（标准库HTTPServer）
│   ├── fetch.py          # 文章抓取（调用Node.js脚本）
│   ├── classify.py       # 研究方向分类器
│   └── stats.py          # 统计报告生成
├── scripts/
│   ├── backup.py         # 数据库备份工具
│   ├── backfill.py       # 数据回填脚本
│   └── ...               # 其他工具脚本
├── tests/
│   ├── test_classify.py  # 分类器测试
│   ├── test_server.py    # Web服务测试
│   └── test_stats.py     # 统计功能测试
├── docs/
│   ├── README.md         # 本文件
│   ├── Instruction.txt   # 详细功能说明
│   └── VERSION.txt       # 版本说明
├── jac_articles.db       # SQLite数据库
├── 一键启动.bat          # Windows启动脚本
└── backups/              # 数据库备份目录
```

## 技术栈

- **后端**：Python 3（标准库HTTPServer）
- **数据库**：SQLite
- **前端**：纯HTML/CSS（无框架）
- **抓取**：Node.js + Playwright（外部依赖）
- **测试**：pytest

## 版本规则

- 奇数版本 (0.1, 0.3, ...): Linux
- 偶数版本 (0.2, 0.4, ...): Jarvis

## 开发

### 运行测试
```bash
# 安装pytest
pip install pytest

# 运行所有测试
python -m pytest tests/ -v

# 运行特定测试
python -m pytest tests/test_classify.py -v
```

### 代码规范
- 使用Python标准库，尽量减少外部依赖
- 保持向后兼容
- 添加必要的测试
