import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type Signal = "green" | "yellow" | "red";
type RailwayAudio = {
  context: AudioContext;
  master: GainNode;
  engine: OscillatorNode;
  engineGain: GainNode;
  trackGain: GainNode;
  interval: number;
};

export default function RailwayGame({ onDashboard }: { onDashboard: () => void }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const speedRef = useRef(0);
  const distanceRef = useRef(8.5);
  const throttleRef = useRef(0);
  const brakeRef = useRef(0);
  const signalRef = useRef<Signal>("green");
  const cameraModeRef = useRef<"chase" | "cab">("chase");
  const audioRef = useRef<RailwayAudio | null>(null);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(8.5);
  const [throttle, setThrottleState] = useState(0);
  const [brake, setBrakeState] = useState(0);
  const [message, setMessage] = useState("Drive the Vande Bharat. Stop at Arakkonam platform marker.");
  const [running, setRunning] = useState(true);
  const [cameraMode, setCameraMode] = useState<"chase" | "cab">("chase");
  const [soundOn, setSoundOn] = useState(false);

  const setThrottle = (value: number) => { throttleRef.current = value; setThrottleState(value); };
  const setBrake = (value: number) => { brakeRef.current = value; setBrakeState(value); };
  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.28;
    master.connect(context.destination);
    const engineGain = context.createGain();
    engineGain.gain.value = 0;
    const engine = context.createOscillator();
    engine.type = "sawtooth";
    engine.frequency.value = 55;
    engine.connect(engineGain);
    engineGain.connect(master);
    engine.start();
    const trackGain = context.createGain();
    trackGain.gain.value = 0.55;
    trackGain.connect(master);
    const interval = window.setInterval(() => {
      playTrackClick(context, trackGain, speedRef.current);
      if (speedRef.current > 35) window.setTimeout(() => playTrackClick(context, trackGain, speedRef.current), 72);
    }, 150);
    audioRef.current = { context, master, engine, engineGain, trackGain, interval };
    setSoundOn(true);
    return audioRef.current;
  };
  const toggleSound = () => {
    const audio = ensureAudio();
    const next = !soundOn;
    audio.master.gain.value = next ? 0.28 : 0;
    setSoundOn(next);
  };
  const playHorn = () => {
    const audio = ensureAudio();
    playTrainHorn(audio.context, audio.master);
  };

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    let last = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.shadowMap.enabled = true;
    stage.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#9bd4ff");
    scene.fog = new THREE.Fog("#9bd4ff", 80, 260);
    const camera = new THREE.PerspectiveCamera(64, stage.clientWidth / stage.clientHeight, 0.1, 340);
    camera.position.set(-6.4, 4.2, 14.8);
    camera.lookAt(0, 1.8, 3.5);

    scene.add(new THREE.HemisphereLight("#ffffff", "#334155", 2.6));
    const sun = new THREE.DirectionalLight("#fff7ed", 3.1);
    sun.position.set(-18, 28, 16);
    sun.castShadow = true;
    scene.add(sun);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 360), new THREE.MeshStandardMaterial({ color: "#2f7d3a", roughness: 0.9 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.z = -110;
    scene.add(ground);

    const ballast = new THREE.Mesh(new THREE.PlaneGeometry(18, 360), new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.86 }));
    ballast.rotation.x = -Math.PI / 2;
    ballast.position.set(0, 0.02, -110);
    scene.add(ballast);

    const railMaterial = new THREE.MeshStandardMaterial({ color: "#d1d5db", roughness: 0.34, metalness: 0.76 });
    [-2.2, 2.2].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.18, 360), railMaterial);
      rail.position.set(x, 0.18, -110);
      rail.castShadow = true;
      scene.add(rail);
    });

    const sleeperMaterial = new THREE.MeshStandardMaterial({ color: "#7c2d12", roughness: 0.72 });
    const sleepers: THREE.Mesh[] = [];
    for (let i = 0; i < 62; i++) {
      const sleeper = new THREE.Mesh(new THREE.BoxGeometry(7.4, 0.18, 0.46), sleeperMaterial);
      sleeper.position.set(0, 0.12, -i * 5.4);
      sleeper.castShadow = true;
      scene.add(sleeper);
      sleepers.push(sleeper);
    }

    const train = createVandeBharat3D();
    train.position.set(0, 0.52, -4.5);
    train.rotation.y = 0;
    scene.add(train);

    const platforms: THREE.Object3D[] = [];
    for (let i = 0; i < 16; i++) {
      const platform = createPlatformSegment(i);
      platform.position.set(9.8, 0, -i * 14 - 18);
      scene.add(platform);
      platforms.push(platform);
    }

    const poles: THREE.Object3D[] = [];
    for (let i = 0; i < 38; i++) {
      const pole = createElectricPole();
      pole.position.set(i % 2 ? 7.2 : -7.2, 0, -i * 8 - 8);
      scene.add(pole);
      poles.push(pole);
    }
    const wireMaterial = new THREE.LineBasicMaterial({ color: "#111827" });
    [-1.9, 1.9].forEach((x) => {
      const points = [new THREE.Vector3(x, 7.4, 18), new THREE.Vector3(x * 0.35, 7.1, -170)];
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), wireMaterial));
    });
    for (let i = 0; i < 32; i++) [-1, 1].forEach((side) => {
      const tree = createTreeCluster();
      tree.position.set(side * (17 + Math.random() * 16), 0, -i * 9 - 12);
      scene.add(tree);
      poles.push(tree);
    });
    const bridge = createBridge3D();
    bridge.position.set(0, 0, -28);
    scene.add(bridge);

    const signal = createSignal3D();
    signal.position.set(-5.8, 0, -38);
    scene.add(signal);

    const onResize = () => {
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const loop = (time: number) => {
      const delta = Math.min((time - (last || time)) / 1000, 0.04);
      last = time;
      if (running) {
        const target = throttleRef.current * 34;
        speedRef.current += (target - speedRef.current) * delta * 0.42;
        speedRef.current = Math.max(0, speedRef.current - brakeRef.current * delta * 26);
        distanceRef.current = Math.max(0, distanceRef.current - speedRef.current * delta / 820);
        signalRef.current = distanceRef.current < 1.2 ? "red" : distanceRef.current < 2.8 ? "yellow" : "green";
        if (distanceRef.current === 0 && speedRef.current < 4) setMessage("Perfect stop. Vande Bharat arrived at Arakkonam safely.");
        else if (distanceRef.current === 0) setMessage("Overspeed at platform. Apply brake earlier.");
        setSpeed(Math.round(speedRef.current));
        setDistance(Number(distanceRef.current.toFixed(2)));
      }
      if (audioRef.current) {
        const audio = audioRef.current;
        const speedRatio = Math.min(speedRef.current / 160, 1);
        audio.engine.frequency.setTargetAtTime(45 + speedRatio * 95, audio.context.currentTime, 0.08);
        audio.engineGain.gain.setTargetAtTime(speedRatio * 0.12, audio.context.currentTime, 0.08);
        audio.trackGain.gain.setTargetAtTime(0.28 + speedRatio * 0.72, audio.context.currentTime, 0.04);
      }

      const motion = speedRef.current * 0.035;
      sleepers.forEach((sleeper) => { sleeper.position.z += motion; if (sleeper.position.z > 14) sleeper.position.z -= 335; });
      platforms.forEach((platform) => { platform.position.z += motion * 0.75; if (platform.position.z > 22) platform.position.z -= 230; });
      poles.forEach((pole) => { pole.position.z += motion * 0.85; if (pole.position.z > 18) pole.position.z -= 318; });
      train.position.z = -4.5 + Math.sin(time / 600) * 0.22;
      train.rotation.z = Math.sin(time / 500) * Math.min(speedRef.current / 600, 0.018);
      updateSignal(signal, signalRef.current);
      if (cameraModeRef.current === "cab") {
        camera.position.set(0, 4.1, 7.8);
        camera.lookAt(0, 1.7, -80);
      } else {
        camera.position.set(-6.4, 4.2, 14.8);
        camera.lookAt(0, 1.8, 3.5);
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      stage.replaceChildren();
      if (audioRef.current) {
        window.clearInterval(audioRef.current.interval);
        audioRef.current.engine.stop();
        audioRef.current.context.close();
        audioRef.current = null;
      }
    };
  }, [running]);

  const restart = () => {
    speedRef.current = 0;
    distanceRef.current = 8.5;
    signalRef.current = "green";
    setSpeed(0);
    setDistance(8.5);
    setThrottle(0);
    setBrake(0);
    setRunning(true);
    setMessage("Drive the Vande Bharat. Stop at Arakkonam platform marker.");
  };

  const changeCamera = (mode: "chase" | "cab") => {
    cameraModeRef.current = mode;
    setCameraMode(mode);
  };

  return (
    <main className="railway-page">
      <section className="railway-header">
        <button className="secondary" onClick={onDashboard}>Back to Dashboard</button>
        <div><p className="eyebrow">Built-in playable game</p><h1>Bhartiye Railway</h1></div>
        <div className="railway-stats"><span>Vande Bharat</span><span>Speed <b>{speed}</b> km/h</span><span>Next Stop <b>{distance}</b> km</span></div>
      </section>
      <section className="railway-sim">
        <div className="railway-screen">
          <div ref={stageRef} className="railway-3d-stage" aria-label="3D Vande Bharat railway driving game" />
          <div className="railway-hud"><span>NEXT STOP</span><b>ARAKKONAM</b><strong>{speed}</strong><small>KM/H</small></div>
          <div className="railway-left-hud">
            <button onClick={() => changeCamera(cameraMode === "chase" ? "cab" : "chase")}>{cameraMode === "chase" ? "Three Quarters" : "Cab View"}</button>
            <p><b className={`signal-dot ${signalRef.current}`}></b> {signalRef.current.toUpperCase()} Signal</p>
            <p>Next speed limit: 140 km/h</p>
            <p>Platform marker: {distance.toFixed(2)} km</p>
          </div>
        </div>
        <div className="railway-console">
          <button className="primary" onClick={() => setRunning(!running)}>{running ? "Pause" : "Play"}</button>
          <button className="secondary" onClick={restart}>Restart</button>
          <button className="secondary" onClick={toggleSound}>{soundOn ? "Sound On" : "Enable Sound"}</button>
          <button className="primary" onClick={playHorn}>Horn</button>
          <div className="railway-lever">
            <label>Throttle <b>{throttle}</b><input type="range" min="0" max="5" value={throttle} onChange={(e) => setThrottle(Number(e.target.value))} /></label>
            <label>Brake <b>{brake}</b><input type="range" min="0" max="5" value={brake} onChange={(e) => setBrake(Number(e.target.value))} /></label>
          </div>
          <p>{message}</p>
        </div>
      </section>
    </main>
  );
}

