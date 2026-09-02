# JAC_Year 项目整理计划 — 2026-05-19

## 当前状态

### 根目录 (E:\Claw\JAC_Year\)
**核心文件（保留）**：
- package.json, package-lock.json, tsconfig.json
- .gitignore, .env.production.example
- Dockerfile, docker-compose.yml, DEPLOY.md
- jac_articles.db (主数据库)
- _start.bat, 一键启动.bat

**临时文件（归档）**：
- `_*.js` - 15个调试脚本
- `_*.json` - 4个临时数据文件
- `jac_articles.db.backup_*` - 旧备份

### scripts/ 目录
**核心脚本（保留）**：
- add-article.ts
- backfill.py, backfill_corresponding_json.py
- classify_articles.py
- clean-funding.ts, fetch-all-funding.ts, fetch-detail.ts, fetch-emails.ts
- migrate.ts, migrate.py, migrate_v030.py
- build.cmd, restart.bat

**临时文件（归档）**：
- `debug_*.js` - 30个调试脚本
- `dbg_*.js` - 4个调试脚本
- `check_*.js` - 7个检查脚本
- `test_*.js/py` - 10个测试脚本
- `temp_*.js` - 临时文件
- `test_export.*` - 测试导出文件
- `affiliations_*.csv` - 中间数据文件
- `backfill_all_temp.json` - 临时数据

### archive/ 目录
已有2026-05-06归档的调试脚本，可直接删除或保留

## 整理方案

### 方案A：归档到 archive/
- 创建 `archive/root-cleanup-2026-05-19/` 存放根目录临时文件
- 创建 `archive/scripts-cleanup-2026-05-19/` 存放scripts临时文件
- 优点：可恢复
- 缺点：占用空间

### 方案B：直接删除
- 删除所有 `_*.js`, `_*.json`, `debug_*.js`, `test_*.*` 等
- 优点：干净
- 缺点：不可恢复

### 方案C：只删除明显无用的
- 删除 `test_export.*` (大文件)
- 删除 `temp_*.js`
- 保留 debug 脚本（可能还有用）

## 建议
采用方案A，归档到 `archive/scripts-cleanup-2026-05-19/`

---

*生成时间：2026-05-19 10:04*
