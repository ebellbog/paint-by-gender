class PbgLevel {
    // Required config

    challenges = [];

    levelName = '';
    levelDescription = '';

    affirmations = [];
    endMessages = {};

    // State

    challengeIdx = 0;

    constructor(cfg, challenges) {
        this.levelName = cfg.levelName;
        this.levelDescription = cfg.levelDescription;

        this.affirmations = cfg.affirmations;
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

    get randomAffirmation() {
        return this.affirmations[Math.floor(Math.random() * this.affirmations.length)];
    }
}

export default PbgLevel;