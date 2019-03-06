const midiPlayer = (function () {
    let isInitialized = false;
    let muted = false;
    let holdEnabled = false;
    const missedNoteOffs = new Array(128).fill(false);

    return {
        init: function (onsuccess) {
            MIDI.loadPlugin({
                soundfontUrl: "../../soundfont/FatBoy/",
                instrument: "acoustic_grand_piano",
                onsuccess: function () {
                    MIDI.setVolume(0, 127);
                    isInitialized = true;
                    if (typeof onsuccess === "function")
                        onsuccess();
                }
            });
        },
        noteOn: function (channel, notenumber, velocity) {
            if (holdEnabled)
                missedNoteOffs[notenumber] = false;
            if (isInitialized && !muted)
                MIDI.noteOn(channel, notenumber, velocity);
        },
        noteOff: function (channel, notenumber) {
            if (holdEnabled) {
                // hold back the note-off event to emulate the
                missedNoteOffs[notenumber] = true;
            } else if (isInitialized && !muted) {
                MIDI.noteOff(channel, notenumber, 0);
            }
        },
        setHold: function (enable) {
            if (holdEnabled && !enable) {
                // send out all note-off events that have been held back
                for (let i = 0; i < missedNoteOffs.length; ++i) {
                    if (missedNoteOffs[i]) {
                        if (isInitialized && !muted)
                            MIDI.noteOff(0, i, 0);
                        missedNoteOffs[i] = false;
                    }
                }
            }
            holdEnabled = enable;
        },
        setMute: function (enable) {
            if (enable) {
                this.setHold(false);
                for (let n = 0; n < 128; ++n)
                    MIDI.noteOff(0, n);
            }
            muted = enable;
        }
    }
})();