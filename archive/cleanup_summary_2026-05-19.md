# JAC_Year 项目整理完成 — 2026-05-19

## 整理结果

### 根目录（11个核心文件）
- package.json, package-lock.json, tsconfig.json
- .gitignore, .env.production.example
- Dockerfile, docker-compose.yml, DEPLOY.md
- jac_articles.db (1.4MB)
- _start.bat, 一键启动.bat

### scripts/（25个核心脚本）
**数据回填**：
- backfill.py, backfill_corresponding_json.py
- fetch-detail.ts, fetch-all-funding.ts, fetch-emails.ts
- clean-funding.ts

**分类与迁移**：
- classify_articles.py
- migrate.ts, migrate.py, migrate_v030.py

**导出与工具**：
- export_affiliations.py, export_extracted_sample.py
- add-article.ts, count_funding.js, scan_full.js

**构建与启动**：
- build.cmd, restart.bat, compile.ps1

### archive/（归档）
| 目录 | 文件数 | 说明 |
|------|--------|------|
| root-cleanup-2026-05-19 | 17 | 根目录临时脚本和JSON |
| scripts-cleanup-2026-05-19 | 44 | debug/test脚本 |
| debug-scripts-2026-05-19 | (已有) | 之前归档 |

## 归档内容
- `debug_*.js` (20个) - 调试脚本
- `dbg_*.js` (4个) - 调试脚本
- `check_*.js` (7个) - 检查脚本
- `test_*.*` (10个) - 测试脚本和导出文件
- `_*.js/json` (17个) - 根目录临时文件
- `affiliations_*.csv` - 中间数据文件

---

*整理完成时间：2026-05-19 10:06*
