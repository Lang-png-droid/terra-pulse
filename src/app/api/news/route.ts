import { NextResponse } from 'next/server';
import { generateMockNews, NewsArticle } from '@/lib/normalizers';
import { fetchWithTimeout } from '@/lib/fetchWithTimeout';

const NEWS_SOURCES = [
  { name: 'BMKG', url: 'https://data.bmkg.go.id/DataMKG/TEWS/latest_earthquake.json', type: 'earthquake' },
  { name: 'BNPB', url: 'https://bnpb.go.id/rss', type: 'all' },
  { name: 'PVMBG', url: 'https://magma.vsi.esdm.go.id/api/news', type: 'volcano' },
];

async function fetchRssFeed(url: string): Promise<any[]> {
  const res = await fetchWithTimeout(url, { next: { revalidate: 600 } } as RequestInit);
  if (!res) return [];
  try {
    const text = await res.text();
    // Simple RSS parsing - in production use a proper parser
    const items = text.match(/<item>[\s\S]*?<\/item>/g) || [];
    return items.map((item) => {
      const title = item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/)?.[1] || item.match(/<title>(.*?)<\/title>/)?.[1] || '';
      const link = item.match(/<link>(.*?)<\/link>/)?.[1] || '';
      const description = item.match(/<description><!\[CDATA\[(.*?)\]\]><\/description>|<description>(.*?)<\/description>/)?.[1] || '';
      const pubDate = item.match(/<pubDate>(.*?)<\/pubDate>/)?.[1] || '';
      return { title, link, description, pubDate };
    });
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type'); // Filter by disaster type
  const limit = parseInt(searchParams.get('limit') || '20');

  let articles: NewsArticle[] = [];

  try {
    // Sources are independent: fetch in parallel so a dead network costs one
    // 3s timeout, not one per source.
    const feeds = await Promise.allSettled(NEWS_SOURCES.map((source) => fetchRssFeed(source.url)));

    feeds.forEach((feed, index) => {
      if (feed.status !== 'fulfilled') return;
      const source = NEWS_SOURCES[index];
      for (const item of feed.value.slice(0, 5)) {
        articles.push({
          id: `news-${source.name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: item.title,
          summary: String(item.description ?? '').replace(/<[^>]*>/g, '').slice(0, 200),
          url: item.link,
          source: source.name,
          publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
          disasterTypes: [source.type as any],
        });
      }
    });
  } catch {
    // Degraded network: fall through to mock news.
  }

  // Fallback to mock data if no real articles
  const usedMock = articles.length === 0;
  if (usedMock) {
    articles = generateMockNews();
  }

  // Filter by type if specified
  if (type && type !== 'all') {
    articles = articles.filter((a) => a.disasterTypes.includes(type as any));
  }

  // Sort by date descending
  articles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  // Limit results
  articles = articles.slice(0, limit);

  return NextResponse.json(
    { articles, meta: { source: usedMock ? 'mock' : 'live', cached: false, stale: usedMock, timestamp: new Date().toISOString() } },
    {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
