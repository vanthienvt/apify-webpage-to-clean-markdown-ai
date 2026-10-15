import { Actor } from 'apify';

function htmlToCleanMarkdown(html) {
  let clean = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '');

  clean = clean
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1')
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return clean;
}

await Actor.init();
const input = (await Actor.getInput()) || {};
const urls = Array.isArray(input.urls) && input.urls.length > 0 ? input.urls : ['https://example.com'];
const chunkSize = Number(input.chunkSizeChars || 1000);

const results = [];
for (const url of urls) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; MarkdownRagBot/1.0)' } });
    const html = await res.text();
    const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || null;
    const markdown = htmlToCleanMarkdown(html);
    const wordCount = markdown.split(/\s+/).filter(Boolean).length;
    const estimatedTokens = Math.ceil(wordCount * 1.35);

    const chunks = [];
    for (let i = 0; i < markdown.length; i += chunkSize) {
      chunks.push(markdown.slice(i, i + chunkSize));
    }

    results.push({
      url,
      title,
      wordCount,
      estimatedTokens,
      chunkCount: chunks.length,
      markdown,
      ragChunks: chunks,
      extractedAt: new Date().toISOString(),
    });
  } catch (e) {
    results.push({ url, error: e.message, extractedAt: new Date().toISOString() });
  }
}

await Actor.pushData(results);
console.log('Pushed', results.length, 'Markdown RAG records to Dataset.');
await Actor.exit();
