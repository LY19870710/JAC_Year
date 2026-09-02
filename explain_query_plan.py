#!/usr/bin/env python3
"""
explain_query_plan.py - 学习 EXPLAIN QUERY PLAN (数据库系统学习计划 阶段1 任务2)
运行多种查询，分析执行计划，找出慢查询
"""

import sqlite3
import os

def explain_query_plan(db_path, query):
    """运行 EXPLAIN QUERY PLAN，返回执行计划"""
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    try:
        cursor.execute(f"EXPLAIN QUERY PLAN {query}")
        plan = cursor.fetchall()
        return plan
    except Exception as e:
        return [("Error", str(e))]
    finally:
        conn.close()

def analyze_plan(plan):
    """分析执行计划，判断是否需要优化"""
    for row in plan:
        detail = row[-1]  # detail 是最后一列
        if "SCAN TABLE" in detail and "USING INDEX" not in detail:
            return "❌ SLOW (全表扫描，无索引)"
        elif "SEARCH TABLE" in detail or "USING INDEX" in detail:
            return "✅ FAST (使用索引)"
        elif "SCAN TABLE" in detail and "USING INDEX" in detail:
            return "✅ FAST (使用索引)"
    return "⚠️ UNKNOWN"

def main():
    db_path = "E:/Claw/JAC_Year/jac_articles.db"
    
    if not os.path.exists(db_path):
        print(f"❌ 数据库不存在: {db_path}")
        return
    
    print("=" * 80)
    print("EXPLAIN QUERY PLAN 分析 - JAC_Year 数据库")
    print("=" * 80)
    
    # 定义测试查询
    queries = [
        ("Q1: 按年份查询", "SELECT * FROM articles WHERE year = 2025"),
        ("Q2: 按研究方向查询", "SELECT * FROM articles WHERE research_area_zh = 'Structural Ceramics'"),
        ("Q3: 按DOI精确查询", "SELECT * FROM articles WHERE doi = '10.26599/JAC.2025.9221194'"),
        ("Q4: 按DOI模糊查询", "SELECT * FROM articles WHERE doi LIKE '%10.26599%'"),
        ("Q5: 按标题模糊查询", "SELECT * FROM articles WHERE title LIKE '%ceramic%'"),
        ("Q6: 按年份+期号查询", "SELECT * FROM articles WHERE year = 2025 AND issue = 4"),
        ("Q7: 按发表日期范围查询", "SELECT * FROM articles WHERE published_date BETWEEN '2025-01-01' AND '2025-12-31'"),
        ("Q8: 统计各年份文章数", "SELECT year, COUNT(*) as cnt FROM articles GROUP BY year ORDER BY year"),
        ("Q9: 按研究方向统计", "SELECT research_area_zh, COUNT(*) as cnt FROM articles GROUP BY research_area_zh"),
        ("Q10: 复杂查询(年份+研究方向)", "SELECT * FROM articles WHERE year = 2025 AND research_area_zh = 'Structural Ceramics'"),
    ]
    
    results = []
    
    for name, query in queries:
        print(f"\n{name}")
        print(f"SQL: {query}")
        
        plan = explain_query_plan(db_path, query)
        analysis = analyze_plan(plan)
        
        print(f"执行计划:")
        for row in plan:
            print(f"  {row}")
        
        print(f"分析结果: {analysis}")
        
        results.append({
            "name": name,
            "query": query,
            "plan": plan,
            "analysis": analysis
        })
    
    # 总结
    print("\n" + "=" * 80)
    print("总结: 慢查询（需要优化）")
    print("=" * 80)
    
    slow_count = 0
    for r in results:
        if "❌ SLOW" in r["analysis"]:
            print(f"{r['name']}: {r['analysis']}")
            print(f"  SQL: {r['query']}")
            slow_count += 1
    
    if slow_count == 0:
        print("✅ 所有查询都使用了索引，无需优化！")
    else:
        print(f"\n⚠️ 发现 {slow_count} 个慢查询，建议添加索引或优化查询。")
    
    print("\n完成！")

if __name__ == "__main__":
    main()
