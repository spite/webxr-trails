import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Mesh,
  MeshNormalMaterial,
  OrthographicCamera,
  DirectionalLight,
  HemisphereLight,
  Vector3,
  Color,
  Raycaster,
  PCFSoftShadowMap,
  sRGBEncoding,
  Vector2,
  IcosahedronBufferGeometry,
} from "../third_party/three.module.js";
import { OrbitControls } from "../third_party/OrbitControls.js";

import { trails, Trail, TrailGroup } from "./trail.js";

import { VRButton } from "../third_party/VRButton.js";
import { XRControllerModelFactory } from "../third_party/XRControllerModelFactory.js";
import { XRHandModelFactory } from "../third_party/XRHandModelFactory.js";

const av = document.querySelector("gum-av");
const canvas = document.querySelector("canvas");
const status = document.querySelector("#status");

const renderer = new WebGLRenderer({
  antialias: true,
  alpha: true,
  canvas,
  preserveDrawingBuffer: false,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(window.devicePixelRatio);
//renderer.setClearColor(0, 0);
renderer.xr.enabled = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = PCFSoftShadowMap;
renderer.outputEncoding = sRGBEncoding;

document.body.append(renderer.domElement);

const scene = new Scene();
const camera = new PerspectiveCamera(60, 1, 0.1, 100);
camera.position.set(0, 0, 2);

const orthoCamera = new OrthographicCamera(1, 1, 1, 1, -1000, 1000);

const controls = new OrbitControls(camera, renderer.domElement);
controls.screenSpacePanning = true;

const geo = new IcosahedronBufferGeometry(0.5, 3);
const mat = new MeshNormalMaterial({
  wireframe: true,
  opacity: 0.1,
  transparent: true,
  depthWrite: false,
});
const mesh = new Mesh(geo, mat);
scene.add(mesh);

const raycaster = new Raycaster();
const mouse = new Vector2();

function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}
window.addEventListener("mousemove", onMouseMove, false);

const POINTS = 50;

const palette = [
  "#CA0045",
  "#052269",
  "#FFC068",
  "#114643",
  "#9BC2B5",
  "#CE8D3D",
  "#BD3E30",
];

//const group = new TrailGroup(50, POINTS);
const up = new Vector3(0, 1, 0);

const fingerNames = [
  "thumb",
  "indexFinger",
  "middleFinger",
  "ringFinger",
  "pinky",
];

const hands = 2;
const trailsPerFinger = 1;

for (let j = 0; j < fingerNames.length * hands * trailsPerFinger; j++) {
  const trail = new Trail(POINTS, 10);
  trails.push(trail);
  scene.add(trail.mesh);
}

for (let trail of trails) {
  const ptr = ~~(Math.random() * palette.length);
  trail.ribbonMesh.material.color = new Color(palette[ptr]);
  scene.add(trail.ribbonMesh);
}

let width = 0;
let height = 0;
let flipCamera = true;

function resize() {
  const videoAspectRatio = width / height;
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const windowAspectRatio = windowWidth / windowHeight;
  let adjustedWidth;
  let adjustedHeight;
  if (videoAspectRatio > windowAspectRatio) {
    adjustedWidth = windowWidth;
    adjustedHeight = windowWidth / videoAspectRatio;
  } else {
    adjustedWidth = windowHeight * videoAspectRatio;
    adjustedHeight = windowHeight;
  }
  renderer.setSize(adjustedWidth, adjustedHeight);
}

let playing = true;
window.addEventListener("keydown", (e) => {
  if (e.keyCode === 32) {
    playing = !playing;
  }
});

async function render() {
  // Flip video element horizontally if necessary.
  av.video.style.transform = flipCamera ? "scaleX(-1)" : "scaleX(1)";

  if (width !== av.video.videoWidth || height !== av.video.videoHeight) {
    const w = av.video.videoWidth;
    const h = av.video.videoHeight;
    orthoCamera.left = -0.5 * w;
    orthoCamera.right = 0.5 * w;
    orthoCamera.top = 0.5 * h;
    orthoCamera.bottom = -0.5 * h;
    orthoCamera.updateProjectionMatrix();
    width = w;
    height = h;
    resize();
  }

  if (playing) {
    for (const trail of trails) {
      trail.step();
      trail.render();
    }
  }
  renderer.render(scene, orthoCamera);
  renderer.setAnimationLoop(render);
}

async function estimate() {
  const predictions = await model.estimateHands(av.video);

  av.style.opacity = 1;
  status.textContent = "";

  if (predictions.length) {
    let ptr = 0;
    for (let j = 0; j < fingerNames.length; j++) {
      const joint = predictions[0].annotations[fingerNames[j]][3];
      const jointN = predictions[0].annotations[fingerNames[j]][2];
      const x = -1 * (joint[0] - 0.5 * width);
      const y = height - joint[1] - 0.5 * height;
      const z = joint[2];
      const xn = -1 * (jointN[0] - 0.5 * width);
      const yn = height - jointN[1] - 0.5 * height;
      const zn = jointN[2];
      const v = new Vector3(x, y, z);
      const n = v.clone();
      n.x -= xn;
      n.y -= yn;
      n.z -= zn;
      n.normalize();
      trails[ptr].update(v, n);
      ptr++;
    }
    if (predictions.length > 1) {
      for (let j = 0; j < fingerNames.length; j++) {
        const joint = predictions[1].annotations[fingerNames[j]][3];
        const jointN = predictions[1].annotations[fingerNames[j]][2];
        const x = joint[0] - 0.5 * width;
        const y = height - joint[1] - 0.5 * height;
        const z = joint[2];
        const xn = jointN[0] - 0.5 * width;
        const yn = height - jointN[1] - 0.5 * height;
        const zn = jointN[2];
        const v = new Vector3(x, y, z);
        const n = v.clone();
        n.x -= xn;
        n.y -= yn;
        n.z -= zn;
        n.normalize();
        trails[ptr].update(v, n);
        ptr++;
      }
    }
  }
  requestAnimationFrame(estimate);
}

const light = new DirectionalLight(0xffffff);
light.position.set(0, 6, 0);
light.castShadow = true;
light.shadow.camera.top = 2;
light.shadow.camera.bottom = -2;
light.shadow.camera.right = 2;
light.shadow.camera.left = -2;
light.shadow.bias = -0.00001;
light.shadow.mapSize.set(4096, 4096);
scene.add(light);

const hemiLight = new HemisphereLight(0xffffbb, 0x080820, 1);
scene.add(hemiLight);

let model;

async function init() {
  await Promise.all([tf.setBackend("webgl"), av.ready()]);
  status.textContent = "Loading model...";
  model = await handpose.load();
  document.body.appendChild(VRButton.createButton(renderer));
  render();
  estimate();
}

window.addEventListener("resize", resize);

resize();
init();
