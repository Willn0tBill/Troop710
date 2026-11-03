/* Troop 710 – scroll-revealed, manually controlled slideshow.
   The slideshow does not capture page scrolling. Motion and autoplay stop
   when the site-wide No animations preference is selected. */
(function(){
"use strict";
const section=document.querySelector("[data-showcase]");
const stage=section?.querySelector("[data-showcase-stage]");
if(!section||!stage)return;
const slides=[...stage.querySelectorAll("[data-showcase-slide]")];
const dots=[...stage.querySelectorAll("[data-showcase-dot]")];
const prev=stage.querySelector("[data-showcase-prev]");
const next=stage.querySelector("[data-showcase-next]");
const toggle=stage.querySelector("[data-showcase-toggle]");
const currentLabel=stage.querySelector("[data-showcase-current]");
const announcement=document.getElementById("t710-showcase-announcement");
if(!slides.length||dots.length!==slides.length)return;

const duration=6500;
let active=0;
let inView=false;
let userPaused=false;
let hovered=false;
let focusWithin=false;
let timer=null;
let swipeStart=null;
const root=document.documentElement;

function allowsMotion(){
 return root.classList.contains("motion-enabled");
}
function canAutoPlay(){
 return inView&&allowsMotion()&&!userPaused&&!hovered&&!focusWithin&&!document.hidden;
}
function stopTimer(){
 if(timer!==null){clearTimeout(timer);timer=null;}
 stage.classList.remove("is-playing");
}
function setSlide(index,announce=false){
 active=(index+slides.length)%slides.length;
 slides.forEach((slide,i)=>{
  const selected=i===active;
  slide.classList.toggle("is-active",selected);
  slide.setAttribute("aria-hidden",String(!selected));
  slide.inert=!selected;
 });
 dots.forEach((dot,i)=>{
  const selected=i===active;
  dot.classList.toggle("is-active",selected);
  if(selected)dot.setAttribute("aria-current","true");
  else dot.removeAttribute("aria-current");
 });
 if(currentLabel)currentLabel.textContent=String(active+1).padStart(2,"0");
 if(announce&&announcement){
  announcement.textContent="Slide "+(active+1)+" of "+slides.length+": "+(slides[active].getAttribute("aria-label")||"").replace(/^\d+\s+of\s+\d+:\s*/,"");
 }
}
function updatePauseControl(){
 if(!toggle)return;
 const motion=allowsMotion();
 toggle.hidden=!motion;
 toggle.setAttribute("aria-pressed",String(userPaused));
 toggle.setAttribute("aria-label",userPaused?"Resume slideshow":"Pause slideshow");
 toggle.setAttribute("title",userPaused?"Resume automatic slides":"Pause automatic slides");
 const icon=toggle.querySelector("span");
 if(icon)icon.textContent=userPaused?"▶":"Ⅱ";
}
function syncPlayback(){
 stopTimer();
 updatePauseControl();
 if(!canAutoPlay())return;
 /* The CSS progress line and the timer must restart together. */
 void stage.offsetWidth;
 stage.classList.add("is-playing");
 timer=setTimeout(()=>{
  timer=null;
  setSlide(active+1,false);
  syncPlayback();
 },duration);
}
function select(index,announce=true){
 setSlide(index,announce);
 syncPlayback();
}
prev?.addEventListener("click",()=>select(active-1));
next?.addEventListener("click",()=>select(active+1));
dots.forEach((dot,i)=>dot.addEventListener("click",()=>select(i)));
toggle?.addEventListener("click",()=>{
 userPaused=!userPaused;
 syncPlayback();
 if(announcement)announcement.textContent=userPaused?"Slideshow paused.":"Automatic slideshow resumed.";
});
/* Pause auto-advance while a pointer is hovering or the keyboard is
   interacting with this component. Touch gestures do not count as hovering. */
stage.addEventListener("pointerenter",event=>{
 if(event.pointerType==="mouse"||event.pointerType==="pen"){
  hovered=true;syncPlayback();
 }
});
stage.addEventListener("pointerleave",event=>{
 if(event.pointerType==="mouse"||event.pointerType==="pen"){
  hovered=false;syncPlayback();
 }
});
stage.addEventListener("focusin",()=>{
 if(!focusWithin){focusWithin=true;syncPlayback();}
});
stage.addEventListener("focusout",()=>{
 requestAnimationFrame(()=>{
  const stillFocused=stage.contains(document.activeElement);
  if(focusWithin!==stillFocused){focusWithin=stillFocused;syncPlayback();}
 });
});
stage.addEventListener("keydown",event=>{
 if(!stage.contains(document.activeElement))return;
 if(event.key==="ArrowLeft"){
  event.preventDefault();select(active-1);
 }else if(event.key==="ArrowRight"){
  event.preventDefault();select(active+1);
 }
});
stage.addEventListener("touchstart",event=>{
 if(event.touches.length!==1)return;
 swipeStart={x:event.touches[0].clientX,y:event.touches[0].clientY};
},{passive:true});
stage.addEventListener("touchend",event=>{
 if(!swipeStart||event.changedTouches.length!==1)return;
 const x=event.changedTouches[0].clientX-swipeStart.x;
 const y=event.changedTouches[0].clientY-swipeStart.y;
 swipeStart=null;
 if(Math.abs(x)>42&&Math.abs(x)>Math.abs(y)*1.25)select(active+(x<0?1:-1));
},{passive:true});
stage.addEventListener("touchcancel",()=>{swipeStart=null;},{passive:true});
document.addEventListener("visibilitychange",syncPlayback);
new MutationObserver(syncPlayback).observe(root,{attributes:true,attributeFilter:["class"]});
slides.forEach(slide=>{
 const img=slide.querySelector("img");
 img?.addEventListener("error",()=>slide.classList.add("image-failed"));
});
setSlide(0,false);
updatePauseControl();

if("IntersectionObserver" in window){
 section.classList.add("is-reveal-pending");
 const observer=new IntersectionObserver(entries=>{
  const visible=entries.some(entry=>entry.isIntersecting);
  if(visible){
   section.classList.remove("is-reveal-pending");
   section.classList.add("is-revealed");
  }
  if(inView!==visible){inView=visible;syncPlayback();}
 },{threshold:0.33});
 observer.observe(stage);
}else{
 section.classList.add("is-revealed");
 /* Browsers without IntersectionObserver retain manual controls. */
}
})();