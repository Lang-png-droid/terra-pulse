/// <reference types="vitest/globals" />
import '@testing-library/jest-dom/vitest';

// Mock next/navigation so components using router hooks can render in jsdom
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
  unstable_rethrow: vi.fn(),
}));
