/** Inline text bodies for seeded written assets, transcripts, minutes and captions. */

const BOILERPLATE =
  '## About Atlas Meridian\nAtlas Meridian is a global engineering, construction and operations company. Around 50,000 people across North America, Europe, the Middle East and Asia-Pacific design, build and run energy, water, transport and digital infrastructure.';

export const pressRelease = (dateline: string, headline: string, body: string, contact = 'press@atlasmeridian.com') =>
  `# ${headline}\n\n**${dateline}.** ${body}\n\n${BOILERPLATE}\n\n*Media contact: ${contact}*\n`;

export const vtt = (cues: string[]) =>
  `WEBVTT\n\n${cues
    .map((cue, i) => {
      const start = i * 4;
      const fmt = (s: number) => `00:00:${String(s).padStart(2, '0')}.000`;
      return `${i + 1}\n${fmt(start)} --> ${fmt(start + 4)}\n${cue}`;
    })
    .join('\n\n')}\n`;

export const transcript = (title: string, turns: [string, string][]) =>
  `# Transcript: ${title}\n\n${turns.map(([who, said]) => `**${who}:** ${said}`).join('\n\n')}\n`;

export const minutes = (title: string, decisions: string[], actions: string[]) =>
  `# Minutes: ${title}\n\n## Decisions\n${decisions.map((d) => `- ${d}`).join('\n')}\n\n## Actions\n${actions
    .map((a) => `- ${a}`)
    .join('\n')}\n`;

export const html = (body: string) => `<!doctype html><html><body style="font-family:system-ui,sans-serif;line-height:1.5;max-width:640px;margin:24px auto;padding:0 16px">${body}</body></html>`;

