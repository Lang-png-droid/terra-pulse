import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import type { DisasterFeature, LayerVisibility } from '@/types/disaster';
import { EventCard } from '@/components/hud/EventCard';
import { LayerPanel } from '@/components/hud/LayerPanel';
import { NewsPanel } from '@/components/hud/NewsPanel';
import { TimelineBar } from '@/components/hud/TimelineBar';

// No `globals: true` in vitest.config.ts, so Testing Library never auto-cleans.
afterEach(cleanup);

const ALL_ON: LayerVisibility = {
  earthquakes: true,
  hotspots: true,
  volcanoes: true,
  cyclones: true,
  tsunamiRings: true,
  rainRadar: true,
  floods: true,
  windParticles: false,
};

const feature = (properties: Record<string, unknown>, geometry?: unknown): DisasterFeature =>
  ({
    type: 'Feature',
    id: 'x',
    geometry: (geometry ?? { type: 'Point', coordinates: [106.8, -6.2] }) as DisasterFeature['geometry'],
    properties: { type: 'earthquake', title: 'x', source: 'test', ...properties } as never,
  }) as DisasterFeature;

const noop = () => {};
const noopCenter = (_lat: number, _lng: number) => {};

describe('HUD survives empty / degraded API data', () => {
  it('NewsPanel: empty collection renders a defined empty state', () => {
    render(<NewsPanel articles={[]} loading={false} error={null} onClose={noop} onCenterMap={noopCenter} />);
    expect(screen.getByText('TIDAK ADA BERITA')).toBeInTheDocument();
  });

  it('NewsPanel: empty collection with a degraded meta/error renders the OFFLINE badge', () => {
    render(<NewsPanel articles={[]} loading={false} error="degraded" onClose={noop} onCenterMap={noopCenter} />);
    expect(screen.getByText('OFFLINE')).toBeInTheDocument();
  });

  it('NewsPanel: article with a bad timestamp does not throw', () => {
    render(
      <NewsPanel
        articles={[
          {
            id: 'a',
            title: 't',
            summary: 's',
            url: 'https://example.com',
            source: 'SRC',
            publishedAt: 'not-a-date',
            disasterTypes: [],
            location: { lat: 0, lng: 0, name: 'n' },
          },
        ]}
        loading={false}
        error={null}
        onClose={noop}
        onCenterMap={noopCenter}
      />,
    );
    expect(screen.getByText('t')).toBeInTheDocument();
  });

  it('EventCard: volcano feature (no magnitude/depth) renders', () => {
    render(
      <EventCard
        feature={feature({ type: 'volcano', alertLevel: 'Siaga', hazardRadiusKm: 5, timestamp: '2026-01-01T00:00:00Z' })}
        userLocation={null}
        onClose={noop}
        onSimulateTsunami={noop}
        onCenterMap={noopCenter}
        isMobile={false}
      />,
    );
    expect(screen.getByText('GUNUNG API')).toBeInTheDocument();
  });

  it('EventCard: hotspot feature (no depth) renders', () => {
    render(
      <EventCard
        feature={feature({ type: 'hotspot', brightness: 330, confidence: 80, timestamp: '2026-01-01T00:00:00Z' })}
        userLocation={null}
        onClose={noop}
        onSimulateTsunami={noop}
        onCenterMap={noopCenter}
        isMobile={false}
      />,
    );
    expect(screen.getByText('HOTSPOT')).toBeInTheDocument();
  });

  it('EventCard: NaN magnitude renders without throwing', () => {
    render(
      <EventCard
        feature={feature({ type: 'earthquake', magnitude: NaN, depth: NaN, timestamp: '2026-01-01T00:00:00Z' })}
        userLocation={null}
        onClose={noop}
        onSimulateTsunami={noop}
        onCenterMap={noopCenter}
        isMobile={false}
      />,
    );
    expect(screen.getAllByLabelText('Tutup detail')[0]).toBeInTheDocument();
  });

  it('EventCard: missing timestamp renders', () => {
    render(
      <EventCard
        feature={feature({ type: 'earthquake', magnitude: 5.2, depth: 10 })}
        userLocation={null}
        onClose={noop}
        onSimulateTsunami={noop}
        onCenterMap={noopCenter}
        isMobile={false}
      />,
    );
    expect(screen.getAllByLabelText('Tutup detail')[0]).toBeInTheDocument();
  });

  it('LayerPanel: counts object missing keys renders 0', () => {
    render(
      <LayerPanel
        visibility={ALL_ON}
        onVisibilityChange={noop}
        isMobile={false}
        disasterCounts={{ earthquake: 0 } as never}
      />,
    );
    expect(screen.getByLabelText('Collapse panel')).toBeInTheDocument();
  });

  it('TimelineBar: zero metrics render 0.0', () => {
    render(
      <TimelineBar
        currentTime={Date.now()}
        startTime={Date.now() - 86400000}
        endTime={Date.now() + 86400000}
        stepHours={3}
        isPlaying={false}
        speed={1}
        onTimeChange={noop}
        onPlayPause={noop}
        onSpeedChange={noop}
        metrics={{ quakes: 0, maxMag: 0, hotspots: 0, cyclones: 0 }}
      />,
    );
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  it('TimelineBar: NaN maxMag does not print NaN', () => {
    render(
      <TimelineBar
        currentTime={Date.now()}
        startTime={Date.now() - 86400000}
        endTime={Date.now() + 86400000}
        stepHours={3}
        isPlaying={false}
        speed={1}
        onTimeChange={noop}
        onPlayPause={noop}
        onSpeedChange={noop}
        metrics={{ quakes: 0, maxMag: NaN, hotspots: 0, cyclones: 0 }}
      />,
    );
    expect(screen.queryAllByText(/NaN/)).toHaveLength(0);

  });

  it('TimelineBar: zero-length window does not print NaN', () => {
    const now = Date.now();
    render(
      <TimelineBar
        currentTime={now}
        startTime={now}
        endTime={now}
        stepHours={3}
        isPlaying={false}
        speed={1}
        onTimeChange={noop}
        onPlayPause={noop}
        onSpeedChange={noop}
        metrics={{ quakes: 0, maxMag: 0, hotspots: 0, cyclones: 0 }}
      />,
    );
    expect(screen.queryAllByText(/NaN/)).toHaveLength(0);
    expect(screen.getByRole('slider', { name: 'Timeline playback' }).getAttribute('aria-valuenow')).toMatch(/^\d+$/);
  });
});
