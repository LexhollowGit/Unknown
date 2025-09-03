const VERSION='v1.0'
document.getElementById('version').textContent=VERSION
const WIDTH=960,HEIGHT=540,GROUND_Y=450,FIXED_DT=1/64,GRAVITY=2200,FRICTION=1800
const RUN_SPEED=330,JUMP_VY=-800
const MOVES={light:{windup:.08,active:.08,recover:.2,dmg:6,kb:280,stamina:8},heavy:{windup:.22,active:.14,recover:.35,dmg:14,kb:480,stamina:18}}
const DIFF={easy:{react:.24,engage:300,retreat:120,block:.2,dodge:.05,feint:0,aggression:.35},mid:{react:.16,engage:250,retreat:160,block:.38,dodge:.1,feint:.08,aggression:.55},hard:{react:.09,engage:220,retreat:190,block:.55,dodge:.18,feint:.16,aggression:.78}}
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v))
const keys=new Map()
addEventListener('keydown',e=>{keys.set(e.key.toLowerCase(),true)})
addEventListener('keyup',e=>{keys.set(e.key.toLowerCase(),false)})

class Fighter{
  constructor(x,facing=1,color='#e5e7eb'){
    this.x=x;this.y=GROUND_Y;this.vx=0;this.vy=0
    this.facing=facing;this.color=color
    this.grounded=true;this.stamina=100;this.hp=100
    this.state='idle';this.stateT=0;this.blocking=false
    this.lastHitT=-999;this.height=120
  }
  isAlive(){return this.hp>0}
  setState(s){if(this.state!==s){this.state=s;this.stateT=0}}
  update(dt,input,enemy){
    this.stamina=clamp(this.stamina+12*dt*(this.grounded?1.2:1),0,100)
    if(!this.grounded)this.vy+=GRAVITY*dt
    const canMove=!['windup','active','recover','stun'].includes(this.state)
    if(canMove){
      if(input.left)this.vx=-RUN_SPEED
      else if(input.right)this.vx=RUN_SPEED
      else if(this.grounded){
        const f=FRICTION*dt*Math.sign(this.vx)
        if(Math.abs(f)>Math.abs(this.vx))this.vx=0;else this.vx-=f
      }
      if(input.jump&&this.grounded){
        this.vy=JUMP_VY;this.grounded=false
      }
    }else{
      if(!this.grounded)this.vx=clamp(this.vx+(input.right?90*dt:0)-(input.left?90*dt:0),-RUN_SPEED,RUN_SPEED)
    }
    this.blocking=input.block&&this.stamina>10&&this.grounded&&!['windup','active'].includes(this.state)
    if(canMove&&this.grounded){
      if(input.light&&this.stamina>=MOVES.light.stamina)this.startAttack('light')
      else if(input.heavy&&this.stamina>=MOVES.heavy.stamina)this.startAttack('heavy')
    }
    this.x+=this.vx*dt;this.y+=this.vy*dt
    this.x=clamp(this.x,40,WIDTH-40)
    if(this.y>=GROUND_Y){this.y=GROUND_Y;this.vy=0;this.grounded=true}
    this.facing=(enemy.x>=this.x)?1:-1
    this.stateT+=dt
  }
  startAttack(kind){
    const m=MOVES[kind]
    this.currentMove={kind,...m,t:0,hit:false}
    this.stamina=clamp(this.stamina-m.stamina,0,100)
    this.setState('windup')
  }
  getHitbox(){
    if(!this.currentMove)return null
    const mv=this.currentMove
    if(this.state==='active'){
      const reach=mv.kind==='light'?46:68
      const cx=this.x+this.facing*(reach+20)
      const cy=this.y-this.height*0.55
      return{x:cx-30,y:cy-15,w:60,h:30,dmg:mv.dmg,kb:mv.kb,owner:this}
    }
    return null
  }
  stepAttack(dt){
    if(!this.currentMove)return
    const mv=this.currentMove;mv.t+=dt
    if(this.state==='windup'&&mv.t>=mv.windup){this.setState('active');mv.t=0}
    else if(this.state==='active'&&mv.t>=mv.active){this.setState('recover');mv.t=0}
    else if(this.state==='recover'&&mv.t>=mv.recover){this.setState('idle');this.currentMove=null}
  }
  onHit(dmg,kb,dir){
    const reduced=this.blocking?Math.round(dmg*0.35):dmg
    this.hp=clamp(this.hp-reduced,0,100)
    const mult=this.blocking?.25:1
    this.vx+=dir*kb*mult*.8;this.vy=-220*mult;this.grounded=false
    this.setState('stun');this.stateT=0;this.stunFor=.2+(kb/900)
    this.lastHitT=performance.now()/1000
  }
  tick(dt,input,enemy){
    if(!this.isAlive())return
    if(['windup','active','recover'].includes(this.state))this.stepAttack(dt)
    if(this.state==='stun'){if(this.stateT>=this.stunFor)this.setState('idle')}
    this.update(dt,input,enemy)
  }
  render(ctx){
    const H=this.height
    const torsoLen=H*.45,legLen=H*.32,armLen=H*.32
    const hipX=this.x,hipY=this.y-legLen
    const chestX=hipX,chestY=hipY-torsoLen
    const headR=H*.12
    let walk=Math.sin((performance.now()/1000)*8+this.x*.01)*.6*(Math.abs(this.vx)>10?1:0)
    let lLeg=walk,rLeg=-walk,lArm=-walk*.5,rArm=walk*.5
    if(this.state==='windup'){lArm-=.6*this.facing;rArm+=.9*this.facing}
    if(this.state==='active')rArm+=1.2*this.facing
    if(this.state==='recover')rArm+=.4*this.facing
    if(this.blocking){lArm=-1.2*this.facing;rArm=-.6*this.facing}
    if(!this.grounded){lLeg=.3;rLeg=-.3}
    if(this.state==='stun'){lArm=-.8;rArm=.8}
    const limb=(x0,y0,a,len)=>[x0+Math.cos(a)*len,y0+Math.sin(a)*len]
    const seg=(ax,ay,bx,by)=>{ctx.beginPath();ctx.moveTo(ax,ay);ctx.lineTo(bx,by);ctx.stroke()}
    ctx.lineCap='round';ctx.lineWidth=6;ctx.strokeStyle=this.color
    const[kLx,kLy]=limb(hipX-8,hipY,1.4+lLeg,legLen*.52)
    const[fLx,fLy]=limb(kLx,kLy,1.2+lLeg*.7,legLen*.65)
    const[kRx,kRy]=limb(hipX+8,hipY,1.6+rLeg,legLen*.52)
    const[fRx,fRy]=limb(kRx,kRy,1.4+rLeg*.7,legLen*.65)
    ctx.beginPath();ctx.moveTo(hipX,hipY);ctx.lineTo(chestX,chestY);ctx.stroke()
    ctx.beginPath();ctx.arc(chestX,chestY-headR-6,headR,0,Math.PI*2);ctx.stroke()
    const[eLx,eLy]=limb(chestX-10,chestY-10,-.6+lArm,armLen*.55)
    const[hLx,hLy]=limb(eLx,eLy,-.4+lArm*.6,armLen*.62)
    const[eRx,eRy]=limb(chestX+10,chestY-10,-.6+rArm,armLen*.55)
    const[hRx,hRy]=limb(eRx,eRy,-.4+rArm*.6,armLen*.62)
    seg(hipX-8,hipY,kLx,kLy);seg(kLx,kLy,fLx,fLy)
    seg(hipX+8,hipY,kRx,kRy);seg(kRx,kRy,fRx,fRy)
    seg(chestX-10,chestY-10,eLx,eLy);seg(eLx,eLy,hLx,hLy)
    seg(chestX+10,chestY-10,eRx,eRy);seg(eRx,eRy,hRx,hRy)
    if(this.blocking){ctx.save();ctx.globalAlpha=.7;ctx.fillStyle='#60a5fa';ctx.beginPath();ctx.arc(chestX,chestY-20,10,0,Math.PI*2);ctx.fill();ctx.restore()}
    ctx.save();ctx.globalAlpha=.25;ctx.fillStyle='#000';ctx.beginPath();ctx.ellipse(this.x,GROUND_Y+4,26,6,0,0,Math.PI*2);ctx.fill();ctx.restore()
  }
}

