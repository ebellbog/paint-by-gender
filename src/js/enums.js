const BRUSH_TYPES = [
    { sides: 0, sizes: [8, 25, 50] },
    { sides: 4, sizes: [27, 54, 108], isQuantized: true },
    { sides: 5, sizes: [10, 28, 57], starred: 1 }
];

const COLORS = {
    innerReticle: [153, 153, 153],
    outerReticle: [221, 221, 221],
    enabledOption: [255, 255, 255],
    disabledOption: [110, 110, 110],
    white: [255, 255, 255],
    purple: [128, 0, 128],
    pink: [255, 150, 150],
    darkpink: [198, 83, 83],
    blue: [132, 189, 250],
    darkblue: [31, 100, 173],
    pinkblue: [132, 150, 150]
};

const CHALLENGE_DATA = {
    1: {
        canvasColor: COLORS.pink,
        paintColor: COLORS.darkpink,
        shapeColor: COLORS.white,
        maxTime: 25,
        enabledTools: [1, 0, 0],
    },
    2: {
        canvasColor: COLORS.pink,
        paintColor: COLORS.blue,
        shapeColor: COLORS.white,
        spillColor: COLORS.pinkBlue,
        maxTime: 45,
        enabledTools: [0, 1, 0],
    },
    3: {
        canvasColor: COLORS.blue,
        paintColor: COLORS.darkblue,
        shapeColor: COLORS.white,
        maxTime: 30,
        enabledTools: [0, 1, 0],
    }
};

const LEVEL_DATA = {
    1: {
        name: 'The Cistem',
        description: 'Round pegs in round holes. Everything in its place. The Cistem was built for you!',
        tooltips: [
            [],
            [
                "Why? Your brush is perfect the way it is!",
                "Why? Your brush is perfect the way it is!",
                "What?? This isn't even a real thing..."
            ],
            [
                '',
                'Too expensive!',
                "Too risky! You're not ready yet."
            ],
        ],
        endMessages: {
            0: ["Congrats!", "You played the game. You painted inside the lines and feel strangely validated."],
            1: ["Oops.", "You transgressed too far. People noticed, and they care way more than they should."],
            2: ["You got clocked", "Time's up. Not everyone gets a chance to fulfill their purpose."]
        },
        challenges: [1, 3]
    },
    2: {
        name: 'Cistem Error',
        // enabledTools: [1, 0, 0]
    },
    3: {
        name: 'Red Pill',
        // enabledTools: [1, 0, 1]
    },
    4: {
        name: 'Antisocial Media',
        // enabledTools: [1, 0, 1]
    },
    5: {
        name: 'Darker Times',
        // enabledTools: [1, 0, 1]
    },
    6: {
        name: 'Trans-cendence',
        // enabledTools: [1, 1, 1]
    }
};

const GAME_MODE = {
    newLevel: 'new-level',
    ready: 'ready',
    starting: 'starting',
    playing: 'playing',
    transitioning: 'transitioning',
    complete: 'complete',
    paused: 'paused',
};

const GAME_OUTCOME = {
    passed: 0,
    transgressed: 1,
    clocked: 2
};

export {
    BRUSH_TYPES,
    COLORS,
    CHALLENGE_DATA,
    GAME_MODE,
    GAME_OUTCOME,
    LEVEL_DATA
};