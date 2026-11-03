(function(){
"use strict";

const root=document.documentElement;
const menuButton=document.querySelector(".menu-button");
const menu=document.querySelector(".nav");

if(menuButton&&menu){
  function setMenu(open){
    menu.setAttribute("data-open",String(open));
    menuButton.setAttribute("aria-expanded",String(open));
    menuButton.setAttribute("aria-label",open?"Close navigation":"Open navigation");
    menuButton.textContent=open?"×":"☰";
  }
  menuButton.addEventListener("click",()=>setMenu(menu.getAttribute("data-open")!=="true"));
  menu.querySelectorAll("a").forEach(link=>link.addEventListener("click",()=>setMenu(false)));
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&menu.getAttribute("data-open")==="true"){
      setMenu(false);
      menuButton.focus();
    }
  });
  document.addEventListener("click",event=>{
    if(menu.getAttribute("data-open")==="true"&&!event.target.closest(".site-header"))setMenu(false);
  });
  window.addEventListener("resize",()=>{
    if(window.innerWidth>1020&&menu.getAttribute("data-open")==="true")setMenu(false);
  },{passive:true});
}

/* Searchable public forms; original document links are never modified. */
const search=document.getElementById("doc-search");
const groups=[...document.querySelectorAll(".doc-group")];
if(search&&groups.length){
  const resultCount=document.getElementById("doc-count");
  const emptyMessage=document.getElementById("no-results");
  const expanded=groups.map(group=>group.open);
  const total=groups.reduce((sum,g)=>sum+g.querySelectorAll(".doc-item").length,0);
  function filterDocuments(){
    const query=search.value.trim().toLocaleLowerCase();
    let visible=0;
    groups.forEach((group,index)=>{
      const title=group.querySelector("summary")?.textContent.toLocaleLowerCase()||"";
      let groupVisible=0;
      group.querySelectorAll(".doc-item").forEach(item=>{
        const matched=!query||title.includes(query)||item.textContent.toLocaleLowerCase().includes(query);
        item.hidden=!matched;
        if(matched)groupVisible++;
      });
      group.hidden=groupVisible===0;
      if(query&&groupVisible)group.open=true;
      else if(!query)group.open=expanded[index];
      visible+=groupVisible;
    });
    if(resultCount)resultCount.textContent=(query?visible:total)+" public documents";
    if(emptyMessage)emptyMessage.style.display=query&&visible===0?"block":"none";
  }
  search.addEventListener("input",filterDocuments);
  filterDocuments();
}

/* OS reduced motion takes precedence by default, but a visitor who
   explicitly clicks the preference button may opt in to animations.
   The choice stays in this browser across pages. */
const motionMedia=window.matchMedia("(prefers-reduced-motion: reduce)");
const motionButton=document.querySelector("[data-motion-switch]");
const motionText=motionButton?.querySelector(".motion-switch__label");
const revealTargets=[...document.querySelectorAll("[data-reveal]")];
let motionObserver=null;
const prefKey="troop710-motion-preference";
let saved=null;
try{saved=localStorage.getItem(prefKey)}catch(_){}
let enabled=saved==="on"||(saved!=="off"&&!motionMedia.matches);

const gridSelector=".home-values,.home-directory__grid,.people-grid,.resource-grid,.grid-3,.grid-4";
revealTargets.forEach(target=>{
  const grid=target.parentElement?.closest(gridSelector);
  if(grid){
    const index=[...target.parentElement.children].filter(child=>child.hasAttribute("data-reveal")).indexOf(target);
    if(index>=0)target.style.setProperty("--reveal-delay",Math.min(index%4,3)*110+"ms");
  }
});

function setMotion(isEnabled){
  enabled=isEnabled;
  root.classList.toggle("motion-enabled",enabled);
  root.classList.remove("motion-ready");
  if(motionObserver){motionObserver.disconnect();motionObserver=null;}

  if(enabled&&"IntersectionObserver" in window&&revealTargets.length){
    motionObserver=new IntersectionObserver(entries=>{
      entries.forEach(entry=>{
        if(entry.isIntersecting){
          entry.target.classList.add("is-visible");
          motionObserver?.unobserve(entry.target);
        }
      });
    },{rootMargin:"0px 0px -32px 0px",threshold:.065});

    revealTargets.forEach(target=>target.classList.remove("is-visible"));
    root.classList.add("motion-ready");
    revealTargets.forEach(target=>motionObserver.observe(target));
  }else{
    revealTargets.forEach(target=>target.classList.add("is-visible"));
  }

  if(motionButton){
    motionButton.hidden=false;
    motionButton.setAttribute("aria-pressed",String(enabled));
    if(motionText)motionText.textContent=enabled?"Pause animations":"Enable animations";
    motionButton.title=enabled
      ?"Pause website animations"
      :motionMedia.matches
        ?"Your device prefers reduced motion. Click to enable animations for this website."
        :"Enable website animations";
  }
}

setMotion(enabled);

motionButton?.addEventListener("click",()=>{
  const next=!enabled;
  try{localStorage.setItem(prefKey,next?"on":"off")}catch(_){}
  setMotion(next);
});

function onMediaChange(e){
  let override=null;
  try{override=localStorage.getItem(prefKey)}catch(_){}
  if(override===null)setMotion(!e.matches);
}
if(typeof motionMedia.addEventListener==="function")motionMedia.addEventListener("change",onMediaChange);
else if(typeof motionMedia.addListener==="function")motionMedia.addListener(onMediaChange);

/* Minimal work per scroll: only a CSS custom property changes. */
const siteHeader=document.querySelector(".site-header");
if(siteHeader){
  let scheduled=false;
  function updateProgress(){
    scheduled=false;
    const height=Math.max(0,document.documentElement.scrollHeight-window.innerHeight);
    const value=height?Math.min(100,Math.max(0,window.scrollY/height*100)):0;
    siteHeader.style.setProperty("--scroll-progress",value.toFixed(2)+"%");
  }
  function schedule(){
    if(!scheduled){
      scheduled=true;
      requestAnimationFrame(updateProgress);
    }
  }
  window.addEventListener("scroll",schedule,{passive:true});
  window.addEventListener("resize",schedule,{passive:true});
  schedule();
}
}());