function createVandeBharat3D() {
  const group = new THREE.Group();
  const white = new THREE.MeshStandardMaterial({ color: "#f8fafc", roughness: 0.32, metalness: 0.32 });
  const blue = new THREE.MeshStandardMaterial({ color: "#1d4ed8", roughness: 0.26, metalness: 0.42 });
  const dark = new THREE.MeshStandardMaterial({ color: "#020617", roughness: 0.18, metalness: 0.32 });
  const grey = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.48, metalness: 0.42 });

  const body = new THREE.Mesh(new THREE.BoxGeometry(4.5, 2.75, 33), white);
  body.position.set(0, 1.7, -8.5);
  body.castShadow = true;
  group.add(body);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(3.65, 0.42, 31), new THREE.MeshStandardMaterial({ color: "#e2e8f0", roughness: 0.45 }));
  roof.position.set(0, 3.24, -9.3);
  group.add(roof);

  const cab = new THREE.Mesh(new THREE.SphereGeometry(2.28, 32, 18), white);
  cab.scale.set(0.92, 0.72, 1.15);
  cab.position.set(0, 1.82, 7.4);
  cab.castShadow = true;
  group.add(cab);

  const nose = new THREE.Mesh(new THREE.SphereGeometry(1.82, 32, 18), white);
  nose.scale.set(0.78, 0.52, 1.55);
  nose.position.set(0, 1.28, 9.12);
  group.add(nose);

  const windshield = new THREE.Mesh(new THREE.BoxGeometry(2.75, 1.15, 0.12), dark);
  windshield.position.set(0, 2.48, 9.16);
  windshield.rotation.x = -0.22;
  group.add(windshield);

  const destination = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.14), new THREE.MeshStandardMaterial({ color: "#facc15", emissive: "#f59e0b", emissiveIntensity: 0.5 }));
  destination.position.set(0, 2.93, 9.22);
  group.add(destination);

  [-2.12, 2.12].forEach((x) => {
    const frontBlue = new THREE.Mesh(new THREE.BoxGeometry(0.34, 2.65, 4.2), blue);
    frontBlue.position.set(x, 1.52, 7.35);
    frontBlue.rotation.y = x < 0 ? -0.22 : 0.22;
    group.add(frontBlue);
  });

  [-2.31, 2.31].forEach((x) => {
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.46, 30), blue);
    stripe.position.set(x, 1.32, -9.4);
    group.add(stripe);
    for (let i = 0; i < 11; i++) {
      const window = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.62, 1.18), dark);
      window.position.set(x + (x < 0 ? -0.02 : 0.02), 2.25, -22.5 + i * 2.05);
      group.add(window);
    }
  });

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(4.65, 0.38, 31), grey);
  skirt.position.set(0, 0.55, -9.8);
  group.add(skirt);

  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#fef3c7", emissive: "#fde68a", emissiveIntensity: 1.5 });
  [-0.82, 0.82].forEach((x) => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.16, 18, 18), lightMaterial);
    light.position.set(x, 1.23, 9.62);
    group.add(light);
  });

  const wheelMat = new THREE.MeshStandardMaterial({ color: "#111827", roughness: 0.5, metalness: 0.35 });
  [-22, -15, -8, -1, 5].forEach((z) => [-1.75, 1.75].forEach((x) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 0.28, 24), wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, 0.35, z);
    group.add(wheel);
  }));

  group.scale.setScalar(1.14);
  return group;
}
function createPlatformSegment(index: number) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.62, 13), new THREE.MeshStandardMaterial({ color: "#b45309", roughness: 0.7 }));
  base.position.y = 0.28;
  group.add(base);
  const floor = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.12, 13.2), new THREE.MeshStandardMaterial({ color: "#f59e0b", roughness: 0.6 }));
  floor.position.y = 0.68;
  group.add(floor);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.24, 10), new THREE.MeshStandardMaterial({ color: "#1e3a8a", roughness: 0.55 }));
  roof.position.set(0, 3.65, 0);
  group.add(roof);
  [-3.4, 0, 3.4].forEach((x) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 3.1, 10), new THREE.MeshStandardMaterial({ color: "#334155", roughness: 0.5 }));
    pillar.position.set(x, 2.1, -3.8);
    group.add(pillar);
  });
  if (index % 3 === 0) {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.7, 0.15), new THREE.MeshStandardMaterial({ color: "#facc15", roughness: 0.35 }));
    sign.position.set(0, 2.2, -4.7);
    group.add(sign);
  }
  if (index % 2 === 0) {
    [-2, 2].forEach((x) => {
      const person = createPassenger();
      person.position.set(x, 0.75, 2.5);
      group.add(person);
    });
  }
  return group;
}

