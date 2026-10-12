import{A as v,E as u,K as g,R as $,c as p,h as d,m as b,n as i,r as h,u as e,w as f,x as c}from"./shared-TLAORWBW.js";function y(){let s=u();$({page:"home",section:s,nav:!1}),document.body.classList.add("merchant");let l=d("mine"),m=(a,t)=>s==="eve"?a:t,k=i("check_circle_f",20),w=[["هل يحتاج العميل يحمّل تطبيق؟","لا. يفتح رابط صفحتك من أي جوال ويحجز خلال 30 ثانية."],["هل فيه عمولة على الحجوزات؟","لا. اشتراك ثابت فقط، وكل ريال من خدماتك لك."],["وش يصير بعد الـ 14 يوم المجانية؟","إذا ما اشتركت تنتقل للباقة المجانية (40 حجز بالشهر)، وتبقى صفحتك وبياناتك."],["أقدر أضيف حجوزات الاتصال والحضور؟","نعم، من لوحتك بضغطة «+ موعد»، وتظهر مع حجوزات صفحتك في جدول واحد."]];e("#app").innerHTML=`
    <header class="m-bar">
      <a class="m-brand" href="explore.html" aria-label="رجوع للتطبيق">${i("arrow_back",20,"flip-rtl")}<b>مولو</b><span>للأعمال</span></a>
      ${l?'<a class="m-bar-btn" href="dashboard.html">لوحتي</a>':'<a class="m-bar-btn" href="#start">ابدأ</a>'}
    </header>

    <section class="m-hero">
      <div class="m-art"><img id="m-img" alt="" width="628" height="868"></div>
      <h1 id="m-title"></h1>
      <p id="m-sub"></p>
    </section>

    <form class="m-form" id="start" novalidate>
      <h2>${l?"صفحتك شغّالة":"ابدأ مجاناً"}</h2>
      ${l?`<p class="m-note">${l.name} · ${l.district}</p><a class="btn btn-black btn-lg btn-block pressable" href="dashboard.html">افتح لوحتك</a>`:`
      <div class="segmented" role="radiogroup" aria-label="نوع المحل">
        <label><input type="radio" name="type" value="eve"${s==="eve"?" checked":""}><span>صالون نسائي</span></label>
        <label><input type="radio" name="type" value="adam"${s==="adam"?" checked":""}><span>محل حلاقة</span></label>
      </div>
      <label class="m-field"><span>اسم المحل</span><input id="f-name" maxlength="40" autocomplete="organization"></label>
      <label class="m-field"><span>رقم الجوال</span><span class="m-phone"><i>+966</i><input id="f-phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel-national" placeholder="5X XXX XXXX"></span></label>
      <button class="btn btn-black btn-lg btn-block pressable" type="submit">ابدأ ${i("chevron_left",20)}</button>
      <p class="m-note">14 يوم مجاناً بكل المزايا · بدون بطاقة · بدون عمولة</p>`}
    </form>

    <section class="m-facts">
      <div><b>٠٪</b><small>عمولة على الحجوزات</small></div>
      <div><b>١٤</b><small>يوم مجاناً</small></div>
      <div><b>٥</b><small>دقائق وتجهز صفحتك</small></div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">ليش تنضم؟</h2>
      <div class="m-why">
        <article><span class="m-pic"><img src="img/icons/fire.webp" alt="" width="96" height="96"></span><b>عملاء جدد يلقونك</b><p>تطلع لكل من يبحث في حيّك، في الدليل وعلى الخريطة.</p></article>
        <article><span class="m-pic"><img src="img/icons/home.webp" alt="" width="96" height="96"></span><b>صفحة حجز باسمك</b><p>رابط واحد للإنستقرام والواتساب وقوقل ماب. يحجزون 24 ساعة.</p></article>
        <article><span class="m-pic"><img src="img/icons/gift.webp" alt="" width="96" height="96"></span><b>غياب أقل، دخل أكثر</b><p>تأكيد وتذكير تلقائي، وعروض وبطاقة ولاء ترجّع عملاءك.</p></article>
      </div>
    </section>

    <section class="m-sec m-gray">
      <h2 class="m-h">كيف تبدأ</h2>
      <ol class="m-steps">
        <li><i>1</i><div><b>سجّل محلّك</b><p>الاسم، الموقع على الخريطة، ورقم جوالك.</p></div></li>
        <li><i>2</i><div><b>أضف خدماتك</b><p>جهّزنا لك الخدمات بأسعار السوق، عدّل اللي تبي.</p></div></li>
        <li><i>3</i><div><b>استقبل الحجوزات</b><p>شارك رابطك، وتابع كل شي من لوحتك.</p></div></li>
      </ol>
      <div class="m-svcs" id="m-svcs"></div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">الباقات</h2>
      <p class="m-lead">كلها تبدأ بـ 14 يوم مجاناً. بدون عمولة، وتلغي متى ما تبي.</p>
      <div class="m-plans">${b.map(a=>`
        <article class="${a.popular?"pop":""}">
          ${a.popular?"<em>الأكثر اختياراً</em>":""}
          <b>${a.solo?"المستقل":a.name}</b>
          <div class="m-price">${a.month?`<strong>${f(a.month)}</strong><small>ر.س / شهر</small>`:"<strong>مجاناً</strong><small>للأبد</small>"}</div>
          <ul>${a.feats.slice(0,4).map(t=>`<li>${k}${t}</li>`).join("")}</ul>
          <a class="btn ${a.popular?"btn-black":"btn-outlined"} btn-block pressable" href="#start" data-plan>اختر ${a.solo?"المستقل":a.name}</a>
        </article>`).join("")}</div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">أسئلة شائعة</h2>
      <div class="m-faq">${w.map(([a,t])=>`<details><summary>${a}${i("expand_more",22)}</summary><p>${t}</p></details>`).join("")}</div>
    </section>

    <section class="m-end">
      <h2>جاهز تملأ جدولك؟</h2>
      <a class="btn btn-lg pressable" href="#start">ابدأ مجاناً</a>
    </section>`;function o(){e("#m-img").src=`img/${s}-full-960.webp`,e("#m-title").textContent=m("حجوزات أكثر لصالونك","حجوزات أكثر لمحلّك"),e("#m-sub").textContent=m("عميلاتك يحجزن بأنفسهن من صفحة باسمك، والتذكير يوصلهن تلقائياً.","زبائنك يحجزون بأنفسهم من صفحة باسمك، والتذكير يوصلهم تلقائياً."),e("#m-svcs").innerHTML=p[s].map(a=>`<span>${g(s,a.id,44)}<small>${a.name}</small></span>`).join("")}o(),v(e("#app")),e("#app").addEventListener("change",a=>{a.target.name==="type"&&(s=a.target.value,h(e(".m-art"),[{opacity:.3,transform:"scale(.96)"},{opacity:1,transform:"none"}],"gentle"),o())}),e("#app").addEventListener("click",a=>{a.target.closest('a[href="#start"]')&&(a.preventDefault(),e("#start").scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>e("#f-name")?.focus({preventScroll:!0}),450))}),e("#start").addEventListener("submit",a=>{if(a.preventDefault(),l)return;let t=e("#f-name").value.trim(),n=e("#f-phone").value.replace(/\D/g,"").replace(/^0/,"");if(t.length<2){c("اكتب اسم المحل"),e("#f-name").focus();return}if(n&&!/^5\d{8}$/.test(n)){c("الرقم يبدأ بـ 5 ومكوّن من 9 أرقام"),e("#f-phone").focus();return}let r=new URLSearchParams({s,name:t});n&&r.set("phone",n),location.href=`join.html?${r}`})}window.__softnav||y();export{y as default};
