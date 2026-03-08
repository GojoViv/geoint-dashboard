import { NextResponse } from 'next/server'

const SOURCE_SCORES: Record<string, { bias: string; score: number; country: string }> = {
  'reuters.com': { bias: 'Neutral', score: 88, country: 'UK' },
  'apnews.com': { bias: 'Neutral', score: 90, country: 'USA' },
  'bbc.com': { bias: 'Western', score: 82, country: 'UK' },
  'bbc.co.uk': { bias: 'Western', score: 82, country: 'UK' },
  'ft.com': { bias: 'Western', score: 85, country: 'UK' },
  'wsj.com': { bias: 'Western', score: 83, country: 'USA' },
  'nytimes.com': { bias: 'Western', score: 80, country: 'USA' },
  'washingtonpost.com': { bias: 'Western', score: 78, country: 'USA' },
  'theguardian.com': { bias: 'Western', score: 79, country: 'UK' },
  'cnn.com': { bias: 'Western', score: 72, country: 'USA' },
  'npr.org': { bias: 'Western', score: 81, country: 'USA' },
  'cbsnews.com': { bias: 'Western', score: 76, country: 'USA' },
  'nbcnews.com': { bias: 'Western', score: 74, country: 'USA' },
  'aljazeera.com': { bias: 'Qatar-backed', score: 70, country: 'QAT' },
  'timesofisrael.com': { bias: 'Israeli', score: 72, country: 'ISR' },
  'haaretz.com': { bias: 'Israeli', score: 74, country: 'ISR' },
  'jpost.com': { bias: 'Israeli', score: 70, country: 'ISR' },
  'rt.com': { bias: 'Russian State', score: 28, country: 'RUS' },
  'tass.com': { bias: 'Russian State', score: 25, country: 'RUS' },
  'sputniknews.com': { bias: 'Russian State', score: 22, country: 'RUS' },
  'sputnikglobe.com': { bias: 'Russian State', score: 22, country: 'RUS' },
  'presstv.ir': { bias: 'Iranian State', score: 20, country: 'IRN' },
  'tehrantimes.com': { bias: 'Iranian State', score: 22, country: 'IRN' },
  'xinhua.net': { bias: 'Chinese State', score: 25, country: 'CHN' },
  'globaltimes.cn': { bias: 'Chinese State', score: 22, country: 'CHN' },
  'chinadaily.com.cn': { bias: 'Chinese State', score: 24, country: 'CHN' },
  'middleeasteye.net': { bias: 'Mideast', score: 65, country: 'INT' },
  'axios.com': { bias: 'Western', score: 80, country: 'USA' },
  'politico.com': { bias: 'Western', score: 78, country: 'USA' },
  'thehill.com': { bias: 'Western', score: 72, country: 'USA' },
  'foreignpolicy.com': { bias: 'Analytical', score: 84, country: 'USA' },
}

function getSourceInfo(url: string) {
  for (const [domain, info] of Object.entries(SOURCE_SCORES)) {
    if (url.includes(domain)) return info
  }
  return { bias: 'Unknown', score: 50, country: 'INT' }
}

function getBiasColor(bias: string) {
  const map: Record<string, string> = {
    'Neutral': '#27AE60',
    'Western': '#3B82F6',
    'Russian State': '#C0392B',
    'Iranian State': '#8B5CF6',
    'Chinese State': '#F59E0B',
    'Israeli': '#06B6D4',
    'Qatar-backed': '#F97316',
    'Analytical': '#10B981',
    'Mideast': '#6366F1',
    'Unknown': '#6B7280',
  }
  return map[bias] || '#6B7280'
}

function getConfidenceLabel(score: number) {
  if (score >= 80) return { label: 'HIGH', color: '#27AE60' }
  if (score >= 55) return { label: 'MEDIUM', color: '#F39C12' }
  return { label: 'LOW', color: '#C0392B' }
}

export async function GET() {
  const queries = [
    'iran war military 2026',
    'israel strikes iran nuclear',
    'china russia military support iran',
    'USA iran operation epic fury',
    'strait hormuz oil war 2026',
  ]

  const allArticles: any[] = []

  await Promise.allSettled(
    queries.map(async (query) => {
      try {
        const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(query)}&mode=artlist&maxrecords=8&format=json&timespan=48h&sort=DateDesc`
        const res = await fetch(url, { next: { revalidate: 120 }, signal: AbortSignal.timeout(6000) })
        if (!res.ok) return
        const data = await res.json()
        if (data?.articles) {
          for (const article of data.articles) {
            const sourceInfo = getSourceInfo(article.url || '')
            const conf = getConfidenceLabel(sourceInfo.score)
            allArticles.push({
              title: article.title,
              url: article.url,
              seendate: article.seendate,
              domain: article.domain,
              bias: sourceInfo.bias,
              biasColor: getBiasColor(sourceInfo.bias),
              confidence: sourceInfo.score,
              confidenceLabel: conf.label,
              confidenceColor: conf.color,
              country: sourceInfo.country,
            })
          }
        }
      } catch {}
    })
  )

  // Deduplicate by URL
  const seen = new Set<string>()
  const unique = allArticles.filter((a) => {
    if (!a.url || seen.has(a.url)) return false
    seen.add(a.url)
    return true
  })

  // Sort by date desc, limit 40
  unique.sort((a, b) => (b.seendate || '').localeCompare(a.seendate || ''))

  return NextResponse.json({ articles: unique.slice(0, 40), updatedAt: new Date().toISOString() })
}