function createPassenger() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 0.8, 10), new THREE.MeshStandardMaterial({ color: ["#ef4444", "#22c55e", "#3b82f6", "#f97316"][Math.floor(Math.random() * 4)] }));
  body.position.y = 0.55;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 12), new THREE.MeshStandardMaterial({ color: "#b87545" }));
  head.position.y = 1.08;
  group.add(body, head);
  return group;
}

function createTreeCluster() {
  const group = new THREE.Group();
  for (let i = 0; i < 3; i++) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.3, 8), new THREE.MeshStandardMaterial({ color: "#7c2d12", roughness: 0.9 }));
    trunk.position.set((Math.random() - 0.5) * 4, 0.65, (Math.random() - 0.5) * 4);
    const leaves = new THREE.Mesh(new THREE.SphereGeometry(0.9 + Math.random() * 0.4, 14, 14), new THREE.MeshStandardMaterial({ color: ["#166534", "#15803d", "#22c55e"][Math.floor(Math.random() * 3)], roughness: 0.9 }));
    leaves.position.set(trunk.position.x, 1.8 + Math.random() * 0.5, trunk.position.z);
    group.add(trunk, leaves);
  }
  return group;
}

function createBridge3D() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#64748b", roughness: 0.45, metalness: 0.35 });
  [-6.5, 6.5].forEach((x) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 70), mat);
    rail.position.set(x, 2.6, -20);
    group.add(rail);
    for (let i = 0; i < 8; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 4.6, 0.28), mat);
      post.position.set(x, 2.2, -52 + i * 9);
      group.add(post);
      const cross = new THREE.Mesh(new THREE.BoxGeometry(0.16, 5.2, 0.16), mat);
      cross.position.set(x, 2.2, -49 + i * 9);
      cross.rotation.x = 0.55;
      group.add(cross);
    }
  });
  return group;
}

