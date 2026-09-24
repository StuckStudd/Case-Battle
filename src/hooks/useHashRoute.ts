import { useCallback, useEffect, useState } from 'react';
import type { Page } from '../types/types';

const PAGES: readonly Page[] = [
  'upgrade',
  'cases',
  'contracts',
  'games',
  'inventory',
  'shop',
  'quests',
  'collections',
  'leaderboard',
  'history',
  'profile',
  'settings',
  'matches',
  'admin',
];

function parseHash(hash: string): Page {
  const candidate = hash.replace(/^#\/?/, '');
  return (PAGES as readonly string[]).includes(candidate) ? (candidate as Page) : 'upgrade';
}

export function useHashRoute(): [Page, (page: Page) => void] {
  const [page, setPage] = useState<Page>(() => parseHash(window.location.hash));

  useEffect(() => {
    const onChange = () => {
      setPage(parseHash(window.location.hash));
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((next: Page) => {
    if (window.location.hash === `#/${next}`) return;
    window.location.hash = `/${next}`;
  }, []);

  return [page, navigate];
}
