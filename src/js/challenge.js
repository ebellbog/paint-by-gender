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
        this.updateUndoStatus();

        this.completionTime = 0;
        this.attempts = 0;
    }

    retry() {
        this.undosRemaining = this.maxUndos;
        this.attempts++;
        this.draw();
    }

    undo() {
        this.undosRemaining--;
        this.updateUndoStatus();
    }

    updateUndoStatus() {
        $('#btn-undo').toggleClass('disabled', this.undosRemaining < 1);

        const $undoStatus = $('#undo-status');
        $undoStatus.empty();

        for (let i = 0; i < this.maxUndos; i++) {
            $undoStatus.append(
                $('<div></div>').addClass(`status-icon status-${i < this.undosRemaining ? 'filled' : 'empty'}`)
            );
        }
    }
}

export default PbgChallenge;