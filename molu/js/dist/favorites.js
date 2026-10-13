import{G as p,N as f,O as m,R as c,h as a,n as r,r as s,t as i,u as l}from"./shared-ZECGUGS6.js";function d(){c({page:"favs"});function t(){let o=p.list().map(a).filter(Boolean);l("#list").innerHTML=o.length?o.map((e,n)=>f(e,{i:n})).join(""):`
      <div class="empty" style="grid-column:1/-1">${i({shape:5,size:96})}
        <h3>المفضلة فاضية</h3>
        <p>اضغط على القلب في أي صالون يعجبك، ويصير هنا عشان ترجع له بسرعة.</p>
        <a class="btn btn-filled pressable" href="explore.html">${r("search",20)}تصفّح الصالونات</a>
      </div>`}t(),m(document,(o,e)=>{if(e)return;let n=document.querySelector(`.sc-card[data-id="${o}"]`);s(n,[{opacity:1,transform:"none"},{opacity:0,transform:"scale(.92)"}],"snappy").finished.then(t)})}window.__softnav||d();export{d as default};
