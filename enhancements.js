/* Troop 710: progressive enhancements for the public information site. */
(function(){
"use strict";

const year=document.querySelectorAll("[data-year]");
year.forEach(node=>node.textContent=String(new Date().getFullYear()));

/* Search the already-public adult directory; no personal data is sent. */
const leaderInput=document.getElementById("t710-leader-search");
if(leaderInput){
 const members=[...document.querySelectorAll(".people-grid .person")];
 const result=document.getElementById("t710-leader-count");
 const empty=document.getElementById("t710-leader-empty");
 function filterLeaders(){
  const q=leaderInput.value.toLocaleLowerCase().trim();
  let count=0;
  members.forEach(member=>{
   const matches=member.textContent.toLocaleLowerCase().includes(q);
   member.hidden=!matches;
   if(matches)count++;
  });
  if(result)result.textContent=count+" of "+members.length+" public committee members";
  if(empty)empty.hidden=count!==0;
 }
 leaderInput.addEventListener("input",filterLeaders);
 filterLeaders();
}

/* Browsing categories is an enhancement layered on the original live
   search. The search handler in site-pages.js resets document matches
   first; this handler applies the selected category afterwards. */
const categoryHost=document.getElementById("t710-category-filters");
const docSearch=document.getElementById("doc-search");
const folderGroups=[...document.querySelectorAll(".doc-group")];
/* Personal document bookmarks remain in the visitor's browser only. */
const savedKey="troop710-saved-documents";
let savedUrls=new Set();
try{
 const raw=JSON.parse(localStorage.getItem(savedKey)||"[]");
 if(Array.isArray(raw))savedUrls=new Set(raw.filter(u=>typeof u==="string"));
}catch(_){}
const docItems=[...document.querySelectorAll(".doc-group .doc-item")];
const docUrl=item=>item.querySelector('a[href]')?.getAttribute("href")||"";

/* Share the original public URL without tracking or a third-party service. */
if(docItems.length){
 const status=document.createElement("div");
 status.className="t710-copy-toast";
 status.setAttribute("role","status");
 status.setAttribute("aria-live","polite");
 status.hidden=true;
 document.body.appendChild(status);
 let hideToast=null;
 function notify(message){
  status.textContent=message;
  status.hidden=false;
  if(hideToast)clearTimeout(hideToast);
  hideToast=setTimeout(()=>{status.hidden=true},2700);
 }
 async function copyOriginal(url){
  if(navigator.clipboard?.writeText){
   try{await navigator.clipboard.writeText(url);return true}catch(_){}
  }
  const tmp=document.createElement("textarea");
  tmp.value=url;
  tmp.setAttribute("readonly","");
  tmp.style.cssText="position:fixed;top:-1000px;left:-1000px";
  document.body.appendChild(tmp);
  tmp.select();
  let success=false;
  try{success=document.execCommand("copy")}catch(_){}
  tmp.remove();
  return success;
 }
 docItems.forEach(item=>{
  const link=item.querySelector('a[href]');
  if(!link||item.querySelector(".t710-copy-doc"))return;
  const name=link.querySelector("span:nth-child(2)")?.textContent?.trim()||"document";
  const button=document.createElement("button");
  button.type="button";
  button.className="t710-copy-doc";
  button.setAttribute("aria-label","Copy link to "+name);
  button.title="Copy public PDF link";
  button.innerHTML='<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></svg>';
  button.addEventListener("click",async()=>{
   const ok=await copyOriginal(link.href);
   notify(ok?"Public document link copied.":"Could not copy automatically. You can copy the address from the opened document.");
  });
  item.appendChild(button);
 });
}

const knownSavedCount=()=>docItems.filter(item=>savedUrls.has(docUrl(item))).length;
function persistBookmarks(){
 try{localStorage.setItem(savedKey,JSON.stringify([...savedUrls]))}catch(_){}
}
function syncBookmarkButtons(){
 docItems.forEach(item=>{
  const b=item.querySelector(".t710-save-doc");
  if(!b)return;
  const saved=savedUrls.has(docUrl(item));
  const name=item.querySelector("a span:nth-child(2)")?.textContent?.trim()||"document";
  b.setAttribute("aria-pressed",String(saved));
  b.setAttribute("aria-label",(saved?"Remove saved document: ":"Save document: ")+name);
  b.title=saved?"Remove saved document":"Save this document on this device";
  b.textContent=saved?"★":"☆";
 });
 const filter=categoryHost?.querySelector('[data-category-button="saved"]');
 if(filter)filter.textContent="★ Saved · "+knownSavedCount();
}

const categories=[
 ["all","All documents"],
 ["saved","★ Saved"],
 ["general","General"],
 ["volunteer","Volunteer requirements"],
 ["adult","Adult registration"],
 ["registration","Scout registration"],
 ["review","Board of Review"],
 ["leadership","Youth leadership"],
 ["eagle","Eagle projects"],
 ["merit","Merit badges"],
 ["district","District archive"]
];
const folderPatterns=[
 ["general",/general documents/i],
 ["volunteer",/volunteer screening|ab 506/i],
 ["adult",/adult registration/i],
 ["registration",/scout registration/i],
 ["review",/board of review/i],
 ["leadership",/youth leadership|leadership position/i],
 ["eagle",/eagle scout|eagle project/i],
 ["merit",/merit badge/i],
 ["district",/district archive|el camino real/i]
];
let activeCategory="all";

if(categoryHost&&folderGroups.length&&docSearch){
 folderGroups.forEach(group=>{
  const title=group.querySelector("summary")?.textContent||"";
  group.dataset.category=folderPatterns.find(([,re])=>re.test(title))?.[0]||"general";
 });
 docItems.forEach(item=>{
  if(item.querySelector(".t710-save-doc"))return;
  const b=document.createElement("button");
  b.type="button";
  b.className="t710-save-doc";
  b.addEventListener("click",()=>{
   const u=docUrl(item);
   if(!u)return;
   if(savedUrls.has(u))savedUrls.delete(u);else savedUrls.add(u);
   persistBookmarks();
   syncBookmarkButtons();
   if(activeCategory==="saved")docSearch.dispatchEvent(new Event("input",{bubbles:true}));
  });
  item.appendChild(b);
 });

 categories.forEach(([slug,label])=>{
  const count=slug==="all"?docItems.length:slug==="saved"?knownSavedCount()
   :folderGroups.filter(g=>g.dataset.category===slug).reduce((n,g)=>n+g.querySelectorAll(".doc-item").length,0);
  if(!count&&slug!=="saved")return;
  const button=document.createElement("button");
  button.type="button";
  button.className="t710-filter-button";
  if(slug==="saved")button.classList.add("t710-saved-filter");
  button.dataset.categoryButton=slug;
  button.setAttribute("aria-pressed",String(slug===activeCategory));
  button.textContent=label+" · "+count;
  button.addEventListener("click",()=>{
   activeCategory=slug;
   categoryHost.querySelectorAll("button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.categoryButton===slug)));
   docSearch.dispatchEvent(new Event("input",{bubbles:true}));
  });
  categoryHost.appendChild(button);
 });
 syncBookmarkButtons();
 categoryHost.hidden=false;

 const resultCount=document.getElementById("doc-count");
 const empty=document.getElementById("no-results");
 function applyCategory(){
  let visible=0;
  folderGroups.forEach(group=>{
   if(activeCategory==="saved"){
    const matching=[...group.querySelectorAll(".doc-item")];
    matching.forEach(item=>{
     if(!savedUrls.has(docUrl(item)))item.hidden=true;
    });
    const count=matching.filter(item=>!item.hidden).length;
    group.hidden=count===0;
    if(count>0)group.open=true;
    visible+=count;
   }else{
    const matchesCategory=activeCategory==="all"||group.dataset.category===activeCategory;
    if(!matchesCategory)group.hidden=true;
    if(!group.hidden){
     visible+=[...group.querySelectorAll(".doc-item")].filter(item=>!item.hidden).length;
    }
   }
  });
  if(resultCount)resultCount.textContent=visible+" public document"+(visible===1?"":"s");
  if(empty){
   empty.textContent=activeCategory==="saved"
    ?knownSavedCount()===0
     ?"You haven't saved any documents yet. Select ☆ beside a file to keep it here."
     :"No saved documents matched your search. Try a different phrase."
    :"No documents matched your search. Try a different phrase.";
   empty.style.display=visible===0?"block":"none";
  }
 }
 docSearch.addEventListener("input",applyCategory);

 const controls=document.getElementById("t710-library-controls");
 const expand=document.getElementById("t710-expand-docs");
 const collapse=document.getElementById("t710-collapse-docs");
 if(controls)controls.hidden=false;
 expand?.addEventListener("click",()=>folderGroups.filter(g=>!g.hidden).forEach(g=>g.open=true));
 collapse?.addEventListener("click",()=>folderGroups.forEach(g=>g.open=false));

 const incoming=new URLSearchParams(location.search).get("category");
 if(incoming&&categories.some(([slug])=>slug===incoming)){
  const button=categoryHost.querySelector('[data-category-button="'+incoming+'"]');
  if(button)button.click();
 }
 const incomingQuery=new URLSearchParams(location.search).get("q");
 if(incomingQuery){
  docSearch.value=incomingQuery.slice(0,150);
  docSearch.dispatchEvent(new Event("input",{bubbles:true}));
 }
 applyCategory();
}

/* A quiet back-to-top shortcut is useful on the long Forms and Leaders pages. */
const backTop=document.getElementById("t710-backtop");
if(backTop){
 let waiting=false;
 function update(){
  waiting=false;
  backTop.hidden=window.scrollY<650;
 }
 function schedule(){
  if(!waiting){
   waiting=true;
   requestAnimationFrame(update);
  }
 }
 window.addEventListener("scroll",schedule,{passive:true});
 window.addEventListener("resize",schedule,{passive:true});
 update();
}
})();
