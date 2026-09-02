# JAC Year Manager — 项目档案

> Journal of Advanced Ceramics 年度文章管理系统  
> GitHub: https://github.com/LY19870710/JAC_Year  
> 网页版: https://ly19870710.github.io/JAC_Year/

---

## 一、项目结构

```
JAC_Year/
├── index.html                  # 网页版主页面（GitHub Pages 入口）
├── .nojekyll                   # 禁用 Jekyll 构建（必须保留）
├── .gitignore                  # Git 忽略规则
├── jac_articles.db             # SQLite 数据库（运行时生成，不推送）
├── 一键启动.bat                # Windows 本地启动脚本
│
├── articles_md/                # 文章 Markdown 文件
│   ├── 10_26599_JAC_2024_9220827.md
│   ├── ...
│   └── articles.json           # 网页数据（从 md 自动生成）
│
├── ris/                        # RIS 引用格式文件
├── docs/                       # 项目文档
│   ├── README.md
│   ├── Instruction.txt
│   ├── VERSION.txt
│   └── ...
├── public/                     # 静态资源
├── views/                      # EJS 前端模板
│   ├── index.ejs
│   ├── search.ejs
│   └── stats.ejs
├── src/                        # Python 核心代码
│   ├── server.py               # Web 服务
│   ├── fetch.py                # 文章抓取
│   ├── classify.py             # 研究方向分类
│   └── stats.py                # 统计报告
├── scripts/                    # 工具脚本
│   ├── md_to_json.py           # Markdown → JSON（网页数据生成）
│   ├── generate_markdown.py    # 数据库 → Markdown
│   ├── backup.py               # 数据库备份
│   └── ...
├── tests/                      # 测试
└── archive/                    # 归档的旧脚本
```

---

## 二、网页版工作原理

### 数据流

```
jac_articles.db (SQLite)
        ↓  generate_markdown.py
articles_md/*.md (Markdown 文件)
        ↓  md_to_json.py
articles_md/articles.json (JSON 数据)
        ↓  fetch (GitHub Pages)
index.html (网页展示)
```

### 关键文件说明

| 文件 | 作用 | 何时需要更新 |
|------|------|-------------|
| `index.html` | 网页界面（HTML/CSS/JS） | 修改页面外观或功能时 |
| `articles_md/articles.json` | 文章数据（JSON 格式） | 新增文章后重新生成 |
| `scripts/md_to_json.py` | MD → JSON 转换脚本 | 修改数据字段时 |
| `scripts/generate_markdown.py` | DB → MD 转换脚本 | 修改 Markdown 格式时 |

---

## 三、常用操作

### 1. 新增文章后更新网页数据

```bash
# 步骤1: 从数据库生成 Markdown（如果数据库有更新）
python scripts/generate_markdown.py

# 步骤2: 从 Markdown 生成 JSON（供网页使用）
python scripts/md_to_json.py

# 步骤3: 提交推送
git add .
git commit -m "Update articles"
git push
```

### 2. 修改网页样式

编辑 `index.html` 中的 `<style>` 部分：

```css
:root {
  --bg: #fef9f3;          /* 页面背景色 */
  --primary: #d35400;     /* 主色调（深橙） */
  --accent: #e67e22;      /* 强调色（橙色） */
  --accent-bg: #fff5e6;   /* 浅橙背景 */
  --text: #3e2723;        /* 文字颜色 */
  --border: #f0d9c8;      /* 边框颜色 */
}
```

### 3. 修改网页功能

编辑 `index.html` 中的 `<script>` 部分：

- **搜索逻辑**: `applyFilters()` 函数
- **渲染逻辑**: `render()` 函数
- **导出功能**: `exportCSV()` / `exportJSON()` 函数

### 4. 本地预览网页版

由于 `index.html` 用 `fetch` 加载 JSON，需要本地服务器：

```bash
# 在 JAC_Year 目录下
python -m http.server 8080
# 然后打开 http://localhost:8080
```

直接双击 `index.html` 打开会因 CORS 限制无法加载 JSON。

---

## 四、网页功能说明

### 搜索与筛选

- **搜索框**: 按标题、作者、关键词、摘要全文搜索
- **年份下拉**: 按发表年份筛选
- **类型下拉**: 按文章类型筛选（Research Article / Review / Rapid Communication 等）

### 文章卡片

- **默认状态**: 折叠（显示标题、作者、关键词）
- **点击标题**: 展开显示摘要、元数据、链接
- **再点击**: 折叠收起

### 导出功能

- **Export CSV**: 导出当前筛选结果为 CSV 文件
- **Export JSON**: 导出当前筛选结果为 JSON 文件

### 数据字段

每篇文章包含：
- 标题、年份、卷号、期号、类型
- DOI、URL、PDF 链接
- 作者列表（含邮箱、机构）
- 关键词、研究方向
- 摘要（~800 字）
- 引用指标（Crossref / WoS / Scopus / CSCD / Altmetric）
- 日期（Received / Accepted / Published）
- 统计（Views / Downloads）

---

## 五、配色方案（浅橙色主题）

| 元素 | 颜色 | 用途 |
|------|------|------|
| 头部渐变 | `#e67e22 → #f39c12 → #f1c40f` | 橙黄渐变 |
| 页面背景 | `#fef9f3` | 米白色 |
| 卡片背景 | `#ffffff` | 白色 |
| 主色调 | `#d35400` | 深橙色（年份标签、链接） |
| 强调色 | `#e67e22` | 橙色（类型标签、高亮） |
| 浅橙背景 | `#fff5e6` | 关键词标签、摘要框 |
| 文字 | `#3e2723` | 深棕色 |
| 次要文字 | `#795548` | 浅棕色 |
| 边框 | `#f0d9c8` | 暖色边框 |

---

## 六、GitHub Pages 配置

- **源**: `main` 分支，根目录
- **Jekyll**: 已禁用（`.nojekyll` 文件）
- **自定义域名**: 无（使用 `ly19870710.github.io/JAC_Year/`）

---

## 七、常见问题

### Q: 网页显示蓝色/旧样式？
**A**: 浏览器缓存。强制刷新：`Ctrl+Shift+R`（Mac: `Cmd+Shift+R`）

### Q: 文章类型只有 Review？
**A**: 需要从数据库重新生成 JSON：
```bash
python scripts/md_to_json.py
git add articles_md/articles.json
git commit -m "Fix article types"
git push
```

### Q: 摘要不显示？
**A**: 检查 `md_to_json.py` 的摘要提取逻辑。摘要从 `## 1 Introduction` 章节的第一段提取。

### Q: 新增文章后网页没更新？
**A**: 确保执行了完整的更新流程：
1. `python scripts/generate_markdown.py`（如果数据库有更新）
2. `python scripts/md_to_json.py`
3. `git add . && git commit -m "..." && git push`

---

## 八、本地 Web 服务

如果需要本地运行完整的 Web 服务（含搜索、统计、导出）：

```bash
# 启动本地服务
python src/server.py

# 访问 http://localhost:3000
```

或使用一键启动脚本：`一键启动.bat`

---

## 九、修改记录

| 日期 | 修改内容 |
|------|---------|
| 2026-09-02 | 初始提交，项目上传 GitHub |
| 2026-09-02 | 添加 GitHub Pages 网页版 |
| 2026-09-02 | 增强：摘要提取、导出功能、UI 美化 |
| 2026-09-02 | 修复：文章类型、浅橙色主题、折叠功能 |
