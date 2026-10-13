import{d as _}from"./shared-LHM63KIC.js";import{B as S,C as h,H as y,I as u,K as x,R as w,S as k,c as A,f as I,h as E,k as L,l as N,n as i,q as R,r as f,t as O,u as o,v as M,w as $,x as g}from"./shared-ZECGUGS6.js";function C(){k(I),w({page:"appts"});let j=[["all","الكل"],["up","القادمة"],["past","السابقة"],["x","الملغاة"]],p=u.upcoming().length?"up":"all",V=t=>`${String(t.getDate()).padStart(2,"0")}/${String(t.getMonth()+1).padStart(2,"0")}/${t.getFullYear()}`,v=()=>{try{return JSON.parse(localStorage.getItem("molu_rated")||"{}")}catch{return{}}};function U(t){let e=Math.round((new Date(t)-Date.now())/36e5);if(e<1)return"موعدك خلال ساعة";if(e<24)return`موعدك بعد ${$(e)} ${e>2&&e<=10?"ساعات":"ساعة"}`;let n=Math.round(e/24);return n===1?"موعدك بكرة":n===2?"موعدك بعد يومين":`موعدك بعد ${$(n)} ${n<=10?"أيام":"يوماً"}`}let B=t=>(A[t.section]||[]).find(e=>e.services.some(([n])=>n===t.services[0]))?.id||"all";function G(t,e){let n=E(t.salonId),s=new Date(t.at),a=y(t),r=t.status==="cancelled",c=v()[t.id],l=a?`<button class="pill-dark pressable" type="button" data-manage="${t.id}">${i("edit_calendar",18)}إدارة الموعد</button>`:r?`<a class="pill-dark pressable" href="salon.html?id=${n.id}">${i("history",18)}احجز مجدداً</a>`:`<button class="pill-dark pressable" type="button" data-rate="${t.id}">${i(c?"star_f":"star",18)}${c?`قيّمت ${$(c)}/5`:"قيّم الزيارة"}</button>`;return`
    <article class="order" style="--i:${e}" data-id="${t.id}">
      <div class="o1"><a class="o-logo" href="salon.html?id=${n.id}" style="--c:${t.section==="eve"?"var(--eve)":"var(--adam)"}">${R(n.name)}</a><a class="o-name" href="salon.html?id=${n.id}">${n.name}</a>${l}</div>
      <div class="o2"><span class="o-thumb">${x(t.section,B(t),30)}</span><span class="o-svc">${t.services.join("، ")}<br><span class="muted">${L(s.getHours()*60+s.getMinutes())} · ${t.staff}</span></span><span class="o-price">${N(t.total)}</span></div>
      <div class="o3">${a?`<span class="up">${U(t.at)}</span>`:r?'<span class="x">موعد ملغى</span>':"<span>تمت الزيارة</span>"}<span>${V(s)}</span></div>
    </article>`}function m(){let t=u.list(),e={all:t,up:u.upcoming(),past:t.filter(a=>!y(a)&&a.status!=="cancelled"),x:t.filter(a=>a.status==="cancelled")},n=e.up.length;o("#bell").textContent=n?$(n):"",o("#bell").dataset.n=n,o("#tabs").innerHTML=j.map(([a,r])=>`<button type="button" role="tab" data-tab="${a}" aria-selected="${a===p}">${r}</button>`).join("");let s=p==="all"?[...e.up,...t.filter(a=>!y(a)).sort((a,r)=>new Date(r.at)-new Date(a.at))]:e[p];o("#list").innerHTML=s.length?s.map(G).join(""):`
      <div class="empty">${O({shape:p==="up"?3:1,size:96})}
        <h3>${p==="up"?"ما عندك مواعيد قادمة":"ما فيه شي هنا"}</h3>
        <p>احجز موعدك الجاي بدقيقة — بدون اتصال ولا انتظار.</p>
        <a class="btn btn-filled pressable" href="explore.html">${i("search",20)}تصفّح الصالونات</a>
      </div>`}m(),o("#tabs").addEventListener("click",t=>{let e=t.target.closest("[data-tab]");!e||e.dataset.tab===p||(p=e.dataset.tab,m())});function H(t,e){let n=new Date(t.at),s=new Date(+n+t.minutes*6e4),a=l=>l.toISOString().replace(/[-:]/g,"").replace(/\.\d+/,""),r=`BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MoLu//AR
BEGIN:VEVENT
UID:${t.id}@molu
DTSTAMP:${a(new Date)}
DTSTART:${a(n)}
DTEND:${a(s)}
SUMMARY:${e.name} — ${t.services.join("، ")}
LOCATION:${e.street?e.street+"، ":""}${e.district}، ${e.city}
GEO:${e.lat};${e.lng}
BEGIN:VALARM
TRIGGER:-PT2H
ACTION:DISPLAY
DESCRIPTION:تذكير بموعدك
END:VALARM
END:VEVENT
END:VCALENDAR`,c=URL.createObjectURL(new Blob([r],{type:"text/calendar"}));Object.assign(document.createElement("a"),{href:c,download:"molu-appointment.ics"}).click(),setTimeout(()=>URL.revokeObjectURL(c),2e3)}document.addEventListener("click",t=>{let e=t.target.closest("[data-manage]"),n=t.target.closest("[data-rate]");if(!e&&!n)return;let s=u.list().find(l=>l.id===(e||n).dataset[e?"manage":"rate"]),a=E(s.salonId),r=o("#manage");if(n){let l=v()[s.id]||0;o("#manage-body").innerHTML=`<h2 class="title-l" style="text-align:center">كيف كانت زيارتك لـ ${a.name}؟</h2>
        <div class="stars-in" id="stars">${[1,2,3,4,5].map(d=>`<button type="button" data-v="${d}" class="${d<=l?"on":""}" aria-label="${d} نجوم">${i("star_f",40)}</button>`).join("")}</div>
        <button class="btn btn-black btn-block btn-lg pressable" type="button" id="send-rate"${l?"":" disabled"}>أرسل التقييم</button>`,S(r),o("#stars").onclick=d=>{let b=d.target.closest("[data-v]");b&&(l=+b.dataset.v,M("#stars button").forEach((T,D)=>{T.classList.toggle("on",D<l),D<l&&f(T,[{transform:"scale(.6)"},{transform:"none"}],"bouncy",{delay:D*.04})}),o("#send-rate").disabled=!1)},o("#send-rate").onclick=()=>{try{localStorage.setItem("molu_rated",JSON.stringify({...v(),[s.id]:l}))}catch{}h(r),m(),g("شكراً! تقييمك يساعد غيرك يختار صح")};return}o("#manage-body").innerHTML=`
      <h2 class="title-l">${a.name}</h2>
      <p class="muted" style="margin:2px 0 14px">${s.services.join("، ")} · ${s.staff}</p>
      <div class="sheet-list">
        <a href="salon.html?id=${a.id}&reschedule=${s.id}">${i("edit_calendar",24)}تغيير الموعد</a>
        <button type="button" id="m-cal">${i("event_available",24)}أضف للتقويم</button>
        <a href="${_(a)}" target="_blank" rel="noopener">${i("near_me",24)}الاتجاهات</a>
        <a href="tel:+966500000000">${i("call",24)}اتصل بالصالون</a>
        <button type="button" class="danger" id="m-cancel">${i("cancel",24)}<span>إلغاء الموعد</span></button>
      </div>`,S(r),o("#m-cal").onclick=()=>{H(s,a),h(r),g("أضفنا الموعد مع تذكير قبلها بساعتين")};let c=!1;o("#m-cancel").onclick=l=>{let d=l.currentTarget;if(!c){c=!0,o("span",d).textContent="متأكد؟ اضغط مرة ثانية",f(d,[{transform:"translateX(0)"},{transform:"translateX(-6px)"},{transform:"translateX(5px)"},{transform:"none"}],"bouncy");return}u.update(s.id,{status:"cancelled"}),h(r);let b=o(`.order[data-id="${s.id}"]`);f(b,[{opacity:1,transform:"none"},{opacity:0,transform:"scale(.94)"}],"snappy").finished.then(m),g("ألغينا الموعد",{action:"تراجع",onAction:()=>{u.update(s.id,{status:"booked"}),m()}})}})}window.__softnav||C();export{C as default};
