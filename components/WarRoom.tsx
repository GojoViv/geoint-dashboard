'use client'

import { useState, useEffect, useCallback } from 'react'

const ALERTS = [
  '🔴 IRAN THREATENS DIMONA NUCLEAR REACTOR — Regime change red line',
  '🔴 STRAIT OF HORMUZ AT 15% CAPACITY — 20% of global oil supply disrupted',
  '🟠 IRANIAN CYBER ATTACKS on US banks & airports active — Seedworm / MuddyWater',
  '🟠 QATAR LNG (Ras Laffan) OFFLINE — European gas prices +50%',
  '🟡 CHINA: 16 PLA cargo planes sent to Iran — loitering munitions reported',
  '🟡 BRENT CRUDE $83/BBL — Citibank warns $120 if Hormuz closed for weeks',
  '🔴 6 US SOLDIERS KILLED — Shuaiba port, Kuwait, Mar 2 2026',
  '🟠 RUSSIA + CHINA demand UN Security Council emergency session',
  '🟡 TRUMP: Campaign could last 5 weeks — 50,000 US troops deployed',
  '🔴 IRAN CLAIMS 500+ US DEAD — Pentagon confirms only 6 (LOW confidence)',
]

const WAR_DAY_START = new Date('2026-02-28T00:00:00Z')

