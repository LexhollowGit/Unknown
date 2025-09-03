const VERSION='final-1'
document.getElementById('version').textContent=VERSION

const WIDTH=960,HEIGHT=540,GROUND_Y=460
const FIXED_DT=1/64
const GRAVITY=2200,RUN_SPEED=300,JUMP_VY=-820,FRICTION=1400
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))

const keys=new Set()
addEventListener('keydown',e=>keys.add(e.key.toLowerCase()))
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()))
addEventListener('blur',()=>keys.clear())

const ANIM={
  idle:{frames:[{leg:0,arm:0}],fps:6},
  walk:{frames:[{leg:1,arm:-0.6},{leg:-1,arm:0.6}],fps:12},
  punch:{frames:[{arm:0},{arm:1.0},{arm:1.5,forward:10},{arm:0}],fps:20},
  kick:{frames:[{leg:0},{leg:-1.2},{leg:-1.6,forward:6},{leg:0}],fps:18},
  block:{frames:[{block:1}],fps:1}
}

class Fighter{
  constructor(x,facing,color){
    this.x=x;this.y=GROUND_Y;this.vx=0;this.vy=0
    this.facing=facing;this.color=color
    this.hp=100;this.stamina=100;this.grounded=true
    this.state='idle';this.anim=ANIM.idle;this.af=0;this.at=0
    this.width=28;this.height=120;this.lastHit=0
  }
  isAlive(){return this.hp>0}
  changeState(s){
    if(this.state===s)return
    this.state=s
    this.anim=ANIM[s]||ANIM.idle
    this.af=0;this.at=0
  }
  applyInput(input,enemy,dt){
    this.stamina=clamp(this.stamina+18*dt,0,100)
    if(!this.grounded)this.vy+=GRAVITY*dt
    const canMove=['idle','walk'].includes(this.state)
    if(canMove){
      if(input.left){this.vx=-RUN_SPEED;this.changeState('walk')}
      else if(input.right){this.vx=RUN_SPEED;this.changeState('walk')}
      else {this.vx=clamp(this.vx - Math.sign(this.vx)*FRICTION*dt,-RUN_SPEED,RUN_SPEED);if(Math.abs(this.vx)<5){this.vx=0;this.changeState('idle')}}
      if(input.jump&&this.grounded){this.vy=JUMP_VY;this.grounded=false}
      if(input.light&&this.stamina>=12){this.stamina-=12;this.changeState('punch')}
      if(input.heavy&&this.stamina>=20){this.stamina-=20;this.changeState('kick')}
      if(input.block){this.changeState('block')}
    }
    this.x+=this.vx*dt;this.y+=this.vy*dt
    if(this.y>=GROUND_Y){this.y=GROUND_Y;this.vy=0;this.grounded=true}
    this.x=clamp(this.x,40,WIDTH-40)
    this.facing=(enemy.x>=this.x)?1:-1
  }
  updateAnim(dt){
    this.at += dt * this.anim.fps
    if(this.at >= 1){this.at = 0; this.af++}
    if(this.af >= this.anim.frames.length){
      if(this.state==='punch'||this.state==='kick'||this.state==='block')this.changeState('idle')
      else this.af%=this.anim.frames.length
    }
  }
  getPose(){
    const f = this.anim.frames[this.af]||{}
    return {leg:f.leg||0,arm:f.arm||0,forward:f.forward||0,block:!!f.block}
  }
  getHitbox(){
    const pose=this.getPose()
    if(this.state==='punch' && this.af===2) return {x:this.x + this.facing*(40+pose.forward), y:this.y-80, w:52, h:34, dmg:10, kb:240, owner:this}
    if(this.state==='kick' && this.af===2) return {x:this.x + this.facing*(52+pose.forward), y:this.y-40, w:62, h:30, dmg:14, kb:420, owner:this}
    return null
  }
  receiveHit(hb,dir){
    const blocked = this.state==='block'
    const dmg = blocked ? Math.round(hb.dmg*0.32) : hb.dmg
    this.hp = clamp(this.hp - dmg, 0, 100)
    if(!blocked){
      this.vx += dir * Math.min(hb.kb*0.8, 800)
      this.vy = -160
      this.grounded=false
    }
    this.lastHit = performance.now()/1000
  }
  render(ctx){
    ctx.lineCap='round';ctx.lineWidth=6;ctx.strokeStyle=this.color
    const torsoX=this.x, torsoY=this.y - 60
    ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(torsoX,torsoY);ctx.stroke()
    ctx.beginPath();ctx.arc(torsoX,torsoY-20,12,0,Math.PI*2);ctx.stroke()
    const pose=this.getPose()
    const legAngle = pose.leg||0
    const armAngle = pose.arm||0
    const hipLx = torsoX-8, hipLy = torsoY+10
    const kneeLx = hipLx + Math.cos(1.4 + legAngle)*34
    const kneeLy = hipLy + Math.sin(1.4 + legAngle)*34
    const footLx = kneeLx + Math.cos(1.2 + legAngle*0.6)*34
    const footLy = kneeLy + Math.sin(1.2 + legAngle*0.6)*34
    const hipRx = torsoX+8, hipRy = hipLy
    const kneeRx = hipRx + Math.cos(1.6 - legAngle)*34
    const kneeRy = hipRy + Math.sin(1.6 - legAngle)*34
    const footRx = kneeRx + Math.cos(1.4 - legAngle*0.6)*34
    const footRy = kneeRy + Math.sin(1.4 - legAngle*0.6)*34
    ctx.beginPath();ctx.moveTo(hipLx,hipLy);ctx.lineTo(kneeLx,kneeLy);ctx.lineTo(footLx,footLy);ctx.stroke()
    ctx.beginPath();ctx.moveTo(hipRx,hipRy);ctx.lineTo(kneeRx,kneeRy);ctx.lineTo(footRx,footRy);ctx.stroke()
    const shoulderLx = torsoX-12, shoulderLy = torsoY-10
    const elbowLx = shoulderLx + Math.cos(-0.6 + armAngle)*26
    const elbowLy = shoulderLy + Math.sin(-0.6 + armAngle)*26
    const handLx = elbowLx + Math.cos(-0.2 + armAngle*0.6)*28
    const handLy = elbowLy + Math.sin(-0.2 + armAngle*0.6)*28
    const shoulderRx = torsoX+12, shoulderRy = shoulderLy
    const elbowRx = shoulderRx + Math.cos(0.6 - armAngle)*26
    const elbowRy = shoulderRy + Math.sin(0.6 - armAngle)*26
    const handRx = elbowRx + Math.cos(0.2 - armAngle*0.6)*28
    const handRy = elbowRy + Math.sin(0.2 - armAngle*0.6)*28
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(shoulderLx,shoulderLy);ctx.lineTo(elbowLx,elbowLy);ctx.lineTo(handLx,handLy);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(shoulderRx,shoulderRy);ctx.lineTo(elbowRx,elbowRy);ctx.lineTo(handRx,handRy);ctx.stroke()
    if(pose.block){ctx.save();ctx.globalAlpha=.6;ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(torsoX,torsoY-6,20,0,Math.PI*2);ctx.fill();ctx.restore()}
    ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(this.x, this.y+6, 26, 8, 0, 0, Math.PI*2);ctx.fill();ctx.restore()
  }
}

