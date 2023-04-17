import PbgLevel from './level';
import PbgChallenge from './challenge';
import {SHAPES} from './shape';

const level1 = new PbgLevel(
    {
        levelName: "How We're Shaped",
        levelDescription: 'Square pegs in square holes. Everything in its place. Your life is shaping up just fine!',
        affirmations: ['Nice job!', 'Awesome!', 'A+!', 'Nailed it!'],
        endMessages: {
            0: ["Congrats!", "You perfected this game like you've been playing it every day. Never change!"],
            1: ["Oops.", "That was a bit embarrassing, but no use crying over spilled paint! In a pinch, just click undo (<i class='fa-solid fa-rotate-left'></i>)."],
            2: ["Time's up", "Brushes down, the test is over. You'll ace it next time! Did you know you can pause<br>(<i class='fa fa-pause'></i>) if you need a break?"],
        },
        winPercent: .997,
    },
    [
        new PbgChallenge({
            shape: SHAPES.curvyToy,
            timeLimit: 25,
            maxSpill: 3800,
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
            maxSpill: 6700,
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
            timeLimit: 25,
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
            0: ["Thanks for playing!", "You made it work somehow. You painted inside the lines and feel strangely validated."],
            1: ["Oops.", "You transgressed too far. People noticed, and they care a surprising amount."],
            2: ["You got clocked", "Time seems to pass faster for some of us. Not everyone gets a chance to fulfill their purpose."]
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
                guybrush: ['Guybrush', 'A solid brush with rigid movement. Good luck smoothing out these curves!'],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.briefcase,
            timeLimit: 70,
            maxSpill: 8500,
            enabledTools: [1, 0, 0],
            emojis: ['🤓', '👎', '🤖'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with gentle movement. This precision work might be a bit demanding for it...'],
                guybrush: ['Guybrush', "A solid brush with consistent, tactical movement. The obvious choice here - but I guess that's not your way."],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.boob,
            timeLimit: 85,
            maxSpill: 18000,
            winPercent: .97,
            enabledTools: [0, 1, 0],
            emojis: ['🤡', '🤣'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with smooth movement. Generally the only brush used for shapes like this.'],
                guybrush: ['Guybrush', 'A solid brush with chunky movement. Trying it on curves like these is getting a bit ridiculous.'],
            }
        }),
        new PbgChallenge({
            shape: SHAPES.silhouette,
            timeLimit: 55,
            maxSpill: 7000,
            enabledTools: [1, 0, 0],
            emojis: ['👽', '👻'],
            tooltips: {
                galbrush: ['Galbrush', 'A soft brush with squishy movement. I guess you could try squeezing it into this shape?'],
                guybrush: ['Guybrush', "A solid brush with clean, confident movement. The clear choice, blah, blah, blah. You already know that by now."],
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