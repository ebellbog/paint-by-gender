import PbgLevel from './level';
import PbgChallenge from './challenge';
import {SHAPES} from './shape';

const level1 = new PbgLevel(
    {
        levelName: "How We're Shaped",
        levelDescription: 'Square pegs in square holes. Everything in its place. Your life is shaping up just fine!',
        affirmations: ['Nice job!', 'Awesome!', '100%', 'Nailed it!'],
        endMessages: {
            0: ["Congrats!", "You know this game like you've been playing it every day. Keep on keeping on!"],
            1: ["Oops.", "That was a bit embarrassing, but everyone has their off days. No use crying over spilled paint!"],
            2: ["Time's up", "People like to say that a lot these days. But sadly, your timer did actually run out."]
        }
    },
    [
        new PbgChallenge({
            shape: SHAPES.curvyToy,
            timeLimit: 25,
            maxSpill: 7000,
            enabledTools: [1, 0, 0],
            emojis: ['💃','💋','💘', '⌛'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement and endless sizes. Great for natural curves like these!'],
                guybrush: ['Guybrush', 'A solid brush with precise, tactical movement. You wouldn\'t have much use for it here.'],
                'mystery-tool': ['???', ''],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.briefcase,
            timeLimit: 30,
            maxSpill: 4300,
            enabledTools: [0, 1, 0],
            emojis:['💼', '👨🏻‍💼', '🧔🏻‍♂️', '📈'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement and endless sizes. You wouldn\'t have much use for it here.'],
                guybrush: ['Guybrush', 'A solid brush with precise, tactical movement. Great for geometric shapes like these!'],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.boob,
            timeLimit: 50,
            maxSpill: 7000,
            enabledTools: [1, 0, 0],
            emojis:['👙', '👶', '🍼'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement and endless sizes. Great for natural curves like these!'],
                guybrush: ['Guybrush', 'A solid brush with precise, tactical movement. You wouldn\'t have much use for it here.'],
                'mystery-tool': ['???', ''],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.silhouette,
            timeLimit: 30,
            maxSpill: 2950,
            enabledTools: [0, 1, 0],
            emojis:['🏋️‍♂️','👖', '🍆'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement and endless sizes. You wouldn\'t have much use for it here.'],
                guybrush: ['Guybrush', 'A solid brush with precise, tactical movement. Great for geometric shapes like these!'],
            }
        }),
    ]
);

const level2 = new PbgLevel(
    {
        levelName: "Squaring Circles",
        levelDescription: "So maybe you're shaped a little different. It's ok, just head back to Level 1! Then again... Here you are anyway.",
        affirmations: ['Close enough!', 'Half-decent!', 'Interesting!', 'Ok then!'],
        endMessages: {
            0: ["Congrats!", "You played the game. You painted inside the lines and feel strangely validated."],
            1: ["Oops.", "You transgressed too far. People noticed, and they care a surprising amount."],
            2: ["You got clocked", "Time's up. Not everyone gets a chance to fulfill their purpose."]
        },
        winPercent: .995,
    },
    [
        new PbgChallenge({
            shape: SHAPES.curvyToy,
            timeLimit: 60,
            maxSpill: 15000,
            enabledTools: [0, 1, 0],
            emojis: ['🤷‍♀️', '🤷‍♂️', '🤔'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement. Normally, people would use it for this kind of shape.'],
                guybrush: ['Guybrush', 'A solid brush with precise movement. Good luck using it on these curves!'],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.briefcase,
            timeLimit: 30,
            maxSpill: 4300,
            enabledTools: [1, 0, 0],
            emojis: ['🤓', '👎', '🤖'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement. I guess you could try squeezing it into this shape?'],
                guybrush: ['Guybrush', "A solid brush with precise movement. The clear choice here - but I guess that's not your way."],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.boob,
            timeLimit: 50,
            maxSpill: 16000,
            enabledTools: [0, 1, 0],
            emojis: ['🤡', '🤣'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement. Normally, people would use it for this kind of shape.'],
                guybrush: ['Guybrush', 'A solid brush with precise movement. Good luck using it on these curves!'],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.silhouette,
            timeLimit: 70,
            maxSpill: 7500,
            enabledTools: [1, 0, 0],
            emojis: ['👽', '👻'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement. I guess you could try squeezing it into this shape?'],
                guybrush: ['Guybrush', "A solid brush with precise movement. The clear choice here - but I guess that's not your way."],
            }
        }),
    ]
);

/**
 * OLD DESIGN NOTES
 * 
 * Level 2
 * Name: 'Out of Shape' // ish? maybe??
 * EnabledTools: [1, 0, 0]
 * 
 * Level 3
 * Name: 'Red Pill' // probs not...
 * EnabledTools: [1, 0, 1]
 * 
 * Level 4
 * Name: 'Antisocial Media' // I like this one. is it original tho?
 * EnabledTools: [1, 0, 1]
 * 
 * Level 5
 * Name: 'Darker Times'
 * EnabledTools: [1, 0, 1]
 * 
 * Level 6:
 * Name: 'Trans-cendence'
 * EnabledTools: [1, 1, 1]
 */


const ALL_LEVELS = [level1, level2];
export default ALL_LEVELS;