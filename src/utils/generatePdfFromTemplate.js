// src/utils/generatePdfFromTemplate.js
import Handlebars from 'handlebars';
import { launchPdfBrowser } from './pdfBrowser.js';

/**
 * Renders a DocumentType HTML template (with Handlebars placeholders)
 * into a PDF Buffer (A4, print background).
 */
export async function generatePdfFromTemplate(templateHtml, data) {
  const template = Handlebars.compile(templateHtml);
  const html = template(data || {});

  const browser = await launchPdfBrowser();

  try {
    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '10mm',
        right: '10mm',
        bottom: '10mm',
        left: '10mm',
      },
    });

    await page.close();
    return pdfBuffer;
  } finally {
    await browser.close();
  }
}
