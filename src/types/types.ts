export type Rarity =
  | 'consumer'
  | 'industrial'
  | 'milspec'
  | 'restricted'
  | 'classified'
  | 'covert'
  | 'contraband'
  | 'rare'
  /** One-of-a-kind endgame items (data/legends.ts). */
  | 'legendary';

export type WeaponCategory =
  | 'rifle'
  | 'sniper'
  | 'pistol'
  | 'smg'
  | 'shotgun'
  | 'machinegun'
  | 'knife'
  | 'gloves'
  | 'agent'
  | 'charm'
  | 'music';

export type Exterior =
  | 'Factory New'
  | 'Minimal Wear'
  | 'Field-Tested'
  | 'Well-Worn'
  | 'Battle-Scarred';

export interface Skin {
  id: string;
  /** Id of the base skin this wear / StatTrak variant belongs to. */
  baseId: string;
  name: string;
  weapon: string;
  finish: string;
  category: WeaponCategory;
  rarity: Rarity;
  price: number;
  /** Optional real image URL. When null, a generated vector artwork is rendered instead. */
  image: string | null;
  collection: string;
  float: number;
  exterior: Exterior;
  /** Primary / secondary colors used by the generated artwork. */
  colors: [string, string];
  statTrak: boolean;
  /** Souvenir version (from souvenir packages). */
  souvenir?: boolean;
  /** Items without wear or float: vanilla knives, agents, charms, music kits. */
  wearless?: boolean;
  /** Price change versus 24 hours ago, e.g. 0.031 = +3.1%. */
  priceChange: number;
}

export type ItemOrigin = 'shop' | 'upgrade' | 'case' | 'contract' | 'battle' | 'trade' | 'crash' | 'jackpot' | 'wheel';

/** Rare patterns and floats that multiply an item's value. */
export type SpecialPattern = 'ruby' | 'sapphire' | 'blackPearl' | 'blueGem' | 'fullFade' | 'lowFloat';

export interface InventoryItem {
  uid: string;
  skinId: string;
  acquiredAt: number;
  origin: ItemOrigin;
  /** Applied sticker ids (max 4). */
  stickers?: string[];
  special?: SpecialPattern;
  /** Item-specific float, used by rare low-float drops. */
  float?: number;
}

export interface StickerItem {
  uid: string;
  stickerId: string;
  acquiredAt: number;
}

export interface TradeOffer {
  id: string;
  /** Player item uids the bot wants. */
  give: string[];
  /** Skin ids the bot offers. */
  get: string[];
  bot: string;
}

export interface QuestState {
  day: number;
  week: number;
  /** Stats snapshots at the start of the current day / week; quest progress is the difference. */
  dayStart: UserStats;
  weekStart: UserStats;
  claimed: string[];
}

export interface SeasonState {
  id: number;
  startXp: number;
  claimed: number[];
}

export type TowersDifficulty = 'easy' | 'medium' | 'hard' | 'expert';

export interface TowersGame {
  id: string;
  bet: number;
  difficulty: TowersDifficulty;
  /** Bomb tile indices per floor, decided when the game starts. */
  bombs: number[][];
  /** Tile picked on each cleared floor. */
  picks: number[];
}

export interface HiloGame {
  id: string;
  bet: number;
  /** The whole deck is drawn when the game starts; cards[index] is face up. Values 1 (A) … 13 (K). */
  cards: number[];
  index: number;
  multiplier: number;
}

/** Per-game totals shown in the profile. */
export interface GameStat {
  played: number;
  wagered: number;
  /** Net result of the game: returns minus stakes. */
  profit: number;
}

export interface MinesGame {
  id: string;
  bet: number;
  mines: number[];
  revealed: number[];
}

export type Theme = 'yellow' | 'purple' | 'red';
export type SoundPack = 'classic' | 'retro' | 'soft';

export type UpgradeResult = 'win' | 'loss';

export interface UpgradeOutcome {
  id: string;
  sourceUids: string[];
  sourceSkinIds: string[];
  /** Part of the balance staked in addition to the items. */
  balanceUsed: number;
  targetSkinId: string;
  /** Total staked value: items + balance. */
  sourcePrice: number;
  targetPrice: number;
  chance: number;
  /** Relative chance bonus from the losing-streak luck system (0.04 = +4%). */
  luckBonus: number;
  roll: number;
  result: UpgradeResult;
  createdAt: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  fromSkinId: string;
  fromName: string;
  fromPrice: number;
  toSkinId: string;
  toName: string;
  toPrice: number;
  chance: number;
  roll: number;
  result: UpgradeResult;
  profit: number;
}

