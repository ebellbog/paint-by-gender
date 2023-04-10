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

const ALL_LEVELS = [level1];
export default ALL_LEVELS;