class CPU{
  constructor(me,enemy){
    this.me=me;this.enemy=enemy;this.timer=0;this.state='idle';this.combo=0
  }
  think(dt){
    this.timer -= dt
    if(this.timer>0)return {}
    const dist=Math.abs(this.enemy.x-this.me.x)
    const near = dist < 160
    const cornerLeft = this.me.x < 100
    const cornerRight = this.me.x > WIDTH-100
    const outOfCorner = cornerLeft || cornerRight
    let act={}
    if(outOfCorner && Math.random() < 0.6){act.jump=true; this.timer = 0.25; return act}
    if(near){
      if(Math.random()<0.55){
        if(Math.random()<0.6){act.light=true; this.combo = 1}
        else {act.heavy=true; this.combo = 0}
      } else {
        if(Math.random()<0.4) act.block=true
        else act.jump = Math.random()<0.2
      }
      this.timer = 0.18 + Math.random()*0.15
    } else {
      act.right = this.enemy.x > this.me.x
      act.left = this.enemy.x < this.me.x
      this.timer = 0.12 + Math.random()*0.12
    }
    return act
  }
}

const canvas=document.getElementById('game')
const ctx=canvas.getContext('2d')
canvas.width=WIDTH;canvas.height=HEIGHT

const hp1El=document.getElementById('hp1'),hp2El=document.getElementById('hp2'),fpsEl=document.getElementById('fps')

