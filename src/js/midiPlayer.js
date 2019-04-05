class MidiPlayer {
    _isInitialized = false;
    _muted = false;
    _holdEnabled = false;
    _missedNoteOffs = new Array(128).fill(false);

    constructor(onsuccess) {
        MIDI.loadPlugin({
            soundfontUrl: "../soundfont/FatBoy/",
            instrument: "acoustic_grand_piano",
            onsuccess: () => {
                MIDI.setVolume(0, 127);
                this._isInitialized = true;
                if (typeof onsuccess === "function")
                    onsuccess();
            }
        });
    }

    noteOn(channel, notenumber, velocity) {
        if (this._holdEnabled)
            this._missedNoteOffs[notenumber] = false;
        if (this._isInitialized && !this._muted)
            MIDI.noteOn(channel, notenumber, velocity);
    }

    noteOff(channel, notenumber) {
        if (this._holdEnabled) {
            // hold back the note-off event to emulate the
            this._missedNoteOffs[notenumber] = true;
        } else if (this._isInitialized && !this._muted) {
            MIDI.noteOff(channel, notenumber, 0);
        }
    }

    set hold(enable) {
        if (this._holdEnabled && !enable) {
            // send out all note-off events that have been held back
            for (let i = 0; i < this._missedNoteOffs.length; ++i) {
                if (this._missedNoteOffs[i]) {
                    if (this._isInitialized && !this.muted)
                        MIDI.noteOff(0, i, 0);
                    this._missedNoteOffs[i] = false;
                }
            }
        }
        this._holdEnabled = enable;
    }

    get hold() {
        return this._holdEnabled;
    }

    set muted(enable) {
        if (enable) {
            this.hold = false;
            for (let n = 0; n < 128; ++n)
                MIDI.noteOff(0, n);
        }
        this._muted = enable;
    }

    get muted() {
        return this._muted;
    }
}
