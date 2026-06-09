import type { NewsEvent, AssetCategory } from '../types';

let eventIdCounter = 0;

interface EventTemplate {
  headlines: string[];
  bodies: string[];
  categories: AssetCategory[];
  affectedTicker?: string;
  impact: [number, number]; // [min, max]
  type: NewsEvent['type'];
  probability: number;
}

const EVENT_TEMPLATES: EventTemplate[] = [
  {
    headlines: [
      'Fed raises interest rates by 50bps — markets brace for impact',
      'Central bank delivers surprise rate hike amid inflation fears',
    ],
    bodies: [
      'The Federal Reserve raised the benchmark rate to combat persistent inflation, sending tech and growth stocks lower.',
      'Policymakers cited labor market strength and elevated CPI in their decision to tighten monetary policy.',
    ],
    categories: ['growth', 'meme', 'index'],
    impact: [-0.6, -0.3],
    type: 'macro',
    probability: 0.04,
  },
  {
    headlines: [
      'AI breakthrough sends tech sector surging to all-time highs',
      'Major AI company reveals AGI-adjacent model — bulls go wild',
    ],
    bodies: [
      'A breakthrough announcement in artificial general intelligence sent AI-adjacent growth stocks soaring in after-hours trading.',
      'Analysts raised price targets across the board for AI and tech companies following the landmark announcement.',
    ],
    categories: ['growth'],
    impact: [0.4, 0.9],
    type: 'sector',
    probability: 0.05,
  },
  {
    headlines: [
      'Meme stock MOON goes viral on social media — retail frenzy begins',
      'Reddit community targets RGRP in coordinated short squeeze',
    ],
    bodies: [
      'A new social media campaign has targeted heavily-shorted meme stocks, triggering a massive short squeeze.',
      'Retail investors flooded into meme stocks following viral posts, pushing prices to irrational levels.',
    ],
    categories: ['meme'],
    impact: [0.8, 2.0],
    type: 'hype',
    probability: 0.06,
  },
  {
    headlines: [
      'BREAKING: Major crypto exchange halts withdrawals — panic selling',
      'Contagion fears spread as exchange insolvency rumors circulate',
    ],
    bodies: [
      'Reports of a major exchange freezing customer funds sparked widespread panic selling across all risk assets.',
      'Liquidity crises at a prominent trading venue sent shockwaves through digital asset markets.',
    ],
    categories: ['meme', 'event'],
    impact: [-1.2, -0.7],
    type: 'black_swan',
    probability: 0.025,
  },
  {
    headlines: [
      'Oil supply shock: OPEC announces surprise production cuts',
      'Geopolitical tensions spike — energy sector and commodities surge',
    ],
    bodies: [
      'OPEC+ members agreed to deeper-than-expected production cuts, sending energy prices sharply higher.',
      'Rising tensions in the Middle East pushed oil prices above $100/barrel, fueling inflation concerns.',
    ],
    categories: ['event', 'stable'],
    impact: [-0.3, 0.5],
    type: 'macro',
    probability: 0.04,
  },
  {
    headlines: [
      'BioGen Pharma drug trial shows 95% efficacy — stock halted for volatility',
      'Surprise FDA approval sends biotech sector into a frenzy',
    ],
    bodies: [
      'Phase III trial results exceeded expectations dramatically, with analysts scrambling to revise growth forecasts upward.',
      'The surprise approval of a blockbuster drug triggered halts and circuit breakers across the biotech sector.',
    ],
    categories: ['growth'],
    impact: [0.5, 1.2],
    type: 'sector',
    probability: 0.035,
  },
  {
    headlines: [
      'Flash crash wipes 8% off major indices in 12 minutes',
      'Algorithmic sell-off triggers circuit breakers across global markets',
    ],
    bodies: [
      'An unexpected cascade of algorithmic sell orders triggered a rapid market-wide crash before partial recovery.',
      'High-frequency trading algorithms appeared to amplify the initial downturn, creating extreme volatility.',
    ],
    categories: ['stable', 'growth', 'meme', 'event', 'index'],
    impact: [-0.9, -0.5],
    type: 'black_swan',
    probability: 0.015,
  },
  {
    headlines: [
      'Inflation data comes in below expectations — rate cut bets surge',
      'Soft CPI print sparks broad market rally across all sectors',
    ],
    bodies: [
      'Lower-than-expected inflation data increased the probability of rate cuts, powering equities broadly higher.',
      'Markets cheered cooler price pressures, with all major sectors posting gains on the news.',
    ],
    categories: ['stable', 'growth', 'index'],
    impact: [0.3, 0.6],
    type: 'macro',
    probability: 0.05,
  },
  {
    headlines: [
      'Meme stock collapses 70% after company announces dilutive offering',
      'Reality check: meme stocks reverse as fundamentals reassert themselves',
    ],
    bodies: [
      'The heavily-hyped meme stocks gave back all recent gains and more after corporate insiders announced massive equity sales.',
      'Retail investors were caught holding the bag as institutional money exited meme positions en masse.',
    ],
    categories: ['meme'],
    impact: [-1.5, -0.6],
    type: 'hype',
    probability: 0.04,
  },
  {
    headlines: [
      'Global recession fears mount as manufacturing data plunges',
      'Leading economic indicators signal contraction — bear market deepens',
    ],
    bodies: [
      'Multiple data points from major economies came in worse than feared, reigniting recession concerns.',
      'PMI data from G7 nations fell into contraction territory simultaneously for the first time since 2008.',
    ],
    categories: ['stable', 'growth', 'event', 'index'],
    impact: [-0.7, -0.3],
    type: 'macro',
    probability: 0.03,
  },
];

