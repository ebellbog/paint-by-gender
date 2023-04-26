const COLORS = {
    innerReticle: [153, 153, 153],
    outerReticle: [221, 221, 221],
    white: [255, 255, 255],
    purple: [128, 0, 128],
    pink: [255, 150, 150],
    darkpink: [198, 83, 83],
    blue: [132, 189, 250],
    darkblue: [31, 100, 173],
    pinkblue: [132, 150, 150],
    outline: [68, 68, 68],
};

const BRUSH_TYPES = [
    { sides: 0, sizes: [8, 25, 50], color: COLORS.darkpink },
    { sides: 4, sizes: [27, 54, 108], color: COLORS.darkblue, isQuantized: true },
    { sides: 5, sizes: [10, 28, 57], color: COLORS.purple, starred: 1 }
];

const GAME_MODE = {
    newLevel: 'new-level',
    ready: 'ready',
    starting: 'starting',
    playing: 'playing',
    nextChallenge: 'next-challenge',
    nextLevel: 'next-level',
    complete: 'complete',
    failed: 'failed',
    paused: 'paused',
};

const GAME_OUTCOME = {
    passed: 'passed',
    transgressed: 'transgressed',
    clocked: 'clocked',
};

const OUTCOME_MODIFIER = {
    default: 'default',
    fast: 'fast',
    slow: 'slow',
    neat: 'neat',
    messy: 'messy',
    incomplete: 'incomplete',
    firstTry: 'firstTry',
    nthTry: 'nthTry',
};
export {
    COLORS,
    BRUSH_TYPES,
    GAME_MODE,
    GAME_OUTCOME,
    OUTCOME_MODIFIER,
};