import * as THREE from './vendor/three.js';
import {createGlassPlane} from './flight-geometry.js?v=cinema-2';
import {flightPose} from './flight-pose.js?v=cinema-2';

function studioSky(renderer) {
 // A small dawn-colored environment supplies reflections without a remote HDRI.
 const width=128, height=64, pixels=new Float32Array(width*height*4);
 for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
  const u=x/width, v=y/height;
  const key=Math.exp(-Math.pow((u-.23)/.1,2)-Math.pow((v-.25)/.2,2))*3.8;
  const rim=Math.exp(-Math.pow((u-.77)/.065,2)-Math.pow((v-.38)/.18,2))*2.7;
  const horizon=Math.exp(-Math.pow((v-.5)/.045,2))*.8;
  const i=(y*width+x)*4;
  pixels[i]=.025+key*.8+rim*.42+horizon*.85;
  pixels[i+1]=.06+key*.95+rim*.78+horizon*.7;
  pixels[i+2]=.085+key+rim+horizon*.48;
  pixels[i+3]=1;
 }
 const texture=new THREE.DataTexture(pixels,width,height,THREE.RGBAFormat,THREE.FloatType);
 texture.mapping=THREE.EquirectangularReflectionMapping;
 texture.needsUpdate=true;
 const generator=new THREE.PMREMGenerator(renderer);
 try {return generator.fromEquirectangular(texture);}
 finally {generator.dispose();texture.dispose();}
}

export function mountFlightScene(root,{state,onFailure}) {
 const host=root.querySelector('.flight-canvas');
 let renderer,environment,plane,resizeObserver,frame=0,last=0;
 let disposed=false,dirty=true;
 let currentState={...state};
 const pointer={x:0,y:0};
 let target=flightPose(state.progress,pointer,state.reducedMotion,state.narrow);
 let current={...target};
 const scene=new THREE.Scene();
 const camera=new THREE.PerspectiveCamera(24,1.5,.1,25);
 const canRender=()=>!disposed && currentState.visible && document.visibilityState!=='hidden';

 function dispose() {
  if(disposed) return;
  disposed=true;
  cancelAnimationFrame(frame);
  resizeObserver?.disconnect();
  document.removeEventListener('visibilitychange',visibilityChanged);
  renderer?.domElement.removeEventListener('webglcontextlost',contextLost);
  plane?.dispose();environment?.dispose();
  renderer?.dispose();renderer?.forceContextLoss();
  renderer?.domElement.remove();
 }
 function fail(error) {dispose();onFailure(error);}
 function contextLost(event) {event.preventDefault();fail(new Error('The glass scene lost its WebGL context.'));}
 function applyPose() {
  plane.group.rotation.set(current.rx,current.ry,current.rz);
  plane.group.position.x=current.px;
  plane.group.position.y=current.py;
  camera.position.set(current.cameraX,current.cameraY,current.cameraZ);
  camera.lookAt(0,-.04,0);
 }
 function draw() {applyPose();renderer.render(scene,camera);dirty=false;}
 function requestFrame() {if(canRender() && !frame) {last=0;frame=requestAnimationFrame(tick);}}
 function tick(time) {
  frame=0;
  if(!canRender()) return;
  const step=currentState.reducedMotion?1:1-Math.exp(-Math.min(last?time-last:16,50)/85);
  last=time;
  let moving=false;
  for(const key of Object.keys(target)) {
   const delta=target[key]-current[key];
   if(Math.abs(delta)>.00015) {current[key]+=delta*step;moving=true;}
   else current[key]=target[key];
  }
  try {if(moving || dirty) draw();}
  catch(error) {fail(error);return;}
  if(moving) frame=requestAnimationFrame(tick);
 }
 function retarget() {
  target=flightPose(currentState.progress,pointer,currentState.reducedMotion,currentState.narrow);
  const moving=Object.keys(target).some(key=>Math.abs(target[key]-current[key])>.00015);
  if(currentState.reducedMotion && moving) {current={...target};dirty=true;}
  if(moving || dirty) requestFrame();
 }
 function update(next) {
  if(disposed) return;
  const changedSize=next.narrow!==undefined && next.narrow!==currentState.narrow;
  currentState={...currentState,...next};
  if(changedSize) resize();
  if(!canRender()) {cancelAnimationFrame(frame);frame=0;}
  retarget();
 }
 function resize() {
  if(disposed) return;
  const width=Math.max(1,host.clientWidth),height=Math.max(1,host.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,currentState.narrow?1.5:2));
  renderer.setSize(width,height,false);
  camera.aspect=width/height;camera.updateProjectionMatrix();
  dirty=true;requestFrame();
 }
 function visibilityChanged() {
  if(!canRender()) {cancelAnimationFrame(frame);frame=0;}
  else {dirty=true;requestFrame();}
 }
 function confirmFrame() {
  const gl=renderer.getContext();
  const pixels=new Uint8Array(gl.drawingBufferWidth*gl.drawingBufferHeight*4);
  gl.readPixels(0,0,gl.drawingBufferWidth,gl.drawingBufferHeight,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
  let visible=0;
  for(let i=3;i<pixels.length;i+=4) if(pixels[i]>16) visible++;
  if(gl.isContextLost() || visible<12) throw new Error('The glass scene did not produce a visible first frame.');
 }

 try {
  renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
  renderer.debug.onShaderError=()=>{throw new Error('The glass scene could not compile its shaders.');};
  renderer.setClearColor(0x0b2029,0);
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.1;
  renderer.transmissionResolutionScale=.75;
  renderer.domElement.setAttribute('aria-hidden','true');
  host.append(renderer.domElement);
  environment=studioSky(renderer);scene.environment=environment.texture;
  scene.fog=new THREE.FogExp2(0x0b2029,.023);
  scene.add(new THREE.HemisphereLight(0xe2f1ed,0x193943,1.8));
  const key=new THREE.DirectionalLight(0xdfefeb,3.4);key.position.set(-2,5,3);scene.add(key);
  const rim=new THREE.DirectionalLight(0xc2dee8,2.1);rim.position.set(3,1,-4);scene.add(rim);
  plane=createGlassPlane(THREE);scene.add(plane.group);
  resize();draw();confirmFrame();
  renderer.domElement.addEventListener('webglcontextlost',contextLost);
  document.addEventListener('visibilitychange',visibilityChanged);
  if('ResizeObserver' in window) {resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}
  return {
   update,
   resize,
   pointer(x,y) {pointer.x=x;pointer.y=y;retarget();},
   dispose
  };
 } catch(error) {dispose();throw error;}
}