export const TEXT = {
  norlandDay100: `# Norland Infrastructure integration: Day 100 report

## Summary
Integration is on track. 1,840 Norland colleagues now use Atlas Meridian identity and email. Brand transition of site hoardings is 62% complete.

## Brand and communications
- 2,300 legacy Norland assets catalogued in Google Drive; 410 linked into GrowthGateway.
- Co-brand lockup approved for transitional use until March 2027.

## Risks
- Duplicate photography libraries across Box and Google Drive.
- Local approval workarounds in Stockholm and Oslo offices.
`,
  careersPage: html(
    '<h1>Build what matters</h1><p>Join 50,000 engineers, builders and operators delivering energy, water and transport infrastructure across four continents.</p><h2>Early careers</h2><p>Apprenticeships and graduate programmes in 14 countries.</p><p><a href="https://www.atlasmeridian.com/careers/search">Search open roles</a></p>',
  ),
  offshoreWindFr: html(
    "<h1>Éolien en mer</h1><p>De l'étude de site à l'exploitation, Atlas Meridian accompagne les développeurs éoliens sur tout le cycle de vie des parcs offshore en Europe.</p><p>Plus de 4 GW de capacité livrée en mer du Nord et en Manche.</p>",
  ),
  waterHub: html(
    '<h1>Water infrastructure</h1><p>We help utilities secure supply, cut leakage and adapt to drought, from treatment plants to smart networks.</p><ul><li>Desalination and reuse</li><li>Flood defence</li><li>Network digital twins</li></ul>',
  ),
  dataCentreApac: html(
    '<h1>Data centre delivery across Asia-Pacific</h1><p>Hyperscale campuses designed, built and commissioned in Sydney, Singapore and Tokyo.</p><p><a href="{{CTA_LINK}}">Talk to our team</a></p>',
  ),
  dubaiMetro: html(
    '<h1>Extending the Dubai Metro</h1><p>Our tunnelling teams completed 15 km of twin-bore tunnels for the Route 2030 extension, ahead of schedule and with zero lost-time injuries.</p>',
  ),
  halcyonWelcome: `# Welcome, Halcyon Engineering

Halcyon Engineering joined Atlas Meridian in 2022. Halcyon's healthcare and campus buildings expertise now sits within our Buildings & Places business.

Legacy Halcyon brand assets remain in Brandfolder until migration completes.
`,
  ceoResults: html(
    '<h1>Our FY2025 results: thank you</h1><p>Dear colleagues, revenue grew 9% and our safety record was the best in our history. Thank you for building what matters.</p><p>Join the global town hall on 17 September to hear more.</p>',
  ),
  clientNewsletter: html(
    '<h1>Net Zero Pathways: October</h1><p>How utilities are de-risking hydrogen hubs, and what the latest US tax-credit guidance means for project finance.</p><p>Read the full briefing on our website.</p>',
  ),
  investorUpdate: html(
    '<h1>Halcyon integration: six-month update</h1><p>Cost synergies of $42m have been realised against a target of $60m. Healthcare backlog is up 18%.</p><p><small><a href="{{unsubscribe_url}}">Unsubscribe</a></small></p>',
  ),
  safetyFr: html(
    '<h1>Semaine Safety First</h1><p>Du 6 au 10 octobre, chaque site organise des ateliers sur le travail en hauteur et la prévention des chutes.</p>',
  ),
  ramadanAr: `# ساعات العمل خلال شهر رمضان

يسرّنا إبلاغكم بأن ساعات العمل في مكاتب الشرق الأوسط ستكون من الساعة 9 صباحًا حتى 3 مساءً طوال شهر رمضان المبارك.

رمضان كريم.
`,
  osakaInviteJa: html(
    '<h1>大阪湾防潮堤プロジェクト 記者説明会のご案内</h1><p>10月28日（水）午前10時より、大阪市内にて記者説明会を開催いたします。</p><p><small><a href="{{unsubscribe_url}}">配信停止</a></small></p>',
  ),
  travelPolicy: `# Travel policy update: Q4 2026

From 1 October, rail is the default for journeys under four hours in Europe and Japan. Business-class air travel now needs director approval.
`,
  leadershipOffsite: `# Leadership offsite: agenda (restricted)

1. Capital allocation for FY2027
2. Portfolio review: hydrogen and data centres
3. Succession planning
`,
  damFreeze: `# Brand migration: legacy DAMs move to read-only

From 1 December 2026, Brandfolder (Halcyon) and the Norland Google shared drives become read-only. Register new assets in GrowthGateway. Linked assets stay available while the migration team moves them.
`,
  singaporeMove: `# APAC office relocation: Singapore

Our Singapore team moves to Marina One on 2 November. Visitor access details will follow.
`,
  meaApprovals: `# MEA approvals workflow change

From 15 October, all MEA Comms assets are approved in GrowthGateway instead of by email. Regional approvers: Omar Haddad, Fatima Al-Sayed.
`,
  gulfHydrogen: pressRelease(
    'HOUSTON, 4 May 2026',
    'Atlas Meridian selected to deliver Gulf Coast hydrogen hub',
    'Atlas Meridian has been selected as engineering, procurement and construction partner for a 1 GW green hydrogen hub on the Texas Gulf Coast. Construction starts in Q3 2026 and will create 1,200 jobs.',
  ),
  norlandAcquisition: pressRelease(
    'LONDON, 15 January 2024',
    'Atlas Meridian completes acquisition of Norland Infrastructure',
    'Atlas Meridian today completed its acquisition of Norland Infrastructure, adding 1,800 people and a strong Nordic rail and energy portfolio.',
  ),
  riyadhWater: pressRelease(
    'RIYADH, 21 October 2026',
    'Riyadh water reuse plant reaches commissioning',
    'The 200,000 m³/day water reuse plant delivered by Atlas Meridian has entered commissioning, supplying treated water for irrigation and industry.',
  ),
  tradingUpdate: pressRelease(
    'LONDON, 24 October 2026',
    'Q3 2026 trading update',
    'Year-to-date revenue is ahead of the prior year. Full-year guidance is unchanged. (Market-sensitive: do not share before release.)',
    'investors@atlasmeridian.com',
  ),
  lyonRail: pressRelease(
    'LYON, 15 septembre 2026',
    'Atlas Meridian remporte un contrat ferroviaire majeur à Lyon',
    "Atlas Meridian assurera l'ingénierie de la modernisation de 40 km de voies sur la ligne Lyon–Turin.",
    'presse@atlasmeridian.com',
  ),
  tokyoWindJa: pressRelease(
    '東京、2026年8月20日',
    '東京湾洋上風力発電パートナーシップを締結',
    'Atlas Meridianは、東京湾における洋上風力発電プロジェクトの設計・建設パートナーとして選定されました。',
  ),
  hydrogenFactSheet: `# Gulf Coast Hydrogen Hub: fact sheet

- Capacity: 1 GW electrolysis
- Jobs: 1,200 during construction, 180 permanent
- First hydrogen: 2029
- Partners: Gulf Coast Energy Partners, Atlas Meridian (EPC)
`,
};

