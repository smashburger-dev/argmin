// Fixed lesson records captured with the existing canonical rng and shuffle.
// No browser RNG fork; regenerate and verify with the canonical source before changing seeds.
export const seedRecords = {
  "7": {
    "sequence": [
      0,
      0,
      9,
      6,
      5,
      4,
      4,
      2
    ],
    "permutation": [
      6,
      5,
      8,
      1,
      2,
      3,
      4,
      7,
      9,
      0
    ]
  },
  "8": {
    "sequence": [
      1,
      6,
      3,
      6,
      5,
      4,
      8,
      2
    ],
    "permutation": [
      6,
      9,
      0,
      8,
      7,
      3,
      4,
      2,
      5,
      1
    ]
  },
  "9": {
    "sequence": [
      1,
      8,
      1,
      8,
      7,
      6,
      2,
      9
    ],
    "permutation": [
      6,
      0,
      2,
      8,
      3,
      4,
      5,
      9,
      7,
      1
    ]
  }
};
for (const record of Object.values(seedRecords)) {
  Object.freeze(record.sequence);
  Object.freeze(record.permutation);
  Object.freeze(record);
}
Object.freeze(seedRecords);

export const bootstrapRecords = [
  {
    "seed": 3,
    "indices": [
      5,
      0,
      3,
      0,
      6,
      3,
      3,
      1
    ]
  },
  {
    "seed": 7,
    "indices": [
      0,
      0,
      7,
      5,
      4,
      3,
      3,
      1
    ]
  },
  {
    "seed": 11,
    "indices": [
      4,
      4,
      4,
      4,
      6,
      4,
      0,
      4
    ]
  }
];
for (const record of bootstrapRecords) {
  Object.freeze(record.indices);
  Object.freeze(record);
}
Object.freeze(bootstrapRecords);