const EARNINGS_TEMPLATES: EventTemplate[] = [
  {
    headlines: ['NVDA Q3 earnings crush estimates — data center revenue up 122% YoY'],
    bodies: ['NVIDIA reported quarterly revenue far exceeding analyst expectations, driven by insatiable demand for H100 and Blackwell AI chips. The company raised full-year guidance, sending the stock surging in after-hours trading.'],
    categories: ['growth'], affectedTicker: 'NVDA',
    impact: [0.9, 2.2], type: 'earnings', probability: 0.018,
  },
  {
    headlines: ['NVDA export restrictions tighten — China sales at risk'],
    bodies: ['New U.S. export rules now cover NVIDIA\'s H20 chip, the company\'s last product available to Chinese buyers. Analysts estimate China contributed 15% of revenue, raising material downside risk to guidance.'],
    categories: ['growth'], affectedTicker: 'NVDA',
    impact: [-1.4, -0.6], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['MSFT Azure growth accelerates — AI Copilot adoption exceeds targets'],
    bodies: ['Microsoft\'s cloud division reported 35% revenue growth, beating consensus by 4 points. CEO Satya Nadella cited AI Copilot deployments at Fortune 500 companies as the primary growth driver.'],
    categories: ['growth'], affectedTicker: 'MSFT',
    impact: [0.6, 1.3], type: 'earnings', probability: 0.018,
  },
  {
    headlines: ['MSFT earnings miss — cloud growth disappoints Street'],
    bodies: ['Microsoft reported Azure growth of 26%, below the 31% consensus estimate. Management cited capacity constraints and longer enterprise sales cycles as headwinds for the current quarter.'],
    categories: ['growth'], affectedTicker: 'MSFT',
    impact: [-1.0, -0.4], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['AMZN AWS revenue surges — advertising business reaches $17B quarterly'],
    bodies: ['Amazon Web Services grew 22% to $29B, while the advertising segment hit a record quarter. Operating margins expanded significantly as the company completed its logistics cost-cutting restructuring.'],
    categories: ['growth'], affectedTicker: 'AMZN',
    impact: [0.7, 1.5], type: 'earnings', probability: 0.018,
  },
  {
    headlines: ['AMZN warns on Q4 spending — logistics and AI capex surge'],
    bodies: ['Amazon guided Q4 operating income below consensus, citing a $75B capex plan for AI infrastructure and logistics expansion. Investors question returns on the heavy spending cycle.'],
    categories: ['growth'], affectedTicker: 'AMZN',
    impact: [-0.8, -0.3], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['GME announces Bitcoin treasury strategy — stock halted limit up'],
    bodies: ['GameStop\'s board voted to convert up to $1.3B of its cash reserves into Bitcoin, following the MicroStrategy playbook. Retail investors flooded buy orders, triggering multiple trading halts.'],
    categories: ['meme'], affectedTicker: 'GME',
    impact: [1.5, 3.5], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['GME quarterly sales miss badly — store count shrinks again'],
    bodies: ['GameStop reported hardware and software sales down 28% year-over-year as consumers continue shifting to digital downloads. The company closed 120 more locations during the quarter.'],
    categories: ['meme'], affectedTicker: 'GME',
    impact: [-1.8, -0.7], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['AMC box office record — summer blockbusters revive theaters'],
    bodies: ['AMC Entertainment reported its strongest quarterly attendance since 2019, driven by multiple $1B+ blockbusters. The CEO cited renewed consumer confidence in the theatrical experience and raised guidance.'],
    categories: ['meme'], affectedTicker: 'AMC',
    impact: [1.0, 2.5], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['AMC issues massive dilutive offering — shareholders crushed'],
    bodies: ['AMC announced a 40M share offering at a steep discount to fund debt repayment, diluting existing shareholders significantly. The move was seen as necessary to avoid covenant breaches on outstanding bonds.'],
    categories: ['meme'], affectedTicker: 'AMC',
    impact: [-2.0, -0.9], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['PLTR lands $950M DoD AI contract — largest government deal in company history'],
    bodies: ['Palantir was awarded a massive multi-year Department of Defense contract to deploy its AIP platform across military logistics and battlefield analytics. The win validates its government AI thesis.'],
    categories: ['meme'], affectedTicker: 'PLTR',
    impact: [1.2, 2.8], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['XOM Permian output hits record — oil price surge boosts margins'],
    bodies: ['ExxonMobil reported record Permian Basin production following the Pioneer acquisition integration. With Brent crude above $95, the company announced a $20B buyback expansion and raised its dividend.'],
    categories: ['event'], affectedTicker: 'XOM',
    impact: [0.8, 1.8], type: 'earnings', probability: 0.018,
  },
  {
    headlines: ['XOM Q2 earnings miss — refining margins collapse on weak demand'],
    bodies: ['ExxonMobil\'s downstream refining margins fell sharply on weak global demand and higher feedstock costs, dragging overall earnings below consensus despite strong upstream production.'],
    categories: ['event'], affectedTicker: 'XOM',
    impact: [-1.0, -0.4], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['GLD surges as central banks accelerate gold purchases'],
    bodies: ['The World Gold Council reported central bank buying hit a 55-year high last quarter, led by China, India, and Poland. Real yields fell simultaneously, creating a powerful double tailwind for gold prices.'],
    categories: ['event'], affectedTicker: 'GLD',
    impact: [0.7, 1.6], type: 'earnings', probability: 0.018,
  },
  {
    headlines: ['TLT collapses as 10-year yield spikes to 5.2%'],
    bodies: ['Long-duration Treasury bonds sold off sharply after hotter-than-expected jobs data forced traders to price out expected rate cuts. TLT, highly sensitive to duration risk, fell to its lowest level since 2007.'],
    categories: ['stable'], affectedTicker: 'TLT',
    impact: [-1.6, -0.7], type: 'earnings', probability: 0.015,
  },
  {
    headlines: ['TLT rally on recession fears — flight to safety sends bonds surging'],
    bodies: ['A sharp deterioration in consumer confidence and manufacturing data sent investors rushing into long-duration Treasuries. TLT posted its biggest single-day gain in three months as yields collapsed.'],
    categories: ['stable'], affectedTicker: 'TLT',
    impact: [0.8, 1.8], type: 'earnings', probability: 0.015,
  },
];

