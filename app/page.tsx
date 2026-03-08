'use client'

import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import dynamic from 'next/dynamic'
import WarRoom from '@/components/WarRoom'

const SituationMap = dynamic(() => import('@/components/SituationMap'), { ssr: false })

// ─── Types ───────────────────────────────────────────────────────────────────

interface Article {
  title: string; url: string; seendate: string; domain: string
  bias: string; biasColor: string; confidence: number
  confidenceLabel: string; confidenceColor: string; country: string
}

interface MarketItem { price: number; change: number; currency: string; symbol: string }

// ─── Static Data ─────────────────────────────────────────────────────────────

const COUNTRIES = [
  {
    id: 'usa', name: 'United States', flag: '🇺🇸', color: '#3B82F6',
    threatLevel: 3, status: 'At War — Operation Epic Fury',
    role: 'Aggressor / Initiator',
    summary: 'Joint US-Israel strikes on Iran began Feb 28, 2026. 50,000+ troops, 2 carrier groups, 200+ fighter jets deployed. Operation targeting nuclear sites, military infrastructure.',
    casualties: { confirmed: 6, wounded: 18, claimed: null },
    nuclear: { warheads: 5177, posture: 'Stable Deterrence', status: 'Normal' },
    sanctions: 'Imposing on Iran',
    keyFacts: ['Operation Epic Fury active', '3,000+ targets struck', '43 Iranian warships destroyed', 'World\'s largest oil exporter, benefiting economically'],
    redLines: ['Iran strikes CONUS', 'China enters conflict directly'],
  },
  {
    id: 'iran', name: 'Iran', flag: '🇮🇷', color: '#C0392B',
    threatLevel: 5, status: 'Under Attack — Retaliating',
    role: 'Defender / Retaliating',
    summary: 'Supreme Leader killed Feb 28. Military, nuclear, and energy infrastructure under sustained bombardment. IRGC retaliating with missiles and drones across region.',
    casualties: { confirmed: 1332, wounded: null, claimed: null },
    nuclear: { warheads: 0, posture: 'Pre-Nuclear (degraded)', status: 'Program Under Attack' },
    sanctions: 'Under maximum pressure',
    keyFacts: ['Supreme Leader killed Feb 28', 'Strait of Hormuz near-halted', '500+ US deaths claimed (unverified)', 'Threatening Dimona nuclear strike'],
    redLines: ['Strike on Dimona', 'WMD deployment', 'Hormuz fully closed'],
  },
  {
    id: 'israel', name: 'Israel', flag: '🇮🇱', color: '#06B6D4',
    threatLevel: 4, status: 'Active Combat — Operation Roar of the Lion',
    role: 'Co-Aggressor',
    summary: 'Co-launched strikes with US on Feb 28. Targeting Iranian nuclear program, IRGC leadership, missile infrastructure. Iran has threatened to strike Dimona.',
    casualties: { confirmed: null, wounded: null, claimed: null },
    nuclear: { warheads: 90, posture: 'Ambiguous (Samson Option)', status: 'Elevated — Dimona threatened' },
    sanctions: 'None',
    keyFacts: ['~90 nuclear warheads (unconfirmed)', 'Dimona reactor threatened by Iran', 'F-35I + Dolphin subs deployed', 'Jericho IV ICBM operational by 2027'],
    redLines: ['Existential threat → Samson Option', 'Dimona strike'],
  },
  {
    id: 'china', name: 'China', flag: '🇨🇳', color: '#F59E0B',
    threatLevel: 2, status: 'Elevated — Diplomatic Support to Iran',
    role: 'Indirect Supporter',
    summary: 'Buying 80%+ of Iran\'s oil. Sent PLA cargo planes with drones/air defense to Iran in Jan. Running digital sovereignty program in Iran. Diplomatically opposing strikes at UN.',
    casualties: { confirmed: 0, wounded: 0, claimed: null },
    nuclear: { warheads: 600, posture: 'Moving to Launch-on-Warning', status: 'Rapid Modernization' },
    sanctions: 'Imposing rare earth export bans (military use)',
    keyFacts: ['600 warheads → 1,500 by 2035', 'Fastest growing arsenal globally', '16 PLA cargo planes to Iran (Jan 2026)', 'Rare earth ban affecting US weapons manufacturing'],
    redLines: ['Taiwan strike triggers China entry', 'US sanctions on Chinese banks for Iran oil'],
  },
  {
    id: 'russia', name: 'Russia', flag: '🇷🇺', color: '#8B5CF6',
    threatLevel: 2, status: 'Benefiting — Diplomatic Backing for Iran',
    role: 'Indirect Beneficiary',
    summary: 'Diplomatically backing Iran at UN. Benefiting from oil/LNG supply disruption — selling more crude to China/India at higher prices. Still engaged in Ukraine.',
    casualties: { confirmed: 0, wounded: 0, claimed: null },
    nuclear: { warheads: 4300, posture: 'Elevated Alert (Ukraine context)', status: 'Ready' },
    sanctions: 'Under Western sanctions (Ukraine)',
    keyFacts: ['4,300 operational warheads', 'Largest nuclear arsenal globally', 'Benefiting from $83+/barrel oil', 'Supplying China/India at premium prices'],
    redLines: ['NATO Article 5 trigger', 'Nuclear use in Ukraine'],
  },
]

