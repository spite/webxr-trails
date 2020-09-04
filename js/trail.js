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
  constructor(numPoints) {
    this.numPoints = numPoints;
    this.spring = 0.4 + Math.random() * 0.2;
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
    for (let j = 1; j < this.points.length; j++) {
      spring *= 0.99; //this.spring; // (this.spring * (this.points.length - j)) / this.points.length;
      const prev = this.points[j - 1];
      const cur = this.points[j];
      cur.step(prev.position, spring);
      const prevNormal = this.points[j - 1].normal;
      const normal = this.points[j].normal;
      normal.lerp(prevNormal, 0.1);
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
    const w = 0.1;
    const n = new Vector3();
    const t = new Vector3();
    for (let j = 0; j < this.points.length; j++) {
      const p = this.points[j].position;
      n.copy(this.points[j].normal);
      n.multiplyScalar(w);
      vertices[j * 3] = p.x + n.x;
      vertices[j * 3 + 1] = p.y + n.y;
      vertices[j * 3 + 2] = p.z + n.z;
      vertices[(j + this.points.length) * 3 + 0] = p.x - n.x;
      vertices[(j + this.points.length) * 3 + 1] = p.y - n.y;
      vertices[(j + this.points.length) * 3 + 2] = p.z - n.z;
    }
    this.ribbonGeometry.attributes.position.needsUpdate = true;
    this.ribbonGeometry.computeVertexNormals();
    this.ribbonGeometry.computeFaceNormals();
  }
}

class TrailGroup {
  constructor(num, numPoints) {
    this.trails = [];
    for (let j = 0; j < num; j++) {
      const trail = new Trail(numPoints);
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
