// TODO: LeapMotion, MIDI slider, mouse, touch input
// TODO: Debug mode that shows LeapMotion interaction box and fps stats

// trail: http://www.subimago.com/?action=viewArticle&articleId=39
// https://github.com/leapmotion/leapjs-rigged-hand

(function () {
    const parameters = {
        volume: createParameterModel('volume', 0.5, {animate: false}),
        tempo: createParameterModel('tempo', 0.5, {animate: false}),
        ml: createParameterModel('ml', 0.5, {animate: false}),
        mlLoudness: createParameterModel('mlLoudness', 0.5, {animate: true}),
        mlDynamicSpread: createParameterModel('mlDynamicSpread', 0.5, {animate: true}),
        mlTempo: createParameterModel('mlTempo', 0.5, {animate: true}),
        mlMicroTiming: createParameterModel('mlMicroTiming', 0.5, {animate: true}),
        mlArticulation: createParameterModel('mlArticulation', 0.5, {animate: true}),
    };

    const scene_options = {
        particleOptions: {
            position: new THREE.Vector3(),
            positionRandomness: .3,
            velocity: new THREE.Vector3(),
            velocityRandomness: .5,
            color: 0xaa88ff,
            colorRandomness: .2,
            turbulence: .5,
            lifetime: 2,
            size: 5,
            sizeRandomness: 1
        },
        particleSpawnerOptions: {
            spawnRate: 15000,
            horizontalSpeed: 1.5,
            verticalSpeed: 1.33,
            timeScale: 1
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
                        callback(this._value);
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
                const i = this._listeners.indedOf(l);
                if (i >= 0) this._listeners = this._listeners.splice(i, 1);
            },
            userData: userData
        };
    };

    function createParameterView(parameterModel, animate) {
        const div = document.createElement('div');
        div.innerText = parameterModel.id;
        div.id = parameterModel.id;
        div.classList.add('parameterBar');
        const intermediate = {value: parameterModel.value};
        let tween = new TWEEN.Tween(intermediate).to({value: parameterModel.value}).start();
        const callback = v => {
            tween.stop();
            tween = new TWEEN
                .Tween(intermediate)
                .to({value: v}, animate ? 200 : 0)
                .easing(TWEEN.Easing.Cubic.InOut)
                .onUpdate(function () {
                    div.style.width = `${this.value * 90}%`
                })
                .start();
        };
        parameterModel.addValueListener(callback);
        return div;
    }

    let controller, stats;

    window.scene = null;
    window.hands = null;
    window.renderer = null;
    window.camera = null;
    window.datgui = null;
    window.particleScope = {system: null, clock: new THREE.Clock(), tick: 0};

    let msLastPoint = -1;
    const MS_BETWEEN_POINTS = 100;
    const NUM_POINTS = 20;
    const tracePoints = [new THREE.Vector3(0, 0, 0), new THREE.Vector3(1, 0, 0)];
    const traceGeometry = new THREE.BufferGeometry().setFromPoints(tracePoints);

    function initScene(element) {
        let axis, pointLight;
        window.scene = new THREE.Scene();
        window.renderer = new THREE.WebGLRenderer({
            alpha: true
        });
        renderer.setClearColor(0x000000, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        element.appendChild(renderer.domElement);
        axis = new THREE.AxesHelper(40);
        scene.add(axis);
        scene.add(new THREE.AmbientLight(0x000000));
        pointLight = new THREE.PointLight(0xFFffff);
        pointLight.position.copy(new THREE.Vector3(0, 100, 1000));
        pointLight.lookAt(new THREE.Vector3(0, 200, 0));
        scene.add(pointLight);
        window.camera = new THREE.OrthographicCamera(window.innerWidth / -3, window.innerWidth / 3, window.innerHeight / 3, window.innerHeight / -3, 1, 1000);
//        window.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.fromArray([0, 200, 500]);
        camera.lookAt(new THREE.Vector3(0, 350, 0));
        window.controls = new THREE.OrbitControls(camera);
        window.controls.target = new THREE.Vector3(0, 350, 0);
        scene.add(camera);
        hands = new THREE.Group();
        scene.add(hands);
        scene.add(new THREE.Line(traceGeometry, new THREE.LineBasicMaterial({color: 0xff0000})));

        const textureLoader = new THREE.TextureLoader();
        particleScope.system = new THREE.GPUParticleSystem({
            maxParticles: 250000,
            particleNoiseTex: textureLoader.load('../../lib/textures/perlin-512.jpg'),
            particleSpriteTex: textureLoader.load('../../lib/textures/particle2.png'),
        });
        scene.add(particleScope.system);

        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            controls.handleResize(); // TODO
            return renderer.render(scene, camera);
        }, false);
        return renderer.render(scene, camera);
    };

    function computeInBetweenTracePoints(tracePoints) {
        const curve = new THREE.CatmullRomCurve3(tracePoints);
        const inBetweenPoints = curve.getPoints(5000);
        return inBetweenPoints;
    }

    function updateParticles(newPoint) {
        const options = scene_options.particleOptions;
        const spawnerOptions = scene_options.particleSpawnerOptions;
        const delta = particleScope.clock.getDelta() * spawnerOptions.timeScale;

        particleScope.tick += delta;

        if (particleScope.tick < 0) particleScope.tick = 0;

        const spawnParticles = spawnerOptions.spawnRate * delta;
        if (spawnParticles > 0) {

            const oldPoint = options.position;
            options.position = new THREE.Vector3();
            for (var x = 0; x < spawnParticles; x++) {
                options.position.lerpVectors(oldPoint, newPoint, x / spawnParticles);
                particleScope.system.spawnParticle(options);
            }
        }

        particleScope.system.update(particleScope.tick);
    }

    function animate() {
        traceGeometry.setFromPoints(computeInBetweenTracePoints(tracePoints));
        traceGeometry.verticesNeedUpdate = true;
        updateParticles(tracePoints[0]);
    }

    function initOverlayScene(element) {
        const container = document.createElement('div');
        container.id = 'parameterBarContainer';
        Object.values(parameters).forEach(p => container.appendChild(createParameterView(p, p.userData.animate)));
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

    initMidi = function () {
        console.log(WebMidi.inputs);
        console.log(WebMidi.outputs);

        const midiSlider = WebMidi.getInputByName("SOLO Control");
        midiSlider.addListener('controlchange', "all", e => parameters.ml.value = e.value / 127.0);

        const midiInput = WebMidi.getInputByName("LeapControl");
        const midiOutput = WebMidi.getOutputByName("LeapControl");

        const midiOutParameterMap = {
            tempo: 20,
            volume: 21,
            ml: 22,
        }
        const MIDI_OUT_CHANNEL = 1;
        const sendMidiParam = (control, value) => midiOutput.sendControlChange(control, value, MIDI_OUT_CHANNEL);

        window.startPlaying = () => sendMidiParam(24, 127, 0);
        window.stopPlaying = () => sendMidiParam(25, 127, 0);

        // stop playing and play from the beginning
        stopPlaying();
        startPlaying();

        Object.entries(midiOutParameterMap).forEach(e => parameters[e[0]].addValueListener(v => sendMidiParam(e[1], v * 127)));

        const midiInParameterMap = {
            '110': 'mlLoudness',
            '111': 'mlDynamicSpread',
            '112': 'mlTempo',
            '113': 'mlMicroTiming',
            '114': 'mlArticulation',
        };
        midiInput.addListener('controlchange', "all",
            function (e) {
                if (e.controller.number >= 110 && e.controller.number <= 114) {
                    const value = e.value / 127.0;
                    const id = midiInParameterMap[e.controller.number];
                    parameters[id].value = value;
                }
            }
        );
    };

    function initDatGui() {
        datgui = new dat.GUI({width: 350});

        const particleFolder = datgui.addFolder('particles');
        particleFolder.open();

        particleFolder.add(scene_options.particleOptions, "velocityRandomness", 0, 3);
        particleFolder.add(scene_options.particleOptions, "positionRandomness", 0, 3);
        particleFolder.add(scene_options.particleOptions, "size", 1, 20);
        particleFolder.add(scene_options.particleOptions, "sizeRandomness", 0, 25);
        particleFolder.add(scene_options.particleOptions, "colorRandomness", 0, 1);
        particleFolder.add(scene_options.particleOptions, "lifetime", .1, 10);
        particleFolder.add(scene_options.particleOptions, "turbulence", 0, 1);

        particleFolder.add(scene_options.particleSpawnerOptions, "spawnRate", 10, 30000);
        particleFolder.add(scene_options.particleSpawnerOptions, "timeScale", -1, 1);
    }

    if (webglAvailable) {
        initScene(document.body);
        initOverlayScene(document.body);
        initDatGui();
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
    document.body.appendChild(stats.domElement);

    let prevHand = Leap.Hand.Invalid;
    let prevFinger = Leap.Finger.Invalid;

    function updatePosition(frame) {
        let hand = frame.hand(prevHand.id);
        for (let i = 0; i < frame.hands.length && !hand.valid; ++i) {
            hand = frame.hands[i];
        }
        if (hand.valid) {
            let finger = Leap.Finger.Invalid;
            if (hand.fingers.length > 0) {
                const preference = ['indexFinger', 'middleFinger', 'thumb', 'ringFinger', 'pinky'];
                for (let fingerName of preference) {
                    if (hand[fingerName].valid) {
                        finger = hand[fingerName];
                        break;
                    }
                }
                if (finger.valid) {
                    const tipPosition = finger.tipPosition;
                    const interactionBox = frame.interactionBox;
                    const normalizedTipPosition = interactionBox.normalizePoint(tipPosition, true);
                    parameters.tempo.value = normalizedTipPosition[0];
                    parameters.volume.value = normalizedTipPosition[1];
                    const msCurrentPoint = frame.timestamp / 1000;
                    const currentPoint = new THREE.Vector3().fromArray(tipPosition);
                    if (msLastPoint + MS_BETWEEN_POINTS <= msCurrentPoint) {
                        tracePoints.unshift(currentPoint);
                        msLastPoint = msCurrentPoint;
                    } else {
                        tracePoints[0].lerp(currentPoint, 0.5);
                    }
                    while (tracePoints.length > NUM_POINTS)
                        tracePoints.pop();
                }
            }
            prevFinger = finger;
        }
        prevHand = hand;
    }

    window.controller = controller = new Leap.Controller;

    controller.on('frame', updatePosition);

    window.riggedHandScope = {
        parent: hands,
        renderer: renderer,
        scale: 1.0,
        positionScale: 1.0,
        helper: false,
        offset: new THREE.Vector3(0, 0, 0),
        renderFn: function () {
            TWEEN.update();
            animate();
            renderer.render(scene, camera);
            return controls.update();
        },
        materialOptions: {
            wireframe: false,
            transparent: false,
            opacity: 1.0,
            transparent: false,
            color: new THREE.Color('white'),
        },
        dotsMode: false,
        stats: stats,
        camera: camera,
        boneLabels: function (boneMesh, leapHand) {
            const fingerName = `Finger_${prevFinger.type}3`;
            if (boneMesh.name === fingerName && leapHand.id == prevHand.id) {
                return ['tempo', 'volume', 'ml']
                    .map(a => `${a}: ${(parameters[a].value).toFixed(2)}`).join(', ');
            }
        },
        boneColors: function (boneMesh, leapHand) {
            const fingerNamePrefix = `Finger_${prevFinger.type}`;
            if ((boneMesh.name.indexOf(fingerNamePrefix) === 0) && leapHand.id == prevHand.id) {
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
