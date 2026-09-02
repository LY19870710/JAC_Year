# JAC_Year 目录整理方案

## 当前问题

根目录散落 27 个文件，包括：
- 4 个调试脚本 (`_check_*.js`, `_test_*.js`, `_regenerate.*`)
- 多个重复启动脚本 (`start.bat`, `start.sh`, `启动.bat`, `一键启动.bat`, `一键启动_调试.bat`)
- 2 个数据库备份文件
- 重复编译脚本 (`build.bat`, `build.cmd`, `compile.bat`, `compile.ps1`, `rebuild.bat`)

## 整理方案

### 保留文件 (根目录)
```
.env.production.example  # 配置模板
.gitignore               # Git 忽略规则
DEPLOY.md                # 部署文档
docker-compose.yml       # Docker 配置
Dockerfile               # Docker 镜像
jac_articles.db          # 生产数据库
package.json             # 项目配置
package-lock.json        # 依赖锁定
tsconfig.json            # TS 配置
一键启动.bat              # 主启动脚本 (唯一)
```

### 归档目录 (`archive/`)
- `jac_articles.db.backup_20260506_093814`
- `jac_articles.db.backup_20260506_093920`

### 移动到 `scripts/debug/`
- `_check_authors.js`
- `_check_citation.js`
- `_test_citation_format.js`
- `_regenerate.ps1`
- `_regenerate_citations.bat`

### 删除 (冗余/过时)
- `start.bat` (被一键启动.bat 替代)
- `start.sh` (Linux 启动，用户用 Windows)
- `启动.bat` (重复)
- `一键启动_调试.bat` (合并到主脚本)
- `诊断.bat` (功能合并到主脚本)
- `build.bat` (被 build.cmd 替代)
- `compile.bat` (被 compile.ps1 替代)
- `rebuild.bat` (功能合并)

## 一键启动脚本设计

功能：
1. 检查端口 3000 是否被占用
2. 如果占用，询问是否重启
3. 启动服务 (node dist/server.js)
4. 自动打开浏览器 http://localhost:3000
5. 显示服务状态

选项：
- 正常启动
- 调试模式 (使用 ts-node)
- 停止服务
- 查看日志
