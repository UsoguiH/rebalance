// Everything the template shows. Words wrapped in *stars* are the accent (bold, in
// the brand colour). See .claude/skills/launch-promo/references/content.md.
M.CONTENT = {
  brand: { name: 'Stripe', icon: 'stripe', color: '#635BFF', key: 'PAY' },

  intro: {
    line: 'Your payments are *everywhere.*',
    tiles: ['gmail', 'googlesheets', 'paypal', 'quickbooks', 'shopify', 'xero', 'googlecalendar', 'wise', 'chat'],
  },

  montage: {
    cards: [
      { type: 'notes', cap: 'Sticky Notes', notes: ['chase\nAcme $$', 'invoice\n#1042??', 'URGENT', 'refund?', 'who paid\nwhat?', 'late fee?', 'update\npricing', '???', 'call\nthe bank'] },
      {
        type: 'sheet',
        cap: 'Spreadsheet Tracker',
        title: 'invoices_2024_FINAL_v3.xlsx',
        columns: ['Client', 'Owner', 'Status', 'Last reminder'],
        rows: [['Acme Co', 'Sam', 'Overdue'], ['Globex', '??', 'Pending??'], ['Initech', 'Priya', 'Paid?'], ['Umbrella', 'Jordan', 'Overdue'], ['Hooli', '', '???'], ['Stark Ltd', 'Alex', 'Pending??'], ['Wayne Inc', 'Sam', 'see email'], ['Soylent', 'Priya', 'Paid?'], ['Vandelay', '??', 'Failed']],
        notes: ['last month?', 'sent twice', 'Tuesday', '??', 'ask Sam'],
      },
      {
        type: 'inbox',
        cap: 'Email Thread',
        title: 'Inbox (61)',
        mails: [['Acme Co', 'Re: Re: invoice #1042', '9:41'], ['Bank', 'Payment failed: card declined', '9:38'], ['Priya', 'did they pay yet?', '9:30'], ['Globex', 'Re: wrong amount?', '9:12'], ['Sam K.', 'Fwd: refund request', '8:57'], ['Jordan', 'Re: any payment update?', '8:40'], ['Calendar', 'Month-end close moved to 3pm', '8:31']],
      },
      { type: 'chat', cap: 'Team Chat', messages: [['Jordan', 'hey, quick one'], ['Jordan', 'did Acme pay?'], ['Sam', 'not sure, check the sheet?'], ['Jordan', 'bumping this ↑']] },
      { type: 'calendar', cap: 'Month-End Close', title: 'Month-end close', blocks: ['Reconcile', 'Chase invoices', 'Bank call', 'Reconcile', 'Refunds', 'Chase invoices', 'Reconcile', 'Tax prep?', 'Bank call', 'Reconcile', 'Chase invoices', 'Reconcile', 'Where is it?', 'Reconcile', 'Refunds'] },
      { type: 'call', cap: 'Another Call' },
      { type: 'whiteboard', cap: 'Pricing Plan', title: 'PRICING??', lines: ['monthly → yearly → ???', 'who bills: Sam? Priya?', 'when: end of month (maybe)'], circled: 'LATE' },
      { type: 'doc', cap: 'revenue_report_FINAL.docx', title: 'Revenue report (FINAL v3)', lines: ['Revenue is on track', 'Acme: paid?', 'Refunds: waiting on Sam', 'Fees: see sheet', 'Next steps: TBD'] },
      { type: 'notifications', cap: 'Notifications', items: [['Bank', 'Payment failed: card declined'], ['Messages', '3 new: "did they pay?"'], ['Calendar', 'Month-end close in 5 min'], ['Mail', 'Re: Re: invoice #1042']] },
    ],
    phrase: 'did they pay?',
  },

  whatIf: { typed: 'what if one dashboard', bold: 'one dashboard' },

  reveal: {
    type: 'dashboard',
    title: 'Payments',
    subtitle: 'Today  ·  live',
    kpis: [['Gross volume', 128430, '$', '+12.4%'], ['Net revenue', 96120, '$', '+9.1%'], ['New customers', 2480, '', '+8%']],
    chartLabel: 'Gross volume  ·  last 12 weeks',
    listLabel: 'Latest invoices',
    rows: [['Invoice #1042', '$1,200.00 · Acme Co'], ['Invoice #1041', '$860.00 · Globex'], ['Invoice #1040', '$2,450.00 · Initech'], ['Invoice #1039', '$310.00 · Hooli']],
    status: ['Pending', 'Paid'],
    button: 'Payout',
  },
  // the items on the ring of cards and behind the arch
  items: ['Invoice #1042', 'Refund #77', 'Payout to bank', 'Subscription: Pro', 'Failed charge retry', 'Tax report Q3', 'New customer: Acme', 'Dispute #12', 'Launch pricing'],

  noMore: ['No more *chasing* invoices.', 'No more *failed* payments'],

  once: 'Build once, *And scale (:*',

  features: {
    ring: 'Payments',
    panel: { word: 'Billing', type: 'list', rows: [['Invoice sent'], ['Reminder scheduled'], ['Card charged'], ['Receipt emailed']] },
    wall: { word: 'Connect', tiles: ['shopify', 'quickbooks', 'xero', 'paypal', 'gmail', 'googlesheets', 'wise', 'hubspot', 'woocommerce'] },
    card: 'Payouts',
    payoff: 'Pure *growth.*',
  },

  end: { tagline: 'Your money, in one *place.*' },
};
