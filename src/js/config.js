import PbgLevel from './level';
import PbgChallenge from './challenge';
import {SHAPES} from './shape';

const level1 = new PbgLevel(
    "How We're Shaped",
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