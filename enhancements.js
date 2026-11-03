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
const categories=[
 ["all","All documents"],
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
 categories.forEach(([slug,label])=>{
  const count=slug==="all"?folderGroups.reduce((n,g)=>n+g.querySelectorAll(".doc-item").length,0)
   :folderGroups.filter(g=>g.dataset.category===slug).reduce((n,g)=>n+g.querySelectorAll(".doc-item").length,0);
  if(!count)return;
  const button=document.createElement("button");
  button.type="button";
  button.className="t710-filter-button";
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
 categoryHost.hidden=false;

 const resultCount=document.getElementById("doc-count");
 const empty=document.getElementById("no-results");
 function applyCategory(){
  let visible=0;
  folderGroups.forEach(group=>{
   const matchCategory=activeCategory==="all"||group.dataset.category===activeCategory;
   if(!matchCategory)group.hidden=true;
   if(!group.hidden){
    visible+=[...group.querySelectorAll(".doc-item")].filter(item=>!item.hidden).length;
   }
  });
  if(resultCount)resultCount.textContent=visible+" public document"+(visible===1?"":"s");
  if(empty)empty.style.display=visible===0?"block":"none";
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