const WAR_STATS = {
  lastUpdated: 'Mar 8, 2026 — 16:00 UTC',
  usKilled: { confirmed: 6, iranian_claim: 500 },
  usWounded: { confirmed: 18 },
  iranKilled: { confirmed: 1332, source: 'Tasnim (semiofficial)' },
  targetsStruck: { value: '3,000+', source: 'CENTCOM' },
  warshipsDestroyed: { value: 43, source: 'CENTCOM' },
  hormuz: { status: 'Near-Halt', pctCapacity: 15 },
  operationStart: 'Feb 28, 2026',
  operationNames: ['Epic Fury (US)', 'Roar of the Lion (Israel) / Shield of Judah (Joint)'],
  usAssets: { troops: '50,000+', carriers: 2, fighters: '200+', bombers: true },
}

const RED_LINES = [
  { id: 1, label: 'Iran strikes Dimona nuclear reactor', status: 'threatened', severity: 5, detail: 'Senior IRGC official threatened Dimona if regime change pursued' },
  { id: 2, label: 'Iran deploys chemical/biological weapons', status: 'watch', severity: 5, detail: 'No evidence yet. Maximum red line for US/Israel escalation.' },
  { id: 3, label: 'China enters conflict directly', status: 'watch', severity: 5, detail: 'Xi prioritizing summit with Trump. Unlikely near-term.' },
  { id: 4, label: 'Strait of Hormuz fully closed (weeks)', status: 'near', severity: 4, detail: 'Currently at ~15% capacity. Full closure = $120+/bbl.' },
  { id: 5, label: 'Russia opens second front (Ukraine surge)', status: 'watch', severity: 4, detail: 'Russia benefiting economically. No military escalation yet.' },
  { id: 6, label: 'Iran nuclear breakout / dirty bomb', status: 'watch', severity: 5, detail: 'Program being actively degraded by strikes. Risk reduced.' },
  { id: 7, label: 'Gulf state oil infrastructure attacked', status: 'near', severity: 4, detail: 'Qatar LNG facilities already hit (Ras Laffan, Mesaieed).' },
  { id: 8, label: 'US domestic cyberattack (critical infra)', status: 'active', severity: 3, detail: 'Seedworm/MuddyWater active on US banks, airports.' },
]

