// trail: http://www.subimago.com/?action=viewArticle&articleId=39
// https://github.com/leapmotion/leapjs-rigged-hand
//

(function () {
    var prevHand = Leap.Hand.Invalid;
    var prevFinger = Leap.Finger.Invalid;
    var prevParamsMIDI = {
        tempo: 0.5 * 127,
        volume: 0.5 * 127,
        ai: 0
    };

    function updatePosition(frame) {
        let hand = frame.hand(prevHand.id);
        for (let i = 0; i < frame.hands.length && !hand.valid; ++i) {
            hand = frame.hands[i];
        }
        if (hand.valid) {
            let finger = Leap.Finger.Invalid;
            if (hand.fingers.length > 0) {
                const preference = [
                    'indexFinger',
                    'middleFinger',
                    'thumb',
                    'ringFinger',
                    'pinky'
                ];
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
                    const paramsMIDI = {
                        tempo: Math.ceil(normalizedTipPosition[0] * 127),
                        volume: Math.ceil(normalizedTipPosition[1] * 127),
                        ai: 0
                    };
                    prevParamsMIDI = paramsMIDI;
                }
            }
            prevFinger = finger;
        }
        prevHand = hand;
    }

    let controller, initScene, stats;

    window.scene = null;

    window.renderer = null;

    window.camera = null;

    initScene = function (element) {
        let axis, pointLight;
        window.scene = new THREE.Scene();
        window.renderer = new THREE.WebGLRenderer({
            alpha: true
        });
        renderer.setClearColor(0x000000, 1);
        renderer.setSize(window.innerWidth, window.innerHeight);
        element.appendChild(renderer.domElement);
        axis = new THREE.AxisHelper(40);
        scene.add(axis);
        scene.add(new THREE.AmbientLight(0x888888));
        pointLight = new THREE.PointLight(0xFFffff);
        pointLight.position = new THREE.Vector3(-20, 10, 0);
        pointLight.lookAt(new THREE.Vector3(0, 0, 0));
        scene.add(pointLight);
        window.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
        camera.position.fromArray([0, 0, 400]);
        camera.lookAt(new THREE.Vector3(0, 0, 0));
        window.controls = new THREE.TrackballControls(camera);
        scene.add(camera);
        window.addEventListener('resize', function () {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            controls.handleResize();
            return renderer.render(scene, camera);
        }, false);
        return renderer.render(scene, camera);
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

    if (webglAvailable) {
        initScene(document.body);
    }

    stats = new Stats();

    stats.domElement.style.position = 'absolute';

    stats.domElement.style.left = '0px';

    stats.domElement.style.top = '0px';

    document.body.appendChild(stats.domElement);

    window.controller = controller = new Leap.Controller;

    controller.on('frame', updatePosition);

    controller.use('handHold').use('transform', {
        position: new THREE.Vector3(1, 0, 0)
    }).use('handEntry').use('screenPosition').use('riggedHand', {
        parent: scene,
        renderer: renderer,
        scale: 1.0,
        positionScale: 1.0,
        helper: false,
        offset: new THREE.Vector3(0, 0, 0),
        renderFn: function () {
            renderer.render(scene, camera);
            return controls.update();
        },
        materialOptions: {
            wireframe: true
        },
        dotsMode: false,
        stats: stats,
        camera: camera,
        boneLabels: function (boneMesh, leapHand) {
            const handNum = prevHand.type === 'left' ? 0 : 1;
            const fingerNum = prevFinger.type;
            const fingerName = `Finger_${fingerNum}3`;
            if ((boneMesh.name.indexOf(fingerName) === 0) && leapHand.id == prevHand.id) {
                return JSON.stringify(prevParamsMIDI);
            }
        },
        boneColors: function (boneMesh, leapHand) {
            const handNum = prevHand.type === 'left' ? 0 : 1;
            const fingerNum = prevFinger.type;
            const fingerName = `Finger_${fingerNum}`;
            if ((boneMesh.name.indexOf(fingerName) === 0) && leapHand.id == prevHand.id) {
                return {
                    hue: 0.0,
                    lightness: 0.5,
                    saturation: (1 + parseInt(boneMesh.name.substring(boneMesh.name.length - 1))) / 4
                };
            }
        },
        checkWebGL: true
    }).connect();
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
