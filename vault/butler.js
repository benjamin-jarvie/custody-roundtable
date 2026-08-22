// The Butler host: a 2.5D billboard sprite drawn on canvas, and the
// caption queue. Replace makeButlerTexture with real art later; nothing
// else changes.

export function makeButlerTexture(){
  const c=document.createElement("canvas"); c.width=512; c.height=1024;
  const x=c.getContext("2d");
  const GOLD="#FBDC7B", INK="#0d1016", SUIT="#1a2029", SUIT2="#232b38", SKIN="#e8d6b8", SHIRT="#EDE8DA";
  x.clearRect(0,0,512,1024);
  // shadow under feet
  x.fillStyle="rgba(0,0,0,.45)"; x.beginPath(); x.ellipse(256,990,120,18,0,0,7); x.fill();
  // legs
  x.fillStyle=INK;
  x.fillRect(196,760,44,220); x.fillRect(272,760,44,220);
  x.fillStyle="#000"; x.fillRect(188,962,60,26); x.fillRect(266,962,64,26);
  // tailcoat body
  const grd=x.createLinearGradient(150,300,360,800);
  grd.addColorStop(0,SUIT2); grd.addColorStop(1,SUIT);
  x.fillStyle=grd;
  x.beginPath();
  x.moveTo(256,300);
  x.bezierCurveTo(160,315,140,400,148,520);
  x.lineTo(150,780); x.lineTo(210,760); x.lineTo(256,700);
  x.lineTo(302,760); x.lineTo(362,780); x.lineTo(364,520);
  x.bezierCurveTo(372,400,352,315,256,300);
  x.closePath(); x.fill();
  // coat opening / shirt
  x.fillStyle=SHIRT;
  x.beginPath(); x.moveTo(256,318); x.lineTo(222,470); x.lineTo(256,640); x.lineTo(290,470); x.closePath(); x.fill();
  // lapels
  x.fillStyle=INK;
  x.beginPath(); x.moveTo(256,318); x.lineTo(198,360); x.lineTo(232,480); x.lineTo(256,380); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(256,318); x.lineTo(314,360); x.lineTo(280,480); x.lineTo(256,380); x.closePath(); x.fill();
  // gold piping on lapels
  x.strokeStyle=GOLD; x.lineWidth=3;
  x.beginPath(); x.moveTo(202,362); x.lineTo(234,474); x.moveTo(310,362); x.lineTo(278,474); x.stroke();
  // buttons
  x.fillStyle=GOLD;
  for(const y of [500,545,590]){ x.beginPath(); x.arc(256,y,6,0,7); x.fill(); }
  // bow tie
  x.fillStyle=GOLD;
  x.beginPath(); x.moveTo(256,332); x.lineTo(222,316); x.lineTo(222,350); x.closePath(); x.fill();
  x.beginPath(); x.moveTo(256,332); x.lineTo(290,316); x.lineTo(290,350); x.closePath(); x.fill();
  x.beginPath(); x.arc(256,332,8,0,7); x.fill();
  // left arm folded behind back (hint of sleeve)
  x.strokeStyle=SUIT2; x.lineWidth=34; x.lineCap="round";
  x.beginPath(); x.moveTo(168,392); x.quadraticCurveTo(120,470,150,540); x.stroke();
  // right arm presenting a tray
  x.beginPath(); x.moveTo(344,392); x.quadraticCurveTo(420,440,412,520); x.stroke();
  // white glove
  x.fillStyle=SHIRT; x.beginPath(); x.arc(414,532,20,0,7); x.fill();
  // the tray, with a tiny seed plate on it
  x.fillStyle="#2b3442"; x.beginPath(); x.ellipse(420,512,66,14,0,0,7); x.fill();
  x.strokeStyle=GOLD; x.lineWidth=3; x.beginPath(); x.ellipse(420,512,66,14,0,0,7); x.stroke();
  x.fillStyle="#39424f"; x.fillRect(390,486,60,18);
  x.strokeStyle=GOLD; x.lineWidth=2; x.strokeRect(390,486,60,18);
  // neck + head
  x.fillStyle=SKIN; x.fillRect(240,268,32,44);
  x.beginPath(); x.arc(256,220,62,0,7); x.fill();
  // hair, side part
  x.fillStyle=INK;
  x.beginPath(); x.arc(256,204,62,Math.PI*0.98,Math.PI*2.02); x.fill();
  x.beginPath(); x.moveTo(194,214); x.quadraticCurveTo(216,178,318,196); x.lineTo(318,176); x.quadraticCurveTo(230,150,194,200); x.closePath(); x.fill();
  // ears
  x.fillStyle=SKIN; x.beginPath(); x.arc(196,226,10,0,7); x.fill(); x.beginPath(); x.arc(316,226,10,0,7); x.fill();
  // face: closed content eyes + slight smile, discreet
  x.strokeStyle=INK; x.lineWidth=4; x.lineCap="round";
  x.beginPath(); x.moveTo(226,224); x.quadraticCurveTo(234,230,242,224); x.stroke();
  x.beginPath(); x.moveTo(270,224); x.quadraticCurveTo(278,230,286,224); x.stroke();
  x.beginPath(); x.moveTo(240,258); x.quadraticCurveTo(256,268,272,258); x.stroke();
  // monocle on the right eye, gold chain
  x.strokeStyle=GOLD; x.lineWidth=4;
  x.beginPath(); x.arc(278,225,17,0,7); x.stroke();
  x.lineWidth=2; x.beginPath(); x.moveTo(288,238); x.quadraticCurveTo(300,280,290,318); x.stroke();
  return c;
}

const say=document.getElementById("say");
let timer=null,queue=[];
export function speak(lines,delay=0){
  queue=Array.isArray(lines)?lines.slice():[lines];
  clearTimeout(timer);
  const next=()=>{
    if(!queue.length)return;
    const l=queue.shift();
    say.textContent=l;
    if(queue.length) timer=setTimeout(next,Math.max(2600,l.length*55));
  };
  timer=setTimeout(next,delay);
}
