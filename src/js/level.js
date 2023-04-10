class PbgLevel {
    // Required config

    challenges = [];

    levelName = '';
    levelDescription = '';
    endMessages = {};

    // State

    challengeIdx = 0;

    constructor(cfg, challenges) {
        this.levelName = cfg.levelName;
        this.levelDescription = cfg.levelDescription;
        this.endMessages = cfg.endMessages;

        this.challenges.push(...challenges);
    }

    reset() {
        this.challengeIdx = 0;
        this.challenges.forEach((challenge) => challenge.reset());
    }

    get currentChallenge() {
        return this.challenges[this.challengeIdx];
    }
}

export default PbgLevel;