let p1,p2,cpu
function setupMatch(){
  p1=new Fighter(WIDTH*0.3,1,'#e5e7eb')
  p2=new Fighter(WIDTH*0.7,-1,'#fca5a5')
  cpu=new CPU(p2,p1)
}
setupMatch()
document.getElementById('restart').onclick=()=>setupMatch()
document.getElementById('difficulty').onchange=()=>{}

let acc=0,last=performance.now()/1000,frames=0,fpsTimer=0,fps=64

function loop(){
  const t=performance.now()/1000
  let dt = t - last
  last = t
  if(dt>0.1)dt=0.1
  acc += dt
  fpsTimer += dt
  frames++
  while(acc >= FIXED_DT){
    step(FIXED_DT)
    acc -= FIXED_DT
  }
  render()
  if(fpsTimer >= 0.5){ fps = Math.round(frames / fpsTimer); fpsEl.textContent = fps + ' FPS'; frames = 0; fpsTimer = 0 }
  requestAnimationFrame(loop)
}

function step(dt){
  const input1 = { left: keys.has('a'), right: keys.has('d'), jump: keys.has('w')||keys.has(' '), light: keys.has('j'), heavy: keys.has('k'), block: keys.has('l') }
  const input2 = cpu.think(dt)
  p1.applyInput(input1,p2,dt); p2.applyInput(input2,p1,dt)
  p1.updateAnim(dt); p2.updateAnim(dt)
  const hb1 = p1.getHitbox(), hb2 = p2.getHitbox()
  if(hb1 && overlap(hb1,p2)){ p2.receiveHit(hb1, p1.facing); hb1.hit = true }
  if(hb2 && overlap(hb2,p1)){ p1.receiveHit(hb2, p2.facing); hb2.hit = true }
  hp1El.style.width = p1.hp + '%'; hp2El.style.width = p2.hp + '%'
  if(!p1.isAlive() || !p2.isAlive()){
    if(!p1.isAlive()) showResult('CPU WINS')
    if(!p2.isAlive()) showResult('PLAYER WINS')
  }
}

let overlayTimer=0
function showResult(text){
  overlayTimer = 2.0
  const el = document.getElementById('stats')
  el.innerHTML = text + '<br><button id="revive">Restart</button>'
  setTimeout(()=>{ const b = document.getElementById('revive'); if(b) b.onclick = ()=>{ setupMatch(); document.getElementById('stats').textContent='Target 64 FPS'; overlayTimer=0 } }, 100)
}

function overlap(hb,f){
  const cx = f.x, cy = f.y - f.height*0.5
  return cx > hb.x - hb.w/2 && cx < hb.x + hb.w/2 && cy > hb.y - hb.h/2 && cy < hb.y + hb.h/2
}

function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT)
  ctx.fillStyle='#0b1220'; ctx.fillRect(0,GROUND_Y,WIDTH,HEIGHT-GROUND_Y)
  p1.render(ctx); p2.render(ctx)
  if(overlayTimer>0){ overlayTimer -= FIXED_DT; ctx.save(); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.fillStyle='#fff'; ctx.font='28px system-ui'; ctx.textAlign='center'; ctx.fillText('Match Over', WIDTH/2, HEIGHT/2 - 20); ctx.restore() }
}

loop()
const VERSION='final-1'
document.getElementById('version').textContent=VERSION

