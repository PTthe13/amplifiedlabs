/* ============================================================
   FIFA World Cup 2026 — static dataset
   Groups per the Final Draw (Washington D.C., 5 Dec 2025)
   + playoff winners (March 2026).
   Elo ratings snapshot: eloratings.net, June 2026.
   ============================================================ */

const HOST_BOOST = 50; // Elo points added to co-hosts (MEX, USA, CAN)

const TEAMS = [
  // Group A
  { id: 'MEX', name: 'Mexico',            flag: '🇲🇽', group: 'A', elo: 1875, host: true },
  { id: 'RSA', name: 'South Africa',      flag: '🇿🇦', group: 'A', elo: 1517 },
  { id: 'KOR', name: 'South Korea',       flag: '🇰🇷', group: 'A', elo: 1758 },
  { id: 'CZE', name: 'Czechia',           flag: '🇨🇿', group: 'A', elo: 1740 },
  // Group B
  { id: 'CAN', name: 'Canada',            flag: '🇨🇦', group: 'B', elo: 1788, host: true },
  { id: 'SUI', name: 'Switzerland',       flag: '🇨🇭', group: 'B', elo: 1891 },
  { id: 'QAT', name: 'Qatar',             flag: '🇶🇦', group: 'B', elo: 1421 },
  { id: 'BIH', name: 'Bosnia & Herz.',    flag: '🇧🇦', group: 'B', elo: 1595 },
  // Group C
  { id: 'BRA', name: 'Brazil',            flag: '🇧🇷', group: 'C', elo: 1991 },
  { id: 'MAR', name: 'Morocco',           flag: '🇲🇦', group: 'C', elo: 1827 },
  { id: 'HAI', name: 'Haiti',             flag: '🇭🇹', group: 'C', elo: 1548 },
  { id: 'SCO', name: 'Scotland',          flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', group: 'C', elo: 1782 },
  // Group D
  { id: 'USA', name: 'United States',     flag: '🇺🇸', group: 'D', elo: 1726, host: true },
  { id: 'PAR', name: 'Paraguay',          flag: '🇵🇾', group: 'D', elo: 1834 },
  { id: 'AUS', name: 'Australia',         flag: '🇦🇺', group: 'D', elo: 1777 },
  { id: 'TUR', name: 'Türkiye',           flag: '🇹🇷', group: 'D', elo: 1911 },
  // Group E
  { id: 'GER', name: 'Germany',           flag: '🇩🇪', group: 'E', elo: 1932 },
  { id: 'CIV', name: 'Ivory Coast',       flag: '🇨🇮', group: 'E', elo: 1695 },
  { id: 'ECU', name: 'Ecuador',           flag: '🇪🇨', group: 'E', elo: 1938 },
  { id: 'CUW', name: 'Curaçao',           flag: '🇨🇼', group: 'E', elo: 1434 },
  // Group F
  { id: 'NED', name: 'Netherlands',       flag: '🇳🇱', group: 'F', elo: 1948 },
  { id: 'SWE', name: 'Sweden',            flag: '🇸🇪', group: 'F', elo: 1712 },
  { id: 'TUN', name: 'Tunisia',           flag: '🇹🇳', group: 'F', elo: 1628 },
  { id: 'JPN', name: 'Japan',             flag: '🇯🇵', group: 'F', elo: 1906 },
  // Group G
  { id: 'BEL', name: 'Belgium',           flag: '🇧🇪', group: 'G', elo: 1894 },
  { id: 'EGY', name: 'Egypt',             flag: '🇪🇬', group: 'G', elo: 1696 },
  { id: 'IRN', name: 'Iran',              flag: '🇮🇷', group: 'G', elo: 1772 },
  { id: 'NZL', name: 'New Zealand',       flag: '🇳🇿', group: 'G', elo: 1562 },
  // Group H
  { id: 'ESP', name: 'Spain',             flag: '🇪🇸', group: 'H', elo: 2157 },
  { id: 'CPV', name: 'Cape Verde',        flag: '🇨🇻', group: 'H', elo: 1578 },
  { id: 'KSA', name: 'Saudi Arabia',      flag: '🇸🇦', group: 'H', elo: 1576 },
  { id: 'URU', name: 'Uruguay',           flag: '🇺🇾', group: 'H', elo: 1892 },
  // Group I
  { id: 'FRA', name: 'France',            flag: '🇫🇷', group: 'I', elo: 2063 },
  { id: 'SEN', name: 'Senegal',           flag: '🇸🇳', group: 'I', elo: 1860 },
  { id: 'IRQ', name: 'Iraq',              flag: '🇮🇶', group: 'I', elo: 1618 },
  { id: 'NOR', name: 'Norway',            flag: '🇳🇴', group: 'I', elo: 1914 },
  // Group J
  { id: 'ARG', name: 'Argentina',         flag: '🇦🇷', group: 'J', elo: 2114 },
  { id: 'ALG', name: 'Algeria',           flag: '🇩🇿', group: 'J', elo: 1760 },
  { id: 'AUT', name: 'Austria',           flag: '🇦🇹', group: 'J', elo: 1830 },
  { id: 'JOR', name: 'Jordan',            flag: '🇯🇴', group: 'J', elo: 1680 },
  // Group K
  { id: 'POR', name: 'Portugal',          flag: '🇵🇹', group: 'K', elo: 1986 },
  { id: 'COD', name: 'DR Congo',          flag: '🇨🇩', group: 'K', elo: 1652 },
  { id: 'UZB', name: 'Uzbekistan',        flag: '🇺🇿', group: 'K', elo: 1714 },
  { id: 'COL', name: 'Colombia',          flag: '🇨🇴', group: 'K', elo: 1982 },
  // Group L
  { id: 'ENG', name: 'England',           flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', group: 'L', elo: 2021 },
  { id: 'CRO', name: 'Croatia',           flag: '🇭🇷', group: 'L', elo: 1912 },
  { id: 'GHA', name: 'Ghana',             flag: '🇬🇭', group: 'L', elo: 1510 },
  { id: 'PAN', name: 'Panama',            flag: '🇵🇦', group: 'L', elo: 1730 },
];

const GROUPS = 'ABCDEFGHIJKL'.split('');

/* Round of 32 — slot notation:
   { w: 'E' }  winner of group E
   { r: 'A' }  runner-up of group A
   { t: 'ABCDF' }  best-third drawn from one of these groups */
const R32 = [
  { id: 73, home: { r: 'A' },     away: { r: 'B' } },
  { id: 74, home: { w: 'E' },     away: { t: 'ABCDF' } },
  { id: 75, home: { w: 'F' },     away: { r: 'C' } },
  { id: 76, home: { w: 'C' },     away: { r: 'F' } },
  { id: 77, home: { w: 'I' },     away: { t: 'CDFGH' } },
  { id: 78, home: { r: 'E' },     away: { r: 'I' } },
  { id: 79, home: { w: 'A' },     away: { t: 'CEFHI' } },
  { id: 80, home: { w: 'L' },     away: { t: 'EHIJK' } },
  { id: 81, home: { w: 'D' },     away: { t: 'BEFIJ' } },
  { id: 82, home: { w: 'G' },     away: { t: 'AEHIJ' } },
  { id: 83, home: { r: 'K' },     away: { r: 'L' } },
  { id: 84, home: { w: 'H' },     away: { r: 'J' } },
  { id: 85, home: { w: 'B' },     away: { t: 'EFGIJ' } },
  { id: 86, home: { w: 'J' },     away: { r: 'H' } },
  { id: 87, home: { w: 'K' },     away: { t: 'DEIJL' } },
  { id: 88, home: { r: 'D' },     away: { r: 'G' } },
];

/* Later rounds reference earlier match ids */
const R16 = [
  { id: 89, home: 74, away: 77 },
  { id: 90, home: 73, away: 75 },
  { id: 91, home: 76, away: 78 },
  { id: 92, home: 79, away: 80 },
  { id: 93, home: 83, away: 84 },
  { id: 94, home: 81, away: 82 },
  { id: 95, home: 86, away: 88 },
  { id: 96, home: 85, away: 87 },
];
const QF = [
  { id: 97,  home: 89, away: 90 },
  { id: 98,  home: 93, away: 94 },
  { id: 99,  home: 91, away: 92 },
  { id: 100, home: 95, away: 96 },
];
const SF = [
  { id: 101, home: 97, away: 98 },
  { id: 102, home: 99, away: 100 },
];
const FINAL = { id: 104, home: 101, away: 102 };

const STAGES = ['group', 'r32', 'r16', 'qf', 'sf', 'final', 'champion'];
const STAGE_LABELS = {
  group: 'Group stage', r32: 'Round of 32', r16: 'Round of 16',
  qf: 'Quarter-final', sf: 'Semi-final', final: 'Final', champion: 'Champion',
};
