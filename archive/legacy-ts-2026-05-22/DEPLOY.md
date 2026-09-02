# JAC Year Manager — 部署指南

> Last updated: 2026-04-09 | Version: 0.3.3+

---

## 快速开始

### 本地运行（开发）

```bash
cd E:\Claw\JAC_Year
npm install
npm run build
npm start
# 访问 http://localhost:3000
```

### 本地运行（接受外部连接）

```bash
# Windows
start.bat

# 或手动
set HOST=0.0.0.0
set PORT=3000
npm start
```

---

## 部署方案

### 方案 A：Docker（推荐，最简）

**前提**：安装 [Docker Desktop](https://www.docker.com/products/docker-desktop/)

```bash
# 1. 进入项目目录
cd E:\Claw\JAC_Year

# 2. 构建镜像
docker build -t jac-year .

# 3. 运行容器
docker run -d -p 3000:3000 --name jac-year jac-year

# 4. 查看状态
docker logs -f jac-year
```

访问：`http://<服务器IP>:3000`

**使用 docker-compose**：
```bash
docker compose up -d
docker compose logs -f
docker compose down
```

**数据持久化**：数据库文件在容器内 `/app/jac_articles.db`，`docker-compose.yml` 已配置 named volume 自动持久化。

---

### 方案 B：直接部署到 Linux VPS

**前提**：Node.js 22+ 已安装

```bash
# 1. 上传项目到服务器
scp -r E:\Claw\JAC_Year user@vps:/opt/jac-year/

# 2. 安装依赖
cd /opt/jac-year
npm ci --omit=dev

# 3. 构建 TypeScript
npm run build

# 4. 启动（后台运行）
HOST=0.0.0.0 PORT=3000 npm start &

# 或用 PM2 管理进程
npm install -g pm2
pm2 start dist/server.js --name jac-year
pm2 save
pm2 startup
```

**重启后自动恢复**：
```bash
pm2 startup  # 按提示执行生成的命令
```

---

### 方案 C：Nginx 反向代理 + HTTPS

适用于方案 A 或 B，Nginx 提供 SSL 终止和域名路由：

```nginx
# /etc/nginx/sites-available/jac-year
server {
    listen 443 ssl;
    server_name jac-year.example.com;

    ssl_certificate     /etc/letsencrypt/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# HTTP 重定向到 HTTPS
server {
    listen 80;
    server_name jac-year.example.com;
    return 301 https://$server_name$request_uri;
}
```

**获取 SSL 证书（Let's Encrypt 免费）**：
```bash
sudo certbot --nginx -d jac-year.example.com
```

---

## 环境变量参考

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HOST` | `0.0.0.0` | 监听地址，`0.0.0.0` 接受外部连接 |
| `PORT` | `3000` | 监听端口 |
| `NODE_ENV` | `production` | 设为 `production` 关闭调试日志 |
| `DB_PATH` | `./jac_articles.db` | SQLite 数据库文件路径 |

---

## 数据库更新

当 `jac_articles.db` 有新数据时：

**Docker 环境**：
```bash
# 方式 1：复制新 DB 文件到容器
docker cp jac_articles.db jac-year:/app/jac_articles.db
docker restart jac-year

# 方式 2：挂载外部文件（推荐）
# 编辑 docker-compose.yml volumes:
#   - /path/to/new/jac_articles.db:/app/jac_articles.db
docker compose restart
```

**直接部署**：
```bash
# 替换 DB 文件后重启
pm2 restart jac-year
# 或
kill $(pgrep -f "node dist/server.js") && HOST=0.0.0.0 npm start &
```

---

## 健康检查

```bash
curl http://localhost:3000/health
# 返回: {"status":"ok","timestamp":"2026-04-09T..."}
```

---

## 目录结构（部署相关）

```
JAC_Year/
  dist/              ← TypeScript 编译产物（必须）
  src/                ← TypeScript 源码
  views/              ← EJS 模板
  public/             ← 静态文件（robots.txt, favicon.ico）
  jac_articles.db     ← SQLite 数据库（必须）
  package.json
  Dockerfile
  docker-compose.yml
  .env.production.example
  start.bat           ← Windows 快速启动（含 HOST=0.0.0.0）
```

---

## 注意事项

- `dist/` 目录需随项目一起部署（从源码 `npm run build` 编译后复制）
- Playwright 用于爬虫，如不使用可从 `package.json` 移除以减少镜像大小
- sql.js 数据库在每次写操作时自动保存到文件，无需额外备份脚本
- `SIGTERM` / `SIGINT` 信号触发优雅关闭，确保数据库保存完整
