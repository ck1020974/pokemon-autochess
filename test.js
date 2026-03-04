const puppeteer = require('puppeteer');
(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERR:', err.message, err.stack));

    try {
        await page.goto('http://127.0.0.1:5173');
        await page.waitForTimeout(2000);
        console.log('Clicking start...');
        await page.click('button.start-game-btn');
        await page.waitForTimeout(500);
        console.log('Clicking normal difficulty...');
        await page.click('.difficulty-card');
        await page.waitForTimeout(1000);
        console.log('Skipping tutorial...');
        await page.mouse.click(10, 10);
        await page.waitForTimeout(500);
        console.log('Clicking encyclopedia button...');
        await page.click('button.mute-toggle-btn-header[title="圖鑑"]');
        await page.waitForTimeout(1000);
        const body = await page.evaluate(() => document.body.innerHTML);
        if (body.includes('encyclopedia-overlay')) {
            console.log('SUCCESS: Rendered overlay');
        } else {
            console.log('FAIL: Did not render overlay');
        }
    } catch (e) {
        console.log('SCRIPT ERROR:', e.stack);
    } finally {
        await browser.close();
    }
})();
