const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    try {
        await page.goto('http://127.0.0.1:5173');
        await page.waitForTimeout(2000);
        await page.click('button.start-game-btn');
        await page.waitForTimeout(500);
        await page.click('.difficulty-card');
        await page.waitForTimeout(1000);
        await page.mouse.click(10, 10);
        await page.waitForTimeout(500);

        console.log('Clicking encyclopedia button...');
        await page.click('button.mute-toggle-btn-header[title="圖鑑"]');
        await page.waitForTimeout(1000);

        const overlayBox = await page.evaluate(() => {
            const el = document.querySelector('.encyclopedia-overlay');
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            const zIndex = window.getComputedStyle(el).zIndex;
            return { top: rect.top, height: rect.height, zIndex };
        });

        const headerBox = await page.evaluate(() => {
            const el = document.querySelector('.header');
            if (!el) return null;
            const rect = el.getBoundingClientRect();
            const zIndex = window.getComputedStyle(el).zIndex;
            return { top: rect.top, height: rect.height, zIndex };
        });

        console.log('Overlay Box:', overlayBox);
        console.log('Header Box:', headerBox);

    } catch (e) {
        console.log('SCRIPT ERROR:', e.message);
    } finally {
        await browser.close();
    }
})();