const ESCALATION_EVENTS = [
  { date: 'Feb 28', label: 'US-Israel launch strikes on Iran', severity: 5, flag: '🇺🇸🇮🇱' },
  { date: 'Feb 28', label: 'Supreme Leader killed, Tehran struck', severity: 5, flag: '🇮🇷' },
  { date: 'Mar 1', label: 'IRGC retaliatory missile strikes on US bases', severity: 4, flag: '🇮🇷' },
  { date: 'Mar 2', label: '6 US soldiers killed at Shuaiba port, Kuwait', severity: 4, flag: '🇺🇸' },
  { date: 'Mar 2', label: 'Iran closes Strait of Hormuz', severity: 5, flag: '🇮🇷' },
  { date: 'Mar 3', label: 'Iranian cyberattacks on US banks & airports', severity: 3, flag: '🇮🇷' },
  { date: 'Mar 4', label: 'Russia & China demand UN Security Council session', severity: 2, flag: '🇷🇺🇨🇳' },
  { date: 'Mar 5', label: 'Qatar LNG facilities struck (drone)', severity: 4, flag: '🇮🇷' },
  { date: 'Mar 5', label: 'Brent crude hits $83/bbl (+15%)', severity: 3, flag: '🌐' },
  { date: 'Mar 6', label: 'Iran threatens to strike Dimona', severity: 5, flag: '🇮🇷' },
  { date: 'Mar 7', label: 'Trump: campaign could last 5 weeks', severity: 3, flag: '🇺🇸' },
  { date: 'Mar 8', label: 'CENTCOM: 3,000+ targets, 43 warships destroyed', severity: 3, flag: '🇺🇸' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function ConfidenceBadge({ label, color, score }: { label: string; color: string; score: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold" style={{ backgroundColor: color + '22', color, border: `1px solid ${color}44` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {label} {score}%
    </span>
  )
}

function BiasBadge({ bias, color }: { bias: string; color: string }) {
  return (
    <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono" style={{ backgroundColor: color + '18', color, border: `1px solid ${color}33` }}>
      {bias}
    </span>
  )
}

function ThreatMeter({ level }: { level: number }) {
  const colors = ['', '#27AE60', '#F39C12', '#F97316', '#C0392B', '#7F1D1D']
  const labels = ['', 'MINIMAL', 'LOW', 'ELEVATED', 'HIGH', 'CRITICAL']
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-[10px] text-[#6B7280] font-mono">THREAT</span>
        <span className="text-[10px] font-mono font-bold" style={{ color: colors[level] }}>{labels[level]}</span>
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex-1 h-1.5 rounded-full" style={{ backgroundColor: i <= level ? colors[level] : '#1E1E28' }} />
        ))}
      </div>
    </div>
  )
}

function RedLineStatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; color: string }> = {
    active: { label: 'ACTIVE', color: '#C0392B' },
    threatened: { label: 'THREATENED', color: '#F97316' },
    near: { label: 'NEAR', color: '#F59E0B' },
    watch: { label: 'WATCHING', color: '#6B7280' },
    crossed: { label: 'CROSSED', color: '#7F1D1D' },
  }
  const s = map[status] || map.watch
  return (
    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded" style={{ backgroundColor: s.color + '22', color: s.color, border: `1px solid ${s.color}44` }}>
      {s.label}
    </span>
  )
}

// ─── Tab: Feed ────────────────────────────────────────────────────────────────

function FeedTab() {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState('')
  const [filter, setFilter] = useState('ALL')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/news')
      const data = await res.json()
      setArticles(data.articles || [])
      setUpdatedAt(data.updatedAt)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 90000); return () => clearInterval(t) }, [load])

  const countries = ['ALL', 'USA', 'IRN', 'ISR', 'CHN', 'RUS', 'INT']
  const filtered = filter === 'ALL' ? articles : articles.filter(a => a.country === filter)

  function formatDate(s: string) {
    if (!s) return ''
    try {
      const d = s.slice(6,8), m = s.slice(4,6), h = s.slice(9,11), mi = s.slice(11,13)
      return `${d}/${m} ${h}:${mi}Z`
    } catch { return s }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5 flex-wrap">
          {countries.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className="px-2.5 py-1 rounded text-[11px] font-mono transition-all"
              style={{ backgroundColor: filter === c ? '#00D4FF22' : '#141418', color: filter === c ? '#00D4FF' : '#6B7280', border: `1px solid ${filter === c ? '#00D4FF44' : '#1E1E28'}` }}>
              {c}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-[#6B7280] font-mono">AUTO-REFRESH 90s</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-5 h-5 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#6B7280] text-sm font-mono">Fetching OSINT feeds…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[#6B7280] font-mono text-sm">No articles for: {filter}</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((a, i) => (
            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
              className="block p-3 rounded-lg border border-[#1E1E28] bg-[#141418] hover:bg-[#1A1A20] transition-all group">
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#E8E8E8] group-hover:text-[#00D4FF] transition-colors leading-snug line-clamp-2">{a.title}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="text-[11px] text-[#6B7280] font-mono">{a.domain}</span>
                    <span className="text-[10px] text-[#3D3D48]">·</span>
                    <span className="text-[11px] text-[#6B7280] font-mono">{formatDate(a.seendate)}</span>
                    <BiasBadge bias={a.bias} color={a.biasColor} />
                    <ConfidenceBadge label={a.confidenceLabel} color={a.confidenceColor} score={a.confidence} />
                  </div>
                </div>
                <span className="text-[#6B7280] text-xs mt-0.5 group-hover:text-[#00D4FF] transition-colors">↗</span>
              </div>
            </a>
          ))}
        </div>
      )}
      {updatedAt && <p className="text-[10px] text-[#3D3D48] font-mono text-center">Last sync: {new Date(updatedAt).toUTCString()}</p>}
    </div>
  )
}