const WIDTH=960,HEIGHT=540,GROUND_Y=460
const FIXED_DT=1/64
const GRAVITY=2200,RUN_SPEED=300,JUMP_VY=-820,FRICTION=1400
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))

const keys=new Set()
addEventListener('keydown',e=>keys.add(e.key.toLowerCase()))
addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()))
addEventListener('blur',()=>keys.clear())

const ANIM={
  idle:{frames:[{leg:0,arm:0}],fps:6},
  walk:{frames:[{leg:1,arm:-0.6},{leg:-1,arm:0.6}],fps:12},
  punch:{frames:[{arm:0},{arm:1.0},{arm:1.5,forward:10},{arm:0}],fps:20},
  kick:{frames:[{leg:0},{leg:-1.2},{leg:-1.6,forward:6},{leg:0}],fps:18},
  block:{frames:[{block:1}],fps:1}
}

class Fighter{
  constructor(x,facing,color){
    this.x=x;this.y=GROUND_Y;this.vx=0;this.vy=0
    this.facing=facing;this.color=color
    this.hp=100;this.stamina=100;this.grounded=true
    this.state='idle';this.anim=ANIM.idle;this.af=0;this.at=0
    this.width=28;this.height=120;this.lastHit=0
  }
  isAlive(){return this.hp>0}
  changeState(s){
    if(this.state===s)return
    this.state=s
    this.anim=ANIM[s]||ANIM.idle
    this.af=0;this.at=0
  }
  applyInput(input,enemy,dt){
    this.stamina=clamp(this.stamina+18*dt,0,100)
    if(!this.grounded)this.vy+=GRAVITY*dt
    const canMove=['idle','walk'].includes(this.state)
    if(canMove){
      if(input.left){this.vx=-RUN_SPEED;this.changeState('walk')}
      else if(input.right){this.vx=RUN_SPEED;this.changeState('walk')}
      else {this.vx=clamp(this.vx - Math.sign(this.vx)*FRICTION*dt,-RUN_SPEED,RUN_SPEED);if(Math.abs(this.vx)<5){this.vx=0;this.changeState('idle')}}
      if(input.jump&&this.grounded){this.vy=JUMP_VY;this.grounded=false}
      if(input.light&&this.stamina>=12){this.stamina-=12;this.changeState('punch')}
      if(input.heavy&&this.stamina>=20){this.stamina-=20;this.changeState('kick')}
      if(input.block){this.changeState('block')}
    }
    this.x+=this.vx*dt;this.y+=this.vy*dt
    if(this.y>=GROUND_Y){this.y=GROUND_Y;this.vy=0;this.grounded=true}
    this.x=clamp(this.x,40,WIDTH-40)
    this.facing=(enemy.x>=this.x)?1:-1
  }
  updateAnim(dt){
    this.at += dt * this.anim.fps
    if(this.at >= 1){this.at = 0; this.af++}
    if(this.af >= this.anim.frames.length){
      if(this.state==='punch'||this.state==='kick'||this.state==='block')this.changeState('idle')
      else this.af%=this.anim.frames.length
    }
  }
  getPose(){
    const f = this.anim.frames[this.af]||{}
    return {leg:f.leg||0,arm:f.arm||0,forward:f.forward||0,block:!!f.block}
  }
  getHitbox(){
    const pose=this.getPose()
    if(this.state==='punch' && this.af===2) return {x:this.x + this.facing*(40+pose.forward), y:this.y-80, w:52, h:34, dmg:10, kb:240, owner:this}
    if(this.state==='kick' && this.af===2) return {x:this.x + this.facing*(52+pose.forward), y:this.y-40, w:62, h:30, dmg:14, kb:420, owner:this}
    return null
  }
  receiveHit(hb,dir){
    const blocked = this.state==='block'
    const dmg = blocked ? Math.round(hb.dmg*0.32) : hb.dmg
    this.hp = clamp(this.hp - dmg, 0, 100)
    if(!blocked){
      this.vx += dir * Math.min(hb.kb*0.8, 800)
      this.vy = -160
      this.grounded=false
    }
    this.lastHit = performance.now()/1000
  }
  render(ctx){
    ctx.lineCap='round';ctx.lineWidth=6;ctx.strokeStyle=this.color
    const torsoX=this.x, torsoY=this.y - 60
    ctx.beginPath();ctx.moveTo(this.x,this.y);ctx.lineTo(torsoX,torsoY);ctx.stroke()
    ctx.beginPath();ctx.arc(torsoX,torsoY-20,12,0,Math.PI*2);ctx.stroke()
    const pose=this.getPose()
    const legAngle = pose.leg||0
    const armAngle = pose.arm||0
    const hipLx = torsoX-8, hipLy = torsoY+10
    const kneeLx = hipLx + Math.cos(1.4 + legAngle)*34
    const kneeLy = hipLy + Math.sin(1.4 + legAngle)*34
    const footLx = kneeLx + Math.cos(1.2 + legAngle*0.6)*34
    const footLy = kneeLy + Math.sin(1.2 + legAngle*0.6)*34
    const hipRx = torsoX+8, hipRy = hipLy
    const kneeRx = hipRx + Math.cos(1.6 - legAngle)*34
    const kneeRy = hipRy + Math.sin(1.6 - legAngle)*34
    const footRx = kneeRx + Math.cos(1.4 - legAngle*0.6)*34
    const footRy = kneeRy + Math.sin(1.4 - legAngle*0.6)*34
    ctx.beginPath();ctx.moveTo(hipLx,hipLy);ctx.lineTo(kneeLx,kneeLy);ctx.lineTo(footLx,footLy);ctx.stroke()
    ctx.beginPath();ctx.moveTo(hipRx,hipRy);ctx.lineTo(kneeRx,kneeRy);ctx.lineTo(footRx,footRy);ctx.stroke()
    const shoulderLx = torsoX-12, shoulderLy = torsoY-10
    const elbowLx = shoulderLx + Math.cos(-0.6 + armAngle)*26
    const elbowLy = shoulderLy + Math.sin(-0.6 + armAngle)*26
    const handLx = elbowLx + Math.cos(-0.2 + armAngle*0.6)*28
    const handLy = elbowLy + Math.sin(-0.2 + armAngle*0.6)*28
    const shoulderRx = torsoX+12, shoulderRy = shoulderLy
    const elbowRx = shoulderRx + Math.cos(0.6 - armAngle)*26
    const elbowRy = shoulderRy + Math.sin(0.6 - armAngle)*26
    const handRx = elbowRx + Math.cos(0.2 - armAngle*0.6)*28
    const handRy = elbowRy + Math.sin(0.2 - armAngle*0.6)*28
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(shoulderLx,shoulderLy);ctx.lineTo(elbowLx,elbowLy);ctx.lineTo(handLx,handLy);ctx.stroke()
    ctx.beginPath();ctx.moveTo(torsoX,torsoY);ctx.lineTo(shoulderRx,shoulderRy);ctx.lineTo(elbowRx,elbowRy);ctx.lineTo(handRx,handRy);ctx.stroke()
    if(pose.block){ctx.save();ctx.globalAlpha=.6;ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(torsoX,torsoY-6,20,0,Math.PI*2);ctx.fill();ctx.restore()}
    ctx.save();ctx.globalAlpha=.22;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(this.x, this.y+6, 26, 8, 0, 0, Math.PI*2);ctx.fill();ctx.restore()
  }
}

