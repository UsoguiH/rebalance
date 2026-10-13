import{A as g,B as u,E as y,P as w,Q as k,R as L,h as v,m as b,n as e,r as m,u as s,v as $,w as p}from"./shared-ZECGUGS6.js";function q(){let o=y(),t=!1;L({page:"home",section:o,nav:!1}),document.body.classList.add("biz");let i=v("mine"),n=(a,l)=>o==="eve"?a:l,h=[["هل يحتاج العميل يحمّل تطبيق؟","لا. يفتح رابط صفحتك من أي جوال ويحجز خلال 30 ثانية."],["فيه عمولة على الحجوزات؟","لا. اشتراك ثابت فقط، وكل ريال من خدماتك لك."],["وش يصير بعد الـ 14 يوم؟","إذا ما اشتركت تنتقل للباقة المجانية (40 حجز بالشهر)، وتبقى صفحتك وبياناتك."],["أقدر أضيف حجوزات الاتصال والحضور؟","نعم، من لوحتك بضغطة «+ موعد»، وتظهر مع حجوزات صفحتك في جدول واحد."]],c=a=>`join.html?s=${o}${a?"&kind=home":""}`;s("#app").innerHTML=`
    <header class="b-top">
      <a class="round pressable" href="account.html" aria-label="رجوع">${e("arrow_back",22,"flip-rtl")}</a>
      <h1>لأصحاب المحلات</h1>
      <div id="sec"></div>
    </header>
    <div id="b-body"></div>`;function f(){s("#b-body").innerHTML=`
      <a class="b-promo pressable" href="${i?"dashboard.html":c(!1)}">
        <span class="b-promo-t">
          <em>${i?"صفحتك شغّالة":"بدون عمولة"}</em>
          <b>${i?i.name:n("سجّلي صالونك واستقبلي الحجوزات","سجّل محلّك واستقبل الحجوزات")}</b>
          <small>${i?"حجوزاتك وخدماتك وفريقك في مكان واحد":"14 يوم مجاناً · جاهز خلال 5 دقائق"}</small>
          <span class="b-promo-btn">${i?"افتح لوحتك":"ابدأ الآن"}${e("chevron_left",18)}</span>
        </span>
        <img src="img/icons/home.webp" alt="" width="132" height="132">
      </a>

      <section class="sec"><div class="sec-h"><h2>وش تحصل</h2></div>
        <div class="b-tiles">
          <div><img src="img/icons/fire.webp" alt="" width="56" height="56"><b>عملاء جدد</b><small>تطلع في الدليل والخريطة</small></div>
          <div><img src="img/icons/home.webp" alt="" width="56" height="56"><b>صفحة باسمك</b><small>رابط للإنستقرام وقوقل ماب</small></div>
          <div><img src="img/icons/gift.webp" alt="" width="56" height="56"><b>عروض وولاء</b><small>ترجّع عملاءك</small></div>
          <div><img src="img/icons/offer.webp" alt="" width="56" height="56"><b>بدون عمولة</b><small>اشتراك ثابت فقط</small></div>
        </div>
      </section>

      <section class="sec"><div class="sec-h"><h2>تبدأ في دقيقتين</h2></div>
        <ol class="b-track">
          <li><i>١</i><span><b>${n("سجّلي صالونك","سجّل محلّك")}</b><small>الاسم، الموقع، ورقم جوالك</small></span></li>
          <li><i>٢</i><span><b>أضف خدماتك</b><small>جاهزة بأسعار السوق، عدّل اللي تبي</small></span></li>
          <li><i>٣</i><span><b>استقبل الحجوزات</b><small>شارك رابطك وتابع من لوحتك</small></span></li>
        </ol>
      </section>

      <section class="sec"><div class="sec-h"><h2>الباقات</h2></div>
        <div class="segmented b-bill" role="radiogroup" aria-label="الدفع">
          <label><input type="radio" name="bill" value="m"${t?"":" checked"}><span>شهري</span></label>
          <label><input type="radio" name="bill" value="y"${t?" checked":""}><span>سنوي · شهرين مجاناً</span></label>
        </div>
        <div class="b-plans">${b.map(a=>`
          <article class="${a.popular?"pop":""}">
            ${a.popular?"<em>الأكثر اختياراً</em>":""}
            <b>${a.solo?n("المستقلة","المستقل"):a.name}</b>
            <div class="b-price">${a.month?`<strong>${p(t?a.year:a.month)}</strong><small>ر.س / ${t?"سنة":"شهر"}</small>`:"<strong>مجاناً</strong><small>للأبد</small>"}</div>
            <ul>${a.feats.slice(0,3).map(l=>`<li>${e("check",18)}${l}</li>`).join("")}</ul>
            <a class="btn ${a.popular?"btn-filled":"btn-tonal"} btn-block pressable" href="${c(!!a.solo)}">${a.month?"جرّبها 14 يوم":"ابدأ مجاناً"}</a>
          </article>`).join("")}</div>
      </section>

      <a class="b-solo pressable" href="${c(!0)}"><span class="ic">${e("home_work",22)}</span><span class="grow"><b>${n("تشتغلين في البيوت؟","تشتغل في البيوت؟")}</b><small>${n("سجّلي كمستقلة وحددي الأحياء ورسوم الزيارة","سجّل كمستقل وحدد الأحياء ورسوم الزيارة")}</small></span>${e("chevron_left",20)}</a>

      <section class="sec"><div class="sec-h"><h2>أسئلة</h2></div>
        <div class="list-card">${h.map(([a],l)=>`<button type="button" data-faq="${l}"><span class="ic">${e("info",22)}</span>${a}<span class="end">${e("chevron_left",20)}</span></button>`).join("")}</div>
      </section>`,g(s("#b-body")),s("#b-cta").href=i?"dashboard.html":c(!1),s("#b-cta span").textContent=i?"افتح لوحتك":n("سجّلي صالونك مجاناً","سجّل محلّك مجاناً")}document.body.insertAdjacentHTML("beforeend",`<div class="b-bar"><a class="btn btn-filled btn-lg btn-block pressable" id="b-cta" href="join.html"><span></span>${e("chevron_left",20)}</a></div>
    <div class="sheet" id="faq-sheet" hidden role="dialog" aria-label="سؤال"><div class="handle"></div><div id="faq-body"></div></div>`),f(),m(s(".b-promo img"),[{transform:"scale(.6) rotate(-12deg)",opacity:0},{transform:"none",opacity:1}],"bouncy",{delay:.15}),s("#app").addEventListener("change",a=>{a.target.name==="bill"&&(t=a.target.value==="y",$(".b-price").forEach((l,d)=>{let r=b[d];r.month&&(l.innerHTML=`<strong>${p(t?r.year:r.month)}</strong><small>ر.س / ${t?"سنة":"شهر"}</small>`,m(l,[{transform:"translateY(8px)",opacity:0},{transform:"none",opacity:1}],"bouncy",{delay:d*.04}))}))}),s("#app").addEventListener("click",a=>{let l=a.target.closest("[data-faq]");if(!l)return;let[d,r]=h[+l.dataset.faq];s("#faq-body").innerHTML=`<h2 class="title-l">${d}</h2><p class="muted" style="margin:8px 0 18px;font-size:1rem;line-height:1.8">${r}</p><a class="btn btn-filled btn-lg btn-block pressable" href="${c(!1)}">${n("سجّلي صالونك","سجّل محلّك")}</a>`,u(s("#faq-sheet"))}),w(s("#sec"),o,a=>{o=a,k(s("#b-body"),f)})}window.__softnav||q();export{q as default};
