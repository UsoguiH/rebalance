import{I as l,P as p,Q as m,T as c,h as n,n as r,r as s,u as t,v as i}from"./shared-TD55TVYE.js";c({page:"favs"});function d(){let e=l.list().map(n).filter(Boolean);i("#list").innerHTML=e.length?e.map((o,a)=>p(o,{i:a})).join(""):`
    <div class="empty" style="grid-column:1/-1">${t({shape:5,size:96})}
      <h3>\u0627\u0644\u0645\u0641\u0636\u0644\u0629 \u0641\u0627\u0636\u064A\u0629</h3>
      <p>\u0627\u0636\u063A\u0637 \u0639\u0644\u0649 \u0627\u0644\u0642\u0644\u0628 \u0641\u064A \u0623\u064A \u0635\u0627\u0644\u0648\u0646 \u064A\u0639\u062C\u0628\u0643\u060C \u0648\u064A\u0635\u064A\u0631 \u0647\u0646\u0627 \u0639\u0634\u0627\u0646 \u062A\u0631\u062C\u0639 \u0644\u0647 \u0628\u0633\u0631\u0639\u0629.</p>
      <a class="btn btn-filled pressable" href="explore.html">${r("search",20)}\u062A\u0635\u0641\u0651\u062D \u0627\u0644\u0635\u0627\u0644\u0648\u0646\u0627\u062A</a>
    </div>`}d();m(document,(e,o)=>{if(o)return;let a=document.querySelector(`.sc-card[data-id="${e}"]`);s(a,[{opacity:1,transform:"none"},{opacity:0,transform:"scale(.92)"}],"snappy").finished.then(d)});
