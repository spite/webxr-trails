import {
  Mesh,
  Line,
  DoubleSide,
  Vector3,
  BufferAttribute,
  BufferGeometry,
  LineBasicMaterial,
  AdditiveBlending,
  PlaneBufferGeometry,
  MeshStandardMaterial,
} from "../third_party/three.module.js";
import Maf from "../third_party/Maf.js";

const trails = [];

const up = new Vector3(0, 1, 0);

class Point {
  constructor(position, normal) {
    this.normal = new Vector3().copy(normal);
    this.position = new Vector3().copy(position);
    this.velocity = new Vector3(0, 0, 0);
    this.tmp = new Vector3();
  }
  step(pos, force) {
    this.tmp.copy(pos).sub(this.position).multiplyScalar(force);
    this.velocity.add(this.tmp);
    this.velocity.multiplyScalar(0.5);
    this.position.add(this.velocity);
  }
}

class Trail {
  constructor(numPoints, width) {
    this.width = width;
    this.numPoints = numPoints;
    this.spring = Maf.randomInRange(0.4, 0.5); //  0.45
    this.dampening = Maf.randomInRange(0.2, 0.25); // .25
    this.friction = Maf.randomInRange(0.45, 0.5); // .5
    this.tension = Maf.randomInRange(0.98, 0.99); // 0.98;

    this.points = [];
    this.initialised = false;
    this.vertices = new Float32Array(this.numPoints * 3);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute(
      "position",
      new BufferAttribute(this.vertices, 3)
    );
    this.material = new LineBasicMaterial({
      color: 0xffffff,
      opacity: 1,
      linewidth: 4,
      transparent: true,
      blending: AdditiveBlending,
    });
    this.mesh = new Line(this.geometry, this.material);
    this.mesh.frustumCulled = false;

    this.ribbonGeometry = new PlaneBufferGeometry(1, 1, this.numPoints - 1, 1);
    this.ribbonMaterial = new MeshStandardMaterial({
      wireframe: !true,
      side: DoubleSide,
      color: 0xffffff,
      roughness: 0.9,
      metalness: 0.1,
      //emissive: 0xffffff,
    });
    this.ribbonMesh = new Mesh(this.ribbonGeometry, this.ribbonMaterial);
    this.ribbonMesh.frustumCulled = false;
    this.ribbonMesh.receiveShadow = this.ribbonMesh.castShadow = true;

    this.ptr = 0;
  }

  update(point, normal) {
    if (!this.initialised) {
      this.initialised = true;
      for (let j = 0; j < this.numPoints; j++) {
        const p = new Point(point, normal);
        this.points[j] = p;
      }
    }
    this.points[0].position.copy(point);
    this.points[0].normal.copy(normal);
  }

  step() {
    let spring = this.spring;
    const dampening = this.dampening;
    const friction = this.friction;
    const tension = this.tension;

    for (let j = 1; j < this.points.length; j++) {
      const prev = this.points[j - 1];
      const cur = this.points[j];

      const prevNormal = this.points[j - 1].normal;
      const normal = this.points[j].normal;
      normal.lerp(prevNormal, dampening);

      cur.velocity.x += (prev.position.x - cur.position.x) * spring;
      cur.velocity.y += (prev.position.y - cur.position.y) * spring;
      cur.velocity.z += (prev.position.z - cur.position.z) * spring;
      cur.velocity.x += prev.velocity.x * dampening;
      cur.velocity.y += prev.velocity.y * dampening;
      cur.velocity.z += prev.velocity.z * dampening;
      cur.velocity.multiplyScalar(friction);
      //   cur.velocity.x += 0.001 * normal.x;
      //   cur.velocity.y += 0.001 * normal.y;
      //   cur.velocity.z += 0.001 * normal.z;

      cur.position.add(cur.velocity);
      spring *= tension;
    }
  }

  render() {
    for (let j = 0; j < this.points.length; j++) {
      const p = this.points[j].position;
      this.vertices[j * 3] = p.x;
      this.vertices[j * 3 + 1] = p.y;
      this.vertices[j * 3 + 2] = p.z;
    }
    this.geometry.attributes.position.needsUpdate = true;

    const vertices = this.ribbonGeometry.attributes.position.array;
    const w = this.width;
    const n = new Vector3();
    const t = new Vector3();
    for (let j = 0; j < this.points.length; j++) {
      const p = this.points[j].position;
      n.copy(this.points[j].normal);
      n.normalize();
      vertices[j * 3] = p.x - 0.01 * n.x;
      vertices[j * 3 + 1] = p.y - 0.01 * n.y;
      vertices[j * 3 + 2] = p.z - 0.01 * n.z;
      vertices[(j + this.points.length) * 3 + 0] = p.x - (0.01 + w) * n.x;
      vertices[(j + this.points.length) * 3 + 1] = p.y - (0.01 + w) * n.y;
      vertices[(j + this.points.length) * 3 + 2] = p.z - (0.01 + w) * n.z;
    }
    this.ribbonGeometry.attributes.position.needsUpdate = true;
    this.ribbonGeometry.computeVertexNormals();
    this.ribbonGeometry.computeFaceNormals();
  }
}

class TrailGroup {
  constructor(num, numPoints, width) {
    this.trails = [];
    for (let j = 0; j < num; j++) {
      const trail = new Trail(numPoints, width);
      this.trails.push(trail);
      trails.push(trail);
    }
  }

  update(point, normal) {
    for (let trail of this.trails) {
      trail.update(point, normal);
    }
  }
}

export { Trail, TrailGroup, trails };