export default function WarRoom() {
  const [time, setTime] = useState('')
  const [warDay, setWarDay] = useState(0)
  const [alertIdx, setAlertIdx] = useState(0)
  const [articles, setArticles] = useState<any[]>([])
  const [markets, setMarkets] = useState<Record<string, any>>({})
  const [moodPulse, setMoodPulse] = useState(false)

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      setTime(now.toUTCString().replace('GMT', 'UTC'))
      const diff = Math.floor((now.getTime() - WAR_DAY_START.getTime()) / 86400000)
      setWarDay(diff + 1)
    }
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setAlertIdx(i => (i + 1) % ALERTS.length), 4500)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const t = setInterval(() => setMoodPulse(p => !p), 2000)
    return () => clearInterval(t)
  }, [])

  const loadData = useCallback(async () => {
    try {
      const [newsRes, mktRes] = await Promise.all([fetch('/api/news'), fetch('/api/markets')])
      const news = await newsRes.json()
      const mkt = await mktRes.json()
      setArticles((news.articles || []).slice(0, 8))
      setMarkets(mkt.markets || {})
    } catch {}
  }, [])

  useEffect(() => { loadData(); const t = setInterval(loadData, 120000); return () => clearInterval(t) }, [loadData])

  const fmt = (v: number | undefined, dec = 2) => v != null ? v.toFixed(dec) : '—'
  const brent = markets.brent
  const gold = markets.gold

  const STATS = [
    { label: 'US KIA (Confirmed)', value: '6', sub: '500+ (Iran claim — LOW conf)', color: '#3B82F6', icon: '🇺🇸' },
    { label: 'Iran KIA (Tasnim)', value: '1,332+', sub: 'Semiofficial source', color: '#C0392B', icon: '🇮🇷' },
    { label: 'Targets Struck', value: '3,000+', sub: 'CENTCOM confirmed', color: '#F39C12', icon: '💥' },
    { label: 'Hormuz Capacity', value: '15%', sub: 'Near-halt — mining confirmed', color: '#F97316', icon: '🚢' },
    { label: 'Brent Crude', value: brent ? `$${fmt(brent.price)}` : '$83.00', sub: brent ? `${brent.change >= 0 ? '+' : ''}${fmt(brent.change)}% war premium` : '+15% war premium', color: '#F59E0B', icon: '🛢️' },
    { label: 'Gold Spot', value: gold ? `$${fmt(gold.price, 0)}` : '—', sub: 'War hedge demand up', color: '#27AE60', icon: '🥇' },
  ]

  const RED_LINES_WATCH = [
    { label: 'Dimona Strike', status: 'THREATENED', color: '#F97316' },
    { label: 'Hormuz Full Close', status: 'NEAR', color: '#F59E0B' },
    { label: 'Gulf Oil Infra', status: 'NEAR', color: '#F59E0B' },
    { label: 'US Cyber Attack', status: 'ACTIVE', color: '#C0392B' },
    { label: 'China Entry', status: 'WATCHING', color: '#6B7280' },
    { label: 'WMD Use', status: 'WATCHING', color: '#6B7280' },
  ]

  return (
    <div className="space-y-4">

      {/* War Room Header */}
      <div className="bg-[#141418] rounded-xl p-4 border border-[#C0392B44]" style={{ boxShadow: '0 0 30px rgba(192,57,43,0.08)' }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-[#C0392B] animate-pulse-red" />
              <span className="font-mono font-black tracking-widest text-sm text-[#C0392B]">WAR ROOM</span>
              <span className="text-[10px] font-mono text-[#6B7280] border border-[#1E1E28] px-2 py-0.5 rounded">ACTIVE</span>
            </div>
            <div className="font-mono text-xs text-[#6B7280]">US-Israel vs Iran · Operation Epic Fury</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-mono font-black text-[#E8E8E8]">DAY {warDay}</div>
            <div className="text-[10px] font-mono text-[#6B7280]">Since Feb 28, 2026</div>
          </div>
        </div>
        <div className="text-[10px] font-mono text-[#6B7280] mb-1">LIVE CLOCK</div>
        <div className="font-mono text-xs text-[#00D4FF]">{time}</div>
      </div>

      {/* Alert Ticker */}
      <div className="bg-[#141418] rounded-lg px-4 py-2.5 border border-[#C0392B33] overflow-hidden">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono font-bold text-[#C0392B] shrink-0 border border-[#C0392B44] px-2 py-0.5 rounded">INTEL</span>
          <div key={alertIdx} className="text-xs text-[#E8E8E8] font-mono truncate animate-slide-in">
            {ALERTS[alertIdx]}
          </div>
        </div>
      </div>

      {/* Key Stats Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {STATS.map(s => (
          <div key={s.label} className="bg-[#141418] rounded-xl p-3 border border-[#1E1E28]">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className="text-base">{s.icon}</span>
              <span className="text-[10px] text-[#6B7280] font-mono leading-tight">{s.label}</span>
            </div>
            <div className="text-xl font-mono font-black leading-none" style={{ color: s.color }}>{s.value}</div>
            <div className="text-[10px] text-[#6B7280] mt-1 leading-tight">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Geopolitical Mood Index */}
      <div className="bg-[#141418] rounded-xl p-4 border border-[#C0392B44]">
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[10px] font-mono text-[#6B7280] mb-0.5">GEOPOLITICAL MOOD INDEX</div>
            <div className="text-[10px] text-[#6B7280]">Composite: conflict severity + Hormuz + nuclear threat + cyber + commodity</div>
          </div>
          <div className="text-3xl font-mono font-black text-[#C0392B]" style={{ textShadow: moodPulse ? '0 0 20px rgba(192,57,43,0.5)' : 'none', transition: 'text-shadow 0.5s' }}>
            8.2
            <span className="text-lg text-[#6B7280]">/10</span>
          </div>
        </div>
        <div className="h-2 bg-[#1E1E28] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-1000" style={{ width: '82%', background: 'linear-gradient(90deg, #F39C12, #F97316, #C0392B)' }} />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] font-mono text-[#6B7280]">CALM</span>
          <span className="text-[10px] font-mono text-[#C0392B] font-bold">CRITICAL</span>
        </div>
        <p className="text-[11px] text-[#6B7280] mt-2">Highest since 2003 Iraq invasion. Next escalation: Dimona strike or Hormuz full closure.</p>
      </div>

      {/* Active Operations */}
      <div className="bg-[#141418] rounded-xl p-4 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">ACTIVE OPERATIONS</div>
        <div className="space-y-2.5">
          {[
            { flag: '🇺🇸', name: 'Operation Epic Fury', status: 'ACTIVE', detail: 'US strikes on Iranian military, nuclear, energy infrastructure', color: '#3B82F6' },
            { flag: '🇮🇱', name: 'Operation Roar of the Lion', status: 'ACTIVE', detail: 'Israeli phase of joint operation — IDF + USAF targeting IRGC', color: '#06B6D4' },
            { flag: '🇮🇱🇺🇸', name: 'Shield of Judah (Joint)', status: 'ACTIVE', detail: 'Combined US-Israel operation framework since Feb 28', color: '#8B5CF6' },
            { flag: '🇮🇷', name: 'IRGC Retaliation Campaign', status: 'ONGOING', detail: 'Missile + drone strikes on US bases, Gulf infrastructure, Israel', color: '#C0392B' },
          ].map(op => (
            <div key={op.name} className="flex items-start gap-3">
              <span className="text-lg shrink-0">{op.flag}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold text-[#E8E8E8]">{op.name}</span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: op.color + '22', color: op.color, border: `1px solid ${op.color}44` }}>{op.status}</span>
                </div>
                <p className="text-[11px] text-[#6B7280] mt-0.5">{op.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Red Line Status */}
      <div className="bg-[#141418] rounded-xl p-4 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">RED LINE MONITOR</div>
        <div className="grid grid-cols-2 gap-2">
          {RED_LINES_WATCH.map(rl => (
            <div key={rl.label} className="flex items-center gap-2 p-2 rounded-lg" style={{ backgroundColor: rl.color + '11', border: `1px solid ${rl.color}22` }}>
              <div className={`w-2 h-2 rounded-full shrink-0 ${rl.status === 'ACTIVE' ? 'animate-pulse-red' : ''}`} style={{ backgroundColor: rl.color }} />
              <div>
                <div className="text-[10px] font-mono text-[#E8E8E8] leading-tight">{rl.label}</div>
                <div className="text-[9px] font-mono" style={{ color: rl.color }}>{rl.status}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Intelligence Feed */}
      <div className="bg-[#141418] rounded-xl p-4 border border-[#1E1E28]">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[10px] text-[#6B7280] font-mono">INTELLIGENCE FEED</div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#27AE60] animate-pulse-red" />
            <span className="text-[10px] font-mono text-[#27AE60]">LIVE</span>
          </div>
        </div>
        {articles.length === 0 ? (
          <div className="flex items-center gap-2 py-4 text-[#6B7280]">
            <div className="w-4 h-4 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-mono">Syncing OSINT feeds…</span>
          </div>
        ) : (
          <div className="space-y-2">
            {articles.map((a, i) => (
              <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                className="flex items-start gap-2 group hover:bg-[#1A1A20] rounded-lg p-1.5 -mx-1.5 transition-all">
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: a.confidenceColor || '#6B7280' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-[#E8E8E8] group-hover:text-[#00D4FF] transition-colors line-clamp-1">{a.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-[#6B7280] font-mono">{a.domain}</span>
                    <span style={{ backgroundColor: a.biasColor + '18', color: a.biasColor, border: `1px solid ${a.biasColor}33` }} className="text-[9px] font-mono px-1 rounded">{a.bias}</span>
                  </div>
                </div>
                <span className="text-[#6B7280] text-xs group-hover:text-[#00D4FF] transition-colors shrink-0">↗</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
