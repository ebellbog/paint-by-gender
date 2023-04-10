import PbgLevel from './level';
import PbgChallenge from './challenge';
import {SHAPES} from './shape';

const level1 = new PbgLevel(
    {
        levelName: "How We're Shaped",
        levelDescription: 'Square pegs in square holes. Everything in its place. Your life is shaping up just fine!',
        endMessages: {
            0: ["Congrats!", "You played the game. You painted inside the lines and feel strangely validated."],
            1: ["Oops.", "You transgressed too far. People noticed, and they care way more than they should."],
            2: ["You got clocked", "Time's up. Not everyone gets a chance to fulfill their purpose."]
        }
    },
    [
        new PbgChallenge({
            shape: SHAPES.curvyToy,
            timeLimit: 25,
            maxSpill: 7000,
            enabledTools: [1, 0, 0],
        }),
        new PbgChallenge({
            shape: SHAPES.qrCode,
            timeLimit: 30,
            maxSpill: 9000,
            enabledTools: [0, 1, 0],
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


const ALL_LEVELS = [level1];
export default ALL_LEVELS;