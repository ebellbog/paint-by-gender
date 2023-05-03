class PbgLevel {
    // Required config

    challenges = [];

    levelName = '';
    levelDescription = '';

    affirmations = {};
    endMessages = {};

    // Optional config

    lockedTools = [];
    emojis = [];
    winPercent = 1;

    // State

    challengeIdx = 0;

    constructor(cfg, challenges) {
        this.levelName = cfg.levelName;
        this.levelDescription = cfg.levelDescription;

        this.affirmations = cfg.affirmations;
        this.endMessages = cfg.endMessages;

        this.emojis = cfg.emojis;

        this.winPercent = cfg.winPercent || this.winPercent;
        this.lockedTools = cfg.lockedTools || this.lockedTools;

        challenges.forEach((challenge) => {
            challenge.lockedTools = this.lockedTools;
            this.challenges.push(challenge);
        });
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