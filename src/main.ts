import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

type Aspect = 'tree' | 'serpent' | 'mandala' | 'within';

interface Forces {
  population: number;
  awakening: number;
  resistance: number;
  choice: number;
  speed: number;
}

const MAX_RENDERED_SOULS = matchMedia('(max-width: 700px)').matches ? 90000 : 180000;
const threshold = get<HTMLElement>('threshold');
const cosmos = get<HTMLElement>('cosmos');

const forces: Forces = {
  population: 250000,
  awakening: 0.18,
  resistance: 0.72,
  choice: 0.64,
  speed: 1,
};

function get<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing #${id}`);
  return node as T;
}

function seeded(index: number, salt: number): number {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 ? 1 : 0)}M`;
  if (value >= 1000) return `${Math.round(value / 1000)}K`;
  return value.toString();
}

class SoulTree {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(44, 1, .05, 160);
  private readonly renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  private readonly controls: OrbitControls;
  private readonly clock = new THREE.Clock();
  private readonly world = new THREE.Group();
  private readonly pathGroup = new THREE.Group();
  private readonly barrier = new THREE.Group();
  private readonly soulGeometry: THREE.BufferGeometry;
  private readonly soulMaterial: THREE.ShaderMaterial;
  private readonly uniforms: Record<string, { value: number }>;
  private readonly destination: THREE.Mesh;
  private active = false;
  private paused = false;
  private simulatedTime = 0;
  private pulseStrength = 0;
  private lastStats = 0;
  private currentAspect: Aspect = 'tree';
  private eraIndex = -1;

  constructor(private readonly host: HTMLElement) {
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.setSize(host.clientWidth, host.clientHeight, false);
    this.renderer.setClearColor(0x03040a, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    host.append(this.renderer.domElement);

    this.camera.position.set(0, 1.2, 23);
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = .045;
    this.controls.minDistance = 2.2;
    this.controls.maxDistance = 44;
    this.controls.enablePan = false;

    this.scene.fog = new THREE.FogExp2(0x03040a, .025);
    this.scene.add(this.world);
    this.addStars();
    this.addPaths();
    this.world.add(this.pathGroup);

    this.uniforms = {
      uTime: { value: 0 },
      uAwakening: { value: forces.awakening },
      uResistance: { value: forces.resistance },
      uChoice: { value: forces.choice },
      uPulse: { value: 0 },
      uPixelRatio: { value: Math.min(devicePixelRatio, 2) },
    };
    ({ geometry: this.soulGeometry, material: this.soulMaterial } = this.createSouls());
    this.world.add(new THREE.Points(this.soulGeometry, this.soulMaterial));

    this.destination = this.addDestination();
    this.addBarrier();
    this.addRootMemory();
    this.setPopulation(forces.population);
    addEventListener('resize', () => this.resize());
    this.animate();
  }

  start(): void {
    this.active = true;
    this.clock.getDelta();
    this.resize();
  }

  setPopulation(logicalPopulation: number): void {
    forces.population = logicalPopulation;
    const rendered = Math.min(logicalPopulation, MAX_RENDERED_SOULS);
    this.soulGeometry.setDrawRange(0, rendered);
  }

  setForce(name: keyof Omit<Forces, 'population'>, value: number): void {
    forces[name] = value;
    if (name === 'resistance') this.uniforms.uResistance.value = value;
    if (name === 'choice') this.uniforms.uChoice.value = value;
  }

  pause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  pulse(): void {
    this.pulseStrength = 1;
    showMoment('Recognition moves through the multitude like lightning through roots.');
  }

  reset(): void {
    this.simulatedTime = 0;
    this.pulseStrength = 0;
    this.eraIndex = -1;
    this.uniforms.uTime.value = 0;
    showMoment('The field forgets—and begins the long remembering again.');
  }

  changeAspect(aspect: Aspect): void {
    this.currentAspect = aspect;
    const views: Record<Aspect, { position: THREE.Vector3; target: THREE.Vector3; copy: [string, string] }> = {
      tree: { position: new THREE.Vector3(0, 1.2, 23), target: new THREE.Vector3(0, .5, 0), copy: ['The branching body.', 'From here, choice appears as divergence and awakening appears as ascent.'] },
      serpent: { position: new THREE.Vector3(23, 1, .01), target: new THREE.Vector3(0, .2, 0), copy: ['The return hidden inside departure.', 'Birth and death curve into one circulation. The leaves feed the root.'] },
      mandala: { position: new THREE.Vector3(.01, 24, .01), target: new THREE.Vector3(0, .2, 0), copy: ['Many paths, one geometry.', 'From outside time, branching lives become petals around a common center.'] },
      within: { position: new THREE.Vector3(.2, .5, 2.5), target: new THREE.Vector3(0, 2.2, 0), copy: ['One light among the lights.', 'The whole is no longer an object. It is the space through which every life moves.'] },
    };
    const view = views[aspect];
    const fromPosition = this.camera.position.clone();
    const fromTarget = this.controls.target.clone();
    const started = performance.now();
    const transition = (now: number) => {
      const progress = Math.min(1, (now - started) / 1400);
      const eased = progress < .5 ? 4 * progress ** 3 : 1 - (-2 * progress + 2) ** 3 / 2;
      this.camera.position.lerpVectors(fromPosition, view.position, eased);
      this.controls.target.lerpVectors(fromTarget, view.target, eased);
      if (progress < 1) requestAnimationFrame(transition);
    };
    requestAnimationFrame(transition);
    get('witness-title').textContent = view.copy[0];
    get('witness-copy').textContent = view.copy[1];
  }

  private createSouls(): { geometry: THREE.BufferGeometry; material: THREE.ShaderMaterial } {
    const seeds = new Float32Array(MAX_RENDERED_SOULS * 4);
    for (let index = 0; index < MAX_RENDERED_SOULS; index += 1) {
      seeds[index * 4] = seeded(index, 1);
      seeds[index * 4 + 1] = seeded(index, 2);
      seeds[index * 4 + 2] = Math.pow(seeded(index, 3), 1.65);
      seeds[index * 4 + 3] = .6 + seeded(index, 4) * .85;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_RENDERED_SOULS * 3), 3));
    geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4));

    const vertexShader = `
      attribute vec4 aSeed;
      uniform float uTime;
      uniform float uAwakening;
      uniform float uResistance;
      uniform float uChoice;
      uniform float uPulse;
      uniform float uPixelRatio;
      varying vec3 vColor;
      varying float vAwake;
      varying float vGlow;

      float hash(float n) { return fract(sin(n) * 43758.5453123); }
      float ease(float x) { return x * x * (3.0 - 2.0 * x); }

      void main() {
        float rate = .022 + aSeed.w * .018;
        float absoluteLife = aSeed.x * 30.0 + uTime * rate;
        float lifeNumber = floor(absoluteLife);
        float phase = fract(absoluteLife);
        float inherited = floor(aSeed.y * 12.0) / 12.0;
        float chosen = floor(hash(aSeed.y * 91.7 + lifeNumber * 17.3) * 12.0) / 12.0;
        float lineage = mix(inherited, chosen, uChoice);
        float angle = lineage * 6.2831853;
        float pulseWave = uPulse * smoothstep(.0, .2, phase) * (1.0 - smoothstep(.2, .52, phase));
        float recognition = clamp(uAwakening + pulseWave, 0.0, 1.0);
        float awake = smoothstep(aSeed.z - .025, aSeed.z + .025, recognition);
        vec3 p;

        if (phase < .78) {
          float t = phase / .78;
          float branching = ease(clamp((t - .12) / .88, 0.0, 1.0));
          float radialCharacter = .72 + hash(aSeed.y * 43.0 + lifeNumber) * .7;
          float radius = branching * (1.0 + 4.5 * pow(t, 1.7)) * radialCharacter;
          float twist = (t * 1.15 + sin(t * 6.283 + aSeed.x * 5.0) * .08) * 6.2831853;
          float localAngle = angle + twist * (.16 + uChoice * .32);
          p.x = cos(localAngle) * radius;
          p.z = sin(localAngle) * radius;
          p.y = -6.5 + t * 13.4;

          float thresholdContact = smoothstep(.76, 1.0, t);
          float refusal = uResistance * (1.0 - awake) * thresholdContact;
          p.y -= refusal * (1.4 + sin(aSeed.x * 40.0 + uTime * .6) * .35);
          p.xz += normalize(p.xz + vec2(.001)) * refusal * sin(uTime + aSeed.y * 80.0) * .35;

          float unionPull = awake * smoothstep(.55, 1.0, t);
          p.xz *= mix(1.0, .12, unionPull);
          p.y += unionPull * 1.15;
        } else {
          float t = (phase - .78) / .22;
          float returnAngle = angle + t * 3.1415926;
          float outerRadius = 5.1 + sin(t * 3.1415926) * 3.8;
          p.x = cos(returnAngle) * outerRadius;
          p.z = sin(returnAngle) * outerRadius;
          p.y = mix(7.8, -6.5, ease(t));
        }

        float palette = fract(lineage * 3.0 + lifeNumber * .071);
        vec3 violet = vec3(.34, .28, .93);
        vec3 cyan = vec3(.18, .73, .75);
        vec3 rose = vec3(.78, .27, .55);
        vec3 sleeping = palette < .5 ? mix(violet, cyan, palette * 2.0) : mix(cyan, rose, (palette - .5) * 2.0);
        vec3 awakened = mix(vec3(1.0, .73, .27), vec3(1.0, .96, .76), awake);
        vColor = mix(sleeping, awakened, awake);
        vAwake = awake;
        vGlow = .55 + hash(aSeed.x * 211.0) * .55;

        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uPixelRatio * (1.4 + awake * 2.5 + pulseWave * 2.0) * (34.0 / max(4.0, -mvPosition.z));
      }
    `;
    const fragmentShader = `
      precision highp float;
      varying vec3 vColor;
      varying float vAwake;
      varying float vGlow;
      void main() {
        vec2 uv = gl_PointCoord - .5;
        float distanceFromCenter = length(uv);
        if (distanceFromCenter > .5) discard;
        float core = smoothstep(.22, 0.0, distanceFromCenter);
        float aura = smoothstep(.5, .08, distanceFromCenter) * .48;
        float alpha = (core + aura) * vGlow * (.5 + vAwake * .5);
        gl_FragColor = vec4(vColor * (1.0 + core * 1.6), alpha);
      }
    `;
    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry, material };
  }

  private pathPoint(t: number, branch: number, returnPath = false): THREE.Vector3 {
    const angle = branch * Math.PI * 2;
    if (!returnPath) {
      const branching = THREE.MathUtils.smoothstep(t, .12, 1);
      const radius = branching * (1 + 4.5 * Math.pow(t, 1.7));
      const localAngle = angle + t * Math.PI * .8;
      return new THREE.Vector3(Math.cos(localAngle) * radius, -6.5 + t * 13.4, Math.sin(localAngle) * radius);
    }
    const returnAngle = angle + t * Math.PI;
    const radius = 5.1 + Math.sin(t * Math.PI) * 3.8;
    return new THREE.Vector3(Math.cos(returnAngle) * radius, THREE.MathUtils.lerp(7.8, -6.5, t * t * (3 - 2 * t)), Math.sin(returnAngle) * radius);
  }

  private addPaths(): void {
    for (let branch = 0; branch < 24; branch += 1) {
      const branchFraction = branch / 24;
      const lifePoints = Array.from({ length: 90 }, (_, index) => this.pathPoint(index / 89, branchFraction));
      const returnPoints = Array.from({ length: 65 }, (_, index) => this.pathPoint(index / 64, branchFraction, true));
      const hue = .48 + branchFraction * .32;
      const color = new THREE.Color().setHSL(hue % 1, .7, .55);
      const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: .065, blending: THREE.AdditiveBlending, depthWrite: false });
      this.pathGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(lifePoints), material));
      this.pathGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(returnPoints), material.clone()));
    }
  }

  private addStars(): void {
    const count = 1600;
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) {
      const radius = 18 + seeded(index, 8) * 54;
      const theta = seeded(index, 9) * Math.PI * 2;
      const phi = Math.acos(2 * seeded(index, 10) - 1);
      positions[index * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[index * 3 + 1] = radius * Math.cos(phi);
      positions[index * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.scene.add(new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x8c82bd, size: .035, transparent: true, opacity: .58, depthWrite: false })));
  }

  private addDestination(): THREE.Mesh {
    const core = new THREE.Mesh(
      new THREE.IcosahedronGeometry(.17, 2),
      new THREE.MeshBasicMaterial({ color: 0xffe0a1, blending: THREE.AdditiveBlending }),
    );
    core.position.y = 8.15;
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(.75, 24, 24),
      new THREE.MeshBasicMaterial({ color: 0xe9bd75, transparent: true, opacity: .08, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    core.add(halo);
    const light = new THREE.PointLight(0xffc879, 18, 18);
    core.add(light);
    this.world.add(core);
    return core;
  }

  private addBarrier(): void {
    for (let ring = 0; ring < 4; ring += 1) {
      const mesh = new THREE.Mesh(
        new THREE.TorusGeometry(3.6 + ring * .42, .012, 6, 150),
        new THREE.MeshBasicMaterial({ color: ring % 2 ? 0x7b6de0 : 0xb68c65, transparent: true, opacity: .18 - ring * .025, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      mesh.rotation.x = Math.PI / 2;
      mesh.position.y = 5.6 + ring * .13;
      mesh.userData.baseOpacity = .18 - ring * .025;
      this.barrier.add(mesh);
    }
    const shell = new THREE.Mesh(
      new THREE.IcosahedronGeometry(4.2, 2),
      new THREE.MeshBasicMaterial({ color: 0x7769cc, wireframe: true, transparent: true, opacity: .045, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    shell.scale.y = .23;
    shell.position.y = 5.75;
    shell.userData.baseOpacity = .045;
    this.barrier.add(shell);
    this.world.add(this.barrier);
  }

  private addRootMemory(): void {
    const rings = new THREE.Group();
    rings.position.y = -6.5;
    for (let index = 0; index < 6; index += 1) {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(.35 + index * .32, .009, 5, 90),
        new THREE.MeshBasicMaterial({ color: 0x59b4b5, transparent: true, opacity: .14 - index * .015, blending: THREE.AdditiveBlending }),
      );
      ring.rotation.x = Math.PI / 2;
      rings.add(ring);
    }
    this.world.add(rings);
  }

  private updateWorld(delta: number): void {
    if (!this.paused) this.simulatedTime += delta * forces.speed;
    this.pulseStrength = Math.max(0, this.pulseStrength - delta * .22);
    const centuries = this.simulatedTime / 12;
    const emergentAwakening = .22 * (1 - Math.exp(-centuries / 90));
    const awareness = Math.min(1, forces.awakening + emergentAwakening + this.pulseStrength * .22);
    this.uniforms.uTime.value = this.simulatedTime;
    this.uniforms.uAwakening.value = awareness;
    this.uniforms.uPulse.value = this.pulseStrength;

    const awakeRatio = Math.pow(awareness, 1.55);
    const coherence = Math.min(1, Math.pow(awakeRatio, 1.25) * (1.08 - forces.choice * .16));
    const breach = Math.max(0, (coherence - forces.resistance * .62) / Math.max(.15, 1 - forces.resistance * .62));
    this.barrier.children.forEach((child) => {
      const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity = child.userData.baseOpacity * forces.resistance * (1 - breach * .88);
    });
    this.barrier.rotation.y += delta * (.025 + breach * .16);
    this.destination.scale.setScalar(1 + Math.sin(this.simulatedTime * 1.7) * .08 + coherence * .22);
    this.pathGroup.rotation.y = Math.sin(this.simulatedTime * .018) * .08;

    if (this.simulatedTime - this.lastStats > .35) {
      this.lastStats = this.simulatedTime;
      this.updateStats(awakeRatio, coherence, breach, awareness);
    }
  }

  private updateStats(awakeRatio: number, coherence: number, breach: number, awareness: number): void {
    const rendered = Math.min(forces.population, MAX_RENDERED_SOULS);
    const logicalPerParticle = forces.population / rendered;
    const averageLifeRate = .03 * Math.max(.01, forces.speed);
    const lives = Math.floor(this.simulatedTime * rendered * averageLifeRate * logicalPerParticle);
    get('population-stat').textContent = forces.population.toLocaleString();
    get('awake-stat').textContent = `${(awakeRatio * 100).toFixed(1)}%`;
    get('lives-stat').textContent = compactNumber(lives);
    get('coherence-stat').textContent = coherence.toFixed(2);
    get<HTMLElement>('threshold-progress').style.width = `${Math.min(100, coherence * 100)}%`;
    get<HTMLElement>('breach-marker').style.left = `${forces.resistance * 100}%`;

    const eras = [
      { at: 0, name: 'The Age of Sleep', title: 'A multitude of separate journeys.', copy: 'Every light follows a life, forgets it, and returns through the unseen root.' },
      { at: .12, name: 'The First Remembering', title: 'Recognition begins to spread.', copy: 'Some souls carry a faint memory across the boundary between lives.' },
      { at: .3, name: 'The Convergence', title: 'The branches begin to feel the trunk.', copy: 'Awakened lives bend toward one another without surrendering their choices.' },
      { at: .52, name: 'The Great Labor', title: 'The whole begins to pull.', copy: 'Enough lights recognize the shared body to press together against resistance.' },
      { at: .72, name: 'The Breaking Open', title: 'The boundary becomes a doorway.', copy: 'What opposed the tree becomes the pressure through which its next form is born.' },
    ];
    let nextEra = 0;
    eras.forEach((era, index) => { if (awareness >= era.at) nextEra = index; });
    if (nextEra !== this.eraIndex) {
      this.eraIndex = nextEra;
      const era = eras[nextEra];
      get('era-name').textContent = era.name;
      if (this.currentAspect === 'tree') {
        get('witness-title').textContent = era.title;
        get('witness-copy').textContent = era.copy;
      }
      showMoment(nextEra === 0 ? 'The cycle begins.' : era.name + '.');
    }
    if (breach > .08) get('era-name').textContent = 'The Threshold Opens';
  }

  private resize(): void {
    const width = this.host.clientWidth || innerWidth;
    const height = this.host.clientHeight || innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
    this.uniforms.uPixelRatio.value = Math.min(devicePixelRatio, 2);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    if (!this.active) return;
    const delta = Math.min(.05, this.clock.getDelta());
    this.updateWorld(delta);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };
}

let simulation: SoulTree | undefined;
let momentTimer = 0;

function showMoment(text: string): void {
  const moment = get<HTMLElement>('moment');
  get('moment-text').textContent = text;
  moment.style.opacity = '1';
  clearTimeout(momentTimer);
  momentTimer = window.setTimeout(() => { moment.style.opacity = '.35'; }, 4200);
}

function bindRange(id: string, outputId: string, force: keyof Forces, format: (value: number) => string): void {
  const input = get<HTMLInputElement>(id);
  const output = get<HTMLOutputElement>(outputId);
  input.addEventListener('input', () => {
    const value = Number(input.value);
    output.value = format(value);
    if (force === 'population') simulation?.setPopulation(value);
    else simulation?.setForce(force, value);
  });
}

get('enter-button').addEventListener('click', () => {
  threshold.classList.add('is-hidden');
  cosmos.classList.remove('is-hidden');
  simulation ??= new SoulTree(get('scene'));
  simulation.start();
  showMoment('The first life enters the current.');
});

bindRange('population', 'population-output', 'population', compactNumber);
bindRange('awakening', 'awakening-output', 'awakening', (value) => `${Math.round(value * 100)}%`);
bindRange('resistance', 'resistance-output', 'resistance', (value) => `${Math.round(value * 100)}%`);
bindRange('choice', 'choice-output', 'choice', (value) => `${Math.round(value * 100)}%`);
bindRange('speed', 'speed-output', 'speed', (value) => `${value.toFixed(value % 1 ? 1 : 0)}×`);

get('pause-button').addEventListener('click', () => {
  const paused = simulation?.pause() ?? false;
  get('pause-button').textContent = paused ? '▶' : 'Ⅱ';
});
get('pulse-button').addEventListener('click', () => simulation?.pulse());
get('reset-button').addEventListener('click', () => simulation?.reset());
get('controls-toggle').addEventListener('click', () => {
  const panel = get<HTMLElement>('controls-panel');
  const collapsed = panel.classList.toggle('is-collapsed');
  get('controls-toggle').textContent = collapsed ? '+' : '−';
});
document.querySelectorAll<HTMLButtonElement>('.aspect').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.aspect').forEach((item) => item.classList.remove('is-active'));
    button.classList.add('is-active');
    simulation?.changeAspect(button.dataset.view as Aspect);
  });
});
