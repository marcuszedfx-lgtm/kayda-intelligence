import type { IntelligenceFeed } from '@/types/intelligence';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

export interface AdapterArticle {
  title: string;
  link: string;
  description: string;
  publishedAt: string;
  sourceId: string;
}

export interface AdapterResult {
  articles: AdapterArticle[];
  method: string;
  status: 'success' | 'empty' | 'protected' | 'error';
  error?: string;
}

function decodeEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, '$1')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/gi, (_, code) => {
      try {
        return String.fromCharCode(Number(code));
      } catch {
        return _;
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => {
      try {
        return String.fromCharCode(parseInt(code, 16));
      } catch {
        return _;
      }
    })
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTag(
  xml: string,
  names: string[],
): string {
  for (const name of names) {
    const expression = new RegExp(
      `<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`,
      'i',
    );

    const match = xml.match(expression);

    if (match?.[1]) {
      return decodeEntities(match[1]);
    }
  }

  return '';
}

function parseXmlFeed(
  xml: string,
  sourceId: string,
): AdapterArticle[] {
  const rssItems =
    xml.match(/<item(?:\s[^>]*)?>[\s\S]*?<\/item>/gi) ?? [];

  if (rssItems.length > 0) {
    return rssItems
      .map((item) => ({
        title: extractTag(item, ['title']),
        link: extractTag(item, ['link']),
        description: extractTag(item, [
          'description',
          'content:encoded',
        ]),
        publishedAt: extractTag(item, [
          'pubDate',
          'published',
          'updated',
        ]),
        sourceId,
      }))
      .filter((article) => article.title && article.link);
  }

  const atomEntries =
    xml.match(/<entry(?:\s[^>]*)?>[\s\S]*?<\/entry>/gi) ?? [];

  return atomEntries
    .map((entry) => {
      const linkMatch = entry.match(
        /<link[^>]+href=["']([^"']+)["'][^>]*\/?>/i,
      );

      return {
        title: extractTag(entry, ['title']),
        link: linkMatch?.[1] ?? extractTag(entry, ['link']),
        description: extractTag(entry, [
          'summary',
          'content',
        ]),
        publishedAt: extractTag(entry, [
          'published',
          'updated',
        ]),
        sourceId,
      };
    })
    .filter((article) => article.title && article.link);
}

function isProtectedResponse(
  response: ResponseLike,
  body: string,
): boolean {
  if (
    response.status === 401 ||
    response.status === 403 ||
    response.status === 429
  ) {
    return true;
  }

  const lower = body.toLowerCase();

  return (
    lower.includes('just a moment') ||
    lower.includes('cf-mitigated') ||
    lower.includes('cloudflare') ||
    lower.includes('verify you are human') ||
    lower.includes('checking your browser')
  );
}

interface ResponseLike {
  status: number;
  statusText: string;
  ok: boolean;
  contentType: string;
}

interface TextResponse {
  response: ResponseLike;
  body: string;
}

export interface SourceTransportResult {
  status: number;
  statusText: string;
  ok: boolean;
  contentType: string;
  body: string;
}

async function fetchWithNativeHttps(
  url: string,
  caFile: string,
): Promise<TextResponse> {
  if (!fs.existsSync(caFile)) {
    throw new Error(
      `ZRA CA bundle not found: ${caFile}`,
    );
  }

  const ca = fs.readFileSync(caFile);

  return await new Promise<TextResponse>((resolve, reject) => {
    const request = https.request(
      url,
      {
        method: 'GET',
        ca,
        rejectUnauthorized: true,
        headers: {
          'User-Agent':
            'Kayda-Intelligence/1.5 (+https://kayda.group)',
          Accept:
            'application/json, application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9',
        },
      },
      (response) => {
        const chunks: Buffer[] = [];

        response.on('data', (chunk) => {
          chunks.push(
            Buffer.isBuffer(chunk)
              ? chunk
              : Buffer.from(chunk),
          );
        });

        response.on('end', () => {
          resolve({
            response: {
              status: response.statusCode ?? 0,
              statusText:
                response.statusMessage ?? '',
              ok:
                (response.statusCode ?? 0) >= 200 &&
                (response.statusCode ?? 0) < 300,
              contentType:
                response.headers['content-type'] ??
                '',
            },
            body: Buffer.concat(chunks).toString('utf8'),
          });
        });
      },
    );

    request.setTimeout(15000, () => {
      request.destroy(
        new Error('ZRA request timed out after 15 seconds.'),
      );
    });

    request.on('error', reject);

    request.end();
  });
}

async function fetchText(
  url: string,
): Promise<TextResponse> {
  const isZra =
    /(^|\.)zra\.org\.zm$/i.test(
      new URL(url).hostname,
    );

  if (isZra) {
    const caFile =
      process.env.ZRA_CA_BUNDLE ||
      path.join(
        process.cwd(),
        'certs',
        'zra-sectigo-ca-bundle.pem',
      );

    return await fetchWithNativeHttps(
      url,
      caFile,
    );
  }

  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Kayda-Intelligence/1.5 (+https://kayda.group)',
      Accept:
        'application/rss+xml, application/atom+xml, application/xml, text/xml, application/json, text/html;q=0.9',
    },
    cache: 'no-store',
  });

  const body = await response.text();

  return {
    response: {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      contentType:
        response.headers.get('content-type') ??
        '',
    },
    body,
  };
}

