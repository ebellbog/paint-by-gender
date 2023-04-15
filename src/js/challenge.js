import tippy from 'tippy.js';

class PbgChallenge {
    // Required config

    shape = null;
    maxSpill = 0;
    enabledTools = [];
    timeLimit = 0;

    // Optional config

    tooltips = {};
    spillColor = null;
    maxUndos = 3;
    winPercent = 0;
    emojis = [];

    // State

    completionTime = 0;
    attempts = 0;
    undosRemaining = 3;
    tippyInstances = [];

    constructor(options) {
        ['shape', 'enabledTools', 'timeLimit', 'spillColor', 'maxSpill', 'winPercent', 'tooltips', 'emojis']
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

        this.destroyTooltips();
    }

    retry() {
        this.attempts++;

        this.undosRemaining = this.maxUndos;
        this.updateUndoStatus();

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

    setTooltips() {
        if (!this.tooltips) return;

        Object.entries(this.tooltips).map(([ttId, ttContent], idx) => {
            let formattedContent =
                `<div class="tt-title
                ${idx === 0 ? ' text-pink' : ''}
                ${idx === 1 ? ' text-blue' : ''}
                ${this.enabledTools[idx] === 0 ? ' disabled' : ''}">
                ${ttContent[0]}
                </div>`;
            if (ttContent[1]) formattedContent += `<hr><div class="tt-body">${ttContent[1]}</div>`;
            $(`#${ttId}`).attr('data-tippy-content', formattedContent);
        });

        this.tippyInstances = tippy('.tool[data-tippy-content]', {
            allowHTML: true,
            delay: [400, null],
            offset: [0, 15],
            placement: 'left',
            theme: 'white'
        });
    }

    hideTooltips() {
        this.tippyInstances.forEach((ti) => ti.hide());
    }

    destroyTooltips() {
        this.tippyInstances.forEach((ti) => ti.destroy());
        this.tippyInstances = [];
    }
}

export default PbgChallenge;