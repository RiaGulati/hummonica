/**
 * React hooks for harmonica.com tabs: the list of all tabs (for search) and
 * one tab page. Both load in the background and can be retried.
 */

import { useEffect, useState } from 'react';

import { fetchOnlineTab, fetchTabIndex, type OnlineTab, type OnlineTabSummary } from './harmonica-com';

export type LoadStatus = 'loading' | 'ready' | 'error';

export function useOnlineTabIndex() {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [items, setItems] = useState<OnlineTabSummary[]>([]);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true; // ignore the answer if the screen has gone away
    fetchTabIndex()
      .then((list) => {
        if (!active) return;
        setItems(list);
        setStatus('ready');
      })
      .catch((error) => {
        console.warn('Could not load the harmonica.com tab list', error);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }

  return { status, items, retry };
}

export function useOnlineTab(id: number) {
  const [status, setStatus] = useState<LoadStatus>('loading');
  const [tab, setTab] = useState<OnlineTab | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    fetchOnlineTab(id)
      .then((result) => {
        if (!active) return;
        setTab(result);
        setStatus('ready');
      })
      .catch((error) => {
        console.warn('Could not load the tab', error);
        if (active) setStatus('error');
      });
    return () => {
      active = false;
    };
  }, [id, attempt]);

  function retry() {
    setStatus('loading');
    setAttempt((n) => n + 1);
  }

  return { status, tab, retry };
}
