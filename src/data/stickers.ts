import type { Rarity } from '../types/types';
import { KATOWICE_2014 } from './katowice2014';

const CDN = 'https://community.akamai.steamstatic.com/economy/image/';

export interface StickerDef {
  id: string;
  name: string;
  rarity: Rarity;
  price: number;
  image: string;
  /** Stickers of a set only drop from capsules of that set. */
  set?: string;
}

/** Sticker catalog (artwork: github.com/ByMykel/CSGO-API). */
const BASE_STICKERS: StickerDef[] = [
  { id: 'welcome-to-the-clutch', name: "Welcome to the Clutch", rarity: 'milspec', price: 0.12, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1PHic4ERmpsjj71XkThD0oZXs6DZY57z6bKI5eKTFDGXDwL9wteBtFirrwEsmsTjQm96ocS3EPVAhAsB1F7QIrFDmxRUFa3Qh' },
  { id: 'nelu-the-bear', name: "Nelu the Bear", rarity: 'milspec', price: 0.15, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7dempVfiTQjllpPi-CNJofT8MPU6dKXGWjfAk-ol5-c8SnqwwBkisGrVzI2hcXiUa1QlCZsjRbYU8k7vnUZEXqM' },
  { id: 'pocket-bbq', name: "Pocket BBQ", rarity: 'milspec', price: 0.2, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpUnoQhb0iqni_zMV7ar-OvJscKmVWmLEmL5057JrTnGxk0xy4z_RzdipJHOXbQFzX8NxQflK7Edh8BfzWw' },
  { id: 'winged-defuser', name: "Winged Defuser", rarity: 'milspec', price: 0.25, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpU7uTxr0mqnk-CRO_Pe8JvA9JKXLWDeWlbx3s7RoSnyyw0V16znQmNj9JXvFaVVyDJV2Q-YI5BSm0oqwWcbD_hE' },
  { id: 'doomed', name: "Doomed", rarity: 'milspec', price: 0.25, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7dempV3oThD0mti0qiBf6qD-bPVvdaiQXjXJxL915eM9Tn3jx01ysT6Bz4v7JXKROlUjFNIuEgwux_Im' },
  { id: 'chicken-lover', name: "Chicken Lover", rarity: 'milspec', price: 0.3, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1PHic4ERmpsj34lDkShj_oZrv6ydJoab4MPZpc_PBDzXDl-ggs7M4Hy-ylhhyt22Amdj8JX_FZ1UnA8QmE-YU8k7vYJs36dk' },
  { id: 'lucky-13', name: "Lucky 13", rarity: 'milspec', price: 0.5, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1NHWT5ERxu5P840vzRBj_0JPlqiYP6ff6OPM0cvLBDGORmbYhs7NsTii2zBt_tT_Qn9iscH3GO1A-SswnhsokpHo' },
  { id: 'bomb-doge', name: "Bomb Doge", rarity: 'milspec', price: 0.8, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpVvoTB_Ompnn-GwDufH-O6JrJvTGVzGUlu8ntrM6Hn7gkB5ztW3Vztn_dC7GOlN0CsF0W6dU5RydrPIb' },
  { id: 'hello-ak-47', name: "Hello AK-47", rarity: 'milspec', price: 0.35, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNikNnSe6Rl0_9Oj1UviQhL4kti4_nsKvvf6avE0JqLDC2HIxLYk5rA5TC3mk01y62WBwt__Jy7CbFUlFNIuEiXV6npc' },
  { id: 'hello-m4a4', name: "Hello M4A4", rarity: 'milspec', price: 0.35, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNikNnSe6Rl4oIag1UviQhL4ktjkpCQP6aKqPvNpdqDDWWHFkLtz4rVoSSzkxxl-62mHw9_8cy_BOlInFNIuEqpIi-X4' },
  { id: 'hello-awp', name: "Hello AWP", rarity: 'milspec', price: 0.45, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNikNnSe6Rl045fL-FzkThT90Mez_yMPv6GrbvZrePTKDDXGkLxysrk8Syq3xhsltmXSzNqsc3OUbAY-SswnspByV94' },
  { id: 'stay-frosty', name: "Stay Frosty", rarity: 'milspec', price: 0.4, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7dempUrzQAT3jJnz6TsV7aaoMPxuJqbKDWLBk7cktbM_TXixkEl-4D7QyN6sdHKXOgQhX8B1EPlK7Ed15iMSOQ' },
  { id: 'bish-holo', name: "Bish (Holo)", rarity: 'restricted', price: 4, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1PHic4ERmpsj240rvfhX-kpmu-yBevqP2O_E4I6mVDTCWlLYjtblvG3vglEt-4m3VzdmpIimSOAImWIwwG7DEtAgJ5w' },
  { id: 'bash-holo', name: "Bash (Holo)", rarity: 'restricted', price: 4, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1PHic4ERmpsj260rvfhX-kpmuqHdf6vP5PKI1IaTGVj6Vkuhws-BoFnnnzUgltmmGyY77IyjEaFJxXowwG7CRGcYc-g' },
  { id: 'bosh-holo', name: "Bosh (Holo)", rarity: 'restricted', price: 5, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1PHic4ERmpsj25UrvfhX-kpmuqiQL7aSqO_I6JabFDTaUlrwlseI-G3uwxUUhtWvTzIz8d3mWbFd1C4wwG7C3RapAzQ' },
  { id: 'mastermind-holo', name: "Mastermind (Holo)", rarity: 'restricted', price: 9, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNmpNG-D4ERw8Ljj71uoTBziipPy8CtV682mZ6hibqKSVjfHlr9w5eNvTXDqkxght2nTnI2vdXyTaAIoDpV2QbMM4xLqkdT5d7S1hhvk6Ak' },
  { id: 'flammable-foil', name: "Flammable (Foil)", rarity: 'classified', price: 30, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpV_rQBD8n5Ts-B1d4PuiJvQ9I_WWDWSWlb8k5bA4SnDjxUshsTnVyoutcXyXPQciDJN0R-EOshim0oqw3mezwEo' },
  { id: 'headhunter-foil', name: "Headhunter (Foil)", rarity: 'classified', price: 40, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpVHiQBn5i5j0-DBk6f2nZOppcqiSWTXFwOwksbFrHnmxxUx352ncn9ehI3uXP1QiD5p5QrIL4Ba6jJS5YBlVjhXJ' },
  { id: 'swag-foil', name: "Swag (Foil)", rarity: 'classified', price: 25, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpUrwQBrOmJnp8WwLt6v9aqVudPORX2LJl7omtuRsTSjixU9-6j6Dn9_8ciqSbAAkXsZ4W6dU5f-J8SZe' },
  { id: 'crown-foil', name: "Crown (Foil)", rarity: 'classified', price: 350, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1PHic4ERmpsj3-FbwTyL3kZ_ssycDt6v4PvU_dvTGDWGWl-xwtLZoS36ykB4ltTvXy42seS_EPFQpC8BuBbldJQkRI1c' },
  { id: 's1mple-gold-stockholm-2021', name: "s1mple (Gold) | Stockholm 2021", rarity: 'covert', price: 45, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1Onic7QQlpta7-VDgfg6gk4bs-B1c4P6qJv1seKHGWmPHwrYu4LcwH3nnlhx_t2jSnIr7dSmQa1JyX5RxR7QI5kOm0oqwa5pQJSY' },
  { id: 'zywoo-gold-stockholm-2021', name: "ZywOo (Gold) | Stockholm 2021", rarity: 'covert', price: 20, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1Onic7QQlpta7-VDgfgfoiZnvwiVU4_bgPvc0c_aXDDGWlO91srFrF36xxh8k4G6HzI79eSjFawR2W5MkRbFe4Q74zIOQs8L6JA' },
  { id: 'niko-gold-stockholm-2021', name: "NiKo (Gold) | Stockholm 2021", rarity: 'covert', price: 25, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1Onic7QQlpta7-VDgfhP4lZnf-i1X67ysPfdrdaOWXD-Rle8l4bFsHn2xlh935mmAyt-rIy3BZ1NxCMR3ROUKrFDmxZ-GWysN' },
  { id: 'device-gold-stockholm-2021', name: "device (Gold) | Stockholm 2021", rarity: 'covert', price: 15, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjNm1Onic7QQlpta7-VDgfhn0iJ_j-B1c4P6qJvVueaDFWzHHmOsi4Lg7Hnm3x0V24G-BmNf6IiqeOwMjWMMiRLENtkOm0oqwDf_eJJc' },
  { id: 'howling-dawn', name: "Howling Dawn", rarity: 'contraband', price: 600, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjMmuOHaC619h7delpVHoVhH4kJHf-SNM4bz9bKY_dPWQWDCUkLxy57g_H3DgkB5w42uAzIv4I3meOAQlApdwFO5YrFDmxUNp_lL7' },
  { id: 'natus-vincere-holo-katowice-2014', name: "Natus Vincere (Holo) | Katowice 2014", rarity: 'restricted', price: 800, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjM-sJnCW8Vli_YTxuAm2FVL_n4DpwipU4_3gav08c6jBWzHElbck5ONvGX2yxU8m6mnXwtetcnOfOgMiCJclRbIMsg74zIPTbZA4cw' },
  { id: 'titan-holo-katowice-2014', name: "Titan (Holo) | Katowice 2014", rarity: 'restricted', price: 1500, image: CDN + 'i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGJai0ki7VeTHjM-sJnCW8Vli_YTxuAm2FVLll4Lh8x1T4P6hJqZrJfHAXjXGkr0i4rc_GSjixEh35GSAnNr8IyqSbg8kA8ciRrQJshGm0oqwlCzKr50' },
];

const KATOWICE_BY_NAME = new Map(KATOWICE_2014.map((s) => [s.name, s]));
const BASE_NAMES = new Set(BASE_STICKERS.map((s) => s.name));

/** Base stickers (Katowice 2014 ones take the real price and set) plus the rest of Katowice 2014. */
export const STICKERS: StickerDef[] = [
  ...BASE_STICKERS.map((s) => {
    const kato = KATOWICE_BY_NAME.get(s.name);
    return kato ? { ...s, rarity: kato.rarity, price: kato.price, set: kato.set } : s;
  }),
  ...KATOWICE_2014.filter((s) => !BASE_NAMES.has(s.name)),
];

export const STICKER_MAP: ReadonlyMap<string, StickerDef> = new Map(STICKERS.map((s) => [s.id, s]));

export function getSticker(id: string | null | undefined): StickerDef | undefined {
  return id ? STICKER_MAP.get(id) : undefined;
}
