class PbgChallenge {
    // Required config

    shape = null;
    maxSpill = 0;
    enabledTools = [];
    timeLimit = 0;

    // Optional config

    spillColor = null;
    maxUndos = 3;

    // State

    completionTime = 0;
    attempts = 0;
    undosRemaining = 3;

    constructor(options) {
        ['shape', 'enabledTools', 'timeLimit', 'spillColor', 'maxSpill']
            .forEach((key) => this[key] = options[key]);
    }

    draw() {
        this.shape.draw();
    }

    reset() {
        this.undosRemaining = this.maxUndos;
        this.completionTime = 0;
        this.attempts = 0;
    }

    retry() {
        this.undosRemaining = this.maxUndos;
        this.attempts++;
        this.draw();
    }
}

export default PbgChallenge;