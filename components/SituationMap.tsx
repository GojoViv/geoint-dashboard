'use client'

import { useEffect, useRef } from 'react'

interface MapPoint {
  id: string
  lat: number
  lng: number
  label: string
  type: 'conflict' | 'nation' | 'asset' | 'event' | 'infrastructure'
  severity: number // 1-5
  detail: string
  flag?: string
  color?: string
}

const MAP_POINTS: MapPoint[] = [
  // Active conflict
  { id: 'tehran', lat: 35.69, lng: 51.39, label: 'Tehran', type: 'conflict', severity: 5, detail: 'Supreme Leader killed Feb 28. Capital under sustained bombardment. IRGC retaliating.', flag: '🇮🇷', color: '#C0392B' },
  { id: 'natanz', lat: 33.72, lng: 51.73, label: 'Natanz Nuclear', type: 'conflict', severity: 5, detail: 'Primary Iranian nuclear enrichment facility. Targeted in strikes.', color: '#C0392B' },
  { id: 'fordow', lat: 34.88, lng: 50.99, label: 'Fordow Facility', type: 'conflict', severity: 5, detail: 'Underground uranium enrichment site. Deep bunker busters deployed.', color: '#C0392B' },
  { id: 'arak', lat: 34.09, lng: 49.43, label: 'Arak Reactor', type: 'conflict', severity: 4, detail: 'Heavy water reactor. Struck to prevent plutonium production.', color: '#C0392B' },
  { id: 'isfahan', lat: 32.66, lng: 51.68, label: 'Isfahan', type: 'conflict', severity: 4, detail: 'Major IRGC military hub. Missile production facilities targeted.', color: '#C0392B' },
  // Strait of Hormuz
  { id: 'hormuz', lat: 26.5, lng: 56.5, label: 'Strait of Hormuz', type: 'infrastructure', severity: 5, detail: '⚠ Near-halted — 15% capacity. Carries 20% of global oil supply. Iranian mining confirmed.', color: '#F97316' },
  // US assets
  { id: 'kuwait', lat: 29.37, lng: 47.97, label: 'Shuaiba Port, Kuwait', type: 'event', severity: 4, detail: '6 US soldiers killed here Mar 2 in Iranian missile strike. Makeshift ops center hit.', flag: '🇺🇸', color: '#3B82F6' },
  { id: 'bahrain', lat: 26.21, lng: 50.59, label: 'USS Carrier Group (Bahrain)', type: 'asset', severity: 3, detail: 'US Navy 5th Fleet HQ. Carrier strike group deployed. F/A-18s operating daily sorties.', flag: '🇺🇸', color: '#3B82F6' },
  { id: 'qatar', lat: 25.28, lng: 51.49, label: 'Al Udeid AB / Qatar', type: 'asset', severity: 4, detail: 'Major US air operations hub. QatarEnergy LNG at Ras Laffan hit by Iranian drones. TTF gas +50%.', flag: '🇺🇸', color: '#3B82F6' },
  { id: 'diego', lat: -7.31, lng: 72.41, label: 'Diego Garcia', type: 'asset', severity: 2, detail: 'B-2 Spirit strategic bombers operating from here for deep strikes on Iran.', flag: '🇺🇸', color: '#3B82F6' },
  // Israel
  { id: 'tel_aviv', lat: 32.08, lng: 34.78, label: 'Tel Aviv', type: 'nation', severity: 4, detail: 'Israel co-launched strikes Feb 28. Iron Dome + David\'s Sling active against Iranian ballistic missiles.', flag: '🇮🇱', color: '#06B6D4' },
  { id: 'dimona', lat: 30.86, lng: 35.14, label: 'Dimona — Nuclear Site', type: 'conflict', severity: 5, detail: '🚨 THREATENED — Iran has explicitly warned it will strike Dimona if regime change continues. ~90 warheads stored.', flag: '🇮🇱', color: '#C0392B' },
  // Regional actors
  { id: 'riyadh', lat: 24.69, lng: 46.72, label: 'Riyadh, Saudi Arabia', type: 'nation', severity: 2, detail: 'Saudi Arabia quietly benefiting from high oil prices. Not in conflict. Monitoring Iranian missiles.', flag: '🇸🇦', color: '#27AE60' },
  { id: 'dubai', lat: 25.20, lng: 55.27, label: 'Dubai / UAE', type: 'nation', severity: 2, detail: 'UAE remains neutral. Iranian shadow fleet transits here. US assets present.', flag: '🇦🇪', color: '#27AE60' },
  // China
  { id: 'beijing', lat: 39.91, lng: 116.39, label: 'Beijing', type: 'nation', severity: 2, detail: 'Diplomatically backing Iran. Buying 80%+ of Iran oil. 16 PLA cargo planes sent to Iran Jan 2026. Xi-Trump summit planned.', flag: '🇨🇳', color: '#F59E0B' },
  // Russia
  { id: 'moscow', lat: 55.75, lng: 37.62, label: 'Moscow', type: 'nation', severity: 2, detail: 'Diplomatically supporting Iran at UN. Benefiting from supply disruption — selling oil to China/India at premium.', flag: '🇷🇺', color: '#8B5CF6' },
  // USA
  { id: 'washington', lat: 38.90, lng: -77.03, label: 'Washington D.C.', type: 'nation', severity: 3, detail: 'Operation Epic Fury commanding from here. Trump: "campaign could last 5 weeks." 50,000+ troops deployed.', flag: '🇺🇸', color: '#3B82F6' },
  // Oil infrastructure
  { id: 'ras_laffan', lat: 25.86, lng: 51.57, label: 'Ras Laffan LNG (Qatar)', type: 'infrastructure', severity: 4, detail: 'Hit by Iranian drones. QatarEnergy suspended LNG production. Europe gas prices +50%.', color: '#F97316' },
  { id: 'kharg', lat: 29.25, lng: 50.33, label: 'Kharg Island (Iran oil)', type: 'infrastructure', severity: 4, detail: 'Iran\'s main oil export terminal. ~90% of exports pass here. Under threat of US strikes.', color: '#F97316' },
]