export interface UserStats {
  totalUpgrades: number;
  wins: number;
  losses: number;
  totalProfit: number;
  biggestWin: number;
  itemsBought: number;
  totalSpent: number;
  itemsSold: number;
  freeCasesOpened: number;
  casesOpened: number;
  contractsCompleted: number;
  coinflipsPlayed: number;
  coinflipsWon: number;
  crashPlayed: number;
  crashBestMultiplier: number;
  winStreak: number;
  bestWinStreak: number;
  /** Lowest chance ever won with, in percent (100 = none yet). */
  lowestChanceWin: number;
  /** Knives, gloves and contraband obtained from upgrades, cases and contracts. */
  rareDrops: number;
  totalWagered: number;
  crashCashouts2x: number;
  battlesPlayed: number;
  battlesWon: number;
  rouletteSpins: number;
  minesPlayed: number;
  plinkoDrops: number;
  tradesAccepted: number;
  stickersApplied: number;
  questsCompleted: number;
  jackpotsPlayed: number;
  jackpotsWon: number;
  collectionsCompleted: number;
}

/** Losing streak since the last win; drives the small luck bonus. */
export interface LuckState {
  lossStreak: number;
  lostValue: number;
}

export type Language = 'ru' | 'en';

export interface Settings {
  soundEnabled: boolean;
  fastRoulette: boolean;
  language: Language;
  theme: Theme;
  soundPack: SoundPack;
}

export interface DailyState {
  /** UTC day index of the last claim. */
  lastClaimDay: number | null;
  streak: number;
}

export interface NetWorthPoint {
  t: number;
  v: number;
}

export interface CrashRound {
  id: string;
  bet: number;
  crashPoint: number;
  autoCashout: number | null;
  startedAt: number;
  /** Set when skins were staked instead of money; `bet` then holds their value. */
  skinStake?: { uids: string[]; skinIds: string[] } | null;
}

export interface AppState {
  storageVersion: number;
  balance: number;
  inventory: InventoryItem[];
  history: HistoryEntry[];
  stats: UserStats;
  luck: LuckState;
  xp: number;
  daily: DailyState;
  /** Achievement id -> unlock timestamp. */
  achievements: Record<string, number>;
  netWorthHistory: NetWorthPoint[];
  /** Up to three inventory uids shown in the profile showcase. */
  showcase: string[];
  nickname: string;
  pendingCrash: CrashRound | null;
  pendingMines: MinesGame | null;
  /** Battle winnings held back until the battle animation ends. */
  pendingBattle: { id: string; items: InventoryItem[] } | null;
  /** Jackpot winnings held back until the jackpot animation ends. */
  pendingJackpot: { id: string; items: InventoryItem[] } | null;
  collectionsClaimed: string[];
  stickers: StickerItem[];
  /** Free case / capsule openings granted by the battle pass, by case id. */
  keys: Record<string, number>;
  tradeOffers: TradeOffer[];
  quests: QuestState;
  season: SeasonState;
  frames: string[];
  frame: string | null;
  settings: Settings;
  favorites: string[];
  isFirstVisit: boolean;
  onboardingComplete: boolean;
  /** An upgrade whose result is already decided but not yet revealed/applied. */
  pendingUpgrade: UpgradeOutcome | null;
  pendingTowers: TowersGame | null;
  pendingHilo: HiloGame | null;
  /** Times the player has prestiged (reset for permanent bonuses). */
  prestige: number;
  /** Timestamp of the last free fortune wheel spin (0 = never). */
  wheelLastSpin: number;
  promoClaimed: string[];
  /** Game id -> totals. */
  gameStats: Record<string, GameStat>;
}

/** Translatable failure reasons returned by store actions (see i18n "error.*"). */
export type ErrorCode =
  | 'insufficientBalance'
  | 'itemUnavailable'
  | 'itemNotFound'
  | 'upgradeInProgress'
  | 'stakeItemMissing'
  | 'stakeItemInvalid'
  | 'invalidBalanceAmount'
  | 'targetInvalid'
  | 'noStake'
  | 'noTarget'
  | 'targetNotPricier'
  | 'chanceTooLow'
  | 'noUpgrade'
  | 'freeCaseUnavailable'
  | 'caseLocked'
  | 'caseUnknown'
  | 'contractEmpty'
  | 'contractMixed'
  | 'contractNotAllowed'
  | 'contractCount'
  | 'contractNoOutcomes'
  | 'invalidBet'
  | 'crashInProgress'
  | 'noCrash'
  | 'cashoutTooLate'
  | 'dailyClaimed'
  | 'stickerMissing'
  | 'stickerSlotsFull'
  | 'tradeInvalid'
  | 'minesInProgress'
  | 'noMines'
  | 'invalidMines'
  | 'questNotReady'
  | 'questClaimed'
  | 'tierLocked'
  | 'tierClaimed'
  | 'importInvalid'
  | 'crashStakeEmpty'
  | 'battleInvalid'
  | 'collectionIncomplete'
  | 'collectionClaimed'
  | 'jackpotEmpty'
  | 'towersInProgress'
  | 'noTowers'
  | 'invalidTowers'
  | 'hiloInProgress'
  | 'noHilo'
  | 'invalidHilo'
  | 'wheelCooldown'
  | 'promoInvalid'
  | 'promoUsed'
  | 'prestigeLocked'
  | 'prestigeBusy';

export type Page =
  | 'upgrade'
  | 'cases'
  | 'contracts'
  | 'games'
  | 'inventory'
  | 'shop'
  | 'history'
  | 'profile'
  | 'quests'
  | 'collections'
  | 'leaderboard'
  | 'settings';