class CPU{
  constructor(me,enemy){
    this.me=me;this.enemy=enemy;this.timer=0;this.state='idle';this.combo=0
  }
  think(dt){
    this.timer -= dt
    if(this.timer>0)return {}
    const dist=Math.abs(this.enemy.x-this.me.x)
    const near = dist < 160
    const cornerLeft = this.me.x < 100
    const cornerRight = this.me.x > WIDTH-100
    const outOfCorner = cornerLeft || cornerRight
    let act={}
    if(outOfCorner && Math.random() < 0.6){act.jump=true; this.timer = 0.25; return act}
    if(near){
      if(Math.random()<0.55){
        if(Math.random()<0.6){act.light=true; this.combo = 1}
        else {act.heavy=true; this.combo = 0}
      } else {
        if(Math.random()<0.4) act.block=true
        else act.jump = Math.random()<0.2
      }
      this.timer = 0.18 + Math.random()*0.15
    } else {
      act.right = this.enemy.x > this.me.x
      act.left = this.enemy.x < this.me.x
      this.timer = 0.12 + Math.random()*0.12
    }
    return act
  }
}

const canvas=document.getElementById('game')
const ctx=canvas.getContext('2d')
canvas.width=WIDTH;canvas.height=HEIGHT

const hp1El=document.getElementById('hp1'),hp2El=document.getElementById('hp2'),fpsEl=document.getElementById('fps')

