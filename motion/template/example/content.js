// Everything the template shows. Words wrapped in *stars* are the accent (bold, in
// the brand colour). See .claude/skills/launch-promo/references/content.md.
M.CONTENT = {
  brand: {
    name: 'Jira',
    // a Simple Icons slug (it must be in js/icons.js), or null for a monogram
    icon: 'jira',
    color: '#0052CC',
    // item keys on cards, e.g. JRA-101
    key: 'JRA',
  },

  // 0-3.3 s: the line over nine floating app tiles (Simple Icons slugs; 'chat' is a
  // generic chat tile)
  intro: {
    line: 'Your team’s work is *everywhere.*',
    tiles: ['gmail', 'googlesheets', 'googlecalendar', 'zoom', 'github', 'figma', 'confluence', 'bitbucket', 'chat'],
  },

  // 3.4-7.6 s: nine clutter cards (the first comes back as the tenth), then the phrase
  // three times. Types: notes, sheet, inbox, chat, calendar, call, whiteboard, doc,
  // notifications. Leave out any field to use the template's default copy.
  montage: {
    cards: [
      { type: 'notes', cap: 'Sticky Notes', notes: ['fix login??', 'ask Sam\nabout API', 'URGENT', 'Q3 plan?', 'who owns\nthis?', 'bug #12', 'update\nroadmap', '???', 'call\ndesign'] },
      { type: 'sheet', cap: 'Spreadsheet Tracker', title: 'roadmap_v7_FINAL_final (2).xlsx' },
      { type: 'inbox', cap: 'Email Thread' },
      { type: 'chat', cap: 'Team Chat' },
      { type: 'calendar', cap: 'Status Meetings' },
      { type: 'call', cap: 'Another Call' },
      { type: 'whiteboard', cap: 'Whiteboard Plan', title: 'SPRINT PLAN??' },
      { type: 'doc', cap: 'status_update_FINAL.docx' },
      { type: 'notifications', cap: 'Notifications' },
    ],
    phrase: 'any update?',
  },

  // 8.1-9.9 s: typed after "But," in one big line; bold is the accent at its end
  whatIf: { typed: 'what if one board', bold: 'one board' },

  // 9.9-12.7 s: the brand tile and wordmark, then the product UI through three beats.
  // type: board (columns of cards) | dashboard (KPIs, chart, rows) | chat (an AI prompt)
  reveal: {
    type: 'board',
    title: 'Launch board',
    subtitle: 'Sprint 24  ·  6 days left',
    columns: ['TO DO', 'IN PROGRESS', 'DONE'],
    // eight board cards, then the hero card that is dragged to done
    cards: ['Design landing page', 'Fix login timeout', 'Set up analytics', 'Pricing page copy', 'Mobile nav polish', 'Onboarding emails', 'Beta feedback triage', 'Release notes', 'Plan launch campaign'],
    button: 'Share',
  },

  // 12.8-15.1 s, then 15.1-17.0 s on the arch
  noMore: ['No more *chasing* updates.', 'No more *pointless* meetings'],

  // 17.1-18.7 s
  once: 'Plan once, *And ship (:*',

  // 18.7-23.0 s: a ring of cards, a panel, a wall of integrations, a dark card, the payoff
  features: {
    ring: 'Boards',
    panel: { word: 'Timeline', type: 'timeline', ticks: ['Jun', 'Jul', 'Aug', 'Sep'], rows: [['Design', 0.0, 0.34], ['Build', 0.22, 0.7], ['Test', 0.55, 0.85], ['Launch', 0.8, 1.0]] },
    wall: { word: 'Automation', tiles: ['github', 'bitbucket', 'confluence', 'figma', 'gmail', 'googlecalendar', 'zoom', 'googlesheets', 'trello'] },
    card: 'Reports',
    payoff: 'Pure *focus.*',
  },

  // 23.05-26.6 s: the tagline lands in two halves (split at the comma), then the lockup
  end: { tagline: 'Your whole team, in one *place.*' },
};
