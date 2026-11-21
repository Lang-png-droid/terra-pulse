import React from 'react';

import { act, render } from '@testing-library/react';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import { MapBase, ViewportState } from './MapBase';

function createMockMap() {
  return {
    on: vi.fn(),
    off: vi.fn(),
    remove: vi.fn(),
    setStyle: vi.fn(),
    getCenter: vi.fn(() => ({ lat: 0, lng: 0 })),
    getZoom: vi.fn(() => 0),
    getBearing: vi.fn(() => 0),
    getPitch: vi.fn(() => 0),
    jumpTo: vi.fn(),
  };
}

vi.mock('maplibre-gl', () => {
  const MapMock = vi.fn(createMockMap);
  return {
    default: { Map: MapMock as unknown },
    Map: MapMock as unknown,
  };
});

import maplibregl from 'maplibre-gl';

type MapMock = ReturnType<typeof vi.fn> & {
  mock: { instances: Array<{ remove: ReturnType<typeof vi.fn> }> };
};

const MockMap = maplibregl.Map as unknown as MapMock;

const DEFAULT_VIEWPORT: ViewportState = {
  latitude: -2.5,
  longitude: 118.0,
  zoom: 4.5,
  bearing: 0,
  pitch: 0,
};

const renderMapBase = () => {
  const onViewportChange = vi.fn();
  const { unmount } = render(
    <MapBase viewport={DEFAULT_VIEWPORT} onViewportChange={onViewportChange} />
  );
  return { unmount, onViewportChange };
};

describe('MapBase strict-mode unmount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockMap.mockImplementation(createMockMap);
  });

  test('does not throw unhandled AbortError when unmounted during style load', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unhandledRejections: unknown[] = [];
    const rejectionHandler = (event: unknown) => {
      if (event instanceof ErrorEvent || event instanceof Event) {
        return;
      }
      unhandledRejections.push(event);
    };
    process.on('unhandledRejection', rejectionHandler as (reason: unknown) => void);

    MockMap.mockImplementation(() => ({
      ...createMockMap(),
      remove: vi.fn(() => {
        throw new DOMException('Aborted', 'AbortError');
      }),
    }));

    let threw: Error | null = null;
    const { unmount } = renderMapBase();

    act(() => {
      try {
        unmount();
      } catch (error) {
        threw = error as Error;
      }
    });

    expect(threw).toBeNull();
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(unhandledRejections).toHaveLength(0);

    process.off('unhandledRejection', rejectionHandler as (reason: unknown) => void);
    consoleErrorSpy.mockRestore();
  });

  test('cleanup is guarded when map instance is null/undefined', () => {
    MockMap.mockImplementation(() => {
      throw new Error('map init failed');
    });

    let threw: Error | null = null;
    act(() => {
      try {
        renderMapBase().unmount();
      } catch (error) {
        threw = error as Error;
      }
    });

    expect(threw).toBeNull();
  });
});
