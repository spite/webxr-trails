import {
  WebGLRenderer,
  PerspectiveCamera,
  Scene,
  Mesh,
  BoxBufferGeometry,
  MeshNormalMaterial,
  DataTexture3D,
  RedFormat,
  RGBFormat,
  RGBAFormat,
  HalfFloatType,
  FloatType,
  Line,
  RawShaderMaterial,
  LinearFilter,
  LinearMipMapLinearFilter,
  DoubleSide,
  OrthographicCamera,
  DirectionalLight,
  HemisphereLight,
  Vector3,
  Color,
  Matrix4,
  BufferAttribute,
  TorusKnotBufferGeometry,
  UnsignedByteType,
  Clock,
  BackSide,
  Raycaster,
  Vector2,
  BufferGeometry,
  LineBasicMaterial,
  AdditiveBlending,
  IcosahedronBufferGeometry,
  PlaneBufferGeometry,
  MeshStandardMaterial,
} from "../third_party/three.module.js";
import { OrbitControls } from "../third_party/OrbitControls.js";

import { trails, Trail, TrailGroup } from "./trail.js";

import { VRButton } from "../third_party/VRButton.js";
import { XRControllerModelFactory } from "../third_party/XRControllerModelFactory.js";
import { XRHandModelFactory } from "../third_party/XRHandModelFactory.js";

const av = document.querySelector("gum-av");
const status = document.querySelector("#status");
let model;

const renderer = new WebGLRenderer({
  preserveDrawingBuffer: false,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0, 0);
renderer.xr.enabled = true;

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

const group = new TrailGroup(50, POINTS);
const up = new Vector3(0, 1, 0);

for (let trail of trails) {
  const ptr = ~~(Math.random() * palette.length);
  trail.ribbonMesh.material.color = new Color(palette[ptr]);
  scene.add(trail.ribbonMesh);
}

const fingers = [];

if ("XRHand" in window) {
  fingers.push(XRHand.THUMB_PHALANX_TIP);
  fingers.push(XRHand.INDEX_PHALANX_TIP);
  fingers.push(XRHand.MIDDLE_PHALANX_TIP);
  fingers.push(XRHand.RING_PHALANX_TIP);
  fingers.push(XRHand.LITTLE_PHALANX_TIP);
}

const hands = 2;
const trailsPerFinger = 5;

// for (let j = 0; j < fingers.length * hands * trailsPerFinger; j++) {
//   const trail = new Trail();
//   trails.push(trail);
//   scene.add(trail.mesh);
// }

const trail = new Trail();
trails.push(trail);
scene.add(trail.mesh);

function resize() {
  let w = window.innerWidth;
  let h = window.innerHeight;
  renderer.setSize(w, h);
  renderer.domElement.style.width = "100%";
  renderer.domElement.style.height = "100%";

  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

let playing = true;
window.addEventListener("keydown", (e) => {
  if (e.keyCode === 32) {
    playing = !playing;
  }
});

let width = 0;
let height = 0;

async function render() {
  renderer.setAnimationLoop(render);

  // if (width !== av.video.videoWidth || height !== av.video.videoHeight) {
  //   const w = av.video.videoWidth;
  //   const h = av.video.videoHeight;
  //   orthoCamera.left = -0.5 * w;
  //   orthoCamera.right = 0.5 * w;
  //   orthoCamera.top = 0.5 * h;
  //   orthoCamera.bottom = -0.5 * h;
  //   orthoCamera.updateProjectionMatrix();
  //   width = w;
  //   height = h;
  // }

  // const predictions = await model.estimateHands(av.video);
  // if (predictions.length) {
  //   const joint = predictions[0].annotations.indexFinger[0];
  //   const x = joint[0];
  //   const y = joint[1];
  //   const z = joint[2];
  //   trail.update(new Vector3(x, y, z).multiplyScalar(0.1));
  // }

  const dir = new Vector3();
  for (let j = 0; j < fingers.length; j++) {
    const pos = hand1.joints[fingers[j]].position;
    const pos2 = hand2.joints[fingers[j]].position;
    const nextJoinPos = hand1.joints[fingers[j] - 1].position;
    const nextJoinPos2 = hand2.joints[fingers[j] - 1].position;
    const n = pos.clone().sub(nextJoinPos).normalize();
    const n2 = pos2.clone().sub(nextJoinPos2).normalize();

    for (let i = 0; i < trailsPerFinger; i++) {
      const pts = trails[j + i * 10].points;
      // if (pts.length) {
      //   dir.copy(pts[0].position).sub(pts[1].position).normalize();
      //   n.crossVectors(dir, up).normalize();
      //   n.cross(dir);
      // }
      trails[j + i * 10].update(pos, n);
      // const pts2 = trails[j + 5 + i * 10].points;
      // if (pts2.length) {
      //   dir.copy(pts2[0].position).sub(pts2[1].position).normalize();
      //   n2.crossVectors(dir, up).normalize();
      //   n2.cross(dir);
      // }
      trails[j + 5 + i * 10].update(pos2, n2);
    }
  }
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(mesh);
  if (intersects.length) {
    const p = intersects[0];
    const n = p.face.normal;
    group.update(p.point, n);
  }
  if (playing) {
    for (const trail of trails) {
      trail.step();
      trail.render();
    }
  }
  renderer.render(scene, camera);
}

const controller1 = renderer.xr.getController(0);
scene.add(controller1);

const controller2 = renderer.xr.getController(1);
scene.add(controller2);

const controllerModelFactory = new XRControllerModelFactory();
const handModelFactory = new XRHandModelFactory().setPath("./assets/");

// Hand 1
const controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(
  controllerModelFactory.createControllerModel(controllerGrip1)
);
scene.add(controllerGrip1);

const hand1 = renderer.xr.getHand(0);
hand1.add(handModelFactory.createHandModel(hand1, "oculus"));
scene.add(hand1);

// Hand 2
const controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(
  controllerModelFactory.createControllerModel(controllerGrip2)
);
scene.add(controllerGrip2);

const hand2 = renderer.xr.getHand(1);
hand2.add(handModelFactory.createHandModel(hand2, "oculus"));
scene.add(hand2);

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

renderer.shadowMap.enabled = true;

async function init() {
  //await Promise.all([tf.setBackend("webgl"), av.ready()]);
  //status.textContent = "Loading model...";
  //model = await handpose.load();
  document.body.appendChild(VRButton.createButton(renderer));
  render();
}

window.addEventListener("resize", resize);

resize();
init();
