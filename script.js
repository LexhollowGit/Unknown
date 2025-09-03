const VERSION='v3.0'
document.getElementById('version').textContent=VERSION

const WIDTH=960,HEIGHT=540,GROUND_Y=460,FIXED_DT=1/64
const GRAVITY=2200,RUN_SPEED=300,JUMP_VY=-800
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))

const keys=new Map()
addEventListener('keydown',e=>keys.set(e.key.toLowerCase(),true))
addEventListener('keyup',e=>keys.set(e.key.toLowerCase(),false))

// === Animation keyframes ===
const ANIMS={
  idle:{frames:[{legs:0,arms:0}],speed:1},
  walk:{frames:[{legs:0.8,arms:-0.6},{legs:-0.8,arms:0.6}],speed:8},
  punch:{frames:[{arms:0},{arms:0.8},{arms:1.2},{arms:0}],speed:16},
  kick:{frames:[{legs:0},{legs:-1.0},{legs:-1.5},{legs:0}],speed:16},
  block:{frames:[{block:true}],speed:1}
}

class Fighter{
  constructor(x,facing,color){
    this.x=x;this.y=GROUND_Y;this.vx=0;this.vy=0
    this.facing=facing;this.color=color
    this.hp=100;this.stamina=100
    this.grounded=true
    this.state='idle';this.animFrame=0;this.animT=0
  }
  isAlive(){return this.hp>0}
  setState(s){if(this.state!==s){this.state=s;this.animFrame=0;this.animT=0}}
  tick(dt,input,enemy){
    if(!this.isAlive())return
    this.stamina=clamp(this.stamina+20*dt,0,100)
    if(!this.grounded)this.vy+=GRAVITY*dt
    if(['idle','walk'].includes(this.state)){
      if(input.left){this.vx=-RUN_SPEED;this.setState('walk')}
      else if(input.right){this.vx=RUN_SPEED;this.setState('walk')}
      else{this.vx=0;this.setState('idle')}
      if(input.jump&&this.grounded){this.vy=JUMP_VY;this.grounded=false}
      if(input.light&&this.stamina>10){this.stamina-=10;this.setState('punch')}
      if(input.heavy&&this.stamina>15){this.stamina-=15;this.setState('kick')}
      if(input.block){this.setState('block')}
    }
    this.x+=this.vx*dt;this.y+=this.vy*dt
    if(this.y>=GROUND_Y){this.y=GROUND_Y;this.vy=0;this.grounded=true}
    this.x=clamp(this.x,40,WIDTH-40)
    this.facing=(enemy.x>=this.x)?1:-1
    this.advanceAnim(dt)
  }
  advanceAnim(dt){
    const anim=ANIMS[this.state]
    this.animT+=dt*anim.speed*64/60
    if(this.animT>=1){
      this.animT=0;this.animFrame++
      if(this.animFrame>=anim.frames.length){
        if(['punch','kick','block'].includes(this.state))this.setState('idle')
        else this.animFrame=0
      }
    }
  }
  getHitbox(){
    if(this.state==='punch'&&this.animFrame===2)return{x:this.x+this.facing*40,y:this.y-80,w:40,h:40,dmg:10,kb:250,owner:this}
    if(this.state==='kick'&&this.animFrame===2)return{x:this.x+this.facing*50,y:this.y-40,w:50,h:30,dmg:14,kb:400,owner:this}
    return null
  }
  onHit(hb){
    if(this.state==='block'){this.hp=clamp(this.hp-hb.dmg*0.3,0,100)}
    else{this.hp=clamp(this.hp-hb.dmg,0,100);this.vx+=hb.kb*this.facing;this.vy=-200}
  }
  render(ctx){
    ctx.lineCap='round';ctx.lineWidth=6;ctx.strokeStyle=this.color
    const torsoX=this.x,torsoY=this.y-60
    ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(torsoX,torsoY);ctx.stroke()
    ctx.beginPath();ctx.arc(torsoX,torsoY-20,12,0,Math.PI*2);ctx.stroke()
    const f=ANIMS[this.state].frames[this.animFrame]||{}
    const leg=f.legs||0,arm=f.arms||0,blocking=f.block
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(torsoX-15,torsoY+40+leg*20);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(torsoX+15,torsoY+40-leg*20);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY-20);ctx.lineTo(torsoX-25*this.facing,torsoY+10+arm*10);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY-20);ctx.lineTo(torsoX+25*this.facing,torsoY+10-arm*10);ctx.stroke()
    if(blocking){ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(torsoX,torsoY-10,18,0,Math.PI*2);ctx.fill();ctx.restore()}
  }
}

class CPU{
  constructor(me,enemy){this.me=me;this.enemy=enemy;this.cool=0}
  think(dt){
    this.cool-=dt;if(this.cool>0)return{}
    let act={},dist=Math.abs(this.enemy.x-this.me.x)
    if(dist>250){act.right=this.enemy.x>this.me.x;act.left=this.enemy.x<this.me.x}
    else if(dist<120){if(Math.random()<0.4)act.block=true;else if(Math.random()<0.5)act.jump=true}
    else{if(Math.random()<0.5)act.light=true;else act.heavy=true}
    if((this.me.x<100||this.me.x>WIDTH-100)&&Math.random()<0.4)act.jump=true
    this.cool=0.2+Math.random()*0.2
    return act
  }
}

const canvas=document.getElementById('game'),ctx=canvas.getContext('2d')
const hp1El=document.getElementById('hp1'),hp2El=document.getElementById('hp2'),fpsEl=document.getElementById('fps')

let p1,p2,cpu
function newMatch(){
  p1=new Fighter(WIDTH*0.3,+1,'#e5e7eb')
  p2=new Fighter(WIDTH*0.7,-1,'#fca5a5')
  cpu=new CPU(p2,p1)
}
newMatch()
document.getElementById('restart').onclick=()=>newMatch()

let acc=0,last=performance.now()/1000,frames=0,fpsTimer=0
function loop(){
  const t=performance.now()/1000;let dt=t-last;last=t;acc+=dt;fpsTimer+=dt;frames++
  while(acc>=FIXED_DT){step(FIXED_DT);acc-=FIXED_DT}
  render()
  if(fpsTimer>=.5){fpsEl.textContent=Math.round(frames/fpsTimer)+' FPS';frames=0;fpsTimer=0}
  requestAnimationFrame(loop)
}
function step(dt){
  const input1={left:keys.get('a'),right:keys.get('d'),jump:keys.get('w')||keys.get(' '),light:keys.get('j'),heavy:keys.get('k'),block:keys.get('l')}
  const input2=cpu.think(dt)
  p1.tick(dt,input1,p2);p2.tick(dt,input2,p1)
  const hb1=p1.getHitbox(),hb2=p2.getHitbox()
  if(hb1&&overlap(hb1,p2))p2.onHit(hb1)
  if(hb2&&overlap(hb2,p1))p1.onHit(hb2)
  hp1El.style.width=p1.hp+'%';hp2El.style.width=p2.hp+'%'
}
function overlap(hb,f){return Math.abs(f.x-hb.x)<hb.w&&Math.abs(f.y-hb.y)<hb.h}
function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT)
  ctx.fillStyle='#111';ctx.fillRect(0,GROUND_Y,WIDTH,HEIGHT-GROUND_Y)
  p1.render(ctx);p2.render(ctx)
}
loop()
