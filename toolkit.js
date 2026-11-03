/* Troop 710 Interactive Toolkit. All checklist data stays in this browser.
   This page does not submit answers, names, or packing lists to a server. */
(function(){
"use strict";

/* A small safe local preference utility: errors in private/incognito mode
   must not prevent any interactive feature from working. */
function loadLocal(key,fallback){
 try{
  const raw=localStorage.getItem(key);
  return raw===null?fallback:JSON.parse(raw);
 }catch(_){return fallback}
}
function saveLocal(key,value){
 try{localStorage.setItem(key,JSON.stringify(value))}catch(_){}
}
function node(tag,className,textValue){
 const el=document.createElement(tag);
 if(className)el.className=className;
 if(textValue!==undefined)el.textContent=textValue;
 return el;
}

/* 1. Trip checklist — informational sample only. */
const packHost=document.getElementById("tk-pack-groups");
const packTabs=[...document.querySelectorAll("[data-trip]")];
const packTitle=document.getElementById("tk-trip-title");
const packCount=document.getElementById("tk-pack-count");
const packFill=document.getElementById("tk-pack-fill");
const packPercent=document.getElementById("tk-pack-percent");
const packBar=document.getElementById("tk-pack-progress");
const addForm=document.getElementById("tk-add-form");
const customInput=document.getElementById("tk-custom-input");
const customStatus=document.getElementById("tk-custom-status");
const packKey="t710-toolkit-pack-v1";
const defaultList={
 "Every outing":[
  ["water","Reusable water bottle"],
  ["weather","Check the forecast and group plan"],
  ["layers","Comfortable, weather-appropriate layers"],
  ["shoes","Comfortable, suitable footwear"],
  ["sun","Sun protection as appropriate"],
  ["snacks","Food or snacks per the trip plan"]
 ],
 "Small essentials":[
  ["notebook","Notebook and pencil"],
  ["light","Flashlight or headlamp (if needed)"],
  ["bag","Daypack to carry belongings"],
  ["plan","Know the meeting point and group check-in plan"]
 ],
 "Overnight extras":[
  ["sleep","Sleeping bag suitable for expected conditions"],
  ["pad","Sleeping pad"],
  ["clothes","Clean change of clothes and socks"],
  ["toiletry","Personal toiletries"],
  ["warm","Extra warm layer"],
  ["overnightbag","Bag for overnight belongings"]
 ]
};
const starter=loadLocal(packKey,{mode:"day",checked:{},custom:[]});
let packState={
 mode:starter&&starter.mode==="overnight"?"overnight":"day",
 checked:starter&&starter.checked&&typeof starter.checked==="object"&&!Array.isArray(starter.checked)?starter.checked:{},
 custom:starter&&Array.isArray(starter.custom)?starter.custom.filter(x=>x&&typeof x.id==="string"&&typeof x.label==="string").slice(0,40):[]
};
function packGroups(){
 const out=[
  ["Every outing",defaultList["Every outing"]],
  ["Small essentials",defaultList["Small essentials"]]
 ];
 if(packState.mode==="overnight")out.push(["Overnight extras",defaultList["Overnight extras"]]);
 if(packState.custom.length)out.push(["My additions",packState.custom.map(x=>[x.id,x.label])]);
 return out;
}
function allPackItems(){return packGroups().flatMap(g=>g[1]);}
function persistPacking(){saveLocal(packKey,packState);}
function updatePacking(){
 const items=allPackItems();
 const complete=items.filter(([id])=>packState.checked[id]===true).length;
 const pct=items.length?Math.round(complete/items.length*100):0;
 if(packCount)packCount.textContent=complete+" / "+items.length;
 if(packPercent)packPercent.textContent=pct+"% prepared";
 if(packFill)packFill.style.width=pct+"%";
 if(packBar)packBar.setAttribute("aria-valuenow",String(pct));
}
function renderPacking(){
 if(!packHost)return;
 if(packTitle)packTitle.textContent=packState.mode==="day"?"Day outing essentials":"Overnight trip essentials";
 packTabs.forEach(tab=>tab.setAttribute("aria-pressed",String(tab.dataset.trip===packState.mode)));
 packHost.replaceChildren();
 for(const [groupName,items] of packGroups()){
  const group=node("div","tk-pack-group");
  const heading=node("h4",null,groupName);
  const ul=node("ul","tk-pack-list");
  for(const [id,labelText] of items){
   const li=node("li",packState.checked[id]?"is-done":"");
   const label=node("label");
   const checkbox=node("input");
   checkbox.type="checkbox";
   checkbox.checked=packState.checked[id]===true;
   checkbox.setAttribute("aria-label",labelText);
   const span=node("span",null,labelText);
   checkbox.addEventListener("change",()=>{
    packState.checked[id]=checkbox.checked;
    li.classList.toggle("is-done",checkbox.checked);
    persistPacking();updatePacking();
   });
   label.append(checkbox,span);
   li.append(label);
   if(groupName==="My additions"){
    const remove=node("button","tk-remove","×");
    remove.type="button";
    remove.setAttribute("aria-label","Remove custom item: "+labelText);
    remove.addEventListener("click",()=>{
     packState.custom=packState.custom.filter(x=>x.id!==id);
     delete packState.checked[id];
     persistPacking();renderPacking();
     if(customStatus)customStatus.textContent="Custom item removed.";
    });
    li.append(remove);
   }
   ul.append(li);
  }
  group.append(heading,ul);
  packHost.append(group);
 }
 updatePacking();
}
if(packHost){
 packTabs.forEach(tab=>tab.addEventListener("click",()=>{
  packState.mode=tab.dataset.trip==="overnight"?"overnight":"day";
  persistPacking();renderPacking();
 }));
 addForm?.addEventListener("submit",event=>{
  event.preventDefault();
  const label=(customInput?.value||"").trim().replace(/\s+/g," ").slice(0,65);
  if(label.length<2){
   if(customStatus)customStatus.textContent="Enter at least two characters.";
   return;
  }
  if(packState.custom.length>=40){
   if(customStatus)customStatus.textContent="You have reached the limit of 40 custom items.";
   return;
  }
  const id="custom-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2,7);
  packState.custom.push({id,label});
  customInput.value="";
  persistPacking();renderPacking();
  if(customStatus)customStatus.textContent="Added to your checklist.";
  customInput.focus();
 });
 document.getElementById("tk-reset-list")?.addEventListener("click",()=>{
  packState.checked={};
  packState.custom=[];
  persistPacking();renderPacking();
  if(customStatus)customStatus.textContent="Checklist reset.";
 });
 document.getElementById("tk-print-list")?.addEventListener("click",()=>window.print());
 renderPacking();
}

/* 2. Short educational readiness quiz — never describes official rank credit. */
const questions=[
 {
  topic:"GETTING READY",
  text:"Before leaving for an outdoor activity, what is the best first step?",
  choices:["Check the forecast and the plan from your leaders","Only check how far you will walk","Assume conditions will stay the same"],
  correct:0,
  why:"Reviewing the weather and the group's plan helps you prepare appropriate clothing, supplies, and expectations."
 },
 {
  topic:"STAYING TOGETHER",
  text:"What's a helpful way to keep a group organized on an outing?",
  choices:["Go ahead without telling anyone","Follow the agreed buddy and group check-in plan","Only check in at the end"],
  correct:1,
  why:"Following the group's agreed check-in and buddy procedures helps everyone know where they should be."
 },
 {
  topic:"RESPECTING WILDLIFE",
  text:"You see a wild animal nearby. What's the best general choice?",
  choices:["Try to feed it","Move closer for a better photo","Observe from a respectful distance and do not feed it"],
  correct:2,
  why:"Giving wildlife space and never feeding it helps protect people and animals."
 },
 {
  topic:"CARING FOR THE OUTDOORS",
  text:"What should you do before leaving an outdoor area?",
  choices:["Collect your belongings and pack out your litter","Leave wrappers if they're small","Move litter to the edge of the trail"],
  correct:0,
  why:"Leave the area clean and follow the group's instructions for waste and site care."
 },
 {
  topic:"ASKING FOR GUIDANCE",
  text:"You're unsure whether an activity is safe. What should you do?",
  choices:["Guess and see what happens","Ask a responsible adult leader before proceeding","Follow the first suggestion you hear"],
  correct:1,
  why:"When an activity is unclear or feels unsafe, getting guidance from the responsible adult leader is the right next step."
 }
];
const play=document.getElementById("tk-quiz-play");
const end=document.getElementById("tk-quiz-end");
const questionText=document.getElementById("tk-quiz-question");
const topic=document.getElementById("tk-quiz-topic");
const answers=document.getElementById("tk-quiz-choices");
const feedback=document.getElementById("tk-quiz-feedback");
const next=document.getElementById("tk-quiz-next");
const track=document.getElementById("tk-quiz-track");
const counter=document.getElementById("tk-quiz-counter");
let current=0,chosen=null,score=0;
function renderQuestion(){
 if(!play||!answers)return;
 if(current>=questions.length){
  play.hidden=true;
  if(end)end.hidden=false;
  if(counter)counter.textContent="Complete";
  if(track)track.style.width="100%";
  const scoreText=document.getElementById("tk-quiz-score");
  if(scoreText)scoreText.textContent="You answered "+score+" of "+questions.length+" questions correctly.";
  return;
 }
 const q=questions[current];
 play.hidden=false;
 if(end)end.hidden=true;
 chosen=null;
 if(topic)topic.textContent=q.topic;
 if(questionText)questionText.textContent=q.text;
 if(counter)counter.textContent="Question "+(current+1)+" of "+questions.length;
 if(track)track.style.width=(current/questions.length*100)+"%";
 if(feedback){feedback.hidden=true;feedback.replaceChildren();}
 if(next){next.disabled=true;next.textContent=current===questions.length-1?"See results →":"Next question →";}
 answers.replaceChildren();
 q.choices.forEach((option,i)=>{
  const button=node("button",null,option);
  button.type="button";
  button.dataset.letter=String.fromCharCode(65+i);
  button.setAttribute("aria-pressed","false");
  button.addEventListener("click",()=>chooseAnswer(i));
  answers.append(button);
 });
}
function chooseAnswer(index){
 if(chosen!==null)return;
 const q=questions[current];
 chosen=index;
 if(index===q.correct)score++;
 [...answers.children].forEach((button,i)=>{
  button.disabled=true;
  button.setAttribute("aria-pressed",String(i===index));
  if(i===q.correct)button.classList.add("is-correct");
  else if(i===index)button.classList.add("is-incorrect");
 });
 if(feedback){
  feedback.hidden=false;
  const title=node("strong",null,index===q.correct?"That's right.":"Good to know:");
  const explanation=node("span",null,q.why);
  feedback.append(title,explanation);
 }
 if(next)next.disabled=false;
}
if(play){
 next?.addEventListener("click",()=>{if(chosen===null)return;current++;renderQuestion();});
 document.getElementById("tk-quiz-restart")?.addEventListener("click",()=>{
  current=0;chosen=null;score=0;renderQuestion();
  questionText?.focus?.();
 });
 renderQuestion();
}

/* 3. Guided resource finder with only already-public destinations. */
const audiences=[
 {
  id:"new",title:"I'm new to the troop",description:"Explore Scouting or learn how to join",
  goals:[
   {title:"Understand the program",description:"Get a useful overview",answer:"Learn about Troop 710",details:"A good starting place for understanding the values and opportunities of Scouting.",links:[["About Our Troop","Scouting values, adventure, and service","about.html"],["Public resources","Trusted troop and Scouting America links","resources.html"]]},
   {title:"Find joining documents",description:"Public youth registration information",answer:"Start with the registration resources",details:"You can browse the listed public forms, then confirm current requirements with the troop.",links:[["Youth registration forms","Publicly indexed registration PDFs","forms.html?category=registration"],["Official Troop 710 portal","Current joining information","https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"]]},
   {title:"Find meeting details",description:"Visit or contact the troop",answer:"Check official troop information",details:"Meeting details and approved contact options are maintained outside this independent public information site.",links:[["Official Troop 710 portal","Current meeting information and contact channels","https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"],["Public adult directory","Names published on the official roster","leaders.html"]]}
  ]
 },
 {
  id:"scout",title:"I'm a current Scout",description:"Find public advancement and leadership tools",
  goals:[
   {title:"Youth leadership",description:"Positions and expectations",answer:"Explore leadership paperwork",details:"The troop's public document archive contains youth leadership expectations and completion paperwork.",links:[["Youth leadership documents","Public position expectations and forms","forms.html?category=leadership"],["Forms & Documents","All public documents","forms.html"]]},
   {title:"Advancement and Eagle",description:"Board of Review and Eagle resources",answer:"Find advancement resources",details:"These are publicly linked documents; always verify the current versions and process with troop leaders.",links:[["Board of Review","Public advancement forms","forms.html?category=review"],["Eagle project workbooks","Both publicly listed workbook files","forms.html?category=eagle"]]},
   {title:"Merit badges",description:"Public reference documents",answer:"Find the merit badge resource",details:"Browse the publicly indexed merit badge resource and official Scouting America references.",links:[["Merit badge resources","Troop public PDF index","forms.html?category=merit"],["Resource Links","Scouting America references","resources.html"]]}
  ]
 },
 {
  id:"adult",title:"I'm a parent or volunteer",description:"Find committee and administrative information",
  goals:[
   {title:"Know the leadership",description:"Find the public committee directory",answer:"Explore adult leadership information",details:"The public directory lists adult committee members. Contact details should be obtained through approved official channels.",links:[["Adult Leaders","Public committee-member directory","leaders.html"],["TroopWebHost","Official troop contact options","https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"]]},
   {title:"Adult paperwork",description:"Registration and volunteering",answer:"Find adult and volunteer documents",details:"These are links to public administrative files; current requirements should be verified with the troop.",links:[["Adult registration","Published adult application resources","forms.html?category=adult"],["Volunteer documents","Public screening and compliance references","forms.html?category=volunteer"]]},
   {title:"Scouting resources",description:"General policies and support",answer:"Find trusted resource links",details:"These pages point to the official organization and curated troop information.",links:[["Resource Links","Official troop and national references","resources.html"],["Official troop portal","Current notices and member information","https://www.troopwebhost.org/Troop710HaciendaHeights/Index.htm"]]}
  ]
 }
];
const audienceHost=document.getElementById("tk-audience-options");
const goalHost=document.getElementById("tk-goal-options");
const goalSection=document.getElementById("tk-finder-goal");
const audienceSection=document.getElementById("tk-finder-audience");
const resultSection=document.getElementById("tk-finder-results");
const finderStep=document.getElementById("tk-finder-step");
const finderBack=document.getElementById("tk-finder-back");
let audience=null;
function makeFinderOption(title,desc,index,callback){
 const button=node("button");
 button.type="button";
 const number=node("span","tk-finder__number",String(index+1).padStart(2,"0"));
 const name=node("span","tk-finder__option-title",title);
 const description=node("span","tk-finder__option-description",desc);
 button.append(number,name,description);
 button.addEventListener("click",callback);
 return button;
}
function chooseAudience(nextAudience){
 audience=nextAudience;
 audienceSection.hidden=true;
 goalSection.hidden=false;
 resultSection.hidden=true;
 finderBack.hidden=false;
 finderStep.textContent="STEP 2 OF 2";
 const heading=document.getElementById("tk-goal-heading");
 if(heading)heading.textContent="What would you like to find?";
 goalHost.replaceChildren();
 audience.goals.forEach((goal,i)=>goalHost.append(makeFinderOption(goal.title,goal.description,i,()=>showResource(goal))));
}
function showResource(goal){
 audienceSection.hidden=true;goalSection.hidden=true;resultSection.hidden=false;
 finderStep.textContent="YOUR RESOURCE GUIDE";
 const title=document.getElementById("tk-finder-result-title");
 const desc=document.getElementById("tk-finder-result-description");
 const links=document.getElementById("tk-finder-links");
 if(title)title.textContent=goal.answer;
 if(desc)desc.textContent=goal.details;
 links.replaceChildren();
 goal.links.forEach(([name,summary,url])=>{
  const a=node("a");a.href=url;
  if(/^https:\/\//.test(url)){a.target="_blank";a.rel="noopener noreferrer";}
  const copy=node("span");
  copy.append(node("span",null,name),node("small",null,summary));
  a.append(copy,node("span",null,"↗"));
  links.append(a);
 });
}
function resetFinder(){
 audience=null;audienceSection.hidden=false;goalSection.hidden=true;resultSection.hidden=true;
 finderBack.hidden=true;finderStep.textContent="STEP 1 OF 2";
}
if(audienceHost&&goalHost){
 audiences.forEach((item,i)=>audienceHost.append(makeFinderOption(item.title,item.description,i,()=>chooseAudience(item))));
 finderBack?.addEventListener("click",resetFinder);
 resetFinder();
}
})();