/**
 * 机构名称提取工具 - v0.3.3
 * 规则：只保留大学/研究所级别，过滤掉"学院""系"等二级单位
 */

// ============================================================
// 辅助函数
// ============================================================

/** 清理机构名称：去掉数字前缀和多余空格 */
function cleanName(name: string): string {
  if (!name) return '';
  let cleaned = name.replace(/^\d+\s*/, '');  // 去掉开头的数字
  cleaned = cleaned.replace(/^[\-\.]+\s*/, ''); // 去掉开头的特殊字符
  return cleaned.replace(/\s+/g, ' ').trim();
}

/** 判断是否是城市名（用于排除） */
function isCityName(name: string): boolean {
  const cities = [
    // 中国城市
    'Beijing', 'Shanghai', 'Guangzhou', 'Shenzhen', 'Hangzhou', 'Nanjing',
    'Wuhan', 'Chengdu', 'Xi\'an', 'Chongqing', 'Tianjin', 'Suzhou',
    'Dalian', 'Qingdao', 'Xiamen', 'Ningbo', 'Wuxi', 'Foshan',
    'Dongguan', 'Yantai', 'Shijiazhuang', 'Tangshan', 'Zhengzhou',
    'Changsha', 'Fuzhou', 'Jinan', 'Shenyang', 'Harbin', 'Changchun',
    'Kunming', 'Hefei', 'Nanchang', 'Guiyang', 'Najian', 'Lanzhou',
    'Xining', 'Yinchuan', 'Urumqi', 'Lhasa', 'Hohhot', 'Taiyuan',
    'Baoding', 'Langfang', 'Zhangjiakou', 'Chengde', 'Qinhuangdao',
    'Cangzhou', 'Hengshui', 'Xingtai', 'Handan', 'Guilin', 'Jingdezhen',
    'Yichang', 'Yichun', 'Luoyang', 'Kaifeng', 'Zhuzhou', 'Xiangtan',
    'Yueyang', 'Zhangjiajie', 'Weifang', 'Hanzhong', 'Zhenjiang',
    'Jiaozuo', 'Ganzhou', 'Shaoyang', 'Liaocheng', 'Changshu',
    'Suwon', 'Busan', 'Incheon', 'Daegu', 'Daejeon', 'Gwangju',
    'Ulsan', 'Sendai', 'Hiroshima', 'Kobe', 'Kyoto', 'Tokyo', 'Osaka',
    'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad',
    'Kolkata', 'Kochi', 'Fukuoka', 'Sapporo', 'Nagoya', 'Yokohama',
    'London', 'Manchester', 'Birmingham', 'Glasgow', 'Liverpool',
    'Edinburgh', 'Leeds', 'Sheffield', 'Bristol', 'Paris', 'Lyon',
    'Marseille', 'Berlin', 'Munich', 'Cologne', 'Hamburg', 'Frankfurt',
    'Madrid', 'Barcelona', 'Valencia', 'Seville', 'Zaragoza', 'Milan',
    'Rome', 'Naples', 'Turin', 'Florence', 'Amsterdam', 'Brussels',
    'Vienna', 'Zurich', 'Geneva', 'Stockholm', 'Copenhagen', 'Oslo',
    'Helsinki', 'Warsaw', 'Prague', 'Budapest', 'Bucharest', 'Athens',
    'Lisbon', 'Dublin', 'Edinburgh', 'Cardiff', 'Belfast', 'Leicester',
    'Nottingham', 'Southampton', 'Brighton', 'Bournemouth', 'Plymouth',
    'Derby', 'Wolverhampton', 'Nottingham', 'Coventry', 'York', 'Cambridge',
    'Oxford', 'Bath', 'Bristol', 'Exeter', 'Canterbury', 'Durham',
    'La Jolla', 'Irvine', 'Stanford', 'Berkeley', 'Los Angeles', 'Chicago',
    'Boston', 'New York', 'Philadelphia', 'Houston', 'Dallas', 'Austin',
    'Seattle', 'Denver', 'Phoenix', 'San Diego', 'Detroit', 'Baltimore',
    'Memphis', 'Milwaukee', 'Albuquerque', 'Fresno', 'Sacramento',
    'Kansas City', 'Mesa', 'Atlanta', 'Miami', 'Minneapolis', 'Cleveland',
    'Newark', 'Buffalo', 'Raleigh', 'Omaha', 'Oakland', 'Miami',
    'Rolla', 'Boulder', 'Rochester', 'Albany', 'Scranton', 'Tampa',
    'Orlando', 'Jacksonville', 'Charlotte', 'Richmond', 'Hartford',
    'Spokane', 'Tacoma', 'Boise', 'Little Rock', 'Jackson', 'Baton Rouge',
    'Madison', 'Des Moines', 'Springfield', 'Annapolis', 'Trenton',
    'Hartford', 'Montpelier', 'Augusta', 'Providence', 'Concord',
    'Palo Alto', 'Santa Barbara', 'Ithaca', 'Ann Arbor', 'Urbana',
    'College Park', 'College Station', 'State College', 'Coral Gables',
    'Gainesville', 'Tallahassee', 'Tucson', 'Tempe', 'Fort Collins',
    'Lubbock', 'Waco', 'Amarillo', 'Odessa', 'Midland', 'Arlington',
    'Irving', 'Plano', 'Frisco', 'McKinney', 'Garland', 'Laredo',
    'Brownsville', 'McAllen', 'Pasadena', 'Beaumont', 'Surat',
    'Vadodara', 'Rajkot', 'Jamshedpur', 'Dhanbad', 'Asansol', 'Malegaon',
    'Ahmedabad', 'Surat', 'Indore', 'Bhopal', 'Jabalpur', 'Ludhiana',
    'Jalandhar', 'Amritsar', 'Patiala', 'Mysore', 'Hubli', 'Belgaum',
    'Tiruchirappalli', 'Coimbatore', 'Madurai', 'Salem', 'Erode',
    'Vijayawada', 'Visakhapatnam', 'Warangal', 'Guntur', 'Nellore',
    'Kakinada', 'Rajahmundry', 'Kurnool', 'Anantapur', 'Kadapa',
    'Tirupati', 'Karimnagar', 'Nizamabad', 'Khammam', 'Nalgonda',
    'Rourkela', 'Durgapur', 'Bardhaman', 'Kharagpur', 'Siliguri',
    'Bhubaneswar', 'Cuttack', 'Berhampur', 'Sambalpur', 'Balasore',
    'Baripada', 'Rourkela', 'Korba', 'Bhilai', 'Bilaspur', 'Raipur',
    'Durg', 'Rajnandgaon', 'Jagdalpur', 'Ambikapur', 'Kanker',
    'Raigarh', 'Jashpur', 'Korea', 'Suwon', 'Gwangju', 'Daejeon',
    'Cheongju', 'Cheonan', 'Seoul', 'Busan', 'Daegu', 'Incheon',
    'Daejeon', 'Gwangju', 'Ulsan', 'Changwon', ' Goyang', 'Seongnam',
    'Yongin', 'Suwon', 'Goyang', 'Seongnam', 'Yongin', 'Bucheon',
    'Ansan', 'Cheongju', 'Cheonan', 'Anyang', 'Hwaseong', 'Pohang',
    'Gimhae', 'Gimpo', 'Pyeongtaek', 'Gumi', 'Gwangju', 'Muan',
    'Uijeongbu', 'Chuncheon', 'Wonju', 'Chonju', 'Iksan', 'Jeonju',
    'Gwangju', 'Mokpo', 'Yeosu', 'Jinju', 'Sacheon', 'Tongyoung',
    'Geoje', 'Changwon', 'Jinju', 'Masan', 'Ulsan', 'Pohang', 'Gyeongju',
    'Andong', 'Gyeongju', 'Boseong', 'Suncheon', 'Yeosu', 'Gochang',
    'Jeongeup', 'Iksan', 'Jinju', 'Changwon', 'Gimhae', 'Changnyeong',
    'Gyeongsangbuk-do', 'Gyeongsangnam-do', 'Jeollabuk-do', 'Jeollanam-do',
    'Chungcheongbuk-do', 'Chungcheongnam-do', 'Gangwon-do', 'Jeju-do',
  ];
  
  const lower = name.toLowerCase();
  
  // 直接匹配
  if (cities.some(c => lower === c.toLowerCase() || lower.startsWith(c.toLowerCase() + ' ') || lower.endsWith(' ' + c.toLowerCase()))) {
    return true;
  }
  
  // 独立城市词（后面不是 University/Institute 等）
  const cityWords = ['Jiaozuo', 'Ganzhou', 'Shaoyang', 'Liaocheng', 'Hanzhong', 'Zhenjiang', 'Changshu'];
  for (const cw of cityWords) {
    if (lower === cw.toLowerCase() || lower.endsWith(cw.toLowerCase())) {
      // 确认后面不是 university/institute
      if (!lower.includes('university') && !lower.includes('institute') && !lower.includes('college') && !lower.includes('laboratory')) {
        return true;
      }
    }
  }
  
  // 邮编模式 (如 "115000", "200240") - 城市后缀
  if (/\b\d{5,6}\b/.test(name)) {
    // 包含5-6位数字可能是城市后的邮编
    return true;
  }
  
  return false;
}