const TYPE_CONFIG = {
  conflict: { icon: '💥', defaultColor: '#C0392B', size: 14 },
  nation: { icon: '🏛', defaultColor: '#6B7280', size: 12 },
  asset: { icon: '⚓', defaultColor: '#3B82F6', size: 12 },
  event: { icon: '⚡', defaultColor: '#F39C12', size: 12 },
  infrastructure: { icon: '⚙️', defaultColor: '#F97316', size: 13 },
}

export default function SituationMap() {
  const mapRef = useRef<any>(null)
  const mapInstanceRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (mapInstanceRef.current) return

    // Dynamic import of Leaflet
    import('leaflet').then((L) => {
      // Fix default icon paths
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
      })

      if (!mapRef.current || mapInstanceRef.current) return

      const map = L.map(mapRef.current, {
        center: [28, 45],
        zoom: 4,
        zoomControl: false,
        attributionControl: false,
      })

      mapInstanceRef.current = map

      // Dark tile layer (CartoDB dark matter - no API key needed)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd',
      }).addTo(map)

      L.control.zoom({ position: 'bottomright' }).addTo(map)
      L.control.attribution({ position: 'bottomleft', prefix: '' }).addTo(map)

      // Add markers
      MAP_POINTS.forEach((point) => {
        const cfg = TYPE_CONFIG[point.type]
        const color = point.color || cfg.defaultColor
        const size = cfg.size + (point.severity - 1) * 2

        const pulseClass = point.severity >= 5 ? 'animate-pulse-red' : ''

        const icon = L.divIcon({
          className: '',
          html: `
            <div style="position:relative;display:flex;align-items:center;justify-content:center;">
              ${point.severity >= 4 ? `<div style="position:absolute;width:${size * 2.5}px;height:${size * 2.5}px;border-radius:50%;background:${color}18;border:1px solid ${color}44;animation:ping 2s cubic-bezier(0,0,0.2,1) infinite;"></div>` : ''}
              <div style="width:${size}px;height:${size}px;background:${color};border-radius:50%;border:2px solid ${color}cc;box-shadow:0 0 8px ${color}66;cursor:pointer;z-index:1;"></div>
            </div>
          `,
          iconSize: [size * 3, size * 3],
          iconAnchor: [size * 1.5, size * 1.5],
        })

        const marker = L.marker([point.lat, point.lng], { icon }).addTo(map)

        const popupContent = `
          <div style="background:#141418;border:1px solid ${color}44;border-radius:8px;padding:12px;min-width:200px;max-width:260px;color:#E8E8E8;font-family:system-ui,sans-serif;">
            <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
              ${point.flag ? `<span style="font-size:16px;">${point.flag}</span>` : ''}
              <span style="font-weight:700;font-size:13px;">${point.label}</span>
              <span style="margin-left:auto;background:${color}22;color:${color};border:1px solid ${color}44;padding:2px 6px;border-radius:4px;font-size:10px;font-family:monospace;">SEV ${point.severity}/5</span>
            </div>
            <p style="font-size:11px;color:#A0A0B0;line-height:1.5;margin:0;">${point.detail}</p>
            <div style="margin-top:8px;padding-top:6px;border-top:1px solid #1E1E28;">
              <span style="font-size:10px;font-family:monospace;color:${color};text-transform:uppercase;">${point.type}</span>
            </div>
          </div>
        `

        marker.bindPopup(L.popup({
          closeButton: false,
          className: 'geoint-popup',
          offset: [0, -8],
          maxWidth: 280,
        }).setContent(popupContent))

        marker.on('mouseover', function (this: any) { this.openPopup() })
        marker.on('mouseout', function (this: any) { this.closePopup() })
        marker.on('click', function (this: any) { this.openPopup() })
      })

      // Add CSS for popups + ping animation
      const style = document.createElement('style')
      style.textContent = `
        .geoint-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          padding: 0 !important;
        }
        .geoint-popup .leaflet-popup-content { margin: 0 !important; }
        .geoint-popup .leaflet-popup-tip-container { display: none !important; }
        @keyframes ping {
          75%, 100% { transform: scale(2); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    })

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  return (
    <div className="space-y-3">
      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10px] font-mono">
        {[
          { color: '#C0392B', label: 'Active Conflict / Threat' },
          { color: '#3B82F6', label: 'US Assets' },
          { color: '#06B6D4', label: 'Israel' },
          { color: '#F97316', label: 'Infrastructure' },
          { color: '#F59E0B', label: 'China' },
          { color: '#8B5CF6', label: 'Russia' },
          { color: '#27AE60', label: 'Neutral' },
        ].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[#6B7280]">{l.label}</span>
          </div>
        ))}
      </div>

      {/* Map container */}
      <div className="relative rounded-xl overflow-hidden border border-[#1E1E28]" style={{ height: '420px' }}>
        <div ref={mapRef} style={{ height: '100%', width: '100%', background: '#0D0D0F' }} />
        <div className="absolute top-3 left-3 bg-[#0D0D0F99] backdrop-blur border border-[#1E1E28] rounded-lg px-3 py-1.5 z-[1000]">
          <span className="text-[10px] font-mono text-[#00D4FF]">SITUATION MAP — LIVE</span>
        </div>
        <div className="absolute top-3 right-3 bg-[#0D0D0F99] backdrop-blur border border-[#C0392B44] rounded-lg px-2 py-1 z-[1000] flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-[#C0392B] animate-pulse-red" />
          <span className="text-[10px] font-mono text-[#C0392B]">CONFLICT ACTIVE</span>
        </div>
      </div>

      {/* Quick reference */}
      <div className="grid grid-cols-2 gap-2">
        {MAP_POINTS.filter(p => p.severity >= 4).slice(0, 6).map(p => (
          <div key={p.id} className="bg-[#141418] rounded-lg p-2.5 border border-[#1E1E28]">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color || '#6B7280' }} />
              <span className="text-[11px] font-mono font-bold text-[#E8E8E8] truncate">{p.flag} {p.label}</span>
            </div>
            <p className="text-[10px] text-[#6B7280] leading-tight line-clamp-2">{p.detail}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
