export const clamp = (value,min=0,max=1) => Math.max(min,Math.min(max,value));
const smooth = (a,b,value) => {const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};

// Arrive, bank, hold beside the story, then make a small upward departure.
export function flightPose(progress,pointer={x:0,y:0},reduced=false,narrow=false) {
 const p = reduced ? .52 : clamp(progress);
 const travel = .78*smooth(.08,.4,p)+.22*smooth(.68,.98,p);
 const gain = reduced || narrow ? 0 : 1;
 const x = clamp(pointer.x,-.5,.5)*gain;
 const y = clamp(pointer.y,-.5,.5)*gain;
 const amount = narrow ? .9 : 1;
 return {
  rx:-.12+travel*.18*amount-y*.14,
  ry:.42+travel*.65*amount+x*.2,
  rz:-.11+travel*.22*amount+x*.045,
  px:-.08+travel*.16*amount,
  py:travel*.13*amount,
  cameraX:2.8-travel*.24*amount,
  cameraY:3.6-travel*.14*amount,
  cameraZ:6.15-travel*.5*amount
 };
}
