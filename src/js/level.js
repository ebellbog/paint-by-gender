class PbgLevel {
    // Required config

    challenges = [];

    levelName = '';
    levelDescription = '';

    affirmations = {};
    endMessages = {};

    // Optional config

    winPercent = 1;
    emojis = [];

    // State

    challengeIdx = 0;

    constructor(cfg, challenges) {
        this.levelName = cfg.levelName;
        this.levelDescription = cfg.levelDescription;

        this.affirmations = cfg.affirmations;
        this.endMessages = cfg.endMessages;

        this.emojis = cfg.emojis;

        if (cfg.winPercent) this.winPercent = cfg.winPercent;

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