import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

type TrafficCar3D = { lane: number; depth: number; color: string; type: string };

const initialTraffic = (): TrafficCar3D[] => [
  { lane: -1.15, depth: -0.22, color: "#2563eb", type: "suv" },
  { lane: 0.45, depth: -0.48, color: "#ef4444", type: "sedan" },
  { lane: 1.15, depth: -0.78, color: "#f8fafc", type: "van" },
];

export default function CarRacingGame({ onDashboard }: { onDashboard: () => void }) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  const keysRef = useRef({ left: false, right: false, up: false, down: false });
  const carRef = useRef({ lane: 0, drift: 0 });
  const trafficRef = useRef<TrafficCar3D[]>(initialTraffic());
  const lastTimeRef = useRef(0);
  const scoreRef = useRef(0);
  const speedLevelRef = useRef(2);
  const driveSpeedRef = useRef(0.18);
  const graceRef = useRef(2.5);
  const [running, setRunning] = useState(true);
  const [crashed, setCrashed] = useState(false);
  const [score, setScore] = useState(0);
  const [speedLevel, setSpeedLevel] = useState(2);
  const [speedKph, setSpeedKph] = useState(80);
  const [best, setBest] = useState(() => Number(localStorage.getItem("gameforge:racing-best") ?? 0));

  const setControl = (control: keyof typeof keysRef.current, active: boolean) => { keysRef.current[control] = active; };
  const changeSpeed = (change: number) => setSpeedLevel((current) => {
    const next = Math.max(1, Math.min(8, current + change));
    speedLevelRef.current = next;
    return next;
  });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keysRef.current.left = true;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keysRef.current.right = true;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") keysRef.current.up = true;
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") keysRef.current.down = true;
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key.toLowerCase() === "a") keysRef.current.left = false;
      if (event.key === "ArrowRight" || event.key.toLowerCase() === "d") keysRef.current.right = false;
      if (event.key === "ArrowUp" || event.key.toLowerCase() === "w") keysRef.current.up = false;
      if (event.key === "ArrowDown" || event.key.toLowerCase() === "s") keysRef.current.down = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let raf = 0;
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(stage.clientWidth, stage.clientHeight);
    renderer.shadowMap.enabled = true;
    stage.replaceChildren(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#b8d7ef");
    scene.fog = new THREE.Fog("#b8d7ef", 48, 150);
    const camera = new THREE.PerspectiveCamera(70, stage.clientWidth / stage.clientHeight, 0.1, 180);
    camera.position.set(0, 3.25, 9.2);
    camera.rotation.x = -0.15;

    scene.add(new THREE.HemisphereLight("#ffffff", "#475569", 2.25));
    const sun = new THREE.DirectionalLight("#fff7ed", 2.9);
    sun.position.set(-10, 16, 9);
    sun.castShadow = true;
    scene.add(sun);

    const roadTexture = makeRoadTexture();
    roadTexture.wrapS = THREE.RepeatWrapping;
    roadTexture.wrapT = THREE.RepeatWrapping;
    roadTexture.repeat.set(2, 18);
    const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 280), new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 0.86 }));
    road.rotation.x = -Math.PI / 2;
    road.position.z = -68;
    road.receiveShadow = true;
    scene.add(road);

    const railMaterial = new THREE.MeshStandardMaterial({ color: "#d1d5db", roughness: 0.38, metalness: 0.4 });
    [-8.7, 8.7].forEach((x) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 280), railMaterial);
      rail.position.set(x, 0.42, -68);
      rail.castShadow = true;
      scene.add(rail);
    });

    const markerMaterial = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: "#ffffff", emissiveIntensity: 0.12 });
    const markers: THREE.Mesh[] = [];
    for (let i = 0; i < 36; i++) [-2.7, 2.7].forEach((x) => {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 2.8), markerMaterial);
      marker.position.set(x, 0.09, -i * 7);
      scene.add(marker);
      markers.push(marker);
    });

    const roadside: THREE.Object3D[] = [];
    for (let i = 0; i < 40; i++) [-1, 1].forEach((side) => {
      const tree = createTree3D();
      tree.position.set(side * (11 + Math.random() * 6), 0, -i * 7 - 8);
      scene.add(tree);
      roadside.push(tree);
      if (i % 2 === 0) {
        const building = createBuilding3D();
        building.position.set(side * (20 + Math.random() * 8), 0, -i * 9 - 18);
        scene.add(building);
        roadside.push(building);
      }
    });

    const trafficMeshes = trafficRef.current.map((car) => {
      const mesh = createVehicle3D(car.color, car.type);
      scene.add(mesh);
      return mesh;
    });

    const onResize = () => {
      camera.aspect = stage.clientWidth / stage.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(stage.clientWidth, stage.clientHeight);
    };
    window.addEventListener("resize", onResize);

    const loop = (time: number) => {
      const delta = Math.min((time - (lastTimeRef.current || time)) / 1000, 0.04);
      lastTimeRef.current = time;
      if (graceRef.current > 0) graceRef.current -= delta;

      if (running && !crashed) {
        const inputX = Number(keysRef.current.right) - Number(keysRef.current.left);
        const inputY = Number(keysRef.current.down) - Number(keysRef.current.up);
        const cruiseSpeed = 0.1 + speedLevelRef.current * 0.062;
        const gasBoost = Math.max(0, -inputY) * 0.18;
        const targetSpeed = cruiseSpeed + gasBoost;
        driveSpeedRef.current += (targetSpeed - driveSpeedRef.current) * delta * 3.4;
        if (inputY > 0) {
          driveSpeedRef.current = Math.max(0, driveSpeedRef.current - delta * (0.22 + inputY * 0.42));
        }
        carRef.current.lane = Math.max(-1.42, Math.min(1.42, carRef.current.lane + inputX * delta * 3.15));
        carRef.current.drift += (inputX - carRef.current.drift) * delta * 9;
        const kph = Math.round(20 + driveSpeedRef.current * 620);
        setSpeedKph(kph);
        scoreRef.current += Math.round(delta * kph * 0.55);
        setScore(scoreRef.current);

        trafficRef.current = trafficRef.current.map((car, index) => {
          const depth = car.depth + delta * driveSpeedRef.current;
          if (depth > 1.18) {
            scoreRef.current += 250;
            const lanes = [-1.2, -0.4, 0.4, 1.2].filter((lane) => Math.abs(lane - carRef.current.lane) > 0.28 || graceRef.current <= 0);
            return {
              lane: lanes[Math.floor(Math.random() * lanes.length)] ?? -0.72,
              depth: -0.25 - index * 0.24,
              color: ["#1d4ed8", "#dc2626", "#f8fafc", "#f59e0b", "#0ea5e9"][Math.floor(Math.random() * 5)],
              type: ["suv", "sedan", "van"][Math.floor(Math.random() * 3)],
            };
          }
          return { ...car, depth };
        });

        const hit = trafficRef.current.some((car) => car.depth > 0.96 && Math.abs(car.lane - carRef.current.lane) < 0.26);
        if (graceRef.current <= 0 && hit) {
          setCrashed(true);
          setRunning(false);
          setBest((current) => {
            const next = Math.max(current, scoreRef.current);
            localStorage.setItem("gameforge:racing-best", String(next));
            return next;
          });
        }
      }

      markers.forEach((marker) => {
        marker.position.z += driveSpeedRef.current * 2.3;
        if (marker.position.z > 12) marker.position.z -= 252;
      });
      roadside.forEach((item) => {
        item.position.z += driveSpeedRef.current * 1.75;
        if (item.position.z > 18) item.position.z -= 270;
      });
      trafficMeshes.forEach((mesh, index) => {
        const car = trafficRef.current[index];
        mesh.position.set(car.lane * 4.65 - carRef.current.lane * 2.25, 0.48, -98 + car.depth * 86);
        mesh.rotation.y = Math.PI + car.lane * 0.04;
        mesh.scale.setScalar(0.95 + Math.max(0, car.depth) * 0.14);
      });
      camera.position.x = carRef.current.lane * 2.05;
      camera.rotation.z = -carRef.current.drift * 0.035;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      roadTexture.dispose();
      stage.replaceChildren();
    };
  }, [crashed, running]);

  const restart = () => {
    carRef.current = { lane: 0, drift: 0 };
    trafficRef.current = initialTraffic();
    lastTimeRef.current = 0;
    scoreRef.current = 0;
    driveSpeedRef.current = 0.18;
    graceRef.current = 2.5;
    setScore(0);
    setCrashed(false);
    setRunning(true);
  };

  return (
    <main className="racing-page">
      <section className="racing-game-header">
        <button className="secondary" onClick={onDashboard}>Back to Dashboard</button>
        <div><p className="eyebrow">Built-in playable game</p><h1>Car Racing</h1></div>
        <div className="racing-stats"><span>Score <b>{score}</b></span><span>Best <b>{best}</b></span><span>{crashed ? "Crashed" : running ? "Racing" : "Paused"}</span></div>
      </section>
      <section className="racing-arena">
        <div className="racing-controls"><button className="primary" onClick={() => setRunning(!running)} disabled={crashed}>{running ? "Pause" : "Play"}</button><button className="secondary" onClick={restart}>Restart</button><span>Controls: steering wheel, pedals, arrow keys, or W/A/S/D</span></div>
        <div className="racing-cabinet">
          <div ref={stageRef} className="three-racing-stage" aria-label="Playable 3D cockpit car racing game" />
          <div className="cockpit-overlay" aria-hidden="true">
            <div className="windshield-top"></div>
            <div className="mirror"></div>
            <div className="cockpit-hands"><span></span><span></span></div>
            <div className="cockpit-steering"><span></span></div>
            <div className="instrument-cluster">
              <div className="gauge"><b>{speedKph}</b><small>km/h</small></div>
              <div className="gauge"><b>{String(Math.floor(score / 10)).padStart(5, "0")}</b><small>odo</small></div>
            </div>
            <div className="dash-panel"><span>HD 3D Drive</span><span>SPD {speedKph}</span></div>
          </div>
          {crashed && <div className="crash-banner"><strong>Crash!</strong><button className="primary" onClick={restart}>Race Again</button></div>}
        </div>
        <div className="cockpit-controls" aria-label="Car direction and speed controls"><button className="pedal brake" onPointerDown={() => setControl("down", true)} onPointerUp={() => setControl("down", false)} onPointerLeave={() => setControl("down", false)}>Brake</button><button className="speed-side" onClick={() => changeSpeed(-1)} disabled={speedLevel === 1}>Slow</button><div className="steering-control"><button className="steer-btn" onPointerDown={() => setControl("left", true)} onPointerUp={() => setControl("left", false)} onPointerLeave={() => setControl("left", false)}>Left</button><div className="steering-wheel"><span></span></div><button className="steer-btn" onPointerDown={() => setControl("right", true)} onPointerUp={() => setControl("right", false)} onPointerLeave={() => setControl("right", false)}>Right</button></div><button className="speed-side" onClick={() => changeSpeed(1)} disabled={speedLevel === 8}>Fast</button><button className="pedal gas" onPointerDown={() => setControl("up", true)} onPointerUp={() => setControl("up", false)} onPointerLeave={() => setControl("up", false)}>Gas</button><span className="speed-pill cockpit-speed">Speed <b>{speedLevel}</b>/8</span></div>
      </section>
    </main>
  );
}

function makeRoadTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#343941";
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const shade = 42 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgba(${shade},${shade + 4},${shade + 12},.22)`;
    ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
  }
  return new THREE.CanvasTexture(canvas);
}

function createBuilding3D() {
  const h = 3 + Math.random() * 6;
  const group = new THREE.Group();
  const building = new THREE.Mesh(new THREE.BoxGeometry(5 + Math.random() * 5, h, 4 + Math.random() * 8), new THREE.MeshStandardMaterial({ color: new THREE.Color().setHSL(0.08, 0.18, 0.45 + Math.random() * 0.2), roughness: 0.78 }));
  building.position.y = h / 2;
  group.add(building);
  return group;
}

function createTree3D() {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 10), new THREE.MeshStandardMaterial({ color: "#7c2d12", roughness: 0.8 }));
  trunk.position.y = 0.6;
  const leaves = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.2, 12), new THREE.MeshStandardMaterial({ color: "#166534", roughness: 0.9 }));
  leaves.position.y = 2.0;
  group.add(trunk, leaves);
  return group;
}

function createVehicle3D(color: string, type: string) {
  const group = new THREE.Group();
  const bodyWidth = type === "van" ? 2.25 : type === "suv" ? 2.05 : 1.85;
  const bodyLength = type === "van" ? 4.25 : type === "suv" ? 3.85 : 3.55;
  const bodyHeight = type === "van" ? 1.25 : 1.0;
  const bodyMaterial = new THREE.MeshStandardMaterial({ color, roughness: 0.26, metalness: 0.58 });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#0f172a", roughness: 0.42, metalness: 0.45 });
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: "#0f172a", roughness: 0.04, metalness: 0.18, transparent: true, opacity: 0.78, clearcoat: 0.7 });
  const lightMaterial = new THREE.MeshStandardMaterial({ color: "#fde68a", emissive: "#facc15", emissiveIntensity: 0.65 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyLength), bodyMaterial);
  body.position.y = 0.62;
  body.castShadow = true;
  group.add(body);
  const hood = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.9, bodyHeight * 0.35, bodyLength * 0.36), bodyMaterial);
  hood.position.set(0, 0.95, bodyLength * 0.16);
  group.add(hood);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(bodyWidth * 0.72, bodyHeight * 0.72, bodyLength * 0.38), glassMaterial);
  cabin.position.set(0, 1.3, -bodyLength * 0.14);
  cabin.castShadow = true;
  group.add(cabin);
  [-1, 1].forEach((side) => [-1, 1].forEach((end) => {
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.28, 28), darkMaterial);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(side * bodyWidth * 0.55, 0.34, end * bodyLength * 0.32);
    wheel.castShadow = true;
    group.add(wheel);
  }));
  [-0.48, 0.48].forEach((x) => {
    const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), lightMaterial);
    headlight.position.set(x, 0.72, bodyLength * 0.52);
    group.add(headlight);
  });
  return group;
}



