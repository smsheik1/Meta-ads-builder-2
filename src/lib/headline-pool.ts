export type Headline = { text: string; framework: string };

export const SEEDED_DENTAL_HOOKS: Headline[] = [
  { text: '3 missed calls a day = $147k gone.', framework: 'Math Bomb' },
  { text: "You don't need more leads. You need answered calls.", framework: 'Belief-Break' },
  { text: 'Your front desk is quietly draining revenue.', framework: 'Calling-Out' },
  { text: 'Every voicemail is a patient choosing someone else.', framework: 'Status-Quo Cost' },
  { text: 'Hiring another receptionist will not fix after-hours calls.', framework: 'Belief-Break' },
  { text: 'The practice across town just answers faster.', framework: 'Comparison-Shame' },
  { text: 'Your marketing works. Your phone coverage does not.', framework: 'Calling-Out' },
  { text: 'Missed calls are not admin issues. They are lost cases.', framework: 'Identity Reframe' },
  { text: 'One lunch break can cost a $3,200 case.', framework: 'Specific-Day Pain' },
  { text: 'Stop paying for leads your front desk misses.', framework: 'Reverse-Promise' },
  { text: 'Smart dentists stopped letting calls hit voicemail.', framework: 'Identity Reframe' },
  { text: 'The leak is not ads. It is unanswered intent.', framework: 'Whisper-Doubt' },
];

export function getSeededHooks(niche: string) {
  if (niche === 'dental') return SEEDED_DENTAL_HOOKS;
  return SEEDED_DENTAL_HOOKS;
}

export function getRandomSeededHook(niche = 'dental') {
  const hooks = getSeededHooks(niche);
  return hooks[Math.floor(Math.random() * hooks.length)]?.text || SEEDED_DENTAL_HOOKS[0].text;
}