export async function fetchSourceForValidation(
  url: string,
): Promise<SourceTransportResult> {
  const result = await fetchText(url);

  return {
    status: result.response.status,
    statusText: result.response.statusText,
    ok: result.response.ok,
    contentType:
      result.response.contentType,
    body: result.body,
  };
}


async function fetchWordPress(
  feed: IntelligenceFeed,
): Promise<AdapterResult> {
  if (!feed.feedUrl) {
    return {
      articles: [],
      method: 'WORDPRESS_API',
      status: 'empty',
      error:
        'No WordPress API endpoint configured.',
    };
  }

  const { response, body } =
    await fetchText(feed.feedUrl);

  if (isProtectedResponse(response, body)) {
    return {
      articles: [],
      method: 'WORDPRESS_API',
      status: 'protected',
      error:
        `Protected response: ${response.status} ${response.statusText}`,
    };
  }

  if (!response.ok) {
    return {
      articles: [],
      method: 'WORDPRESS_API',
      status: 'error',
      error:
        `WordPress API failed: ${response.status} ${response.statusText}`,
    };
  }

  let data: unknown;

  try {
    data = JSON.parse(body);
  } catch {
    return {
      articles: [],
      method: 'WORDPRESS_API',
      status: 'error',
      error:
        'WordPress API returned invalid JSON.',
    };
  }

  if (!Array.isArray(data)) {
    return {
      articles: [],
      method: 'WORDPRESS_API',
      status: 'empty',
      error:
        'WordPress API returned an unexpected response.',
    };
  }

  const articles: AdapterArticle[] = [];

  for (const item of data) {
    if (
      !item ||
      typeof item !== 'object'
    ) {
      continue;
    }

    const record =
      item as Record<string, unknown>;

    const title =
      typeof record.title === 'object' &&
      record.title !== null &&
      'rendered' in record.title
        ? String(
            (
              record.title as Record<
                string,
                unknown
              >
            ).rendered ?? '',
          )
        : String(record.title ?? '');

    const excerpt =
      typeof record.excerpt === 'object' &&
      record.excerpt !== null &&
      'rendered' in record.excerpt
        ? String(
            (
              record.excerpt as Record<
                string,
                unknown
              >
            ).rendered ?? '',
          )
        : String(record.excerpt ?? '');

    const link = String(
      record.link ?? '',
    );

    if (!title || !link) {
      continue;
    }

    articles.push({
      title: decodeEntities(title),
      link,
      description: decodeEntities(excerpt),
      publishedAt:
        String(
          record.date ??
            record.modified ??
            '',
        ) ||
        new Date().toISOString(),
      sourceId: feed.id,
    });
  }

  return {
    articles,
    method: 'WORDPRESS_API',
    status:
      articles.length
        ? 'success'
        : 'empty',
  };
}

