class MidiBackendProxy {
    _parameterListeners = [];
    _musicListeners = [];
    _playbackListeners = [];
    _tempo = 0.5;
    _loudness = 0.5;
    _impact = 0.5;
    _composition = undefined;
    _playing = false;

    _midiInputName = "LeapControl";
    _midiInput = false;
    _midiOutputName = "LeapControl";
    _midiOutput = false;

    _maxScaleFactor = 2.0;

    constructor(options) {
        if (typeof options !== 'undefined') {
            if (typeof options.midiInputName !== 'undefined')
                this._midiInputName = options.midiInputName;
            if (typeof options.midiOutputName !== 'undefined')
                this._midiOutputName = options.midiOutputName;
            if (typeof options.maxScaleFactor !== 'undefined')
                this._maxScaleFactor = options.maxScaleFactor;
        }
        window.setTimeout(() => this._reconnectOutput(), 0);
        window.setTimeout(() => this._reconnectInput(), 0);
        window.setInterval(() => this._reconnectOutput(), 1000);
        window.setInterval(() => this._reconnectInput(), 1000);
    }

    static _addListener(listeners, callback) {
        listeners.push(callback);
    }

    static _removeListener(listeners, callback) {
        const i = listeners.indexOf(callback);
        if (i >= 0) listeners.splice(i, 1);
    }

    addParameterListener(callback) {
        MidiBackendProxy._addListener(this._parameterListeners, callback);
    }

    removeParameterListener(callback) {
        MidiBackendProxy._removeListener(this._parameterListeners, callback);
    }

    addMusicListener(callback) {
        MidiBackendProxy._addListener(this._musicListeners, callback);
    }

    removeMusicListener(callback) {
        MidiBackendProxy._removeListener(this._musicListeners, callback);
    }

    addPlaybackListener(callback) {
        MidiBackendProxy._addListener(this._playbackListeners, callback);
    }

    removePlaybackListener(callback) {
        MidiBackendProxy._removeListener(this._playbackListeners, callback);
    }

    selectComposition(which) {
        this._composition = which;
        const playing = this._playing;
        if (playing)
            this.stopComposition();
        this._sendSongSelect(which);
        if (playing)
            this.playComposition();
    }

    playComposition() {
        this._playing = true;
        this._sendControlChange(24, 127);
    }

    stopComposition() {
        this._playing = false;
        this._sendControlChange(25, 127);
    }

    set tempo(t) {
        this._tempo = t;
        this._sendTempo();
    }

    get tempo() {
        return this._tempo;
    }

    _sendTempo() {
        if (this._midiOutput)
            this._sendControlChange(20, Math.ceil(this._tempo * 127.0));
    }

    set loudness(l) {
        this._loudness = l;
        this._sendLoudness();
        this._sendControlChange(21, Math.ceil(l * 127.0));
    }

    get loudness() {
        return this._loudness;
    }

    _sendLoudness() {
        this._sendControlChange(21, Math.ceil(this._loudness * 127.0));
    }

    set impact(i) {
        this._impact = i;
        this._sendImpact();
    }

    get impact() {
        return this._impact;
    }

    _sendImpact() {
        this._sendControlChange(22, Math.ceil(this._impact * 127.0));
    }

    _resendControls() {
        this._sendTempo();
        this._sendLoudness();
        this._sendImpact();
    }

    _reconnectInput() {
        if (WebMidi.enabled) {
            if (this._midiInput && this._midiInput.state === 'disconnected') {
                this._midiInput.removeListener();
                this._midiInput = false;
            }

            if (!this._midiInput) {
                const midiInput = WebMidi.getInputByName(this._midiInputName);
                if (midiInput) {
                    this._midiInput = midiInput;
                    const parameterChannel = 2;
                    const midiInParameterMap = {
                        '110': 'loudness',
                        '111': 'dynamicSpread',
                        '112': 'tempo',
                        '113': 'microTiming',
                        '114': 'articulation',
                    };
                    this._midiInput.addListener('controlchange', parameterChannel,
                        e => {
                            if (e.controller.number >= 110 && e.controller.number <= 114) {
                                const key = midiInParameterMap[e.controller.number];
                                const value = 0.5 + (((e.value / 127.0) - 0.5) / (this._impact * this._maxScaleFactor));
                                const clampedValue = Math.max(0.0, Math.min(Number.isNaN(value) ? 0.5 : value, 1.0));
                                for (let callback of this._parameterListeners)
                                    callback(key, clampedValue);
                            } else if (e.controller.number === 115 && e.value === 127) {
                                for (let callback of this._playbackListeners)
                                    callback("endOfComposition");
                            }
                        }
                    );

                    const musicChannel = 1;
                    const fireHold = enabled => this._musicListeners.forEach(l => l.hold(enabled));
                    const fireNoteOn = (number, velocity) => this._musicListeners.forEach(l => l.noteOn(number, velocity));
                    const fireNoteOff = number => this._musicListeners.forEach(l => l.noteOff(number));
                    this._midiInput.addListener('controlchange', musicChannel, e => e.controller.number === 64 ? fireHold(e.value < 64 ? false : true) : null);
                    this._midiInput.addListener('noteon', musicChannel, e => fireNoteOn(e.note.number, e.rawVelocity));
                    this._midiInput.addListener('noteoff', musicChannel, e => fireNoteOff(e.note.number));
                }
            }
        }
    }

    _reconnectOutput() {
        if (WebMidi.enabled) {
            if (this._midiOutput && this._midiOutput.state === 'disconnected')
                this._midiOutput = false;

            if (!this._midiOutput) {
                const midiOutput = WebMidi.getOutputByName(this._midiOutputName);
                if (midiOutput) {
                    this._midiOutput = midiOutput;
                    if (this._composition)
                        this.selectComposition(this._composition);
                    if (this._playing)
                        this.playComposition();
                }
            }
        }
    }

    _sendControlChange(control, value) {
        if (this._midiOutput) {
            this._midiOutput.sendControlChange(control, value, 1);
        }
    }

    _sendSongSelect(value) {
        if (this._midiOutput) {
            this._midiOutput.sendSongSelect(value);
        }
    }
}
