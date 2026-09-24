export const STARTING_BALANCE = 200;

/** Fraction removed from the fair chance. 0.05 = 5% house edge. */
export const HOUSE_EDGE = 0.05;
export const MAX_CHANCE = 95;
export const MIN_CHANCE = 0.1;

/** Share of the item price returned when selling back to the shop. */
export const SELL_RATE = 0.9;

export const STORAGE_KEY = 'cs2-upgrader:state';
export const STORAGE_VERSION = 1;
export const HISTORY_LIMIT = 500;

export const ROULETTE_DURATION_MS = 5000;
export const ROULETTE_FAST_DURATION_MS = 2400;
export const CASE_ROULETTE_DURATION_MS = 5200;

/**
 * Luck system: after LUCK_START_STREAK losses in a row the chance grows by LUCK_STEP (relative)
 * per extra loss, up to LUCK_MAX_BONUS. Any win resets it.
 */
export const LUCK_START_STREAK = 3;
export const LUCK_STEP = 0.02;
export const LUCK_MAX_BONUS = 0.1;

/** Daily login rewards for streak days 1..7 (before the level multiplier). */
export const DAILY_REWARDS = [1, 2, 3, 5, 7, 10, 20] as const;

/** Coinflip pays this multiple of the bet on a win (5% house edge). */
export const COINFLIP_PAYOUT = 1.9;

/** Crash: P(crash >= x) = CRASH_RETURN / x. */
export const CRASH_RETURN = 0.96;
export const CRASH_MAX_MULTIPLIER = 900;
/** Multiplier growth per second: m(t) = e^(CRASH_GROWTH * t). */
export const CRASH_GROWTH = 0.12;

export const NET_WORTH_HISTORY_LIMIT = 300;
export const NICKNAME_MAX_LENGTH = 20;

export const MAX_STICKERS_PER_ITEM = 4;
/** Price of renaming an item, like a name tag in the game. */
export const NAME_TAG_PRICE = 2;
export const NAME_TAG_MAX_LENGTH = 20;
/** Wear added by one sticker scrape; at 1 the sticker is gone. */
export const STICKER_SCRAPE_STEP = 0.25;
export const MINES_GRID = 25;
export const MINES_RETURN = 0.97;

/** Towers: floors to climb and the expected return of every cash-out point. */
export const TOWERS_FLOORS = 8;
export const TOWERS_RETURN = 0.97;
/** Hi-Lo: each correct guess pays (HILO_STEP_RETURN / chance); the game ends after HILO_MAX_STEPS guesses. */
export const HILO_STEP_RETURN = 0.98;
export const HILO_MAX_STEPS = 30;
/** Free fortune wheel spin interval. */
export const WHEEL_COOLDOWN_MS = 4 * 3_600_000;
export const PLINKO_ROWS = 12;
/** Battle pass: tiers per season, XP per tier, season length in days. */
export const SEASON_TIERS = 30;
export const SEASON_TIER_XP = 150;
export const SEASON_DAYS = 30;
/** Season index shown as "Season 1" (first season after the simulator launched). */
export const FIRST_SEASON_ID = 690;
export const TRADE_OFFERS = 3;

export const UPGRADE_MULTIPLIERS = [2, 4, 8] as const;
export const CHANCE_PRESETS = [35, 55, 75] as const;

/** Upgrade grids show this many skins per page. */
export const PICKER_PAGE_SIZE = 12;

/** A free case unlocks when the inventory is empty and the balance drops below this. */
export const FREE_CASE_BALANCE_THRESHOLD = 1;