function createElectricPole() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: "#475569", roughness: 0.45, metalness: 0.5 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 7, 10), mat);
  pole.position.y = 3.5;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.09, 0.09), mat);
  arm.position.y = 6.3;
  group.add(arm);
  return group;
}

function createSignal3D() {
  const group = new THREE.Group();
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 12), new THREE.MeshStandardMaterial({ color: "#111827" }));
  pole.position.y = 1.7;
  group.add(pole);
  ["red", "yellow", "green"].forEach((name, index) => {
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 20, 20), new THREE.MeshStandardMaterial({ color: name, emissive: name, emissiveIntensity: 0.1 }));
    light.name = name;
    light.position.set(0, 3.0 - index * 0.55, 0);
    group.add(light);
  });
  return group;
}

function updateSignal(group: THREE.Object3D, active: Signal) {
  group.children.forEach((child) => {
    if (child instanceof THREE.Mesh && ["red", "yellow", "green"].includes(child.name)) {
      const material = child.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = child.name === active ? 1.8 : 0.08;
    }
  });
}

function playTrackClick(context: AudioContext, destination: GainNode, speed: number) {
  if (speed < 3) return;
  const now = context.currentTime;
  const click = context.createOscillator();
  const gain = context.createGain();
  click.type = "triangle";
  click.frequency.value = 52 + Math.min(speed, 180) * 0.55;
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.28, now + 0.005);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.075);
  click.connect(gain);
  gain.connect(destination);
  click.start(now);
  click.stop(now + 0.08);
}

function playTrainHorn(context: AudioContext, destination: GainNode) {
  const now = context.currentTime;
  [165, 220].forEach((frequency, index) => {
    const horn = context.createOscillator();
    const gain = context.createGain();
    horn.type = "sine";
    horn.frequency.setValueAtTime(frequency, now);
    horn.frequency.linearRampToValueAtTime(frequency * 0.96, now + 0.9);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(index === 0 ? 0.12 : 0.07, now + 0.16);
    gain.gain.setValueAtTime(index === 0 ? 0.12 : 0.07, now + 0.55);
    gain.gain.linearRampToValueAtTime(0.0001, now + 1.05);
    horn.connect(gain);
    gain.connect(destination);
    horn.start(now);
    horn.stop(now + 1.1);
  });
}