/** 从地址中提取大学名称 */
function extractUniversity(address: string): string | null {
  const lower = address.toLowerCase();
  
  // 常见大学关键词
  const uniPatterns = [
    // University 结尾
    /\b([A-Za-z\s\'\-\.]+(?:University|Univ\.?))\b/gi,
    // University of X
    /(?:University\s+of\s+)([A-Za-z\s\'\-\.]+?)(?=,|$|\s+\d{5,6})/gi,
    // 研究所
    /(?:Academy\s+of\s+Sciences|CAS)\b/gi,
    /(?:Institute\s+of\s+(?:Technology|Technology))\b/gi,
    // 关键词
    /(?:Polytechnical\s+University|Technical\s+University|Engineering\s+University|Science\s+and\s+Technology\s+University)/gi,
  ];
  
  // 提取所有匹配
  const matches: string[] = [];
  
  // 1. 找 University (排除 School/College)
  const uniMatch = address.match(/\b([A-Z][A-Za-z\s\'\-\.]+(?:University|Univ\.?))\b/);
  if (uniMatch) {
    const name = uniMatch[1].trim();
    // 排除 School/College 开头的
    if (!name.startsWith('School ') && !name.startsWith('College ') && name.length > 3) {
      matches.push(cleanName(name));
    }
  }
  
  // 2. 中国科学院体系
  if (/\bChinese\s+Academy\s+of\s+Sciences\b/i.test(address) || /\bCAS\b/.test(address)) {
    matches.push('Chinese Academy of Sciences');
  }
  if (/\bUniversity\s+of\s+Chinese\s+Academy\s+of\s+Sciences\b/i.test(address)) {
    matches.push('University of Chinese Academy of Sciences');
  }
  if (/\bInstitute\s+of\s+Metal\s+Research\b/i.test(address)) {
    matches.push('Institute of Metal Research');
  }
  if (/\bShanghai\s+Institute\s+of\s+Ceramics\b/i.test(address)) {
    matches.push('Shanghai Institute of Ceramics');
  }
  if (/\bInstitute\s+of\s+Ceramics\b/i.test(address) && !matches.some(m => m.includes('Ceramics'))) {
    matches.push(cleanName(address.match(/\b[A-Z][A-Za-z\s]+(?:Institute\s+of\s+Ceramics)\b/)?.[0] || ''));
  }
  if (/\bInstitute\s+of\s+Physics\b/i.test(address)) {
    matches.push(cleanName(address.match(/\b[A-Z][A-Za-z\s]+(?:Institute\s+of\s+Physics)\b/)?.[0] || ''));
  }
  if (/\bInstitute\s+of\s+Chemistry\b/i.test(address)) {
    matches.push(cleanName(address.match(/\b[A-Z][A-Za-z\s]+(?:Institute\s+of\s+Chemistry)\b/)?.[0] || ''));
  }
  
  // 3. 其他国家级研究所
  if (/\bAcademy\s+of\s+Sciences\b/i.test(address)) {
    const m = address.match(/\b([A-Z][A-Za-z\s\-\.]+(?:Academy\s+of\s+Sciences))\b/);
    if (m) matches.push(cleanName(m[1]));
  }
  
  // 4. Key Laboratory/State Key Laboratory - 提取主管机构
  if (/Key\s+Laboratory\b/i.test(address) || /State\s+Key\s+Laboratory\b/i.test(address)) {
    // 找最近的大学名
    const uniInLab = address.match(/([A-Z][A-Za-z\s\'\-\.]+(?:University|Univ\.?))/);
    if (uniInLab) {
      const name = cleanName(uniInLab[1]);
      if (!name.startsWith('School ') && !name.startsWith('College ') && name.length > 3) {
        matches.push(name);
      }
    }
  }
  
  // 5. 理工/工业大学
  if (/\bUniversity\s+of\s+Science\s+and\s+Technology\b/i.test(address)) {
    const m = address.match(/\b([A-Z][A-Za-z\s\-\.]+University\s+of\s+Science\s+and\s+Technology)\b/);
    if (m) matches.push(cleanName(m[1]));
  }
  if (/\bBeijing\s+Institute\s+of\s+Technology\b/i.test(address)) {
    matches.push('Beijing Institute of Technology');
  }
  if (/\bNorthwestern\s+Polytechnical\s+University\b/i.test(address)) {
    matches.push('Northwestern Polytechnical University');
  }
  if (/\bHarbin\s+Institute\s+of\s+Technology\b/i.test(address)) {
    matches.push('Harbin Institute of Technology');
  }
  if (/\bShanghai\s+Jiao\s+Tong\s+University\b/i.test(address)) {
    matches.push('Shanghai Jiao Tong University');
  }
  
  // 6. 研究所 - 通用模式
  if (/\bInstitute\b/i.test(address)) {
    const m = address.match(/\b([A-Z][A-Za-z\s\-\.]+(?:Institute(?!\s+of\s+Ceramics)))\b/);
    if (m) {
      const name = cleanName(m[1]);
      if (name.length > 4 && !name.startsWith('School ') && !name.startsWith('College ') && !/^Institute$/i.test(name)) {
        matches.push(name);
      }
    }
  }
  
  // 返回最长的匹配（通常最具体）
  if (matches.length === 0) return null;
  
  // 去重
  const unique = [...new Set(matches)];
  unique.sort((a, b) => b.length - a.length);
  
  return unique[0];
}

/**
 * 从单个地址中提取机构名 - v0.3.3
 * 优先大学/研究所名称，过滤城市名和学院/系
 */
export function extractInstitution(address: string): string {
  if (!address || address.trim() === '') return '';
  
  // 移除编号前缀
  let clean = address.trim().replace(/^\d+\s*/, '');
  
  // 移除邮编
  clean = clean.replace(/\b\d{5,6}\b/g, '');
  clean = clean.replace(/\b[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}\b/g, '');
  
  // 尝试提取大学名称
  const uni = extractUniversity(clean);
  if (uni && uni.length > 3) {
    return cleanName(uni);
  }
  
  // 回退：按逗号分隔，从后往前找非城市、非学院的词
  const parts = clean.split(',').map(p => cleanName(p.trim())).filter(p => p.length > 0);
  
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    
    // 跳过城市名
    if (isCityName(part)) continue;
    
    // 跳过学院/系
    if (/\b(School|College|Department|Laboratory|Faculty)\s+of\b/i.test(part)) continue;
    if (/\b(School|College|Department)\b/i.test(part)) continue;
    
    // 跳过太短的
    if (part.length <= 3) continue;
    
    // 跳过国家名
    if (['China', 'USA', 'Japan', 'Germany', 'France', 'UK', 'Italy', 'Canada', 'Australia', 'Korea', 'India', 'Brazil', 'Russia', 'Spain', 'Netherlands', 'Switzerland', 'Sweden', 'Belgium', 'Austria', 'Poland', 'Singapore', 'Thailand', 'Malaysia', 'Israel', 'Ireland'].some(c => part === c || part.endsWith(' ' + c))) {
      continue;
    }
    
    return part;
  }
  
  // 最终回退
  const first = parts[0] || '';
  return cleanName(first);
}

/**
 * 从多个地址中提取机构名（分号分隔）
 */
export function extractInstitutions(affiliations: string): string {
  if (!affiliations || affiliations.trim() === '') return '';
  
  const addresses = affiliations.split(';');
  const institutions = addresses
    .map(addr => extractInstitution(addr.trim()))
    .filter(inst => inst.length > 0);
  
  // 去重
  const unique = [...new Set(institutions)];
  return unique.join('; ');
}

/**
 * 格式化机构显示（用于模板）
 */
export function formatInstitutionsHtml(institutions: string): string {
  if (!institutions || institutions.trim() === '') return '';
  const insts = institutions.split(';').map(i => cleanName(i.trim())).filter(i => i);
  if (insts.length === 0) return '';
  if (insts.length === 1) return insts[0];
  return insts.map(inst => `<div class="inst-line">${inst}</div>`).join('');
}
