/* Troop 710 — sitewide resource finder. All data is sourced from
   public links already present in the website. No analytics or tracking. */
(function(){
"use strict";

const dialog=document.getElementById("t710-search-dialog");
const input=document.getElementById("t710-search-input");
const results=document.getElementById("t710-search-results");
const status=document.getElementById("t710-search-status");
const openButtons=[...document.querySelectorAll("[data-t710-open-search]")];
if(!dialog||!input||!results||!openButtons.length||typeof dialog.showModal!=="function")return;

const closeButton=dialog.querySelector("[data-t710-close-search]");
const tips=[...dialog.querySelectorAll("[data-t710-search-suggestion]")];
const initial=[
 {kind:"page",title:"About Our Troop",subtitle:"Meet Troop 710 and the Scouting program",url:"about.html"},
 {kind:"page",title:"Forms & Documents",subtitle:"Browse public registration and leadership paperwork",url:"forms.html"},
 {kind:"page",title:"Adult Leaders",subtitle:"Search the troop's publicly listed committee members",url:"leaders.html"},
 {kind:"page",title:"Resource Links",subtitle:"Find official troop and Scouting America sites",url:"resources.html"},
 {kind:"page",title:"Join or visit Troop 710",subtitle:"Official troop portal for current information",url:"https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"}
];
const kinds={page:"Page",document:"Public PDF",category:"Category",leader:"Public leader"};
const icons={page:"↗",document:"PDF",category:"▦",leader:"◈"};
let index=null;
let load=null;
let indexState="idle";
let lastOpener=null;

function normalize(value){
 return String(value||"").normalize("NFKD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
}
function relevance(item,query,terms){
 const title=normalize(item.title);
 const subtitle=normalize(item.subtitle);
 const keywords=normalize(item.keywords);
 const hay=[title,subtitle,keywords].join(" ");
 if(!terms.every(t=>hay.includes(t)))return -1;
 let score=0;
 if(title===query)score+=140;
 if(title.startsWith(query))score+=110;
 if(title.includes(query))score+=75;
 if(subtitle.includes(query))score+=22;
 for(const t of terms){
  if(title.split(/[^a-z0-9]+/).includes(t))score+=19;
  else if(title.includes(t))score+=10;
  if(keywords.includes(t))score+=5;
 }
 if(item.kind==="page")score+=16;
 if(item.kind==="category")score+=7;
 return score;
}

function makeResult(item){
 const li=document.createElement("li");
 const a=document.createElement("a");
 a.className="t710-search-dialog__result";
 a.href=item.url;
 if(/^https?:\/\//i.test(item.url)){
  a.target="_blank";
  a.rel="noopener noreferrer";
 }
 const icon=document.createElement("span");
 icon.className="t710-search-dialog__result-icon";
 icon.textContent=icons[item.kind]||"↗";
 if(item.kind==="document")icon.style.fontSize="10px";
 icon.setAttribute("aria-hidden","true");
 const words=document.createElement("span");
 words.className="t710-search-dialog__result-text";
 const title=document.createElement("span");
 title.className="t710-search-dialog__result-title";
 title.textContent=item.title;
 const subtitle=document.createElement("span");
 subtitle.className="t710-search-dialog__result-subtitle";
 subtitle.textContent=(kinds[item.kind]||"Resource")+" · "+(item.subtitle||"Troop 710");
 words.append(title,subtitle);
 const arrow=document.createElement("span");
 arrow.className="t710-search-dialog__result-arrow";
 arrow.textContent="↗";
 arrow.setAttribute("aria-hidden","true");
 a.append(icon,words,arrow);
 li.append(a);
 return li;
}
function showResults(){
 const q=normalize(input.value);
 const terms=q.split(/\s+/).filter(Boolean);
 const all=index||initial;
 const docsLink=dialog.querySelector("[data-t710-all-docs]");
 if(docsLink)docsLink.href=q?"forms.html?q="+encodeURIComponent(input.value.trim()):"forms.html";
 if(q && indexState==="loading" && !index){
  if(status)status.textContent="Loading the public resource index…";
  results.replaceChildren();
  const loading=document.createElement("li");
  loading.className="t710-search-dialog__empty";
  loading.textContent="Loading public documents and directory entries…";
  results.append(loading);
  return;
 }
 let matches;
 if(!q){
  matches=initial;
  if(status)status.textContent="Popular destinations";
 }else{
  matches=all.map(item=>({item,score:relevance(item,q,terms)}))
   .filter(x=>x.score>=0)
   .sort((a,b)=>b.score-a.score||a.item.title.localeCompare(b.item.title))
   .map(x=>x.item);
  if(status)status.textContent=matches.length+(matches.length===1?" result":" results")+" found"+(matches.length>12?" · showing first 12":"");
 }
 results.replaceChildren();
 if(matches.length){
  matches.slice(0,12).forEach(item=>results.append(makeResult(item)));
 }else{
  const empty=document.createElement("li");
  empty.className="t710-search-dialog__empty";
  empty.textContent=indexState==="error"?"The full search index could not load. Try the Forms & Documents page or the official troop portal.":"No matches in the public site index. Try another word, or visit the Forms & Documents page.";
  results.append(empty);
 }
}
async function loadSearchIndex(){
 if(index)return index;
 if(!load){
  indexState="loading";
  load=fetch("search-index.json?v=11",{cache:"force-cache"})
  .then(response=>{if(!response.ok)throw Error("Search index unavailable");return response.json()})
  .then(data=>{
   if(!Array.isArray(data.items))throw Error("Invalid search index");
   index=data.items.filter(x=>typeof x.title==="string"&&typeof x.url==="string");
   indexState="ready";
   return index;
  })
  .catch(()=>{indexState="error";load=null;return initial});
 }
 return load;
}
async function openSearch(opener){
 lastOpener=opener||document.activeElement;
 if(!dialog.open){
  dialog.showModal();
  input.focus();
  input.select();
 }
 const loading=loadSearchIndex();
 showResults();
 await loading;
 if(dialog.open)showResults();
}
function closeSearch(){
 if(dialog.open)dialog.close();
 if(lastOpener&&lastOpener.isConnected&&typeof lastOpener.focus==="function"){
  lastOpener.focus();
 }
}
openButtons.forEach(button=>{
 button.hidden=false;
 button.addEventListener("click",()=>openSearch(button));
});
closeButton?.addEventListener("click",closeSearch);
dialog.addEventListener("click",event=>{if(event.target===dialog)closeSearch();});
dialog.addEventListener("close",()=>{if(lastOpener?.isConnected)lastOpener.focus();});
// A native search input consumes Escape to clear its text in some browsers.
// Capture Escape before the input does so it reliably closes the dialog.
dialog.addEventListener("keydown",event=>{
 if(event.key==="Escape"){
  event.preventDefault();
  event.stopPropagation();
  closeSearch();
 }
},true);
input.addEventListener("input",showResults);
input.addEventListener("keydown",event=>{
 if(event.key==="ArrowDown"){
  const first=results.querySelector("a");
  if(first){event.preventDefault();first.focus();}
 }
 if(event.key==="Enter"){
  const first=results.querySelector("a");
  if(first){event.preventDefault();first.click();}
 }
});
results.addEventListener("keydown",event=>{
 const anchors=[...results.querySelectorAll("a")];
 const current=anchors.indexOf(document.activeElement);
 if(event.key==="ArrowDown"&&current>=0&&anchors[current+1]){
  event.preventDefault();anchors[current+1].focus();
 }else if(event.key==="ArrowUp"&&current>0){
  event.preventDefault();anchors[current-1].focus();
 }else if(event.key==="ArrowUp"&&current===0){
  event.preventDefault();input.focus();
 }
});
tips.forEach(button=>{
 button.addEventListener("click",()=>{
  input.value=button.dataset.t710SearchSuggestion||"";
  input.focus();
  showResults();
 });
});
document.addEventListener("keydown",event=>{
 if((event.ctrlKey||event.metaKey)&&!event.altKey&&event.key.toLowerCase()==="k"){
  event.preventDefault();
  if(dialog.open)input.focus();
  else openSearch(document.querySelector(".t710-header-search"));
 }
});
})();