// Four thin, folded glass panels. +X is the nose; Z spans the two wings.
export const FOLDS = [
 [[1.65,.08,0],[-1.35,.08,1.14],[-1.12,.08,.19]],
 [[1.65,.08,0],[-1.12,.08,-.19],[-1.35,.08,-1.14]],
 [[1.65,.08,0],[-1.12,.08,.19],[-1.05,-.47,0]],
 [[1.65,.08,0],[-1.05,-.47,0],[-1.12,.08,-.19]]
];

export function createGlassPlane(THREE) {
 const group = new THREE.Group();
 const material = new THREE.MeshPhysicalMaterial({
  color:0xbad7da, metalness:.04, roughness:.12, transmission:.68,
  thickness:.12, ior:1.43, clearcoat:1, clearcoatRoughness:.06,
  attenuationColor:0xaacfc9, attenuationDistance:2.4,
  envMapIntensity:1.5, flatShading:true
 });
 const edgeMaterial = new THREE.LineBasicMaterial({color:0xd6eeed,transparent:true,opacity:.4});
 const geometries = [];
 FOLDS.forEach(points => {
  const a = new THREE.Vector3(...points[0]);
  const b = new THREE.Vector3(...points[1]);
  const c = new THREE.Vector3(...points[2]);
  const normal = b.clone().sub(a).cross(c.clone().sub(a)).normalize().multiplyScalar(.013);
  const front = [a,b,c].map(p => p.clone().add(normal));
  const back = [a,b,c].map(p => p.clone().sub(normal));
  const vertices = [...front,...back];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices.flatMap(p => p.toArray()),3));
  geometry.setIndex([0,1,2,5,4,3,0,3,4,0,4,1,1,4,5,1,5,2,2,5,3,2,3,0]);
  geometry.computeVertexNormals();
  group.add(new THREE.Mesh(geometry,material));
  const edges = new THREE.EdgesGeometry(geometry,25);
  group.add(new THREE.LineSegments(edges,edgeMaterial));
  geometries.push(geometry,edges);
 });
 return {
  group,
  dispose() {geometries.forEach(geometry => geometry.dispose());material.dispose();edgeMaterial.dispose();}
 };
}
