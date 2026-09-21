# scraper.py - Scrape th-jac.com paperlist for all 20 categories
import asyncio
from playwright.async_api import async_playwright
import json

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        
        # Navigate to paperlist
        await page.goto('https://www.th-jac.com/hbr/paperlist')
        await page.wait_for_load_state('networkidle')
        
        # Get all category names from buttons
        buttons = await page.query_selector_all('button')
        categories = []
        for btn in buttons:
            text = await btn.text_content()
            text = text.strip()
            if len(text) > 4 and len(text) < 30 and '友情' not in text and '点击' not in text:
                categories.append(text)
        
        print(f"Found {len(categories)} categories")
        
        result = {}
        
        for cat in categories:
            print(f"\nProcessing: {cat}")
            
            # Re-query buttons each time (SPA re-renders DOM)
            buttons = await page.query_selector_all('button')
            clicked = False
            for btn in buttons:
                text = await btn.text_content()
                if text.strip() == cat:
                    await btn.click()
                    clicked = True
                    break
            
            if not clicked:
                print(f"  Button not found!")
                continue
            
            # Wait for content to load
            await page.wait_for_timeout(3000)
            
            # Extract article titles
            articles = await page.evaluate('''
                () => {
                    let body = document.body.innerText;
                    let lines = body.split('\\n');
                    let articles = [];
                    for (let line of lines) {
                        if (line.includes("Journal of Advanced Ceramics") && line.length > 30) {
                            articles.push(line.trim());
                        }
                    }
                    return articles;
                }
            ''')
            
            result[cat] = articles
            print(f"  Found {len(articles)} articles")
        
        await browser.close()
        
        return result

if __name__ == '__main__':
    result = asyncio.run(main())
    
    with open('D:/Claw/JAC_Year/thjac_articles.json', 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print("\nDone!")