async function fetchRssOrAtom(
  feed: IntelligenceFeed,
): Promise<AdapterResult> {
  if (!feed.feedUrl) {
    return {
      articles: [],
      method:
        feed.feedType === 'Atom'
          ? 'ATOM'
          : 'RSS',
      status: 'empty',
      error:
        'No RSS/Atom endpoint configured.',
    };
  }

  const { response, body } =
    await fetchText(feed.feedUrl);

  if (isProtectedResponse(response, body)) {
    return {
      articles: [],
      method:
        feed.feedType === 'Atom'
          ? 'ATOM'
          : 'RSS',
      status: 'protected',
      error:
        `Protected response: ${response.status} ${response.statusText}`,
    };
  }

  if (!response.ok) {
    return {
      articles: [],
      method:
        feed.feedType === 'Atom'
          ? 'ATOM'
          : 'RSS',
      status: 'error',
      error:
        `Feed failed: ${response.status} ${response.statusText}`,
    };
  }

  const articles =
    parseXmlFeed(
      body,
      feed.id,
    );

  return {
    articles,
    method:
      feed.feedType === 'Atom'
        ? 'ATOM'
        : 'RSS',
    status:
      articles.length
        ? 'success'
        : 'empty',
  };
}

async function fetchWebsite(
  feed: IntelligenceFeed,
): Promise<AdapterResult> {
  const { response, body } =
    await fetchText(feed.url);

  if (isProtectedResponse(response, body)) {
    return {
      articles: [],
      method: 'WEBSITE',
      status: 'protected',
      error:
        `Protected website response: ${response.status} ${response.statusText}`,
    };
  }

  if (!response.ok) {
    return {
      articles: [],
      method: 'WEBSITE',
      status: 'error',
      error:
        `Website failed: ${response.status} ${response.statusText}`,
    };
  }

  const articles: AdapterArticle[] = [];

  const linkPattern =
    /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of body.matchAll(
    linkPattern,
  )) {
    const href = match[1];
    const rawText = match[2];

    const title =
      decodeEntities(rawText);

    if (
      !title ||
      title.length < 20
    ) {
      continue;
    }

    const lowerTitle =
      title.toLowerCase();

    if (
      lowerTitle.includes('menu') ||
      lowerTitle.includes('read more') ||
      lowerTitle.includes('contact')
    ) {
      continue;
    }

    let link = href;

    try {
      link = new URL(
        href,
        feed.url,
      ).toString();
    } catch {
      continue;
    }

    articles.push({
      title: title.slice(0, 300),
      link,
      description: '',
      publishedAt:
        new Date().toISOString(),
      sourceId: feed.id,
    });
  }

  const unique =
    new Map<
      string,
      AdapterArticle
    >();

  for (const article of articles) {
    if (
      !unique.has(
        article.link,
      )
    ) {
      unique.set(
        article.link,
        article,
      );
    }
  }

  return {
    articles: Array.from(
      unique.values(),
    ).slice(0, 50),
    method: 'WEBSITE',
    status:
      unique.size
        ? 'success'
        : 'empty',
  };
}

export async function ingestFromSource(
  feed: IntelligenceFeed,
): Promise<AdapterResult> {
  try {
    switch (feed.feedType) {
      case 'API':
        if (
          feed.feedUrl?.includes(
            '/wp-json/',
          )
        ) {
          return await fetchWordPress(
            feed,
          );
        }

        return await fetchWebsite(
          feed,
        );

      case 'RSS':
      case 'Atom':
        return await fetchRssOrAtom(
          feed,
        );

      case 'Manual':
      default:
        return await fetchWebsite(
          feed,
        );
    }
  } catch (error) {
    return {
      articles: [],
      method: feed.feedType,
      status: 'error',
      error:
        error instanceof Error
          ? error.message
          : String(error),
    };
  }
}
