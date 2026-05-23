// Central scoring and decision thresholds.

export const signalWeights = {
  highRequestRate: 35,
  sequentialUrlPattern: 25,
  suspiciousUserAgent: 20,
  missingJsBeacon: 15,
  missingInteraction: 10,
  machineRegularTiming: 20,
  knownSearchCrawler: -50
};

export const scoreTiers = {
  allowMax: 29,
  challengeMax: 69,
  blockMin: 70
};
