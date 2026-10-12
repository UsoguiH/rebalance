import{c as H,d as P,e as z}from"./shared-DNZLK26X.js";import{B as Q,C as Z,F as tt,G as F,I as x,K as st,M as at,O as et,R as nt,a as q,f as _,h as U,i as X,j as S,k as j,l as u,n as l,o as T,p as C,q as G,r as b,s as D,u as n,v as f,w as d,y as J,z as K}from"./shared-TLAORWBW.js";function it(){let B=new URLSearchParams(location.search),a=U(B.get("id"))||_.eve[0],$=q[a.section],m=a.section==="eve";tt(a.section),nt({page:"home",section:a.section,nav:!1}),document.title=`${a.name} — مولو`;let v=x.list().find(s=>s.id===B.get("reschedule")),p=new Map,h=(s,t)=>`${s}:${t}`,ot=s=>{let[t,e]=s.split(":").map(Number);return a.categories[t].services[e]},bt=s=>s===1?"خدمة":s===2?"خدمتين":`${d(s)} ${s<=10?"خدمات":"خدمة"}`,O=(s,t)=>`<button class="add pressable" type="button" data-svc="${s}" aria-pressed="false" aria-label="أضف ${t.name}">${l("add",22,"a-off")}${l("check",22,"a-on")}</button>`,rt=a.categories.slice(0,3).map((s,t)=>({c:s,ci:t,s:s.services[0]}));n("#app").innerHTML=`
    <div class="cover">${T(a)}
      <div class="cover-bar">
        <a class="glass pressable" href="explore.html?s=${a.section}" aria-label="رجوع">${l("arrow_back",22,"flip-rtl")}</a>
        <div class="group-b">
          <button class="glass pressable" type="button" id="share" aria-label="مشاركة">${l("ios_share",22)}</button>
          <button class="glass fav pressable${F.has(a.id)?" on":""}" type="button" data-fav="${a.id}" aria-pressed="${F.has(a.id)}" aria-label="المفضلة">${l("favorite",22,"f-o")}${l("favorite_f",22,"f-f")}</button>
        </div>
      </div>
    </div>
    <div class="wrap">
      <div class="store-head enter">
        <span class="logo" style="--c:${m?"var(--eve)":"var(--adam)"}">${G(a.name)}</span>
        <h1>${a.name}${a.verified?at():""}</h1>
        <div class="store-meta">${a.reviews?`<b>★ ${a.rating.toFixed(1)}</b><span>(${d(a.reviews)})</span>`:"<b>جديد</b>"}·<span>${a.district}</span>·<span>${d(a.km)} كم</span>·<span class="${a.open?"open":""}">${a.open?"مفتوح حتى 11 م":"يفتح 10 ص"}</span></div>
        <div class="info-pills">
          ${a.offer?`<span class="hot">${l("percent",18)}${a.offer} على كل الخدمات</span>`:""}
          <span>${l("payments",18)}الدفع بعد الخدمة</span>
          <span>${l("event_available",18)}إلغاء مجاني</span>
          ${a.home?`<span>${l("home_work",18)}يجونك البيت</span>`:""}
        </div>
      </div>

      <section class="sec"><div class="sec-h"><h2>الأكثر طلباً</h2></div>
        <div class="carousel">${rt.map(({c:s,ci:t,s:e})=>`
          <div class="pop-card" data-pick="${h(t,0)}"><span class="ti">${st(a.section,s.id,48)}</span>${O(h(t,0),e)}<b>${e.name}</b><span>${u(e.price)} · ${d(e.minutes)} د</span></div>`).join("")}</div>
      </section>
    </div>

    <nav class="tabs" aria-label="أقسام الخدمات"><div class="tabs-in" id="tabs">${a.categories.map((s,t)=>`<button type="button" data-tab="${t}" aria-selected="${t===0}">${s.name}</button>`).join("")}<i class="ink" id="ink"></i></div></nav>
    <div class="wrap">
      ${a.categories.map((s,t)=>`
        <section class="menu-sec" id="m-${t}"><h2>${s.name}</h2>
          ${s.services.map((e,o)=>`
            <div class="svc" data-pick="${h(t,o)}"><div class="grow"><b>${e.name}</b><span>${u(e.price)} · ${d(e.minutes)} دقيقة</span></div>${O(h(t,o),e)}</div>`).join("")}
        </section>`).join("")}

      ${a.reviewList.length?`<section class="sec"><div class="sec-h"><h2>وش قالوا عنه</h2><span class="muted">★ ${a.rating.toFixed(1)} · ${d(a.reviews)} تقييم</span></div>
        <div class="carousel">${a.reviewList.map(([s,t,e])=>`<article class="review"><header>${s}<span class="stars">${Array.from({length:5},(o,c)=>l(c<t?"star_f":"star",15)).join("")}</span></header><p>${e}</p></article>`).join("")}</div>
      </section>`:""}

      <section class="sec"><div class="sec-h"><h2>عن ${$.place==="صالون"?"الصالون":"المكان"}</h2></div>
        <div class="about">
          <div class="mini-map pressable" id="mini-map" role="button" aria-label="افتح الخريطة">${C([a],{activeId:a.id,section:a.section})}</div>
          <p class="muted" style="font-size:.78rem;margin:-4px 4px 0">${z(a)}</p>
          <a class="row pressable" href="${P(a)}" target="_blank" rel="noopener">${l("location_on",24)}<span class="grow"><b>${a.street?a.street+"، ":""}${a.district}، ${a.city}</b><span>${d(a.km)} كم ${m?"منكِ":"منك"}</span></span>${l("chevron_left",22)}</a>
          <div class="row">${l("schedule",24)}<span class="grow"><b>${a.hours?.label||"كل يوم 10 ص – 11 م"}</b><span>${a.hours?a.hours.friday?"الجمعة من 4 م":"الجمعة إجازة":"الجمعة من 4 م"}</span></span></div>
          <div class="row">${l("groups",24)}<span class="grow"><b>${a.staff.map(s=>s.name).join("، ")}</b><span>${m?"فريق نسائي بالكامل":"فريق الحلاقين"}</span></span></div>
          ${a.amenities.length?`<div class="row">${l("check_circle",24)}<span class="grow"><b>المزايا</b><span>${a.amenities.join(" · ")}</span></span></div>`:""}
        </div>
      </section>
    </div>`,et(document);function E(){let s=[...p.values()],t=s.reduce((c,i)=>c+i.price,0),e=n("#cta"),o=!e.classList.contains("hide");e.classList.toggle("hide",!s.length),s.length&&(n("#cta-n").textContent=d(s.length),n("#cta-p").textContent=u(t),o&&b(n("#cta-n"),[{transform:"scale(1.4)"},{transform:"none"}],"bouncy")),f("[data-svc]").forEach(c=>c.setAttribute("aria-pressed",p.has(c.dataset.svc)))}document.addEventListener("click",s=>{let t=s.target.closest("[data-pick]");if(!t||s.target.closest("#book"))return;let e=t.dataset.pick;p.has(e)?p.delete(e):p.set(e,ot(e)),E(),f(`[data-svc="${e}"]`).forEach(o=>b(o,[{transform:"scale(.7)"},{transform:"none"}],"bouncy"))});let L=f("#tabs [data-tab]"),W=n("#ink");function g(s,t=!0){L.forEach((c,i)=>c.setAttribute("aria-selected",i===s));let e=L[s],o=n("#tabs");W.style.width=e.offsetWidth+"px",W.style.transform=`translateX(${e.offsetLeft+e.offsetWidth-o.offsetWidth}px)`,t&&e.scrollIntoView({inline:"center",block:"nearest",behavior:"smooth"})}g(0,!1);let I=!1;n("#tabs").addEventListener("click",s=>{let t=s.target.closest("[data-tab]");t&&(I=!0,g(+t.dataset.tab),n(`#m-${t.dataset.tab}`).scrollIntoView({behavior:"smooth"}),setTimeout(()=>I=!1,700))});let ct=new IntersectionObserver(s=>{if(I)return;let t=s.filter(e=>e.isIntersecting).sort((e,o)=>e.boundingClientRect.top-o.boundingClientRect.top)[0];t&&g(+t.target.id.slice(2))},{rootMargin:"-70px 0px -60% 0px"});f(".menu-sec").forEach(s=>ct.observe(s)),addEventListener("resize",()=>g(L.findIndex(s=>s.getAttribute("aria-selected")==="true"),!1)),n("#share").addEventListener("click",async()=>{try{if(navigator.share)return await navigator.share({title:a.name,url:location.href})}catch{return}J(location.href,"نسخنا رابط الصالون ✓")});let N=!1,lt=()=>{if(N)return;N=!0;let s=n("#mini-map");H(s,{salons:[a],activeId:a.id,interactive:!1}).then(()=>s.querySelector(".map-art")?.remove()).catch(()=>{})};new IntersectionObserver((s,t)=>{s.some(e=>e.isIntersecting)&&(t.disconnect(),lt())},{rootMargin:"300px"}).observe(n("#mini-map")),n("#mini-map").addEventListener("click",()=>{let s=n("#mini-map").getBoundingClientRect(),t=`inset(${s.top}px ${innerWidth-s.right}px ${innerHeight-s.bottom}px ${s.left}px round 20px)`,e=document.createElement("div"),o;e.className="map-full",e.innerHTML=`<div class="map-host"></div><button class="round pressable" type="button" aria-label="إغلاق">${l("close",22)}</button>
      <span class="map-note">${z(a)}</span>
      <div class="map-card"><span class="thumb">${T(a)}</span><span class="grow"><b>${a.name}</b><br><span class="muted" style="font-size:.86rem">${a.district} · ${d(a.km)} كم</span></span>
      <a class="pill-dark" href="${P(a)}" target="_blank" rel="noopener">${l("near_me",18)}الاتجاهات</a></div>`,document.body.append(e),document.documentElement.style.overflow="hidden",b(e,[{clipPath:t},{clipPath:"inset(0 round 0px)"}],"smooth"),D(n(".map-card",e),{y:30,delay:.25});let c=_[a.section];H(n(".map-host",e),{salons:c,activeId:a.id,padBottom:110,onPick:i=>{i!==a.id&&(location.href=`salon.html?id=${i}`)}}).then(i=>{o=i,i.map.setView([a.lat,a.lng],15.5,{animate:!1})}).catch(()=>{n(".map-host",e).innerHTML=C(c,{activeId:a.id,section:a.section,h:Math.round(400*innerHeight/innerWidth)})}),n(".round",e).onclick=()=>{document.documentElement.style.overflow="";let i=n("#mini-map").getBoundingClientRect();b(e,[{clipPath:"inset(0 round 0px)"},{clipPath:`inset(${i.top}px ${innerWidth-i.right}px ${innerHeight-i.bottom}px ${i.left}px round 20px)`}],"snappy").finished.then(()=>{o?.destroy(),e.remove()})}});let k=X(14),r={staff:"any",day:0,slot:null},dt=()=>Math.max(0,k.findIndex(s=>S(a,s.i).some(t=>t.free))),M=()=>[...p.values()].reduce((s,t)=>s+t.price,0);function R(){let s=S(a,r.day);return s.some(t=>t.free)?s.map(t=>`<button class="slot" type="button" data-slot="${t.m}"${t.free?"":" disabled"} aria-pressed="${r.slot===t.m}">${j(t.m)}</button>`).join(""):`<div class="empty" style="grid-column:1/-1;padding:16px">${l("event_busy",36)}<b>هاليوم مكتمل</b><span>${m?"اختاري":"اختر"} يوم ثاني</span></div>`}function A(){return r.slot==null?`${m?"اختاري":"اختر"} الوقت`:`${v?"تأكيد الموعد الجديد":"تأكيد الحجز"} · ${u(M())}`}function pt(){let s=[...p.values()];n("#bk").innerHTML=`
      <h2>${m?"متى يناسبكِ؟":"متى يناسبك؟"}</h2>
      <p class="sub">${s.map(t=>t.name).join("، ")} · ${d(s.reduce((t,e)=>t+e.minutes,0))} دقيقة</p>
      <div class="bk-lbl">مع مين؟</div>
      <div class="pills" id="staff">${[["any",$.anyStaff],...a.staff.map(t=>[t.name,t.name])].map(([t,e])=>`<button class="pill" type="button" data-staff="${t}" aria-pressed="${r.staff===t}">${t==="any"?l("bolt",18):""}${e}</button>`).join("")}</div>
      <div class="bk-lbl">اليوم</div>
      <div class="pills" id="days">${k.map(t=>`<button class="day" type="button" data-day="${t.i}" aria-pressed="${t.i===r.day}"><small>${t.wd}</small><b>${d(t.day)}</b></button>`).join("")}</div>
      <div class="bk-lbl">الوقت</div>
      <div class="slots" id="slots">${R()}</div>
      <div class="bk-note">${l("notifications_active",20)}<span>الدفع بعد الخدمة · نذكّر${m?"كِ":"ك"} قبل الموعد بساعتين · إلغاء مجاني</span></div>
      <div class="bk-foot"><button class="btn btn-block pressable" type="button" id="confirm"${r.slot==null?" disabled":""}>${A()}</button></div>`,requestAnimationFrame(()=>n(`#days [data-day="${r.day}"]`)?.scrollIntoView({inline:"center",block:"nearest"}))}function ft(){let s=k[r.day],t=[...p.values()];n("#bk").innerHTML=`
      <div class="done">
        <div class="confetti">${Array.from({length:18},(o,c)=>`<i style="--c:${["#FF5028","#F5A623","#1E8E4E","#1A63D6"][c%4]}"></i>`).join("")}</div>
        <span class="done-check"><svg viewBox="0 0 24 24" fill="none"><path pathLength="1" d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1"/></svg></span>
        <h2>${v?"تم تغيير الموعد":"تم الحجز!"}</h2>
        <p>${m?"نشوفكِ":"نشوفك"} في ${a.name} — أرسلنا التأكيد برسالة.</p>
        <div class="ticket">
          <div class="r"><span>الموعد</span><b>${s.wd} ${d(s.day)} · ${j(r.slot)}</b></div>
          <div class="r"><span>الخدمات</span><b>${t.map(o=>o.name).join("، ")}</b></div>
          <div class="r"><span>${$.staffWord}</span><b>${r.staff==="any"?$.anyStaff:r.staff}</b></div>
          <div class="r"><span>الإجمالي</span><b>${u(M())}</b></div>
        </div>
        <div class="btns"><a class="btn btn-tonal pressable" href="appointments.html">مواعيدي</a><button class="btn btn-black pressable" type="button" id="done">تمام</button></div>
      </div>`;let e=n(".done-check");b(e,[{transform:"scale(.2)",opacity:0},{transform:"none",opacity:1}],"bouncy"),n("path",e).animate([{strokeDashoffset:1},{strokeDashoffset:0}],{duration:420,delay:220,easing:"cubic-bezier(.22,1,.36,1)",fill:"both"}),f(".confetti i").forEach((o,c)=>{let i=c/18*Math.PI*2,w=110+c%3*40;o.animate([{transform:"translate(-50%,0) rotate(0)",opacity:1},{transform:`translate(calc(-50% + ${Math.cos(i)*w}px), ${Math.sin(i)*w*.7+150}px) rotate(${c*70}deg)`,opacity:0}],{duration:1100+c%4*120,delay:150,easing:"cubic-bezier(.15,.7,.3,1)",fill:"both"})}),D(n(".ticket"),{y:20,delay:.25})}n("#cta-btn").addEventListener("click",()=>{r.slot==null&&(r.day=dt()),pt(),Q(n("#book"))}),n("#book").addEventListener("click",async s=>{let t=s.target,e=t.closest("[data-staff]");if(e){r.staff=e.dataset.staff,f("#staff .pill").forEach(i=>i.setAttribute("aria-pressed",i===e));return}let o=t.closest("[data-day]");if(o){r.day=+o.dataset.day,r.slot=null,f("#days .day").forEach(i=>i.setAttribute("aria-pressed",i===o)),n("#slots").innerHTML=R(),n("#slots").animate([{opacity:0,transform:"translateY(8px)"},{opacity:1,transform:"none"}],{duration:240,easing:"cubic-bezier(.22,1,.36,1)"}),n("#confirm").disabled=!0,n("#confirm").textContent=A();return}let c=t.closest("[data-slot]");if(c){r.slot=+c.dataset.slot,f("#slots .slot").forEach(i=>i.setAttribute("aria-pressed",i===c)),n("#confirm").disabled=!1,n("#confirm").textContent=A(),b(n("#confirm"),[{transform:"scale(.95)"},{transform:"none"}],"bouncy");return}if(t.closest("#confirm")){K(n("#confirm"),!0),await new Promise(y=>setTimeout(y,850));let i=k[r.day].date,w=new Date(i.getFullYear(),i.getMonth(),i.getDate(),Math.floor(r.slot/60),r.slot%60),V=[...p.values()],Y={salonId:a.id,section:a.section,services:V.map(y=>y.name),total:M(),minutes:V.reduce((y,mt)=>y+mt.minutes,0),staff:r.staff==="any"?$.anyStaff:r.staff,at:w.toISOString(),pay:"salon",status:"booked"};v?x.update(v.id,Y):x.add({id:"A"+Date.now().toString(36),createdAt:Date.now(),...Y}),ft();return}t.closest("#done")&&(Z(n("#book")),p.clear(),r.slot=null,E())}),v&&(a.categories.forEach((s,t)=>s.services.forEach((e,o)=>{v.services.includes(e.name)&&p.set(h(t,o),e)})),E(),p.size&&setTimeout(()=>n("#cta-btn").click(),400))}window.__softnav||it();export{it as default};