export const CAPTIONS = {
  brandFilm: vtt(['Every day, 50,000 of us build what matters.', 'Clean energy. Safe water. Better journeys.', 'Atlas Meridian. Build what matters.']),
  dubaiTimelapseAr: vtt(['آلة حفر الأنفاق تبدأ العمل', 'خمسة عشر كيلومترًا من الأنفاق', 'مترو دبي: الطريق 2030']),
  workingAtHeight: vtt(['Before you climb, check your harness.', 'Three points of contact, every time.', 'If in doubt, stop the job.']),
  osakaFlyoverJa: vtt(['大阪湾防潮堤の全景', '全長8キロメートル', '2027年完成予定']),
};

export const TRANSCRIPTS = {
  resultsLondon: transcript('FY2025 results press conference', [
    ['CEO', 'FY2025 was a record year for safety and a strong year for growth. Revenue rose 9%.'],
    ['Reuters', 'How exposed is the backlog to US policy changes?'],
    ['CFO', 'Less than 12% of backlog depends on federal incentives, and most of that is contracted.'],
  ]),
  gulfHydrogen: transcript('Gulf Coast hydrogen hub announcement', [
    ['Daniel Okafor', 'This hub will produce hydrogen at scale for refineries and heavy transport on the Gulf Coast.'],
    ['Houston Chronicle', 'When does construction start?'],
    ['Daniel Okafor', 'Site works begin in the third quarter.'],
  ]),
  tokyoSigningJa: transcript('東京湾洋上風力 調印式', [
    ['田中', '本日、東京湾洋上風力プロジェクトのパートナーシップを締結しました。'],
    ['記者', '運転開始はいつ頃ですか。'],
    ['田中', '2030年の運転開始を目指しています。'],
  ]),
  lyonFr: transcript('Point presse – contrat ferroviaire de Lyon', [
    ['Sophie Laurent', 'Ce contrat confirme notre position dans le ferroviaire en France.'],
    ['Le Progrès', 'Combien d’emplois locaux ?'],
    ['Sophie Laurent', 'Environ 250 ingénieurs et techniciens à Lyon.'],
  ]),
  ceoFt: transcript('CEO interview – Financial Times', [
    ['FT', 'You have made a dozen acquisitions. How do you keep one culture?'],
    ['CEO', 'Shared standards for safety and quality first, then shared systems: identity, finance and now our digital asset platform.'],
  ]),
  hydrogenPodcast: transcript('The Energy Transition Podcast – hydrogen', [
    ['Sam Patel', 'Is green hydrogen finally bankable?'],
    ['Daniel Okafor', 'For industrial clusters with long-term offtake, yes. The Gulf Coast hub proves it.'],
  ]),
  gulfNews: transcript('Gulf News – MEA growth strategy', [
    ['Rania Aziz', 'Where is the growth in the region?'],
    ['Omar Haddad', 'Water security and urban rail. We doubled our Saudi workforce this year.'],
  ]),
  nikkei: transcript('Nikkei Asia – APAC data centre demand', [
    ['Nikkei Asia', 'Is power the constraint for new data centres in Japan?'],
    ['Chen Wei', 'Grid connection is now the critical path. We design campuses around on-site generation.'],
  ]),
};

export const MINUTES = {
  townHall: minutes(
    'Comms & Growth global town hall, September 2026',
    ['GrowthGateway becomes the single entry point for all Comms & Growth assets.', 'Regional approval workflows move into GrowthGateway by year end.'],
    ['Regional leads to nominate migration champions (all regions).', 'Brand team to publish taxonomy v1 (Amelia Hart).'],
  ),
  steeringCommittee: minutes(
    'DAM consolidation steering committee #4',
    ['Brandfolder (Halcyon) contract ends March 2027; migrate by February.', 'Norland Google Drive becomes read-only on 1 December.'],
    ['Confirm Box EMEA licence reduction (Sophie Laurent).', 'Pilot Glean assistant with MEA team (Omar Haddad).'],
  ),
  apacPlanning: minutes(
    'APAC content planning, Q4',
    ['Focus Q4 on offshore wind and data centres.', 'Japanese-language assets to be authored natively, not translated.'],
    ['Draft Tokyo Bay case study (Yuki Tanaka).'],
  ),
  meaMediaBriefing: minutes(
    'MEA media relations briefing',
    ['Riyadh media day confirmed for 21 October.', 'Arabic and English press kits required.'],
    ['Book interpreters (Fatima Al-Sayed).', 'Finalise spokesperson briefing (Omar Haddad).'],
  ),
};
