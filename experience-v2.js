/* Troop 710 — an accessible visitor path selector. */
(function(){
"use strict";
const root=document.querySelector(".t710-path__shell");
if(!root)return;
const tabs=[...root.querySelectorAll('[role="tab"][data-path]')];
const panels=[...root.querySelectorAll('[role="tabpanel"][data-path-panel]')];
const valid=new Set(tabs.map(button=>button.dataset.path));
const key="troop710-visitor-path";

function choose(slug,focus){
 if(!valid.has(slug))return;
 tabs.forEach(tab=>{
  const active=tab.dataset.path===slug;
  tab.setAttribute("aria-selected",String(active));
  tab.tabIndex=active?0:-1;
  if(active&&focus)tab.focus();
 });
 panels.forEach(panel=>{
  panel.hidden=panel.dataset.pathPanel!==slug;
 });
 try{localStorage.setItem(key,slug)}catch(_){}
}
tabs.forEach((tab,index)=>{
 tab.addEventListener("click",()=>choose(tab.dataset.path,false));
 tab.addEventListener("keydown",event=>{
  const key=event.key;
  let next=-1;
  if(key==="ArrowRight"||key==="ArrowDown")next=(index+1)%tabs.length;
  if(key==="ArrowLeft"||key==="ArrowUp")next=(index+tabs.length-1)%tabs.length;
  if(key==="Home")next=0;
  if(key==="End")next=tabs.length-1;
  if(next>=0){
   event.preventDefault();
   choose(tabs[next].dataset.path,true);
  }
 });
});
let pref=null;
try{pref=localStorage.getItem(key)}catch(_){}
choose(valid.has(pref)?pref:"discover",false);
})();