// ─── Tab: Nations ─────────────────────────────────────────────────────────────

function NationsTab() {
  const [expanded, setExpanded] = useState<string | null>(null)

  return (
    <div className="space-y-3">
      {COUNTRIES.map(c => (
        <div key={c.id} className="rounded-lg border bg-[#141418] overflow-hidden transition-all"
          style={{ borderColor: expanded === c.id ? c.color + '55' : '#1E1E28', boxShadow: expanded === c.id ? `0 0 0 1px ${c.color}22` : 'none' }}>
          <button className="w-full p-4 text-left" onClick={() => setExpanded(expanded === c.id ? null : c.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{c.flag}</span>
                <div>
                  <div className="font-semibold text-[#E8E8E8]">{c.name}</div>
                  <div className="text-xs font-mono mt-0.5" style={{ color: c.color }}>{c.status}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-24 hidden sm:block"><ThreatMeter level={c.threatLevel} /></div>
                <span className="text-[#6B7280] text-sm">{expanded === c.id ? '▲' : '▼'}</span>
              </div>
            </div>
            <div className="mt-2 sm:hidden"><ThreatMeter level={c.threatLevel} /></div>
          </button>

          {expanded === c.id && (
            <div className="px-4 pb-4 border-t border-[#1E1E28] pt-3 animate-slide-in">
              <p className="text-sm text-[#A0A0B0] leading-relaxed mb-3">{c.summary}</p>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="bg-[#0D0D0F] rounded-lg p-3">
                  <div className="text-[10px] text-[#6B7280] font-mono mb-1">CASUALTIES (CONFIRMED)</div>
                  <div className="text-lg font-bold font-mono" style={{ color: c.color }}>{c.casualties.confirmed !== null ? c.casualties.confirmed.toLocaleString() : '—'}</div>
                  {c.casualties.wounded != null && <div className="text-[11px] text-[#6B7280]">+{c.casualties.wounded} wounded</div>}
                </div>
                <div className="bg-[#0D0D0F] rounded-lg p-3">
                  <div className="text-[10px] text-[#6B7280] font-mono mb-1">NUCLEAR WARHEADS</div>
                  <div className="text-lg font-bold font-mono" style={{ color: c.color }}>{c.nuclear.warheads.toLocaleString()}</div>
                  <div className="text-[11px] text-[#6B7280] leading-tight mt-0.5">{c.nuclear.posture}</div>
                </div>
              </div>
              <div className="bg-[#0D0D0F] rounded-lg p-3 mb-3">
                <div className="text-[10px] text-[#6B7280] font-mono mb-1">NUCLEAR STATUS</div>
                <div className="text-xs font-mono" style={{ color: c.nuclear.status.includes('threat') || c.nuclear.status.includes('Attack') ? '#C0392B' : c.nuclear.status.includes('Moderniz') ? '#F59E0B' : '#27AE60' }}>{c.nuclear.status}</div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[10px] text-[#6B7280] font-mono">KEY INTELLIGENCE</div>
                {c.keyFacts.map((f, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#A0A0B0]">
                    <span style={{ color: c.color }} className="mt-0.5 shrink-0">▸</span>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-[#1E1E28]">
                <div className="text-[10px] text-[#6B7280] font-mono mb-1.5">RED LINES</div>
                <div className="flex flex-wrap gap-1.5">
                  {c.redLines.map((rl, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-[#C0392B11] text-[#C0392B] border border-[#C0392B22] font-mono">{rl}</span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Tab: War Stats ───────────────────────────────────────────────────────────

function WarStatsTab() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm font-bold text-[#E8E8E8]">CONFLICT STATISTICS</h2>
          <p className="text-[10px] text-[#6B7280] font-mono mt-0.5">Last verified: {WAR_STATS.lastUpdated}</p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-[#6B7280] font-mono">OPERATION START</div>
          <div className="text-xs font-mono text-[#C0392B]">{WAR_STATS.operationStart}</div>
        </div>
      </div>

      <div className="bg-[#141418] rounded-lg p-3 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-2">OPERATION NAMES</div>
        {WAR_STATS.operationNames.map((n, i) => <div key={i} className="text-xs font-mono text-[#00D4FF]">▸ {n}</div>)}
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#C0392B33]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">CASUALTIES — CONFIRMED vs CLAIMED</div>
        <div className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-[#E8E8E8]">🇺🇸 US Killed (Pentagon)</span>
              <span className="font-mono font-bold text-[#27AE60]">{WAR_STATS.usKilled.confirmed} confirmed</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#6B7280]">🇮🇷 Iranian claim</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-[#C0392B]">{WAR_STATS.usKilled.iranian_claim}+ claimed</span>
                <ConfidenceBadge label="LOW" color="#C0392B" score={20} />
              </div>
            </div>
          </div>
          <div className="border-t border-[#1E1E28] pt-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-[#E8E8E8]">🇮🇷 Iran Killed (Tasnim)</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-[#C0392B]">{WAR_STATS.iranKilled.confirmed.toLocaleString()}+</span>
                <ConfidenceBadge label="MEDIUM" color="#F39C12" score={60} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#141418] rounded-lg p-3 border border-[#1E1E28]">
          <div className="text-[10px] text-[#6B7280] font-mono mb-1">TARGETS STRUCK</div>
          <div className="text-2xl font-mono font-bold text-[#00D4FF]">{WAR_STATS.targetsStruck.value}</div>
          <div className="text-[11px] text-[#6B7280]">{WAR_STATS.targetsStruck.source}</div>
        </div>
        <div className="bg-[#141418] rounded-lg p-3 border border-[#1E1E28]">
          <div className="text-[10px] text-[#6B7280] font-mono mb-1">WARSHIPS DESTROYED</div>
          <div className="text-2xl font-mono font-bold text-[#00D4FF]">{WAR_STATS.warshipsDestroyed.value}</div>
          <div className="text-[11px] text-[#6B7280]">{WAR_STATS.warshipsDestroyed.source}</div>
        </div>
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#C0392B44]">
        <div className="flex justify-between items-center mb-2">
          <div className="text-[10px] text-[#6B7280] font-mono">STRAIT OF HORMUZ CAPACITY</div>
          <div className="text-xs font-mono text-[#C0392B] font-bold">{WAR_STATS.hormuz.status}</div>
        </div>
        <div className="h-2 bg-[#1E1E28] rounded-full overflow-hidden">
          <div className="h-full bg-[#C0392B] rounded-full" style={{ width: `${WAR_STATS.hormuz.pctCapacity}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-[#6B7280] font-mono">{WAR_STATS.hormuz.pctCapacity}% flowing</span>
          <span className="text-[10px] text-[#6B7280] font-mono">Carries 20% global oil</span>
        </div>
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">US MILITARY ASSETS DEPLOYED</div>
        <div className="grid grid-cols-2 gap-3">
          {[{ label: 'Troops', value: WAR_STATS.usAssets.troops }, { label: 'Carrier Groups', value: WAR_STATS.usAssets.carriers.toString() }, { label: 'Fighter Jets', value: WAR_STATS.usAssets.fighters }, { label: 'Strategic Bombers', value: 'YES' }].map((s, i) => (
            <div key={i}>
              <div className="text-[10px] text-[#6B7280] font-mono">{s.label}</div>
              <div className="text-sm font-mono font-bold text-[#E8E8E8]">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Escalation Timeline */}
      <div className="bg-[#141418] rounded-lg p-4 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">ESCALATION TIMELINE</div>
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-3" style={{ minWidth: `${ESCALATION_EVENTS.length * 140}px` }}>
            {ESCALATION_EVENTS.map((e, i) => {
              const sevColor = e.severity >= 5 ? '#C0392B' : e.severity >= 4 ? '#F97316' : e.severity >= 3 ? '#F39C12' : '#6B7280'
              return (
                <div key={i} className="flex flex-col items-center gap-1.5" style={{ width: 130, flexShrink: 0 }}>
                  <div className="text-[10px] font-mono text-[#6B7280]">{e.date}</div>
                  <div className="w-3 h-3 rounded-full border-2" style={{ backgroundColor: sevColor + '44', borderColor: sevColor }} />
                  <div className="text-[10px] text-center leading-tight text-[#A0A0B0]">{e.flag} {e.label}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Red lines */}
      <div className="space-y-2">
        <div className="text-[10px] text-[#6B7280] font-mono">RED LINE TRACKER</div>
        {RED_LINES.map(rl => (
          <div key={rl.id} className="bg-[#141418] rounded-lg p-3 border border-[#1E1E28] flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-[#E8E8E8]">{rl.label}</span>
                <RedLineStatusBadge status={rl.status} />
              </div>
              <p className="text-[11px] text-[#6B7280] mt-1">{rl.detail}</p>
            </div>
            <div className="flex gap-0.5 shrink-0">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="w-1.5 h-4 rounded-sm" style={{ backgroundColor: i <= rl.severity ? '#C0392B' : '#1E1E28' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Tab: Markets ─────────────────────────────────────────────────────────────

function MarketsTab() {
  const [markets, setMarkets] = useState<Record<string, MarketItem | null>>({})
  const [loading, setLoading] = useState(true)
  const [updatedAt, setUpdatedAt] = useState('')

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/markets')
      const data = await res.json()
      setMarkets(data.markets || {})
      setUpdatedAt(data.updatedAt)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => { load(); const t = setInterval(load, 300000); return () => clearInterval(t) }, [load])

  const fmt = (v: number | undefined, dec = 2) => v != null ? v.toFixed(dec) : '—'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-sm font-bold text-[#E8E8E8]">WAR ECONOMY TRACKER</h2>
        <span className="text-[10px] text-[#6B7280] font-mono">AUTO-REFRESH 5m</span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-3">
          <div className="w-5 h-5 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#6B7280] text-sm font-mono">Fetching market data…</span>
        </div>
      ) : (
        <>
          <div className="bg-[#141418] rounded-lg p-4 border border-[#F39C1233]">
            <div className="text-[10px] text-[#6B7280] font-mono mb-3">COMMODITIES</div>
            <div className="space-y-4">
              {[
                { key: 'brent', label: 'Brent Crude', unit: '/bbl', note: 'Hormuz disruption driver' },
                { key: 'gold', label: 'Gold Spot', unit: '/oz', note: 'War hedge indicator' },
              ].map(c => {
                const d = markets[c.key]
                const pos = d ? d.change >= 0 : false
                return (
                  <div key={c.key}>
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold text-[#E8E8E8]">{c.label}</div>
                        <div className="text-[11px] text-[#6B7280]">{c.note}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xl font-mono font-bold text-[#F39C12]">${d ? fmt(d.price) : '—'}<span className="text-sm font-normal text-[#6B7280]">{c.unit}</span></div>
                        <div className={`text-xs font-mono ${pos ? 'text-[#27AE60]' : 'text-[#C0392B]'}`}>{d ? `${pos ? '+' : ''}${fmt(d.change)}%` : '—'}</div>
                      </div>
                    </div>
                    {c.key === 'brent' && (
                      <div className="mt-2 p-2 bg-[#C0392B11] rounded border border-[#C0392B22]">
                        <p className="text-[11px] text-[#C0392B]">⚠ Citibank: $120/bbl if Hormuz disruption persists weeks</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-[#141418] rounded-lg p-4 border border-[#1E1E28]">
            <div className="text-[10px] text-[#6B7280] font-mono mb-3">DEFENCE STOCKS</div>
            <div className="space-y-3">
              {[{ key: 'LMT', label: 'Lockheed Martin' }, { key: 'RTX', label: 'RTX Corp (Raytheon)' }, { key: 'NOC', label: 'Northrop Grumman' }, { key: 'BA', label: 'Boeing' }].map(d => {
                const data = markets[d.key]
                const pos = data ? data.change >= 0 : false
                return (
                  <div key={d.key} className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-mono font-bold text-[#E8E8E8]">{d.key}</div>
                      <div className="text-[11px] text-[#6B7280]">{d.label}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-mono font-bold text-[#E8E8E8]">${data ? fmt(data.price) : '—'}</div>
                      <div className={`text-xs font-mono ${pos ? 'text-[#27AE60]' : 'text-[#C0392B]'}`}>{data ? `${pos ? '+' : ''}${fmt(data.change)}%` : '—'}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="bg-[#141418] rounded-lg p-4 border border-[#1E1E28]">
            <div className="text-[10px] text-[#6B7280] font-mono mb-2">SOURCE BIAS COMPASS</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Neutral', color: '#27AE60', outlets: 'Reuters, AP, FT' },
                { label: 'Western', color: '#3B82F6', outlets: 'BBC, CNN, NYT, WaPo' },
                { label: 'Russian State', color: '#C0392B', outlets: 'RT, TASS, Sputnik' },
                { label: 'Iranian State', color: '#8B5CF6', outlets: 'PressTV, Tehran Times' },
                { label: 'Chinese State', color: '#F59E0B', outlets: 'Xinhua, Global Times' },
                { label: 'Israeli', color: '#06B6D4', outlets: 'Times of Israel, Haaretz' },
              ].map(b => (
                <div key={b.label} className="flex items-center gap-2 text-[11px]">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <div><span style={{ color: b.color }} className="font-mono font-bold">{b.label}</span><span className="text-[#6B7280] ml-1">· {b.outlets}</span></div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
      {updatedAt && <p className="text-[10px] text-[#3D3D48] font-mono text-center">Last sync: {new Date(updatedAt).toUTCString()}</p>}
    </div>
  )
}

// ─── Tab: Nuclear ─────────────────────────────────────────────────────────────

function NuclearTab() {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-[#C0392B11] border border-[#C0392B33] rounded-lg">
        <p className="text-[11px] text-[#C0392B] font-mono leading-relaxed">
          ⚠ NUCLEAR WATCH ACTIVE — Iran threatened Dimona. China modernizing fastest in history.
        </p>
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">OPERATIONAL WARHEADS</div>
        <div className="space-y-3">
          {[
            { name: 'USA', flag: '🇺🇸', warheads: 5177, max: 5177, color: '#3B82F6', note: 'Treaty-limited, stable' },
            { name: 'Russia', flag: '🇷🇺', warheads: 4300, max: 5177, color: '#8B5CF6', note: 'Elevated alert (Ukraine)' },
            { name: 'China', flag: '🇨🇳', warheads: 600, max: 5177, color: '#F59E0B', note: '→ 1,500 by 2035' },
            { name: 'Israel', flag: '🇮🇱', warheads: 90, max: 5177, color: '#06B6D4', note: 'Unconfirmed (Samson)' },
            { name: 'Iran', flag: '🇮🇷', warheads: 0, max: 5177, color: '#C0392B', note: 'Pre-nuclear, degraded' },
          ].map(c => (
            <div key={c.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-[#E8E8E8]">{c.flag} {c.name}</span>
                <div className="text-right">
                  <span className="text-xs font-mono font-bold" style={{ color: c.color }}>{c.warheads.toLocaleString()}</span>
                  <span className="text-[11px] text-[#6B7280] ml-2">{c.note}</span>
                </div>
              </div>
              <div className="h-2 bg-[#1E1E28] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(c.warheads / c.max) * 100}%`, backgroundColor: c.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#F59E0B33]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">🇨🇳 CHINA MODERNIZATION TRACK</div>
        <div className="space-y-2">
          {[
            { year: '2023', warheads: 410, pct: 27 }, { year: '2024', warheads: 500, pct: 33 },
            { year: '2025', warheads: 600, pct: 40 }, { year: '2030 (proj)', warheads: 1000, pct: 67 },
            { year: '2035 (proj)', warheads: 1500, pct: 100 },
          ].map(y => (
            <div key={y.year}>
              <div className="flex justify-between mb-0.5">
                <span className="text-[11px] font-mono text-[#6B7280]">{y.year}</span>
                <span className="text-[11px] font-mono font-bold text-[#F59E0B]">{y.warheads.toLocaleString()}</span>
              </div>
              <div className="h-1.5 bg-[#1E1E28] rounded-full overflow-hidden">
                <div className="h-full bg-[#F59E0B] rounded-full" style={{ width: `${y.pct}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#1E1E28]">
        <div className="text-[10px] text-[#6B7280] font-mono mb-3">NUCLEAR DOCTRINES</div>
        <div className="space-y-3">
          {[
            { country: '🇺🇸 USA', doctrine: 'Flexible Response', detail: 'Retains first-use option. Full triad. NPT signatory.' },
            { country: '🇷🇺 Russia', doctrine: 'Escalate to De-escalate', detail: 'Low-yield tactical nukes. First-use possible under existential threat.' },
            { country: '🇨🇳 China', doctrine: 'Shifting from No-First-Use', detail: 'Historically minimal deterrence. Now building launch-on-warning posture + tactical nukes.' },
            { country: '🇮🇱 Israel', doctrine: 'Samson Option (ambiguous)', detail: '~90 warheads (est). Nuclear ambiguity. Dimona now threatened by Iran.' },
            { country: '🇮🇷 Iran', doctrine: 'None (Pre-nuclear)', detail: 'Program being degraded by strikes. 83.7% U-235 enrichment achieved.' },
          ].map(d => (
            <div key={d.country} className="border-l-2 border-[#1E1E28] pl-3">
              <div className="text-xs font-mono font-bold text-[#E8E8E8]">{d.country}</div>
              <div className="text-[11px] text-[#F39C12] font-mono">{d.doctrine}</div>
              <div className="text-[11px] text-[#6B7280] mt-0.5 leading-relaxed">{d.detail}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-[#141418] rounded-lg p-4 border border-[#C0392B55]" style={{ boxShadow: '0 0 0 1px rgba(192,57,43,0.3)' }}>
        <div className="flex items-center gap-2 mb-2">
          <div className="w-2 h-2 rounded-full bg-[#C0392B] animate-pulse-red" />
          <div className="text-[10px] font-mono font-bold text-[#C0392B]">DIMONA THREAT — ELEVATED</div>
        </div>
        <p className="text-[11px] text-[#A0A0B0] leading-relaxed">
          Iran has explicitly threatened to strike Israel's Negev Nuclear Research Center (Dimona) if regime change continues. Not under IAEA safeguards. A successful strike would trigger Israel's Samson Option and risk nuclear escalation.
        </p>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'warroom', label: 'War Room', icon: '🎯' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'feed', label: 'Feed', icon: '📡' },
  { id: 'nations', label: 'Nations', icon: '🌍' },
  { id: 'stats', label: 'Stats', icon: '⚔️' },
  { id: 'nuclear', label: 'Nuclear', icon: '☢️' },
]

const MOBILE_TABS = [
  { id: 'warroom', label: 'War Room', icon: '🎯' },
  { id: 'map', label: 'Map', icon: '🗺️' },
  { id: 'feed', label: 'Feed', icon: '📡' },
  { id: 'nations', label: 'Nations', icon: '🌍' },
  { id: 'stats', label: 'Stats', icon: '⚔️' },
]

export default function Page() {
  const [tab, setTab] = useState('warroom')
  const [time, setTime] = useState('')

  useEffect(() => {
    const tick = () => setTime(new Date().toUTCString().replace('GMT', 'UTC'))
    tick()
    const t = setInterval(tick, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="min-h-screen bg-[#0D0D0F] pb-24 sm:pb-8">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0D0D0F] border-b border-[#1E1E28]">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#C0392B] animate-pulse-red" />
              <span className="font-mono font-black tracking-widest text-sm text-[#E8E8E8]">GEOINT</span>
              <span className="text-[10px] text-[#C0392B] font-mono border border-[#C0392B44] px-1.5 py-0.5 rounded hidden sm:inline">LIVE</span>
            </div>
            <div className="text-[10px] font-mono text-[#6B7280] hidden sm:block">{time}</div>
          </div>
          {/* Desktop tabs */}
          <div className="hidden sm:flex gap-0 mt-2 border-b border-[#1E1E28] -mb-px overflow-x-auto">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`px-3 py-2 text-xs font-mono whitespace-nowrap transition-all ${tab === t.id ? 'border-b-2 border-[#00D4FF] text-[#00D4FF]' : 'text-[#6B7280] hover:text-[#E8E8E8] border-b-2 border-transparent'}`}>
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-4">
        {tab === 'warroom' && <WarRoom />}
        {tab === 'map' && (
          <Suspense fallback={<div className="flex items-center justify-center py-16 gap-3"><div className="w-5 h-5 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin" /><span className="text-[#6B7280] font-mono text-sm">Loading situation map…</span></div>}>
            <SituationMap />
          </Suspense>
        )}
        {tab === 'feed' && <FeedTab />}
        {tab === 'nations' && <NationsTab />}
        {tab === 'stats' && <WarStatsTab />}
        {tab === 'markets' && <MarketsTab />}
        {tab === 'nuclear' && <NuclearTab />}
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-[#141418] border-t border-[#1E1E28] z-50">
        <div className="flex">
          {MOBILE_TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className="flex-1 flex flex-col items-center py-2 gap-0.5 transition-all"
              style={{ color: tab === t.id ? '#00D4FF' : '#6B7280' }}>
              <span className="text-lg leading-none">{t.icon}</span>
              <span className="text-[9px] font-mono">{t.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}
