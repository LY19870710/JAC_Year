#!/usr/bin/env python3
"""
fts5_demo.py - 学习 FTS5 全文搜索 (数据库系统学习计划 阶段1 任务3)
创建虚拟表，测试全文搜索，对比 LIKE '%...%' 性能
"""

import sqlite3
import time
import os

def create_fts5_table(db_path):
    """创建 FTS5 虚拟表"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # 删除已存在的虚拟表
        cursor.execute("DROP TABLE IF EXISTS articles_fts;")
        
        # 创建 FTS5 虚拟表（外部内容表模式）
        cursor.execute("""
            CREATE VIRTUAL TABLE articles_fts USING fts5(
                title, 
                abstract, 
                keywords,
                content='articles',  -- 外部内容表
                content_rowid='rowid'  -- 链接到 articles.rowid
            );
        """)
        
        # 从 articles 表填充数据
        cursor.execute("""
            INSERT INTO articles_fts(rowid, title, abstract, keywords)
            SELECT rowid, title, abstract, keywords FROM articles;
        """)
        
        conn.commit()
        print("✅ FTS5 虚拟表创建成功！")
        
        # 统计记录数
        cursor.execute("SELECT COUNT(*) FROM articles_fts;")
        count = cursor.fetchone()[0]
        print(f"   虚拟表记录数: {count}")
        
    except Exception as e:
        print(f"❌ 创建 FTS5 虚拟表失败: {e}")
        conn.rollback()
    finally:
        conn.close()

def test_fts5_search(db_path, keyword):
    """测试 FTS5 全文搜索"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        # FTS5 搜索（使用 MATCH 运算符）
        start_time = time.time()
        cursor.execute("""
            SELECT rowid, title FROM articles_fts 
            WHERE articles_fts MATCH ?;
        """, (keyword,))
        fts5_results = cursor.fetchall()
        fts5_time = time.time() - start_time
        
        # LIKE 搜索（对比）
        start_time = time.time()
        cursor.execute("""
            SELECT rowid, title FROM articles 
            WHERE title LIKE ? OR abstract LIKE ? OR keywords LIKE ?;
        """, (f'%{keyword}%', f'%{keyword}%', f'%{keyword}%'))
        like_results = cursor.fetchall()
        like_time = time.time() - start_time
        
        print(f"\n关键字: '{keyword}'")
        print(f"  FTS5 搜索: {len(fts5_results)} 条结果, 耗时 {fts5_time:.6f} 秒")
        print(f"  LIKE 搜索: {len(like_results)} 条结果, 耗时 {like_time:.6f} 秒")
        
        if fts5_time > 0:
            speedup = like_time / fts5_time
            print(f"  加速比: {speedup:.1f}x")
        
        # 显示前3条结果
        if fts5_results:
            print("  前3条结果:")
            for i, (rowid, title) in enumerate(fts5_results[:3], 1):
                print(f"    {i}. [{rowid}] {title[:50]}...")
        
        return {
            "keyword": keyword,
            "fts5_count": len(fts5_results),
            "fts5_time": fts5_time,
            "like_count": len(like_results),
            "like_time": like_time,
            "speedup": like_time / fts5_time if fts5_time > 0 else 0
        }
        
    except Exception as e:
        print(f"❌ 搜索失败: {e}")
        return None
    finally:
        conn.close()

def main():
    db_path = "E:/Claw/JAC_Year/jac_articles.db"
    
    if not os.path.exists(db_path):
        print(f"❌ 数据库不存在: {db_path}")
        return
    
    print("=" * 80)
    print("FTS5 全文搜索学习 - JAC_Year 数据库")
    print("=" * 80)
    
    # 步骤1：创建 FTS5 虚拟表
    print("\n步骤1：创建 FTS5 虚拟表...")
    create_fts5_table(db_path)
    
    # 步骤2：测试 FTS5 搜索
    print("\n步骤2：测试 FTS5 全文搜索...")
    keywords = ["ceramic", "silicon carbide", "additive manufacturing", "2025"]
    
    results = []
    for keyword in keywords:
        result = test_fts5_search(db_path, keyword)
        if result:
            results.append(result)
    
    # 步骤3：总结
    print("\n" + "=" * 80)
    print("总结: FTS5 性能对比")
    print("=" * 80)
    
    total_fts5_time = sum(r["fts5_time"] for r in results)
    total_like_time = sum(r["like_time"] for r in results)
    
    print(f"总耗时:")
    print(f"  FTS5: {total_fts5_time:.6f} 秒")
    print(f"  LIKE:  {total_like_time:.6f} 秒")
    
    if total_fts5_time > 0:
        total_speedup = total_like_time / total_fts5_time
        print(f"  总加速比: {total_speedup:.1f}x")
    
    print("\n✅ FTS5 学习完成！")
    print("   建议：将 JAC_Year 的模糊查询改为 FTS5 全文搜索（Q4、Q5）")

if __name__ == "__main__":
    main()
