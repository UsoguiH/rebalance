// The five Qudrati leagues, lowest first (their badges are in img/ranks), and
// what the animation needs for each: its name, colours (the charge's tint,
// outline and glow in ink, and its title banner), and for the shine the
// shape that flashes (the pencil, the gem or the crown) and where the X glint
// pops, as fractions of the badge image.
(() => {
  const pencil = [[0.3, 0.52], [0.62, 0.22], [0.68, 0.21], [0.75, 0.28], [0.74, 0.32], [0.4, 0.62], [0.25, 0.67]];
  const gem = [[0.3, 0.25], [0.7, 0.25], [0.5, 0.8]];
  const crown = [[0.19, 0.29], [0.37, 0.41], [0.5, 0.23], [0.63, 0.41], [0.81, 0.29], [0.73, 0.65], [0.27, 0.65]];
  const TIERS = [
    { key: 'bronze', name: 'المستوى البرونزي', title: '#c46a2f', glow: '#f3b98c', facet: pencil, cross: [0.6, 0.3],
      ink: { tint: '#e8b48c', pale: '#fbeee3', ring: '#e0894a', halo: '#f6d6bd', twinkle: '#eba776' },
      banner: { main: '#c46a2f', dark: '#9c5022', light: '#dd8a52', deco: null } },
    { key: 'silver', name: 'المستوى الفضي', title: '#7a8ea8', glow: '#c9d6e6', facet: pencil, cross: [0.6, 0.3],
      ink: { tint: '#c3cedb', pale: '#eef2f7', ring: '#93a6c0', halo: '#e3e9f1', twinkle: '#a9b9cd' },
      banner: { main: '#8a9db5', dark: '#6b7f99', light: '#a9b9cc', deco: 'pencil' } },
    { key: 'gold', name: 'المستوى الذهبي', title: '#e09a00', glow: '#ffd76a', facet: pencil, cross: [0.6, 0.3],
      ink: { tint: '#ffd770', pale: '#fff4cf', ring: '#ffb800', halo: '#ffe9a6', twinkle: '#ffcc33' },
      banner: { main: '#f0a800', dark: '#c98a00', light: '#ffc845', deco: 'coin' } },
    { key: 'diamond', name: 'المستوى الألماسي', title: '#1899d6', glow: '#8fd8ff', facet: gem, cross: [0.4, 0.36],
      ink: { tint: '#a9dcee', pale: '#e2f4fd', ring: '#62e6ff', halo: '#d2f5ff', twinkle: '#7fdcf5' },
      banner: { main: '#1cb0f6', dark: '#1482bf', light: '#5cc8f8', deco: 'gem' } },
    { key: 'champion', name: 'مستوى الأبطال', title: '#8e4cf0', glow: '#c7a6ff', facet: crown, cross: [0.5, 0.3],
      ink: { tint: '#c9a8ff', pale: '#f1e8ff', ring: '#a86bff', halo: '#e2d2ff', twinkle: '#b58cff' },
      banner: { main: '#8e4cf0', dark: '#6a2fc8', light: '#a46cf5', deco: 'crown' } },
  ];
  // The promotion into tier t (1 to 4, silver to champion): the league
  // before it on the left (none for silver's left neighbour beyond bronze),
  // the one you leave, the one you reach, and the next one locked on the right
  // (none after champion). Each role is [image, on-screen width at scale 1].
  function promotion(t) {
    t = Math.min(4, Math.max(1, t | 0));
    const k = (i) => 'ranks/rank-' + TIERS[i].key;
    return {
      tier: TIERS[t],
      art: {
        prev: t >= 2 ? [k(t - 2), 162] : null,
        cur: [k(t - 1), 242],
        lock: [k(t) + '-grey', 158],
        lockBaked: [k(t) + '-locked', 158],
        open: [k(t), 242],
        after: t < 4 ? [k(t + 1) + '-locked', 158] : null,
      },
    };
  }
  window.LEAGUE_TIERS = TIERS;
  window.leaguePromotion = promotion;
})();
