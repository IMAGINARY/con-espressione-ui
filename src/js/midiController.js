class MidiController {
    _listeners = [];
    _midiInputName;
    _midiInput = false;
    _midiChannel = "all";

    constructor(midiInputName, midiChannel) {
        this._midiInputName = midiInputName;
        if (typeof midiChannel !== 'undefined')
            this._midiChannel = midiChannel;

        window.setTimeout(() => this._reconnectInput(), 0);
        window.setInterval(() => this._reconnectInput(), 1000);
    }

    addListener(callback) {
        this._listeners.push(callback);
    }

    removeListener(callback) {
        const i = this._listeners.indexOf(callback);
        if (i >= 0) this._listeners.splice(i, 1);
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
                    this._midiInput.addListener(
                        'controlchange',
                        this._midiChannel,
                        e => this._listeners.forEach( l => l(e.value))
                    );
                }
            }
        }
    }
}