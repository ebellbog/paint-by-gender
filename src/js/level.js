class PbgLevel {
    // Required config

    challenges = [];
    levelName = '';

    // State

    challengeIdx = 0;

    constructor(levelName, challenges) {
        this.levelName = levelName;
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