let p1,p2,cpu
function setupMatch(){
  p1=new Fighter(WIDTH*0.3,1,'#e5e7eb')
  p2=new Fighter(WIDTH*0.7,-1,'#fca5a5')
  cpu=new CPU(p2,p1)
}
setupMatch()
document.getElementById('restart').onclick=()=>setupMatch()
document.getElementById('difficulty').onchange=()=>{}

let acc=0,last=performance.now()/1000,frames=0,fpsTimer=0,fps=64

function loop(){
  const t=performance.now()/1000
  let dt = t - last
  last = t
  if(dt>0.1)dt=0.1
  acc += dt
  fpsTimer += dt
  frames++
  while(acc >= FIXED_DT){
    step(FIXED_DT)
    acc -= FIXED_DT
  }
  render()
  if(fpsTimer >= 0.5){ fps = Math.round(frames / fpsTimer); fpsEl.textContent = fps + ' FPS'; frames = 0; fpsTimer = 0 }
  requestAnimationFrame(loop)
}

function step(dt){
  const input1 = { left: keys.has('a'), right: keys.has('d'), jump: keys.has('w')||keys.has(' '), light: keys.has('j'), heavy: keys.has('k'), block: keys.has('l') }
  const input2 = cpu.think(dt)
  p1.applyInput(input1,p2,dt); p2.applyInput(input2,p1,dt)
  p1.updateAnim(dt); p2.updateAnim(dt)
  const hb1 = p1.getHitbox(), hb2 = p2.getHitbox()
  if(hb1 && overlap(hb1,p2)){ p2.receiveHit(hb1, p1.facing); hb1.hit = true }
  if(hb2 && overlap(hb2,p1)){ p1.receiveHit(hb2, p2.facing); hb2.hit = true }
  hp1El.style.width = p1.hp + '%'; hp2El.style.width = p2.hp + '%'
  if(!p1.isAlive() || !p2.isAlive()){
    if(!p1.isAlive()) showResult('CPU WINS')
    if(!p2.isAlive()) showResult('PLAYER WINS')
  }
}

let overlayTimer=0
function showResult(text){
  overlayTimer = 2.0
  const el = document.getElementById('stats')
  el.innerHTML = text + '<br><button id="revive">Restart</button>'
  setTimeout(()=>{ const b = document.getElementById('revive'); if(b) b.onclick = ()=>{ setupMatch(); document.getElementById('stats').textContent='Target 64 FPS'; overlayTimer=0 } }, 100)
}

function overlap(hb,f){
  const cx = f.x, cy = f.y - f.height*0.5
  return cx > hb.x - hb.w/2 && cx < hb.x + hb.w/2 && cy > hb.y - hb.h/2 && cy < hb.y + hb.h/2
}

function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT)
  ctx.fillStyle='#0b1220'; ctx.fillRect(0,GROUND_Y,WIDTH,HEIGHT-GROUND_Y)
  p1.render(ctx); p2.render(ctx)
  if(overlayTimer>0){ overlayTimer -= FIXED_DT; ctx.save(); ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(0,0,WIDTH,HEIGHT); ctx.fillStyle='#fff'; ctx.font='28px system-ui'; ctx.textAlign='center'; ctx.fillText('Match Over', WIDTH/2, HEIGHT/2 - 20); ctx.restore() }
}

loop()
