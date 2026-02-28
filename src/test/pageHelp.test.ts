import { describe, expect, it } from 'vitest';
import { PAGE_HELP_ROUTES, getFallbackHelpByRouteKey, matchHelpRoute } from '@/help/pageHelp';

describe('pageHelp catalog', () => {
  it('has unique route keys', () => {
    const routeKeys = PAGE_HELP_ROUTES.map((route) => route.routeKey);
    const unique = new Set(routeKeys);
    expect(unique.size).toBe(routeKeys.length);
  });

  it('matches dynamic detail routes', () => {
    expect(matchHelpRoute('/project/abc-123')?.routeKey).toBe('/project/:id');
    expect(matchHelpRoute('/program/abc-123')?.routeKey).toBe('/program/:id');
    expect(matchHelpRoute('/person/abc-123')?.routeKey).toBe('/person/:id');
    expect(matchHelpRoute('/metric/abc-123')?.routeKey).toBe('/metric/:id');
  });

  it('has non-empty fallback sections for every route', () => {
    for (const route of PAGE_HELP_ROUTES) {
      const fallback = getFallbackHelpByRouteKey(route.routeKey);
      expect(fallback.title.trim().length).toBeGreaterThan(0);
      expect(fallback.summary.trim().length).toBeGreaterThan(0);
      expect(fallback.what_this_page_does.trim().length).toBeGreaterThan(0);
      expect(fallback.what_is_expected.trim().length).toBeGreaterThan(0);
      expect(fallback.required_inputs.trim().length).toBeGreaterThan(0);
      expect(fallback.primary_actions.trim().length).toBeGreaterThan(0);
      expect(fallback.common_mistakes.trim().length).toBeGreaterThan(0);
      expect(fallback.next_steps.trim().length).toBeGreaterThan(0);
    }
  });
});