// Merge all templates
const ALL_TEMPLATES = [...EVENT_TEMPLATES, ...EARNINGS_TEMPLATES];

export function generateNewsEvent(tick: number): NewsEvent | null {
  for (const template of ALL_TEMPLATES) {
    if (Math.random() < template.probability) {
      const headlineIdx = Math.floor(Math.random() * template.headlines.length);
      const bodyIdx     = Math.floor(Math.random() * template.bodies.length);
      const impact      = template.impact[0] + Math.random() * (template.impact[1] - template.impact[0]);

      return {
        id: `evt_${++eventIdCounter}_${tick}`,
        headline: template.headlines[headlineIdx]!,
        body:     template.bodies[bodyIdx]!,
        timestamp: tick,
        affectedCategories: template.categories,
        affectedTicker: template.affectedTicker,
        impactMultiplier: impact,
        type: template.type,
      };
    }
  }
  return null;
}

// Force-generate `count` news events (for initial news when no history exists).
// Uses a much higher sampling probability so we always get enough events quickly.
export function generateInitialNews(count: number): NewsEvent[] {
  const events: NewsEvent[] = [];
  let loops = 0;
  while (events.length < count && loops < 2000) {
    loops++;
    for (const template of ALL_TEMPLATES) {
      if (events.length >= count) break;
      if (Math.random() < 0.25) {
        const hIdx   = Math.floor(Math.random() * template.headlines.length);
        const bIdx   = Math.floor(Math.random() * template.bodies.length);
        const impact = template.impact[0] + Math.random() * (template.impact[1] - template.impact[0]);
        const tick   = events.length - count; // negative ticks = "happened before this session"
        events.push({
          id: `init_${++eventIdCounter}_${events.length}`,
          headline: template.headlines[hIdx]!,
          body:     template.bodies[bIdx]!,
          timestamp: tick,
          affectedCategories: template.categories,
          affectedTicker: template.affectedTicker,
          impactMultiplier: impact,
          type: template.type,
        });
      }
    }
  }
  // Return newest-first (matching how the live feed prepends events)
  return events.slice(0, count).reverse();
}

