# CHANGELOG

## v0.4.1 (2026-04-30) — Funding Fetch Implementation
### Funding 抓取实现
- **POST /api/fetch-funding**: 实际爬取 funding 字段
  - 从 sciopen.com `/article/full_text?doi=XXX` API 获取 Funding Statements
  - 从文章页 HTML 提取 Acknowledgements（98% 文章有此字段）
  - 智能清洗：去除 "This work was supported by" 等前缀，保留基金名称+编号
  - 识别基金机构关键词：NSFC、CAS、ERC、DFG、JSPS 等
  - 批量处理：默认每批 20 篇，2秒间隔避免被封
  - 返回进度：每篇文章处理状态、成功/失败统计、剩余待处理数量
- **src/funding-fetcher.ts**: 新增 funding 抓取模块
  - `fetchArticleFunding(doi)`: 单篇文章抓取
  - `fetchBatchFunding(db, batchSize, onProgress)`: 批量抓取带进度回调

### 使用方式
```bash
# 启动服务后调用 API
curl -X POST "http://localhost:3000/api/fetch-funding?batch=20"

# 或在网页端添加触发按钮（待前端实现）
```

## v0.4.0 (2026-04-24) — Export + Funding Framework
### 导出功能
- **GET /api/export**: 支持 CSV/XLSX/JSON 三种格式导出
  - CSV 含 BOM（Excel 打开无乱码），字段含逗号/引号时自动转义
  - XLSX 预设列宽，自动换行
  - JSON 含 `total` 统计和 `articles` 数组
- **导出字段**：年份、类型、标题、作者、通讯作者、通讯邮箱、机构（简化）、机构（原文）、研究方向、DOI、URL、资助信息
- **筛选继承**：导出链接自动携带当前搜索条件（年份/类型/研究方向/作者/机构/关键词）
- **views/index.ejs**：首页底部添加导出链接（XLSX/CSV/JSON）
- **views/search.ejs**：搜索结果页顶部添加导出按钮栏（绿色XLSX/蓝色CSV/紫色JSON）

### 数据库字段扩展
- 新增 `funding TEXT` 列（资助信息）
- 新增 `corresponding_json TEXT` 列（通讯作者JSON：`[{"name":"...","email":"..."}]`）
- `database.ts`: `insertArticle()` 写入全部字段，`migrate()` 自动添加新列
- `database.ts`: 新增 `updateFunding()`、`updateCorrespondingJson()` 方法
- `database.ts`: 新增 `getArticlesWithoutFunding()`、`exportArticles()` 方法

### Funding 爬取框架
- **POST /api/fetch-funding**: 接口框架就位，TODO 集成 Playwright 详情页抓取

## v0.3.4 (2026-04-09) — Category Classification
- **研究方向分类**: 新增 19 个中文研究方向分类（介电/压电/铁电、吸波/透波、热障涂层、能源存储等），根据标题关键词自动匹配
- **scripts/classify_articles.py**: 新增分类脚本，基于标题正则匹配，204 篇文章已全部分类
- **database.ts**: 新增 `category` 列，`queryArticles()` 支持按 category 筛选，`getStats()` 新增 `byCategory` 统计
- **types.ts**: 新增 `CATEGORIES` 常量数组（19 个研究方向）、`Category` 类型、`QueryFilters.category`
- **server.ts**: `/search`、`/stats`、`/` 路由传递 CATEGORIES
- **views/index.ejs**: 搜索表单新增「研究方向」下拉框
- **views/search.ejs**: 结果表格新增「研究方向」列，筛选时有分类提示

## v0.3.4 (2026-04-09) — Public Deployment Prep
- **server.ts**: 监听地址从 `localhost` 改为 `0.0.0.0`（接受外部连接），可通过 `HOST` 环境变量覆盖
- **server.ts**: 添加 graceful shutdown（SIGINT/SIGTERM 信号处理，先保存数据库再退出）
- **server.ts**: 添加安全响应头（X-Content-Type-Options, X-Frame-Options, X-XSS-Protection）
- **server.ts**: 添加 `/health` 健康检查接口（用于负载均衡/监控）
- **server.ts**: 添加 404 错误处理
- **start.bat**: 同步更新为 Node.js 启动方式（之前是 Python 版本）
- **public/**: 新建目录，添加 `favicon.ico` 和 `robots.txt`
- **Dockerfile**: 新增（Node.js 22 Alpine，Playwright 系统依赖）
- **docker-compose.yml**: 新增（健康检查、数据库持久化 volume）
- **.env.production.example**: 新增（环境变量参考文档）
- **DEPLOY.md**: 新增（Docker/VPS/Nginx 部署指南）

## v0.3.3 (2026-04-08)
- 机构提取只保留大学/研究所级别，过滤"学院""系"等二级单位
- 显示通讯作者邮箱（字段已就位），废弃原 email 列的填充
- 数据库迁移优化，支持 institutions 字段动态扩展

## v0.3.2 (2026-04-08)
- 机构名称去前缀优化（去除 "1School" → "School" 等数字前缀）
- 爬虫优化：详情页新增通讯作者字段采集
- 过滤城市列表（Guilin、Jingdezhen 等）
- 数据库新增 email 字段

## v0.3.0 (2026-04-01) - Linux
### 新增
- `corresponding_json` 字段：JSON 格式通讯作者-作者对应关系
- `funding` 字段：资助信息（数据库已加入，采集由 fetch_detail.js 支持）
- 鼠标悬停 tooltip：hover 显示机构原文（学院、系等二级单位）

### 改善
- 通讯作者展示：每人单独一行，姓名+更精确的机构对应
- 机构提取：只取地址前面第 1 级机构（城市+邮编之前的最后一级部分）
  - 去除国别、城市、邮编
  - 去除公司后缀（如 "Ltd."），与前一字复合并
- 文件头显示：Author → Authors / Corr.
- 版本号更新为 v0.3.0

### 数据库变更
- `ALTER TABLE articles ADD COLUMN funding TEXT DEFAULT ''`