class CPU{
  constructor(me,enemy){this.me=me;this.enemy=enemy;this.intent={};this.nextOk=0;this.diff=DIFF.mid}
  setDifficulty(k){this.diff=DIFF[k]||DIFF.mid}
  think(t){
    if(!this.me.isAlive()||!this.enemy.isAlive())return{}
    if(t<this.nextOk)return this.intent
    let d=this.diff
    let dist=Math.abs(this.enemy.x-this.me.x)
    let dir=(this.enemy.x<this.me.x)?-1:1
    let intent={left:false,right:false,jump:false,light:false,heavy:false,block:false}
    const enemyAggro=(t-this.enemy.lastHitT)<.9||['windup','active'].includes(this.enemy.state)
    if(enemyAggro&&dist<120){
      if(Math.random()<d.block)intent.block=true
      if(Math.random()<d.dodge){intent.jump=this.me.grounded&&Math.random()<.5;intent.left=dir>0;intent.right=dir<0}
    }
    if(dist>d.engage){intent.left=dir<0;intent.right=dir>0}
    else if(dist<d.retreat){intent.left=dir>0;intent.right=dir<0}
    if(dist<170&&Math.random()<d.aggression){
      if(Math.random()<(this.me.stamina>40?.45:.15))intent.heavy=true
      else intent.light=true
    }
    if(Math.random()<d.feint)intent.block=false
    this.intent=intent;this.nextOk=t+d.react*(.8+Math.random()*.6)
    return intent
  }
}

