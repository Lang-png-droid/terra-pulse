'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { filterPointFeatures, getFeatureLngLat } from '@/types/geo';
import { DisasterFeature, NewsArticle, DisasterType } from '@/types/disaster';
import { haversineDistance, formatDistance } from '@/lib/geoMath';

interface TopBarProps {
  activeDisasters: DisasterFeature[];
  newsArticles: NewsArticle[];
  onSearch: (query: string) => void;
  onNearMe: (lat: number, lng: number) => void;
  onTabChange: (tab: 'map' | 'news') => void;
  activeTab: 'map' | 'news';
  userLocation: { lat: number; lng: number } | null;
  loading: boolean;
}

export function TopBar({
  activeDisasters,
  newsArticles,
  onSearch,
  onNearMe,
  onTabChange,
  activeTab,
  userLocation,
  loading,
}: TopBarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNearby, setShowNearby] = useState(false);
  const [nearbyDisasters, setNearbyDisasters] = useState<DisasterFeature[]>([]);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [tickerItems, setTickerItems] = useState<string[]>([]);
  const tickerRef = useRef<HTMLDivElement>(null);
  const tickerIndex = useRef(0);

  // Generate ticker items from active disasters
  useEffect(() => {
    const items = activeDisasters
      .filter((d) => d.properties.type === 'earthquake' || d.properties.type === 'tsunami')
      .slice(0, 5)
      .map((d) => {
        const mag = d.properties.magnitude ? `M${d.properties.magnitude}` : '';
        const loc = d.properties.title.replace('Gempa ', '');
        return `🔔 ${mag} ${loc} • ${new Date(d.properties.timestamp).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
      });
    setTickerItems(items.length > 0 ? items : ['✅ Tidak ada peringatan gempa/tsunami terkini']);
  }, [activeDisasters]);

  // Update nearby disasters when user location changes
  useEffect(() => {
    if (userLocation && activeDisasters.length > 0) {
      const pointFeatures = filterPointFeatures(activeDisasters);
      const nearby = pointFeatures
        .map((d) => {
          const lngLat = getFeatureLngLat(d);
          if (!lngLat) return d;
          const [lng, lat] = lngLat;
          const distance = haversineDistance(userLocation.lat, userLocation.lng, lat, lng);
          return { ...d, properties: { ...d.properties, distanceKm: distance } };
        })
        .filter((d) => (d.properties.distanceKm || Infinity) <= 200)
        .sort((a, b) => (a.properties.distanceKm || Infinity) - (b.properties.distanceKm || Infinity))
        .slice(0, 5) as DisasterFeature[];
      setNearbyDisasters(nearby);
    }
  }, [userLocation, activeDisasters]);

  // Auto-scroll ticker
  useEffect(() => {
    if (!tickerRef.current || tickerItems.length <= 1) return;

    const interval = setInterval(() => {
      tickerIndex.current = (tickerIndex.current + 1) % tickerItems.length;
      tickerRef.current!.style.transform = `translateY(-${tickerIndex.current * 28}px)`;
    }, 4000);

    return () => clearInterval(interval);
  }, [tickerItems]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  };

  const handleNearMe = async () => {
    if (!navigator.geolocation) {
      setGpsError('Geolocation tidak didukung browser ini');
      return;
    }

    setGpsError(null);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      onNearMe(latitude, longitude);
      setShowNearby(true);
    } catch (err) {
      setGpsError('Gagal mendapatkan lokasi. Izinkan akses lokasi di browser.');
    }
  };

  const handleTabChange = (tab: 'map' | 'news') => {
    onTabChange(tab);
    if (tab === 'news') setShowNearby(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-40 px-3 py-2 md:px-6 md:py-3 safe-area-inset-top">
      {/* Tab Bar */}
      <div className="flex items-center gap-2 mb-2 md:mb-0 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1 bg-zinc-900/80 backdrop-blur-md rounded-full p-1 border border-zinc-700 w-full md:w-auto">
          <button
            onClick={() => handleTabChange('map')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all min-w-[80px] ${
              activeTab === 'map'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-300 hover:text-white'
            }`}
            aria-pressed={activeTab === 'map'}
          >
            🗺️ Peta
          </button>
          <button
            onClick={() => handleTabChange('news')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all min-w-[80px] ${
              activeTab === 'news'
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-300 hover:text-white'
            }`}
            aria-pressed={activeTab === 'news'}
          >
            📰 Berita
          </button>
        </div>

        {/* Live Alert Ticker */}
        <div
          className="hidden md:block flex-1 mx-4 overflow-hidden bg-zinc-900/60 backdrop-blur-md rounded-lg border border-zinc-700 h-7"
          aria-live="polite"
          aria-label="Peringatan bencana terkini"
        >
          <div
            ref={tickerRef}
            className="flex flex-col h-full transition-transform duration-500 ease-out"
            style={{ transform: `translateY(-${tickerIndex.current * 28}px)` }}
          >
            {tickerItems.map((item, i) => (
              <div key={i} className="flex items-center h-7 px-3 text-xs text-zinc-200 font-medium">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search Bar / News List */}
      {activeTab === 'map' ? (
        <div className="mt-2 md:mt-0 flex items-center gap-2">
          <form onSubmit={handleSearchSubmit} className="flex-1 relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lokasi, gempa, gunung api..."
              className="w-full px-4 py-2 pl-10 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-full text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent text-sm"
              aria-label="Cari lokasi atau bencana"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">🔍</span>
            {loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-400 animate-spin">⟳</span>}
          </form>

          <button
            onClick={handleNearMe}
            disabled={loading}
            className="p-2.5 bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-full text-zinc-200 hover:bg-zinc-800 hover:border-zinc-600 hover:text-white transition-all disabled:opacity-50 min-w-[44px] min-h-[44px] flex items-center justify-center"
            aria-label="Lokasi saya (GPS)"
            title="Lokasi saya"
          >
            📍
          </button>

          {gpsError && (
            <div className="fixed bottom-24 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-red-900/90 border border-red-700 text-red-100 px-4 py-3 rounded-lg shadow-lg animate-slide-up z-50">
              <div className="flex items-center gap-2">
                <span>⚠️</span>
                <span className="text-sm">{gpsError}</span>
                <button onClick={() => setGpsError(null)} className="ml-auto text-red-300 hover:text-white">✕</button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* News Tab Content */
        <div className="mt-2 md:mt-0 max-h-[calc(100dvh-140px)] overflow-y-auto">
          {newsArticles.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              <p className="text-sm">Memuat berita bencana...</p>
            </div>
          ) : (
            <div className="space-y-2" role="feed" aria-label="Artikel berita bencana">
              {newsArticles.map((article) => (
                <article
                  key={article.id}
                  className="group bg-zinc-900/80 backdrop-blur-md border border-zinc-700 rounded-lg p-3 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-lg mt-0.5 flex-shrink-0">
                      {article.disasterTypes.includes('earthquake') && '🌍'}
                      {article.disasterTypes.includes('hotspot') && '🔥'}
                      {article.disasterTypes.includes('volcano') && '🌋'}
                      {article.disasterTypes.includes('cyclone') && '🌀'}
                      {article.disasterTypes.includes('flood') && '🌊'}
                      {article.disasterTypes.includes('tsunami') && '🌊'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-white group-hover:text-blue-300 transition-colors line-clamp-2">
                        {article.title}
                      </h4>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{article.summary}</p>
                      <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
                        <span>{article.source}</span>
                        <span>•</span>
                        <time>{new Date(article.publishedAt).toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</time>
                        {article.location && (
                          <>
                            <span>•</span>
                            <span>📍 {article.location.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Nearby Disasters Panel */}
      {showNearby && nearbyDisasters.length > 0 && activeTab === 'map' && (
        <div className="fixed top-20 left-4 right-4 md:left-auto md:right-4 md:top-16 md:w-72 bg-zinc-950/95 backdrop-blur-md border border-zinc-700 rounded-lg shadow-xl z-50 animate-slide-down p-3 max-h-64 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-white flex items-center gap-1">
              📍 Bencana Terdekat (&lt; 200 km)
            </h4>
            <button onClick={() => setShowNearby(false)} className="text-zinc-400 hover:text-white p-1">✕</button>
          </div>
          <div className="space-y-2">
            {nearbyDisasters.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  // Trigger map to center on this disaster
                  window.dispatchEvent(new CustomEvent('center-on-feature', { detail: d }));
                }}
                className="w-full text-left p-2 rounded bg-zinc-800/50 hover:bg-zinc-700 transition-colors border border-zinc-700"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {d.properties.type === 'earthquake' && '🌍'}
                    {d.properties.type === 'hotspot' && '🔥'}
                    {d.properties.type === 'volcano' && '🌋'}
                    {d.properties.type === 'cyclone' && '🌀'}
                    {d.properties.type === 'flood' && '🌊'}
                    {d.properties.type === 'tsunami' && '🌊'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-white truncate">{d.properties.title}</p>
                    <p className="text-[11px] text-zinc-400">
                      {d.properties.distanceKm ? `${formatDistance(d.properties.distanceKm)}` : ''}
                      {d.properties.magnitude ? ` • M${d.properties.magnitude}` : ''}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {userLocation && (
            <p className="mt-3 text-[11px] text-zinc-500 text-center">
              Lokasi Anda: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}