export function getAIAdvisorComment(
  netWorth: number,
  startingCash: number,
  marketPhase: string,
  riskScore: number,
): string {
  const pnlPct = ((netWorth - startingCash) / startingCash) * 100;

  const comments = [
    riskScore > 70 ? "Your portfolio volatility is dangerously high. Consider moving some capital to stable assets before the next black swan hits." : null,
    pnlPct > 50 ? "You're up big — classic time to lock some profits and hedge against a reversal. FOMO is a powerful thing." : null,
    pnlPct < -30 ? "Down 30%+? This is where emotions lead to revenge trading. Stick to your risk rules." : null,
    marketPhase === 'panic' ? "PANIC phase detected. This is either the best buying opportunity or a falling knife. Hedge first, ask questions later." : null,
    marketPhase === 'euphoria' ? "EUPHORIA mode: everyone's a genius in a bull market. Use stop-losses — what goes up parabolicly comes down fast." : null,
    marketPhase === 'bull' ? "Bull market in play. Momentum is your friend, but keep an eye on overexposure to meme stocks." : null,
    marketPhase === 'bear' ? "Bear market confirmed. Consider shorting or hedging growth positions. Cash is a position too." : null,
    riskScore < 20 ? "Your risk profile is very conservative. You might be leaving significant returns on the table." : null,
  ].filter(Boolean) as string[];

  const fallbacks = [
    "The market is a voting machine in the short run and a weighing machine in the long run.",
    "Diversification is the only free lunch in investing — but not here, this is a casino.",
    "The trend is your friend, until it bends.",
    "Buy the rumor, sell the news — classic play on event stocks.",
    "When everyone's greedy, be fearful. When everyone's fearful, be greedy.",
  ];

  return comments.length > 0
    ? comments[Math.floor(Math.random() * comments.length)]!
    : fallbacks[Math.floor(Math.random() * fallbacks.length)]!;
}
