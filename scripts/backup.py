#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
backup.py — 数据库备份与恢复工具
"""
import sqlite3, shutil, sys, os
from pathlib import Path
from datetime import datetime

DB_PATH = Path(__file__).parent.parent / "jac_articles.db"
BACKUP_DIR = Path(__file__).parent.parent / "backups"


def backup_db():
    """备份数据库"""
    if not DB_PATH.exists():
        print(f"ERROR: Database not found: {DB_PATH}")
        return False
    
    # 创建备份目录
    BACKUP_DIR.mkdir(exist_ok=True)
    
    # 生成备份文件名
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = BACKUP_DIR / f"jac_articles_{timestamp}.db"
    
    try:
        # 复制数据库文件
        shutil.copy2(DB_PATH, backup_file)
        print(f"SUCCESS: Backup created: {backup_file}")
        print(f"  Size: {backup_file.stat().st_size / 1024:.1f} KB")
        return True
    except Exception as e:
        print(f"ERROR: Backup failed: {e}")
        return False


def restore_db(backup_file: str):
    """从备份恢复数据库"""
    backup_path = Path(backup_file)
    
    if not backup_path.exists():
        print(f"ERROR: Backup file not found: {backup_file}")
        return False
    
    if not DB_PATH.exists():
        print(f"ERROR: Current database not found: {DB_PATH}")
        return False
    
    # 创建当前数据库的备份
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    current_backup = BACKUP_DIR / f"jac_articles_before_restore_{timestamp}.db"
    BACKUP_DIR.mkdir(exist_ok=True)
    shutil.copy2(DB_PATH, current_backup)
    print(f"  Current database backed up to: {current_backup}")
    
    try:
        # 恢复数据库
        shutil.copy2(backup_path, DB_PATH)
        print(f"SUCCESS: Database restored from: {backup_file}")
        return True
    except Exception as e:
        print(f"ERROR: Restore failed: {e}")
        return False


def list_backups():
    """列出所有备份"""
    if not BACKUP_DIR.exists():
        print("No backups found")
        return
    
    backups = sorted(BACKUP_DIR.glob("jac_articles_*.db"), reverse=True)
    if not backups:
        print("No backups found")
        return
    
    print(f"Found {len(backups)} backups:")
    for i, backup in enumerate(backups, 1):
        size = backup.stat().st_size / 1024
        mtime = datetime.fromtimestamp(backup.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        print(f"  {i}. {backup.name} ({size:.1f} KB) - {mtime}")


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python scripts/backup.py backup      - Create backup")
        print("  python scripts/backup.py restore <file> - Restore from backup")
        print("  python scripts/backup.py list        - List backups")
        sys.exit(1)
    
    command = sys.argv[1].lower()
    
    if command == "backup":
        backup_db()
    elif command == "restore":
        if len(sys.argv) < 3:
            print("ERROR: Please specify backup file")
            sys.exit(1)
        restore_db(sys.argv[2])
    elif command == "list":
        list_backups()
    else:
        print(f"ERROR: Unknown command: {command}")
        sys.exit(1)


if __name__ == "__main__":
    main()
