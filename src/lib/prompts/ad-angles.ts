import type { BrandBrain } from './brand-brain';

export const normalizeAdAngles = (brandBrain: BrandBrain) => {
  const baseAngles = Array.isArray(brandBrain.adAngles) ? brandBrain.adAngles : [];
  const fallbackAngles = [
    `the painful cost of ${brandBrain.pain}`,
    `why ${brandBrain.audience} should stop accepting the old way`,
    `how ${brandBrain.offer} creates ${brandBrain.promisedResult}`,
    `the competitor advantage hidden in ${brandBrain.differentiator}`,
    `the moment ${brandBrain.audience} realizes the current process is broken`,
    `the fastest path from ${brandBrain.pain} to ${brandBrain.promisedResult}`,
    `the simple alternative to the tools they already tried`,
    `why waiting makes ${brandBrain.pain} more expensive`,
  ];

  return [...baseAngles, ...fallbackAngles]
    .map((angle) => angle.trim())
    .filter(Boolean)
    .filter((angle, index, angles) => angles.findIndex((candidate) => candidate.toLowerCase() === angle.toLowerCase()) === index)
    .slice(0, 8);
};
