/**
 * Debug seeding pairs
 */

function generateSeedingPairs(bracketSize: number): number[][] {
  const rounds = Math.log2(bracketSize);

  // Start with [1, 2]
  let pairs: number[][] = [[1, 2]];

  // Build pairs recursively by "folding" in new opponents
  for (let round = 1; round < rounds; round++) {
    const nextPairs: number[][] = [];
    const numSeeds = Math.pow(2, round + 1);

    // For each existing pair, create two new pairs
    // by inserting the "complement" seeds
    for (const [high, low] of pairs) {
      // First pair: keep high seed, add complement of high
      nextPairs.push([high, numSeeds + 1 - high]);
      // Second pair: add complement of low, keep low seed
      nextPairs.push([numSeeds + 1 - low, low]);
    }

    pairs = nextPairs;
  }

  return pairs;
}

console.log('8-player pairs:', JSON.stringify(generateSeedingPairs(8)));
console.log('Expected:      [[1,8],[4,5],[2,7],[3,6]]');
