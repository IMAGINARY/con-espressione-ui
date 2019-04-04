const config = (function () {
    const parseBoolean = s => s === '' || s.toLowerCase() === 'true';
    const parseInteger = i => Number.parseInt(i);
    const parseString = s => s;
    const searchParams = new URLSearchParams(window.location.search);
    const keys = {
        'backendMidiInput': {parseFn: parseString, defaultValue: 'expressiveness-backend'},
        'backendMidiOutput': {parseFn: parseString, defaultValue: 'expressiveness-backend'},
        'mlImpactMidiInput': {parseFn: parseString, defaultValue: 'SOLO Control'},
        'composition': {parseFn: parseInteger, defaultValue: 0},
        'enableSynth': {parseFn: parseBoolean, defaultValue: true},
        'showDebugTools': {parseFn: parseBoolean, defaultValue: false},
    };
    const parseWithDefault = key => searchParams.has(key) ? keys[key].parseFn(searchParams.get(key)) : keys[key].defaultValue;
    const config = Object.keys(keys)
        .reduce((acc, key) => {
            acc[key] = parseWithDefault(key);
            return acc;
        }, {});
    return Object.freeze(config);
})();