const canvas=document.getElementById('game'),ctx=canvas.getContext('2d')
const hud=document.querySelector('.hud')
hud.innerHTML='<div style="position:absolute;left:12px;top:12px;right:12px;display:flex;gap:12px;"><div style="flex:1;"><div class="row"><div>P1 (You)</div><div id="fps" class="small">64 FPS</div></div><div class="hpbar"><div id="hp1" class="fill hp1" style="width:100%"></div></div></div><div style="flex:1;text-align:right;"><div>CPU</div><div class="hpbar"><div id="hp2" class="fill hp2" style="width:100%"></div></div></div></div>'
const hp1El=document.getElementById('hp1'),hp2El=document.getElementById('hp2'),fpsEl=document.getElementById('fps')

let p1,p2,cpu
function newMatch(){
  p1=new Fighter(WIDTH*.28,+1,'#e5e7eb')
  p2=new Fighter(WIDTH*.72,-1,'#fca5a5')
  cpu=new CPU(p2,p1)
  cpu.setDifficulty(document.getElementById('difficulty').value)
}
newMatch()
document.getElementById('restart').onclick=()=>newMatch()
document.getElementById('difficulty').onchange=e=>cpu.setDifficulty(e.target.value)

let acc=0,last=performance.now()/1000,frames=0,fpsTimer=0,fps=64
function loop(){
  const t=performance.now()/1000
  let dt=t-last;last=t;acc+=dt;fpsTimer+=dt;frames++
  while(acc>=FIXED_DT){step(FIXED_DT);acc-=FIXED_DT}
  render()
  if(fpsTimer>=.5){fps=Math.round(frames/fpsTimer);fpsEl.textContent=fps+' FPS';frames=0;fpsTimer=0}
  requestAnimationFrame(loop)
}

function step(dt){
  const input1={left:keys.get('a'),right:keys.get('d'),jump:keys.get('w')||keys.get(' '),light:keys.get('j'),heavy:keys.get('k'),block:keys.get('l')}
  const input2=cpu.think(performance.now()/1000)
  p1.tick(dt,input1,p2)
  p2.tick(dt,input2,p1)
  const hb1=p1.getHitbox(),hb2=p2.getHitbox()
  if(hb1&&!hb1.hit&&rectOverlap(hb1,p2)){p2.onHit(hb1.dmg,hb1.kb,p1.facing);hb1.hit=true}
  if(hb2&&!hb2.hit&&rectOverlap(hb2,p1)){p1.onHit(hb2.dmg,hb2.kb,p2.facing);hb2.hit=true}
  hp1El.style.width=p1.hp+'%';hp2El.style.width=p2.hp+'%'
}

function rectOverlap(a,f){
  return f.x>a.x&&f.x<a.x+a.w&&f.y>a.y&&f.y<a.y+a.h
}

function render(){
  ctx.clearRect(0,0,WIDTH,HEIGHT)
  ctx.fillStyle='#111';ctx.fillRect(0,GROUND_Y,WIDTH,HEIGHT-GROUND_Y)
  p1.render(ctx);p2.render(ctx)
}

loop()
