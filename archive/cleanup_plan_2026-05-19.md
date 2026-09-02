# JAC_Year 项目整理计划

## 一、当前状态

### 文件统计
| 类型 | 数量 | 位置 | 建议 |
|------|------|------|------|
| _debug*.js | 15个 | 根目录 | 归档 |
| _test*.js | 16个 | 根目录 | 归档 |
| _fetch*.js | 3个 | 根目录 | 归档 |
| _check*.js | 5个 | 根目录 | 归档 |
| _*.json | 3个 | 根目录 | 归档 |
| debug*.js | 20个 | scripts/ | 归档 |
| test_*.py | 3个 | scripts/ | 归档 |
| temp_*.js | 1个 | scripts/ | 删除 |
| *.csv | 3个 | scripts/ | 归档 |

### 数据库状态（2026-05-19）
| 年份 | 总数 | research_area | abstract | funding | affiliations | email | keywords | dates |
|------|------|---------------|----------|---------|--------------|-------|----------|-------|
| 2024 | 174 | 174 ✅ | 174 ✅ | 174 ✅ | 174 ✅ | 174 ✅ | 174 ✅ | 174 ✅ |
| 2025 | 204 | 204 ✅ | 204 ✅ | 204 ✅ | 204 ✅ | 204 ✅ | 204 ✅ | 204 ✅ |

**数据库已完整！xlsx缺少内容是导出脚本问题，不是数据问题。**

---

## 二、整理方案

### 2.1 归档调试文件
创建 `archive/debug-scripts/` 存放所有调试脚本：

根目录移入：
- _debug_*.js (15个)
- _test_*.js (16个)
- _fetch_*.js (3个)
- _check_*.js (5个)
- _*.json (3个)

scripts/移入：
- debug_*.js (20个)
- test_*.py (3个)
- *.csv (3个，除test_export.xlsx)

### 2.2 清理临时文件
删除：
- scripts/temp_db_check.js
- scripts/backfill_all_temp.json

### 2.3 保留的文件
根目录：
- package.json, package-lock.json
- tsconfig.json
- docker-compose.yml, Dockerfile
- .gitignore
- .env.production.example
- DEPLOY.md
- 一键启动.bat, _start.bat
- jac_articles.db

src/：核心代码（不动）
views/：前端模板（不动）
public/：静态资源（不动）
tests/：单元测试（不动）
docs/：文档（不动）

---

## 三、xlsx导出问题排查

### 当前xlsx列（test_export.xlsx）
年份、类型、标题、作者、通讯作者、通讯邮箱、机构（简化）、机构（原文）、研究方向、DOI、URL、资助信息

### 缺少的列
- abstract（摘要）
- keywords（关键词）
- received_date（收稿日期）
- accepted_date（录用日期）
- published_date（发表日期）
- volume, issue

### 修复方案
更新 server.ts 的 export API，添加缺失字段。

---

## 四、执行步骤

1. 创建归档目录
2. 移动调试文件
3. 删除临时文件
4. 更新xlsx导出代码
5. 测试导出

