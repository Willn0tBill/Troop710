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

/* Persistent appearance controls. Motion is ON by default.
   "No animations" is an explicit choice, saved across pages. */
const themeKey="troop710-theme-preference";
const motionKey="troop710-motion-preference";
function getPref(key){
  try{return localStorage.getItem(key)}catch(_){return null}
}
function savePref(key,value){
  try{localStorage.setItem(key,value)}catch(_){}
}
let theme=getPref(themeKey)==="dark"?"dark":"light";
let enabled=getPref(motionKey)!=="off";

const preferences=document.querySelector("[data-preferences]");
const preferencesTrigger=preferences?.querySelector("[data-preferences-trigger]");
const preferencesPanel=preferences?.querySelector("[data-preferences-panel]");
const preferencesClose=preferences?.querySelector("[data-preferences-close]");
const themeOptions=[...document.querySelectorAll("[data-theme-option]")];
const motionOptions=[...document.querySelectorAll("[data-motion-option]")];

function setTheme(next){
  theme=next==="dark"?"dark":"light";
  root.dataset.theme=theme;
  themeOptions.forEach(button=>{
    button.setAttribute("aria-pressed",String(button.dataset.themeOption===theme));
  });
}
setTheme(theme);
themeOptions.forEach(button=>button.addEventListener("click",()=>{
  setTheme(button.dataset.themeOption);
  savePref(themeKey,theme);
}));

const revealTargets=[...document.querySelectorAll("[data-reveal]")];
let motionObserver=null;
const gridSelector=".home-values,.home-directory__grid,.people-grid,.resource-grid,.grid-3,.grid-4";
revealTargets.forEach(target=>{
  const grid=target.parentElement?.closest(gridSelector);
  if(grid){
    const index=[...target.parentElement.children].filter(child=>child.hasAttribute("data-reveal")).indexOf(target);
    if(index>=0)target.style.setProperty("--reveal-delay",Math.min(index%4,3)*110+"ms");
  }
});
function setMotion(next){
  enabled=Boolean(next);
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
  motionOptions.forEach(button=>{
    button.setAttribute("aria-pressed",String((button.dataset.motionOption==="on")===enabled));
  });
}
setMotion(enabled);
motionOptions.forEach(button=>button.addEventListener("click",()=>{
  const on=button.dataset.motionOption==="on";
  setMotion(on);
  savePref(motionKey,on?"on":"off");
}));

if(preferencesTrigger&&preferencesPanel){
  function togglePanel(open,returnFocus=false){
    preferencesPanel.hidden=!open;
    preferencesTrigger.setAttribute("aria-expanded",String(open));
    if(returnFocus)preferencesTrigger.focus();
  }
  preferencesTrigger.addEventListener("click",()=>{
    togglePanel(preferencesPanel.hidden);
  });
  preferencesClose?.addEventListener("click",()=>togglePanel(false,true));
  document.addEventListener("keydown",event=>{
    if(event.key==="Escape"&&!preferencesPanel.hidden)togglePanel(false,true);
  });
  document.addEventListener("pointerdown",event=>{
    if(!preferencesPanel.hidden&&!preferences.contains(event.target))togglePanel(false);
  });
}
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