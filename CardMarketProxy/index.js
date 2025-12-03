const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/price', async (req, res) => {
  const cardName = req.query.card;
  if (!cardName) return res.status(400).json({ error: 'Missing card name' });

  const url = `https://www.cardmarket.com/en/Magic/Products/Search?searchString=${encodeURIComponent(cardName)}&searchMode=v2`;

  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });

    await page.waitForSelector('.table-body .row');

    const prices = await page.$$eval('.table-body .row', rows => {
      return rows.map(row => {
        const langEl = row.querySelector('[data-original-title]');
        const lang = langEl?.getAttribute('data-original-title')?.trim();
        const priceEl = row.querySelector('.price-container .price');
        const priceText = priceEl?.textContent?.trim().replace('€', '');
        return {
          language: lang,
          price: parseFloat(priceText?.replace(',', '.')),
        };
      }).filter(r => r.language === 'English' && !isNaN(r.price));
    });

    const min = prices.reduce((min, p) => p.price < min ? p.price : min, Infinity);
    await browser.close();
    res.json({ minPrice: min });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to scrape price' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
