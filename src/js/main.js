(function () {
    const labels = {
        'tempo': 'Tempo',
        'loudness': 'Loudness',
        'impact': 'Impact',
        'mlTempo': 'Tempo',
        'mlLoudness': 'Loudness',
        'mlMicroTiming': 'Microtiming',
        'mlDynamicSpread': 'Dynamic Spread',
        'mlArticulation': 'Articulation',
    };

    const outputParameters = {
        tempo: createParameterModel('tempo', 0.5, {animate: false}),
        loudness: createParameterModel('loudness', 0.5, {animate: false}),
        impact: createParameterModel('impact', 0.5, {animate: false}),
    };
    const inputParameters = {
        mlTempo: createParameterModel('mlTempo', 0.5, {animate: true}),
        mlLoudness: createParameterModel('mlLoudness', 0.5, {animate: true}),
        mlMicroTiming: createParameterModel('mlMicroTiming', 0.5, {animate: true}),
        mlDynamicSpread: createParameterModel('mlDynamicSpread', 0.5, {animate: true}),
        mlArticulation: createParameterModel('mlArticulation', 0.5, {animate: true}),
    };

    // attach range callbacks to parameters
    {
        const fullRangeCallback = () => {
            return {min: 0, max: 1};
        };
        outputParameters.loudness.userData.rangeCallback = fullRangeCallback;
        outputParameters.tempo.userData.rangeCallback = fullRangeCallback;
        outputParameters.impact.userData.rangeCallback = fullRangeCallback;

        inputParameters.mlLoudness.userData.rangeCallback = () => {
            const ml = outputParameters.impact.value;
            return {
                min: outputParameters.loudness.value * (1 - ml),
                max: outputParameters.loudness.value,
            }
        };

        inputParameters.mlTempo.userData.rangeCallback = () => {
            const ml = outputParameters.impact.value;
            return {
                min: outputParameters.tempo.value * (1 - ml),
                max: outputParameters.tempo.value,
            }
        };

        const mlRangeCallback = () => {
            const ml = outputParameters.impact.value;
            return {
                min: 0.5 * (1 - ml),
                max: 0.5 * (1 + ml),
            }
        };
        inputParameters.mlDynamicSpread.userData.rangeCallback = mlRangeCallback;
        inputParameters.mlMicroTiming.userData.rangeCallback = mlRangeCallback;
        inputParameters.mlArticulation.userData.rangeCallback = mlRangeCallback;
    }

    const particleColoring = {
        "fixed": () => new THREE.Color(app_state.particleOptions.color),
        "rgb(tempo, loudness, ml)": (t, l, i) => new THREE.Color(t, l, i),
        "hsl(ml, tempo, loudness)": (t, l, i) => new THREE.Color().setHSL(i, t, l),
    }

    const app_state = {
        particleOptions: {
            _position: null,
            get position() {
                if (this._position === null)
                    this._position = app_state.leapMotion.tipPosition.clone();
                return this._position;
            },
            positionRandomness: .3,
            velocity: new THREE.Vector3(),
            velocityRandomness: .5,
            color: "#ff1493",
            particleColoring: 'rgb(tempo, loudness, ml)',
            colorRandomness: .2,
            turbulence: .5,
            lifetime: 6,
            size: 20,
            sizeRandomness: 10
        },
        particleSpawnerOptions: {
            spawnRate: 15000,
            horizontalSpeed: 1.5,
            verticalSpeed: 1.33,
            timeScale: 1,
        },
        leapMotion: {
            hand: Leap.Hand.Invalid,
            finger: Leap.Finger.Invalid,
            previousHand: Leap.Hand.Invalid,
            previousFinger: Leap.Finger.Invalid,
            _tipPosition: null,
            get tipPosition() {
                if (this._tipPosition === null) {
                    const {tempo, loudness, impact} = outputParameters;
                    const normalizedTipPosition = new THREE.Vector3(tempo.value, loudness.value, impact.value);
                    this._tipPosition = app_state.leapMotion.unnormalizePosition(normalizedTipPosition);
                }
                return this._tipPosition;
            },
            lastFrameTime: 0,
            boxWidth: 400,
            boxHeight: 260,
            boxDepth: 50,
            boxVerticalOffset: 245,
            clamp: false,
            get min() {
                return new THREE.Vector3(-this.boxWidth / 2.0, this.boxVerticalOffset - this.boxHeight / 2.0, -this.boxDepth / 2.0);
            },
            get max() {
                return new THREE.Vector3(this.boxWidth / 2.0, this.boxVerticalOffset + this.boxHeight / 2.0, +this.boxDepth / 2.0);
            },
            get size() {
                return new THREE.Vector3(this.boxWidth, this.boxHeight, this.boxDepth);
            },
            clampPosition: function (point) {
                return point.clone().clamp(this.min, this.max);
            },
            normalizePosition: function (point, clamp = true) {
                const result = clamp ? this.clampPosition(point) : point.clone();
                return result
                    .sub(this.min)
                    .divide(new THREE.Vector3().subVectors(this.max, this.min));
            },
            unnormalizePosition: function (point) {
                return point.clone().multiply(this.size).add(this.min);
            }
        },
        idleOptions: {
            timeout: 60 * 1000,
            interpolationDuration: 100 * 1000,
            position: t => {
                const tf = 2.0 * Math.PI / 10000;
                const rtf = 10 * tf;
                const r = 0.4 + 0.02 * Math.sin(rtf * t);
                const normalizedPosition = new THREE.Vector3(0.5 + r * Math.cos(tf * t), 0.5 + r * Math.sin(tf * t), 0.5);
                return app_state.leapMotion.unnormalizePosition(normalizedPosition);
            }
        },
        objects: {
            particles: true,
            box: false,
            outputParameters: false,
        },
        controls: {
            ml: "midi",
            camera: false,
            composition: config.composition,
            play: function () {
                midiBackend.playComposition();
            },
            stop: function () {
                midiBackend.stopComposition();
            },
            hideDebugTools: function () {
                setDebugToolsVisible(false);
            },
        },
        playback: {
            enabled: config.enableSynth,
        }
    }

    function createParameterModel(id, initialValue, userData) {
        return {
            id: id,
            _value: initialValue,
            _prevValue: initialValue,
            _listeners: [],
            set value(v) {
                if (this._prevValue != v) {
                    this._prevValue = this._value;
                    this._value = v;
                    for (let callback of this._listeners)
                        callback(this._value, this._prevValue, this);
                }
            },
            get value() {
                return this._value
            },
            addValueListener: function (l) {
                this._listeners.push(l);
                l(this._value);
            },
            removeValueChangeListener: function () {
                const i = this._listeners.indexOf(l);
                if (i >= 0) this._listeners = this._listeners.splice(i, 1);
            },
            userData: userData
        };
    };

    function createAnimator(initialValue, callback) {
        const ts = performance.now();
        return {
            begin: {timestamp: ts, value: initialValue},
            current: {timestamp: ts, value: initialValue},
            end: {timestamp: ts, value: initialValue},
            update: function () {
                const timestamp = performance.now();
                this.current.timestamp = Math.max(this.begin.timestamp, Math.min(timestamp, this.end.timestamp));
                const t = (this.current.timestamp - this.begin.timestamp) / (this.end.timestamp - this.begin.timestamp);
                this.current.value = this.begin.value + (this.end.value - this.begin.value) * (Number.isFinite(t) ? t : 1.0);
                callback(this.current.value, this);
            }
        }
    }

    function createParameterView(parentDomElement, parameterModel, rangeCallback, animate) {

        const label = document.createElement('div');
        label.innerText = labels[parameterModel.id];
        label.classList.add('label', 'left', parameterModel.id);

        const labelInvisible = document.createElement('div');
        labelInvisible.innerText = labels[parameterModel.id];
        labelInvisible.classList.add('label', 'right', parameterModel.id);

        const marker = document.createElement('div');
        marker.classList.add('marker', parameterModel.id);

        const value = document.createElement('div');
        value.classList.add('value', parameterModel.id);
        value.appendChild(marker);

        const minValue = document.createElement('div');
        minValue.classList.add('minValue', parameterModel.id);

        const barContainer = document.createElement('div');
        barContainer.classList.add('barContainer', parameterModel.id);

        const bar = document.createElement('div');
        bar.classList.add('bar', parameterModel.id);
        bar.appendChild(value);
        bar.appendChild(minValue);

        barContainer.appendChild(bar);

        const maxDuration = animate ? 200 : 0;
        const animator = createAnimator(parameterModel.value, (v, animator) => {
            const {min, max} = rangeCallback();
            bar.style.width = `${100 * max}%`;
            minValue.style.width = `${100 * (min / max)}%`;
            value.style.width = `${100 * (min + (max - min) * v) / max}%`;
            if (parameterModel.value !== animator.end.value) {
                animator.begin.timestamp = performance.now();
                animator.begin.value = animator.current.value;
                animator.end.value = parameterModel.value;
                const duration = Math.min(maxDuration, 1000 * Math.abs(animator.end.value - animator.current.value));
                animator.end.timestamp = animator.begin.timestamp + duration;
                animator.update();
            }
        });
        parameterModel.userData.animator = animator;

        parentDomElement.appendChild(label);
        parentDomElement.appendChild(barContainer);
        parentDomElement.appendChild(labelInvisible);

        return [label, bar];
    }

    let controller, stats;

    window.scene = null;
    window.hands = null;
    window.interactionBox = null;
    window.renderer = null;
    window.effect = null;
    window.camera = null;
    window.datgui = null;
    window.particleScope = {system: null, clock: new THREE.Clock(), tick: 0};

    function createBoxLineSegmentsGeometry() {
        const lineSegments = new THREE.Geometry();
        lineSegments.vertices.push(
            new THREE.Vector3(-1, -1, -1), new THREE.Vector3(+1, -1, -1),
            new THREE.Vector3(+1, -1, -1), new THREE.Vector3(+1, +1, -1),
            new THREE.Vector3(+1, +1, -1), new THREE.Vector3(-1, +1, -1),
            new THREE.Vector3(-1, +1, -1), new THREE.Vector3(-1, -1, -1),

            new THREE.Vector3(-1, -1, +1), new THREE.Vector3(+1, -1, +1),
            new THREE.Vector3(+1, -1, +1), new THREE.Vector3(+1, +1, +1),
            new THREE.Vector3(+1, +1, +1), new THREE.Vector3(-1, +1, +1),
            new THREE.Vector3(-1, +1, +1), new THREE.Vector3(-1, -1, +1),

            new THREE.Vector3(-1, -1, -1), new THREE.Vector3(-1, -1, +1),
            new THREE.Vector3(+1, -1, -1), new THREE.Vector3(+1, -1, +1),
            new THREE.Vector3(+1, +1, -1), new THREE.Vector3(+1, +1, +1),
            new THREE.Vector3(-1, +1, -1), new THREE.Vector3(-1, +1, +1),
        );
        lineSegments.scale(0.5, 0.5, 0.5);
        return lineSegments;
    }

    function initScene(element) {
        let axis, pointLight;
        window.scene = new THREE.Scene();
        window.renderer = new THREE.WebGLRenderer({
            alpha: true
        });
        renderer.setClearColor(0xFFFFFF, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        element.appendChild(renderer.domElement);
        axis = new THREE.AxesHelper(40);
        scene.add(axis);
        scene.add(new THREE.AmbientLight(0x000000));
        pointLight = new THREE.PointLight(0xFFffff);
        pointLight.position.copy(new THREE.Vector3(0, 100, 1000));
        pointLight.lookAt(new THREE.Vector3(0, 200, 0));
        scene.add(pointLight);
//        window.camera = new THREE.OrthographicCamera(window.innerWidth / -5, window.innerWidth / 5, window.innerHeight / 5, window.innerHeight / -5, 1, 1000);
        window.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.fromArray([0, 350, 550]);
        camera.lookAt(new THREE.Vector3(0, 350, 0));
        window.controls = new THREE.OrbitControls(camera);
        window.controls.target = new THREE.Vector3(0, 350, 0);
        scene.add(camera);
        hands = new THREE.Group();
        hands.position.set(0.0, 130.0, 100.0);
        scene.add(hands);

        interactionBox = new THREE.LineSegments(createBoxLineSegmentsGeometry(), new THREE.LineBasicMaterial({color: 0x999999}));
        hands.add(interactionBox);

        const textureLoader = new THREE.TextureLoader();
        particleScope.system = new THREE.GPUParticleSystem({
            maxParticles: 250000,
            particleNoiseTex: textureLoader.load('../lib/three.js/98/textures/perlin-512.jpg'),
            particleSpriteTex: textureLoader.load('../lib/three.js/98/textures/particle2.png'),
        });
        particleScope.system.particleShaderMat.userData.outlineParameters = {visible: false};
        hands.add(particleScope.system);

        effect = new THREE.OutlineEffect(renderer);

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            if (typeof controls.handleResize === "function")
                controls.handleResize();
            return effect.render(scene, camera);
        }, false);
        return effect.render(scene, camera);
    }

    function updateParticles() {
        const {particleOptions, particleSpawnerOptions, leapMotion, idleOptions} = app_state;
        const {tempo, loudness, impact} = outputParameters;
        const options = Object.assign({}, particleOptions);
        const delta = particleScope.clock.getDelta() * particleSpawnerOptions.timeScale;

        particleScope.tick += delta;

        if (particleScope.tick < 0) particleScope.tick = 0;
        const spawnParticles = particleSpawnerOptions.spawnRate * delta;

        const idleDuration = performance.now() - leapMotion.lastFrameTime - idleOptions.timeout;
        const idlePosition = idleOptions.position(idleDuration);

        const oldPoint = options.position.clone();
        const newPoint = leapMotion.tipPosition;
        newPoint.lerp(idlePosition, Math.max(0.0, Math.min(idleDuration / idleOptions.interpolationDuration, 1.0)));

        options.color = particleColoring[options.particleColoring](tempo.value, loudness.value, impact.value);
        for (let x = 0; x < spawnParticles; x++) {
            options.position.lerpVectors(oldPoint, newPoint, x / spawnParticles);
            particleScope.system.spawnParticle(options);
        }
        particleOptions.position.copy(options.position);

        particleScope.system.update(particleScope.tick);
    }

    function animate() {
        Object.values(outputParameters).forEach(p => {
            const elements = document.getElementsByClassName(p.id);
            for (let e of elements)
                e.style.display = app_state.objects.outputParameters ? 'unset' : 'none';
            p.userData.animator.update();
        });
        Object.values(inputParameters).forEach(p => p.userData.animator.update());


        controls.enabled = app_state.controls.camera;

        interactionBox.position.addVectors(app_state.leapMotion.min, app_state.leapMotion.max).multiplyScalar(0.5);
        interactionBox.scale.subVectors(app_state.leapMotion.max, app_state.leapMotion.min);
        interactionBox.visible = app_state.objects.box;

        updateParticles();
        particleScope.system.visible = app_state.objects.particles;
    }

    function render() {
        animate();
        effect.render(scene, camera);
        return controls.update();
    }

    function initOverlayScene(element) {
        const container = document.createElement('div');
        container.classList.add('parameters');

        Object.values(outputParameters).forEach(p => createParameterView(container, p, p.userData.rangeCallback, p.userData.animate));
        Object.values(inputParameters).forEach(p => createParameterView(container, p, p.userData.rangeCallback, p.userData.animate));
        element.appendChild(container);
    };

    // via Detector.js:
    let webglAvailable = (function () {
        try {
            let canvas = document.createElement('canvas');
            return !!window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    })();

    let midiBackend;
    initMidi = function () {
        console.log(WebMidi.inputs);
        console.log(WebMidi.outputs);

        const midiController = new MidiController(config.mlImpactMidiInput);
        midiController.addListener(value => {
            if (app_state.controls.ml === "midi")
                outputParameters.impact.value = value / 127.0;
        });

        midiBackend = new MidiBackendProxy({
            midiInputName: config.backendMidiInput,
            midiOutputName: config.backendMidiOutput,
            maxScaleFactor: 2.0
        });
        const mlKeyMap = {
            'loudness': 'mlLoudness',
            'dynamicSpread': 'mlDynamicSpread',
            'tempo': 'mlTempo',
            'microTiming': 'mlMicroTiming',
            'articulation': 'mlArticulation',
        };
        midiBackend.addParameterListener((key, value) => inputParameters[mlKeyMap[key]].value = value);
        midiBackend.addMusicListener({
            'noteOn': (number, velocity) => midiPlayer.noteOn(0, number, velocity),
            'noteOff': (number) => midiPlayer.noteOff(0, number),
            'hold': (enable) => midiPlayer.hold = enable,
        });
        outputParameters.tempo.addValueListener(l => midiBackend.tempo = l);
        outputParameters.loudness.addValueListener(l => midiBackend.loudness = l);
        outputParameters.impact.addValueListener(l => midiBackend.impact = l);

        // stop playing and play the default composition from the beginning
        setTimeout(() => {
            midiBackend.stopComposition();
            midiBackend.selectComposition(config.composition);
            midiBackend.playComposition();
        }, 0);
    };

    function initDatGui() {
        datgui = new dat.GUI({width: 400});
        datgui.domElement.classList.add("debugTool");

        const controlsFolder = datgui.addFolder('Playback controls');
        controlsFolder.open();

        const compositions = {
            "0: beethoven_op027_no2_mv1_bm_z": 0,
            "1: chopin_op10_no3_v422": 1,
            "2: mozart_kv545_mv2": 2,
            "3: beethoven_fuer_elise_complete": 3,
        };

        const compositionSelector = controlsFolder.add(app_state.controls, "composition", compositions).name("Select composition");
        compositionSelector.onChange(() => {
            midiBackend.selectComposition(app_state.controls.composition);
        });
        const useMIDIJS = controlsFolder.add(app_state.playback, "enabled").name("Enable built-in synthesizer");
        useMIDIJS.onChange(() => midiPlayer.muted = !app_state.playback.enabled);
        controlsFolder.add(app_state.controls, "play").name("Play from start");
        controlsFolder.add(app_state.controls, "stop").name("Stop playing");

        const userInputFolder = datgui.addFolder('User input');
        Object.values(outputParameters).forEach(p => userInputFolder.add(p, "value", 0.0, 1.0).name(labels[p.id]).listen());
        userInputFolder.add(app_state.controls, "ml", ["midi", "leap motion z"]).name("Control ML impact via");
        userInputFolder.add(app_state.objects, "outputParameters").name("Show in UI");

        const machineOutputFolder = datgui.addFolder('Machine output');
        Object.values(inputParameters).forEach(p => machineOutputFolder.add(p, "value", 0.0, 1.0).name(labels[p.id]).listen());

        const particleFolder = datgui.addFolder('Particles');

        particleFolder.add(app_state.particleOptions, "size", 1, 20).name("Size");
        particleFolder.add(app_state.particleOptions, "sizeRandomness", 0, 25).name("Randomness of size");
        particleFolder.add(app_state.particleOptions, "particleColoring", Object.keys(particleColoring)).name("Coloring of particles");
        particleFolder.addColor(app_state.particleOptions, "color").name("Color");
        particleFolder.add(app_state.particleOptions, "colorRandomness", 0, 1).name("Randomness of color");
        particleFolder.add(app_state.particleOptions, "positionRandomness", 0, 3).name("Randomness of position");
        particleFolder.add(app_state.particleOptions, "velocityRandomness", 0, 3).name("Randomness of velocity");
        particleFolder.add(app_state.particleOptions, "lifetime", .1, 10).name("Lifetime");
        particleFolder.add(app_state.particleOptions, "turbulence", 0, 1).name("Turbulence");
        particleFolder.add(app_state.particleSpawnerOptions, "spawnRate", 10, 30000).name("Spawn rate");
        particleFolder.add(app_state.particleSpawnerOptions, "timeScale", 0, 10).name("Time scale-factor");
        particleFolder.add(app_state.objects, "particles").name("Visualize particles");

        const leapMotionFolder = datgui.addFolder('Leap Motion interaction box');

        leapMotionFolder.add(app_state.leapMotion, "boxWidth", 0, 1000).name("Width");
        leapMotionFolder.add(app_state.leapMotion, "boxHeight", 0, 1000).name("Height");
        leapMotionFolder.add(app_state.leapMotion, "boxDepth", 0, 1000).name("Depth");
        leapMotionFolder.add(app_state.leapMotion, "boxVerticalOffset", 0, 1000).name("Vertical offset");
        leapMotionFolder.add(app_state.leapMotion, "clamp").name("Clamp to box");
        leapMotionFolder.add(app_state.objects, "box").name("Visualize box");

        const idleFolder = datgui.addFolder('Idle animation');
        idleFolder.add(app_state.idleOptions, "timeout", 0, 500 * 1000).name("Start after (ms");
        idleFolder.add(app_state.idleOptions, "interpolationDuration", 0, 500 * 1000).name("Interpolate for (ms)");

        const miscFolder = datgui.addFolder('Miscellaneous');
        miscFolder.add(app_state.controls, "camera").name("Camera control");
        miscFolder.add(app_state.controls, "hideDebugTools").name("Hide debug tools");
    }

    let midiPlayer;
    if (webglAvailable) {
        initScene(document.body);
        initOverlayScene(document.body);
        initDatGui();

        midiPlayer = new MidiPlayer(() => midiPlayer.muted = !config.enableSynth);
        WebMidi.enable(function (err) {
            if (err) {
                console.log("WebMidi could not be enabled.", err);
            } else {
                console.log("WebMidi enabled!");
                initMidi();
            }
        });
    }

    stats = new Stats();
    stats.domElement.id = 'stats';
    stats.domElement.classList.add("debugTool");
    document.body.appendChild(stats.domElement);

    window.setDebugToolsVisible = function (visible) {
        const debugTools = document.querySelectorAll(".debugTool");
        if (visible)
            debugTools.forEach(e => e.classList.remove("hidden"));
        else
            debugTools.forEach(e => e.classList.add("hidden"));
    };
    setDebugToolsVisible(config.showDebugTools);

    function updatePosition(frame) {
        const {leapMotion} = app_state;
        leapMotion.previousHand = leapMotion.hand;
        leapMotion.previousFinger = leapMotion.finger;

        leapMotion.hand = leapMotion.previousHand.valid ? frame.hand(leapMotion.previousHand.id) : Leap.Hand.Invalid;
        leapMotion.finger = Leap.Finger.Invalid;
        for (let i = 0; i < frame.hands.length && !leapMotion.hand.valid; ++i) {
            leapMotion.hand = frame.hands[i];
        }
        if (leapMotion.hand.valid) {
            app_state.leapMotion.lastFrameTime = performance.now();
            if (leapMotion.hand.fingers.length > 0) {
                const preference = ['indexFinger', 'middleFinger', 'thumb', 'ringFinger', 'pinky'];
                for (let fingerName of preference) {
                    if (leapMotion.hand[fingerName].valid) {
                        leapMotion.finger = leapMotion.hand[fingerName];
                        break;
                    }
                }
                if (leapMotion.finger.valid) {
                    const tipPosition = new THREE.Vector3().fromArray(leapMotion.finger.tipPosition);
                    tipPosition.addScaledVector(new THREE.Vector3().fromArray(leapMotion.finger.direction), leapMotion.finger.length / 5.0);
                    if (leapMotion.clamp)
                        tipPosition.copy(leapMotion.clampPosition(tipPosition));
                    const normalizedTipPosition = leapMotion.normalizePosition(tipPosition);
                    outputParameters.tempo.value = normalizedTipPosition.x;
                    outputParameters.loudness.value = normalizedTipPosition.y;
                    if (app_state.controls.ml === "leap motion z")
                        outputParameters.impact.value = 1.0 - normalizedTipPosition.z;
                    leapMotion.tipPosition.copy(tipPosition);
                }
            }
        }
    }

    window.controller = controller = new Leap.Controller({
        background: true,
        loopWhileDisconnected: true
    });

    controller.on('frame', updatePosition);

    window.riggedHandScope = {
        parent: hands,
        renderer: renderer,
        scale: 1.0,
        positionScale: 1.0,
        helper: false,
        offset: new THREE.Vector3(0, 0, 0),
        renderFn: null /* dummy value, otherwise init fails */,
        materialOptions: {
            wireframe: false,
            transparent: false,
            opacity: 0.1,
            transparent: true,
            color: new THREE.Color('#FFFFFF'),
            userData: {
                outlineParameters: {
                    visible: true,
                    alpha: 0.5,
                    thickness: 0.015,
                    color: [0, 0, 0],
                }
            },
        },
        dotsMode: false,
        stats: stats,
        camera: camera,
        boneColors: function (boneMesh, leapHand) {
            const fingerNamePrefix = `Finger_${app_state.leapMotion.finger.type}`;
            if ((boneMesh.name.indexOf(fingerNamePrefix) === 0) && leapHand.id == app_state.leapMotion.hand.id) {
                return {
                    hue: 0.0,
                    lightness: 0.5,
                    saturation: (1 + parseInt(boneMesh.name.substring(boneMesh.name.length - 1))) / 4
                };
            }
        },
        checkWebGL: true
    };

    controller
        .use('handHold')
        .use('transform', {})
        .use('handEntry')
        .use('screenPosition')
        .use('riggedHand', riggedHandScope)
        .on('frameEnd', render)
        .connect();
}).call(this);

/*
// on screen positioning might be useful later:
window.sphere = new THREE.Mesh(new THREE.SphereGeometry(1), new THREE.MeshBasicMaterial(0x0000ff));
scene.add(sphere);
controller.on('frame', function (frame) {
    var hand, handMesh, screenPosition;
    if (hand = frame.hands[0]) {
        handMesh = frame.hands[0].data('riggedHand.mesh');
        screenPosition = handMesh.screenPosition(hand.fingers[1].tipPosition, camera);
        cursor.style.left = screenPosition.x;
        return cursor.style.bottom = screenPosition.y;
    }
    if (hand = frame.hands[0]) {
        handMesh = frame.hands[0].data('riggedHand.mesh');
        return handMesh.scenePosition(hand.indexFinger.tipPosition, sphere.position);
    }
});
*/
