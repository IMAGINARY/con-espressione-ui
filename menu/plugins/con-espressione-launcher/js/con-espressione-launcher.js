/* globals IMAGINARY */

IMAGINARY.AppLauncher.registerRemoteLauncher('conEspressione', (function () {
  // eslint-disable-next-line no-underscore-dangle,no-unused-vars
  let _appLauncher = null;
  let _midiBackend = null;
  let _closeHandler = null;

  function onPlaybackEvent(type) {
    if (type === "endOfComposition") {
      try {
        /***
         * If we are calling closeApp() directly from the context of the MIDI event, the whole page
         * disappears. As a workaround, we wrap it into a separate timeout event which seems to be run
         * in a different context.
         */
        if (_closeHandler !== null) {
          window.setTimeout(() => _closeHandler(), 0);
        }
      } catch (err) {
        console.log("Playback ended, but no action will be taken since we are not running inside AppLauncher.");
      }
    }
  }

  function playComposition(which) {
    _midiBackend.removePlaybackListener(onPlaybackEvent);
    _midiBackend.selectComposition(which);
    _midiBackend.playComposition();
    /***
     * The following delay is kind of a hack, because we need to wait for the backend to send the
     * endOfComposition event for the previous song (which might also never happen if there wasn't any song
     * playing at the moment). So for the unlikely case that a song if shorter than 2s, the hack might just
     * fail and the endOfComposition callback will never be triggered for the selected composition.
     */
    window.setTimeout(() => _midiBackend.addPlaybackListener(onPlaybackEvent), 2000);
  }

  function stopComposition() {
    _midiBackend.stopComposition();
  }

  /**
   * Init the launcher
   *
   * This method will be called by the appLauncher when it starts.
   *
   * @param {AppLauncher} appLauncher
   *  The AppLauncher instance
   */
  function init(appLauncher) {
    _appLauncher = appLauncher;

    WebMidi.enable(function (err) {
      if (err) {
        console.log("WebMidi could not be enabled.", err);
      } else {
        console.log("WebMidi enabled!");
        _midiBackend = new MidiBackendProxy({
          midiInputName: config.backendMidiInput,
          midiOutputName: config.backendMidiOutput
        });
        window.midiBackend = _midiBackend;
      }
    });
  }

  /**
   * Launch an app
   *
   * This method will be called by the appLauncher when the user launchs an app
   * associated with this launcher.
   *
   * @param {object} appCfg
   *  Configuration of the app to launch
   * @param {string} lang
   *  Language to launch the app with
   * @param {function} onClose
   *  Callback to call if the app decides to close on its own
   */
  // eslint-disable-next-line no-unused-vars
  function run(appCfg, lang, onClose) {

    _closeHandler = onClose;
    playComposition(appCfg.conEspressioneSong)
  }

  /**
   * Close the currently running app
   *
   * This method will be called by the appLauncher when the app needs to close
   *
   */
  function close() {
    stopComposition();
  }

  return {
    init,
    run,
    close,
  };
}()));
