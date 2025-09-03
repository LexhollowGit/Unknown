const VERSION='v2.0'
document.getElementById('version').textContent=VERSION

const WIDTH=960,HEIGHT=540,GROUND_Y=450,FIXED_DT=1/64
const GRAVITY=2200,FRICTION=1800,RUN_SPEED=300,JUMP_VY=-800

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const keys=new Map()
addEventListener('keydown',e=>keys.set(e.key.toLowerCase(),true))
addEventListener('keyup',e=>keys.set(e.key.toLowerCase(),false))

// === Animations (poses) ===
const PUNCH_FRAMES=[
  {arm:0}, {arm:1.2}, {arm:1.8}, {arm:0}
]
const KICK_FRAMES=[
  {leg:0}, {leg:-1.0}, {leg:-1.4}, {leg:0}
]
const BLOCK_FRAMES=[
  {block:true}, {block:true}, {block:true}, {block:true}
]
const WALK_FRAMES=[
  {leg:0.8,arm:-0.6}, {leg:-0.8,arm:0.6}
]

class Fighter{
  constructor(x,facing,color){
    this.x=x;this.y=GROUND_Y
    this.vx=0;this.vy=0
    this.facing=facing;this.color=color
    this.hp=100;this.stamina=100
    this.grounded=true
    this.state='idle';this.animT=0;this.animFrame=0
    this.blocking=false
  }
  isAlive(){return this.hp>0}
  tick(dt,input,enemy){
    if(!this.isAlive())return
    this.stamina=clamp(this.stamina+20*dt,0,100)
    if(!this.grounded)this.vy+=GRAVITY*dt
    if(this.state==='idle'||this.state==='walk'){
      if(input.left){this.vx=-RUN_SPEED;this.state='walk'}
      else if(input.right){this.vx=RUN_SPEED;this.state='walk'}
      else{this.vx=0;this.state='idle'}
      if(input.jump&&this.grounded){this.vy=JUMP_VY;this.grounded=false}
      if(input.light&&this.stamina>10)this.startAnim('punch')
      if(input.heavy&&this.stamina>15)this.startAnim('kick')
      if(input.block)this.startAnim('block')
    }
    this.x+=this.vx*dt;this.y+=this.vy*dt
    if(this.y>=GROUND_Y){this.y=GROUND_Y;this.vy=0;this.grounded=true}
    this.x=clamp(this.x,40,WIDTH-40)
    this.facing=(enemy.x>=this.x)?1:-1
    this.advanceAnim(dt)
  }
  startAnim(kind){
    this.state=kind
    this.animFrame=0;this.animT=0
    if(kind==='punch')this.stamina-=10
    if(kind==='kick')this.stamina-=15
  }
  advanceAnim(dt){
    if(['punch','kick','block'].includes(this.state)){
      this.animT+=dt*64/4 // 4 ticks per frame
      if(this.animT>=1){this.animT=0;this.animFrame++
        const max=(this.state==='punch'?PUNCH_FRAMES.length: this.state==='kick'?KICK_FRAMES.length:BLOCK_FRAMES.length)
        if(this.animFrame>=max){this.state='idle';this.animFrame=0}
      }
    }else if(this.state==='walk'){
      this.animT+=dt*64/8
      if(this.animT>=1){this.animT=0;this.animFrame=(this.animFrame+1)%WALK_FRAMES.length}
    }
  }
  getHitbox(){
    if(this.state==='punch'&&this.animFrame===2)return{x:this.x+this.facing*40,y:this.y-60,w:40,h:40,dmg:8,kb:250,owner:this}
    if(this.state==='kick'&&this.animFrame===2)return{x:this.x+this.facing*50,y:this.y-40,w:50,h:30,dmg:12,kb:400,owner:this}
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
    let legOff=0,armOff=0,blocking=false
    if(this.state==='walk'){const f=WALK_FRAMES[this.animFrame];legOff=f.leg;armOff=f.arm}
    if(this.state==='punch'){armOff=PUNCH_FRAMES[this.animFrame].arm||0}
    if(this.state==='kick'){legOff=KICK_FRAMES[this.animFrame].leg||0}
    if(this.state==='block'){blocking=true}
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(torsoX-15,torsoY+40+legOff*20);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(torsoX+15,torsoY+40-legOff*20);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY-20);ctx.lineTo(torsoX-25*this.facing,torsoY+10+armOff*10);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY-20);ctx.lineTo(torsoX+25*this.facing,torsoY+10-armOff*10);ctx.stroke()
    if(blocking){ctx.save();ctx.globalAlpha=0.5;ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(torsoX,torsoY-10,18,0,Math.PI*2);ctx.fill();ctx.restore()}
  }
}

class CPU{
  constructor(me,enemy){this.me=me;this.enemy=enemy;this.cool=0;this.mode='idle'}
  setDifficulty(d){this.diff=d}
  think(dt){
    this.cool-=dt;if(this.cool>0)return{}
    const dist=Math.abs(this.enemy.x-this.me.x)
    const inCorner=(this.me.x<100||this.me.x>WIDTH-100)
    let act={}
    if(!this.me.isAlive()||!this.enemy.isAlive())return{}
    if(dist>260&&!inCorner){act.right=this.enemy.x>this.me.x;act.left=this.enemy.x<this.me.x}
    else if(dist<120){if(Math.random()<0.4)act.block=true;else if(Math.random()<0.6)act.jump=true}
    else{if(Math.random()<0.5)act.right=this.enemy.x>this.me.x;else act.left=this.enemy.x<this.me.x}
    if(dist<180){if(Math.random()<0.5)act.light=true;else act.heavy=true}
    if(inCorner&&Math.random()<0.5)act.jump=true
    this.cool=0.15+Math.random()*0.2
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
