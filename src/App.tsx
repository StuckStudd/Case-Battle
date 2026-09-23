import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { BottomNav } from './components/BottomNav';
import { DailyModal } from './components/DailyModal';
import { FreeCaseModal } from './components/FreeCaseModal';
import { Header } from './components/Header';
import { LiveFeed } from './components/LiveFeed';
import { SplashScreen, WelcomeModal } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { ToastProvider, useToast } from './components/Toast';
import { getSkin } from './data/skinData';
import { useHashRoute } from './hooks/useHashRoute';
import { useSound } from './hooks/useSound';
import { useT } from './i18n';
import type { TKey } from './i18n';
import type { SelectionChange, UpgradeSelection } from './pages/UpgradePage';
import { StoreProvider, useStore } from './store/inventoryStore';
import type { InventoryItem } from './types/types';
import { formatMoney } from './utils/format';
import { setSoundPack } from './utils/sound';

// Pages load on demand so the first screen downloads less code.
const UpgradePage = lazy(() => import('./pages/UpgradePage').then((m) => ({ default: m.UpgradePage })));
const CasesPage = lazy(() => import('./pages/CasesPage').then((m) => ({ default: m.CasesPage })));
const ContractsPage = lazy(() => import('./pages/ContractsPage').then((m) => ({ default: m.ContractsPage })));
const GamesPage = lazy(() => import('./pages/GamesPage').then((m) => ({ default: m.GamesPage })));
const InventoryPage = lazy(() => import('./pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const ShopPage = lazy(() => import('./pages/ShopPage').then((m) => ({ default: m.ShopPage })));
const QuestsPage = lazy(() => import('./pages/QuestsPage').then((m) => ({ default: m.QuestsPage })));
const CollectionsPage = lazy(() => import('./pages/CollectionsPage').then((m) => ({ default: m.CollectionsPage })));
const LeaderboardPage = lazy(() => import('./pages/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then((m) => ({ default: m.ProfilePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));

function PageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true">
      <div className="skeleton h-10 w-48 rounded-xl" />
      <div className="skeleton h-64 rounded-2xl" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="skeleton h-40 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

const EMPTY_SELECTION: UpgradeSelection = { sourceUids: [], targetId: null };

function Shell() {
  const [page, navigate] = useHashRoute();
  const t = useT();
  const sound = useSound();
  const { state, loadStatus, dismissWelcome, completeOnboarding, progressEvents, clearProgressEvents } = useStore();
  const toast = useToast();
  const [splash, setSplash] = useState<'show' | 'leaving' | 'done'>('show');
  const [selection, setSelection] = useState<UpgradeSelection>(EMPTY_SELECTION);
  const [freeCaseOpen, setFreeCaseOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const loadNoticeShown = useRef(false);

  useEffect(() => {
    const leave = window.setTimeout(() => setSplash('leaving'), 900);
    const done = window.setTimeout(() => setSplash('done'), 1400);
    return () => {
      window.clearTimeout(leave);
      window.clearTimeout(done);
    };
  }, []);

  // Theme and sound pack follow settings everywhere, including portals.
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
  }, [state.settings.theme]);
  useEffect(() => {
    setSoundPack(state.settings.soundPack);
  }, [state.settings.soundPack]);

  useEffect(() => {
    if (loadNoticeShown.current) return;
    loadNoticeShown.current = true;
    if (loadStatus === 'corrupted') {
      toast({ type: 'warning', title: t('load.corrupted'), message: t('load.corruptedText'), durationMs: 6000 });
    } else if (loadStatus === 'repaired') {
      toast({ type: 'info', title: t('load.repaired'), message: t('load.repairedText'), durationMs: 6000 });
    } else if (loadStatus === 'unavailable') {
      toast({ type: 'warning', title: t('load.unavailable'), message: t('load.unavailableText'), durationMs: 6000 });
    }
  }, [loadStatus, toast, t]);

  // Level-ups and achievements from any action surface as toasts.
  useEffect(() => {
    if (progressEvents.length === 0) return;
    for (const event of progressEvents.slice(0, 4)) {
      if (event.type === 'level') {
        toast({ type: 'win', title: t('level.up', { level: event.level }), message: `+${formatMoney(event.reward)}`, durationMs: 5000 });
      } else {
        toast({
          type: 'win',
          title: t('ach.unlocked', { name: t(`ach.${event.id}.title` as TKey) }),
          message: `+${formatMoney(event.reward)}`,
          durationMs: 5000,
        });
      }
    }
    sound.play('cashout');
    clearProgressEvents();
  }, [progressEvents, clearProgressEvents, toast, t, sound]);

  const updateSelection = useCallback((change: SelectionChange) => {
    setSelection((current) => ({ ...current, ...(typeof change === 'function' ? change(current) : change) }));
  }, []);

  const useForUpgrade = useCallback(
    (uid: string) => {
      setSelection({ sourceUids: [uid], targetId: null });
      navigate('upgrade');
    },
    [navigate],
  );

  const handleFirstPurchase = (item: InventoryItem) => {
    completeOnboarding();
    useForUpgrade(item.uid);
    toast({
      type: 'success',
      title: t('shop.added', { name: getSkin(item.skinId)?.name ?? '' }),
      message: t('shop.nextStep'),
      durationMs: 5000,
    });
  };

  const openFreeCase = useCallback(() => setFreeCaseOpen(true), []);

  const handleStart = () => {
    dismissWelcome();
    navigate('shop');
  };

  const content = (() => {
    switch (page) {
      case 'upgrade':
        return <UpgradePage selection={selection} onSelectionChange={updateSelection} onNavigate={navigate} onOpenFreeCase={openFreeCase} />;
      case 'cases':
        return <CasesPage onUpgradeItem={useForUpgrade} />;
      case 'contracts':
        return <ContractsPage onNavigate={navigate} onUpgradeItem={useForUpgrade} />;
      case 'games':
        return <GamesPage />;
      case 'inventory':
        return <InventoryPage onUseForUpgrade={useForUpgrade} onNavigate={navigate} />;
      case 'shop':
        return <ShopPage onFirstPurchase={handleFirstPurchase} onUseForUpgrade={useForUpgrade} />;
      case 'quests':
        return <QuestsPage />;
      case 'collections':
        return <CollectionsPage />;
      case 'leaderboard':
        return <LeaderboardPage />;
      case 'history':
        return <HistoryPage onNavigate={navigate} />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage onReset={() => setSelection(EMPTY_SELECTION)} />;
    }
  })();

  return (
    <>
      {splash !== 'done' && <SplashScreen leaving={splash === 'leaving'} />}
      <Header page={page} onNavigate={navigate} onOpenFreeCase={openFreeCase} onOpenDaily={() => setDailyOpen(true)} />
      <LiveFeed />
      <div className="mx-auto flex max-w-[1600px]">
        <Sidebar page={page} onNavigate={navigate} />
        <main key={page} className="anim-fade-up min-w-0 flex-1 px-3 pb-28 pt-5 sm:px-5 lg:px-8 lg:pb-12 lg:pt-7">
          <Suspense fallback={<PageSkeleton />}>{content}</Suspense>
        </main>
      </div>
      <BottomNav page={page} onNavigate={navigate} />
      <WelcomeModal open={splash === 'done' && state.isFirstVisit} onStart={handleStart} />
      <FreeCaseModal open={freeCaseOpen} onClose={() => setFreeCaseOpen(false)} onUpgradeItem={useForUpgrade} />
      <DailyModal open={dailyOpen} onClose={() => setDailyOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <ToastProvider>
        <Shell />
      </ToastProvider>
    </StoreProvider>
  );
}
