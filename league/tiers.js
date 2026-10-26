// The five Qudrati leagues, lowest first (their badges are in img/ranks), and
// what the animation needs for each: its name, colours, and for the shine the
// shape that flashes (the pencil, the gem or the crown) and where the X glint
// pops, as fractions of the badge image.
(() => {
  const pencil = [[0.3, 0.52], [0.62, 0.22], [0.68, 0.21], [0.75, 0.28], [0.74, 0.32], [0.4, 0.62], [0.25, 0.67]];
  const gem = [[0.3, 0.25], [0.7, 0.25], [0.5, 0.8]];
  const crown = [[0.19, 0.29], [0.37, 0.41], [0.5, 0.23], [0.63, 0.41], [0.81, 0.29], [0.73, 0.65], [0.27, 0.65]];
  const TIERS = [
    { key: 'bronze', name: 'المستوى البرونزي', title: '#c46a2f', glow: '#f3b98c', facet: pencil, cross: [0.6, 0.3] },
    { key: 'silver', name: 'المستوى الفضي', title: '#7a8ea8', glow: '#c9d6e6', facet: pencil, cross: [0.6, 0.3] },
    { key: 'gold', name: 'المستوى الذهبي', title: '#e09a00', glow: '#ffd76a', facet: pencil, cross: [0.6, 0.3] },
    { key: 'diamond', name: 'المستوى الألماسي', title: '#1899d6', glow: '#8fd8ff', facet: gem, cross: [0.4, 0.36] },
    { key: 'champion', name: 'مستوى الأبطال', title: '#8e4cf0', glow: '#c7a6ff', facet: crown, cross: [0.5, 0.3] },
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
