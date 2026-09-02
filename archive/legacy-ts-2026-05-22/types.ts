export type ArticleType = 
  | 'Research Article' 
  | 'Review' 
  | 'Editorial' 
  | 'Erratum' 
  | 'Perspective' 
  | 'Rapid Communication' 
  | 'Technical Paper';

// JAC 期刊研究方向分类（v0.5.0 — 2025年12分类体系）
export const CATEGORIES = [
  '超高温陶瓷',
  '环境/热障涂层',
  '陶瓷基复合材料',
  '介电/压电/铁电陶瓷',
  '功能陶瓷：传感/催化/能源',
  '烧结、制备与致密化',
  '结构陶瓷：力学与摩擦学',
  '高熵陶瓷与新型成分',
  '生物陶瓷与医学应用',
  '计算模拟与表征',
  '连接、钎焊与表面工程',
  '光学、发光与透明陶瓷',
] as const;

export type Category = typeof CATEGORIES[number];

export interface Article {
  id?: number;
  year: number;
  title: string;
  authors: string;
  affiliations: string;
  institutions?: string;  // v0.3.1: 提取后的简化机构名
  doi: string;
  type: ArticleType;
  url: string;
  volume?: string;  // e.g. "14"
  issue?: string;    // e.g. "10"
  category?: string;     // v0.3.4: 旧分类代码（废弃）
  research_area_id?: number;   // v0.5.0: 研究方向ID (1-12)
  research_area?: string;      // v0.5.0: 研究方向(英)
  research_area_zh?: string;   // v0.5.0: 研究方向(中)
  funding?: string;      // v0.4.0: 资助信息
  citation?: string;     // v0.4.2: 引用格式
  corresponding_json?: string; // v0.4.0: 通讯作者JSON [{"name":"...","email":"..."}]
  corresponding_author?: string;  // v0.4.2: 主要通讯作者姓名
  corresponding_authors?: string; // v0.4.2: 分号分隔的通讯作者完整列表
  corresponding_emails?: string; // v0.4.2: 分号分隔的通讯作者邮箱列表
  abstract?: string;     // v0.6.0: 摘要
  keywords?: string;     // v0.6.0: 关键词
  received_date?: string;  // v0.6.0: 收稿日期
  accepted_date?: string;  // v0.6.0: 接收日期
  published_date?: string; // v0.6.0: 发表日期
  created_at?: string;
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'json';
  filters?: QueryFilters;
  limit?: number;
}

export interface QueryFilters {
  year?: number;
  author?: string;
  affiliation?: string;
  type?: ArticleType;
  doi?: string;
  keyword?: string;
  category?: string;     // v0.3.4
}

export interface StatsResult {
  total: number;
  byType: Record<string, number>;
  byCategory: Record<string, number>;
  byYear: Record<number, number>;
  topAffiliations: { name: string; count: number }[];
}
