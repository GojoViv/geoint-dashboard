import { NextResponse } from 'next/server'

async function fetchYahoo(symbol: string) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    const result = data?.chart?.result?.[0]
    if (!result) return null
    const meta = result.meta
    const price = meta.regularMarketPrice
    const prev = meta.previousClose || meta.chartPreviousClose
    const change = prev ? ((price - prev) / prev) * 100 : 0
    return { price, change, prev, currency: meta.currency, symbol }
  } catch {
    return null
  }
}

export async function GET() {
  const symbols = {
    brent: 'BZ=F',
    gold: 'GC=F',
    LMT: 'LMT',
    RTX: 'RTX',
    NOC: 'NOC',
    BA: 'BA',
    usdeur: 'EURUSD=X',
  }

  const results = await Promise.all(
    Object.entries(symbols).map(async ([key, sym]) => {
      const data = await fetchYahoo(sym)
      return [key, data]
    })
  )

  const markets: Record<string, any> = {}
  for (const [key, data] of results) {
    markets[key as string] = data
  }

  return NextResponse.json({ markets, updatedAt: new Date().toISOString() })
}
