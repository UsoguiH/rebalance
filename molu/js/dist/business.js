import{A as v,E as u,K as g,R as $,c as p,h as d,m as b,n as i,r as h,u as e,w as f,x as c}from"./shared-456K7C35.js";function y(){let s=u();$({page:"home",section:s,nav:!1}),document.body.classList.add("merchant");let l=d("mine"),m=(a,t)=>s==="eve"?a:t,k=i("check_circle_f",20),w=[["\u0647\u0644 \u064A\u062D\u062A\u0627\u062C \u0627\u0644\u0639\u0645\u064A\u0644 \u064A\u062D\u0645\u0651\u0644 \u062A\u0637\u0628\u064A\u0642\u061F","\u0644\u0627. \u064A\u0641\u062A\u062D \u0631\u0627\u0628\u0637 \u0635\u0641\u062D\u062A\u0643 \u0645\u0646 \u0623\u064A \u062C\u0648\u0627\u0644 \u0648\u064A\u062D\u062C\u0632 \u062E\u0644\u0627\u0644 30 \u062B\u0627\u0646\u064A\u0629."],["\u0647\u0644 \u0641\u064A\u0647 \u0639\u0645\u0648\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A\u061F","\u0644\u0627. \u0627\u0634\u062A\u0631\u0627\u0643 \u062B\u0627\u0628\u062A \u0641\u0642\u0637\u060C \u0648\u0643\u0644 \u0631\u064A\u0627\u0644 \u0645\u0646 \u062E\u062F\u0645\u0627\u062A\u0643 \u0644\u0643."],["\u0648\u0634 \u064A\u0635\u064A\u0631 \u0628\u0639\u062F \u0627\u0644\u0640 14 \u064A\u0648\u0645 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629\u061F","\u0625\u0630\u0627 \u0645\u0627 \u0627\u0634\u062A\u0631\u0643\u062A \u062A\u0646\u062A\u0642\u0644 \u0644\u0644\u0628\u0627\u0642\u0629 \u0627\u0644\u0645\u062C\u0627\u0646\u064A\u0629 (40 \u062D\u062C\u0632 \u0628\u0627\u0644\u0634\u0647\u0631)\u060C \u0648\u062A\u0628\u0642\u0649 \u0635\u0641\u062D\u062A\u0643 \u0648\u0628\u064A\u0627\u0646\u0627\u062A\u0643."],["\u0623\u0642\u062F\u0631 \u0623\u0636\u064A\u0641 \u062D\u062C\u0648\u0632\u0627\u062A \u0627\u0644\u0627\u062A\u0635\u0627\u0644 \u0648\u0627\u0644\u062D\u0636\u0648\u0631\u061F","\u0646\u0639\u0645\u060C \u0645\u0646 \u0644\u0648\u062D\u062A\u0643 \u0628\u0636\u063A\u0637\u0629 \xAB+ \u0645\u0648\u0639\u062F\xBB\u060C \u0648\u062A\u0638\u0647\u0631 \u0645\u0639 \u062D\u062C\u0648\u0632\u0627\u062A \u0635\u0641\u062D\u062A\u0643 \u0641\u064A \u062C\u062F\u0648\u0644 \u0648\u0627\u062D\u062F."]];e("#app").innerHTML=`
    <header class="m-bar">
      <a class="m-brand" href="explore.html" aria-label="\u0631\u062C\u0648\u0639 \u0644\u0644\u062A\u0637\u0628\u064A\u0642">${i("arrow_back",20,"flip-rtl")}<b>\u0645\u0648\u0644\u0648</b><span>\u0644\u0644\u0623\u0639\u0645\u0627\u0644</span></a>
      ${l?'<a class="m-bar-btn" href="dashboard.html">\u0644\u0648\u062D\u062A\u064A</a>':'<a class="m-bar-btn" href="#start">\u0627\u0628\u062F\u0623</a>'}
    </header>

    <section class="m-hero">
      <div class="m-art"><img id="m-img" alt="" width="628" height="868"></div>
      <h1 id="m-title"></h1>
      <p id="m-sub"></p>
    </section>

    <form class="m-form" id="start" novalidate>
      <h2>${l?"\u0635\u0641\u062D\u062A\u0643 \u0634\u063A\u0651\u0627\u0644\u0629":"\u0627\u0628\u062F\u0623 \u0645\u062C\u0627\u0646\u0627\u064B"}</h2>
      ${l?`<p class="m-note">${l.name} \xB7 ${l.district}</p><a class="btn btn-black btn-lg btn-block pressable" href="dashboard.html">\u0627\u0641\u062A\u062D \u0644\u0648\u062D\u062A\u0643</a>`:`
      <div class="segmented" role="radiogroup" aria-label="\u0646\u0648\u0639 \u0627\u0644\u0645\u062D\u0644">
        <label><input type="radio" name="type" value="eve"${s==="eve"?" checked":""}><span>\u0635\u0627\u0644\u0648\u0646 \u0646\u0633\u0627\u0626\u064A</span></label>
        <label><input type="radio" name="type" value="adam"${s==="adam"?" checked":""}><span>\u0645\u062D\u0644 \u062D\u0644\u0627\u0642\u0629</span></label>
      </div>
      <label class="m-field"><span>\u0627\u0633\u0645 \u0627\u0644\u0645\u062D\u0644</span><input id="f-name" maxlength="40" autocomplete="organization"></label>
      <label class="m-field"><span>\u0631\u0642\u0645 \u0627\u0644\u062C\u0648\u0627\u0644</span><span class="m-phone"><i>+966</i><input id="f-phone" type="tel" inputmode="numeric" maxlength="11" autocomplete="tel-national" placeholder="5X XXX XXXX"></span></label>
      <button class="btn btn-black btn-lg btn-block pressable" type="submit">\u0627\u0628\u062F\u0623 ${i("chevron_left",20)}</button>
      <p class="m-note">14 \u064A\u0648\u0645 \u0645\u062C\u0627\u0646\u0627\u064B \u0628\u0643\u0644 \u0627\u0644\u0645\u0632\u0627\u064A\u0627 \xB7 \u0628\u062F\u0648\u0646 \u0628\u0637\u0627\u0642\u0629 \xB7 \u0628\u062F\u0648\u0646 \u0639\u0645\u0648\u0644\u0629</p>`}
    </form>

    <section class="m-facts">
      <div><b>\u0660\u066A</b><small>\u0639\u0645\u0648\u0644\u0629 \u0639\u0644\u0649 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A</small></div>
      <div><b>\u0661\u0664</b><small>\u064A\u0648\u0645 \u0645\u062C\u0627\u0646\u0627\u064B</small></div>
      <div><b>\u0665</b><small>\u062F\u0642\u0627\u0626\u0642 \u0648\u062A\u062C\u0647\u0632 \u0635\u0641\u062D\u062A\u0643</small></div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">\u0644\u064A\u0634 \u062A\u0646\u0636\u0645\u061F</h2>
      <div class="m-why">
        <article><span class="m-pic"><img src="img/icons/fire.webp" alt="" width="96" height="96"></span><b>\u0639\u0645\u0644\u0627\u0621 \u062C\u062F\u062F \u064A\u0644\u0642\u0648\u0646\u0643</b><p>\u062A\u0637\u0644\u0639 \u0644\u0643\u0644 \u0645\u0646 \u064A\u0628\u062D\u062B \u0641\u064A \u062D\u064A\u0651\u0643\u060C \u0641\u064A \u0627\u0644\u062F\u0644\u064A\u0644 \u0648\u0639\u0644\u0649 \u0627\u0644\u062E\u0631\u064A\u0637\u0629.</p></article>
        <article><span class="m-pic"><img src="img/icons/home.webp" alt="" width="96" height="96"></span><b>\u0635\u0641\u062D\u0629 \u062D\u062C\u0632 \u0628\u0627\u0633\u0645\u0643</b><p>\u0631\u0627\u0628\u0637 \u0648\u0627\u062D\u062F \u0644\u0644\u0625\u0646\u0633\u062A\u0642\u0631\u0627\u0645 \u0648\u0627\u0644\u0648\u0627\u062A\u0633\u0627\u0628 \u0648\u0642\u0648\u0642\u0644 \u0645\u0627\u0628. \u064A\u062D\u062C\u0632\u0648\u0646 24 \u0633\u0627\u0639\u0629.</p></article>
        <article><span class="m-pic"><img src="img/icons/gift.webp" alt="" width="96" height="96"></span><b>\u063A\u064A\u0627\u0628 \u0623\u0642\u0644\u060C \u062F\u062E\u0644 \u0623\u0643\u062B\u0631</b><p>\u062A\u0623\u0643\u064A\u062F \u0648\u062A\u0630\u0643\u064A\u0631 \u062A\u0644\u0642\u0627\u0626\u064A\u060C \u0648\u0639\u0631\u0648\u0636 \u0648\u0628\u0637\u0627\u0642\u0629 \u0648\u0644\u0627\u0621 \u062A\u0631\u062C\u0651\u0639 \u0639\u0645\u0644\u0627\u0621\u0643.</p></article>
      </div>
    </section>

    <section class="m-sec m-gray">
      <h2 class="m-h">\u0643\u064A\u0641 \u062A\u0628\u062F\u0623</h2>
      <ol class="m-steps">
        <li><i>1</i><div><b>\u0633\u062C\u0651\u0644 \u0645\u062D\u0644\u0651\u0643</b><p>\u0627\u0644\u0627\u0633\u0645\u060C \u0627\u0644\u0645\u0648\u0642\u0639 \u0639\u0644\u0649 \u0627\u0644\u062E\u0631\u064A\u0637\u0629\u060C \u0648\u0631\u0642\u0645 \u062C\u0648\u0627\u0644\u0643.</p></div></li>
        <li><i>2</i><div><b>\u0623\u0636\u0641 \u062E\u062F\u0645\u0627\u062A\u0643</b><p>\u062C\u0647\u0651\u0632\u0646\u0627 \u0644\u0643 \u0627\u0644\u062E\u062F\u0645\u0627\u062A \u0628\u0623\u0633\u0639\u0627\u0631 \u0627\u0644\u0633\u0648\u0642\u060C \u0639\u062F\u0651\u0644 \u0627\u0644\u0644\u064A \u062A\u0628\u064A.</p></div></li>
        <li><i>3</i><div><b>\u0627\u0633\u062A\u0642\u0628\u0644 \u0627\u0644\u062D\u062C\u0648\u0632\u0627\u062A</b><p>\u0634\u0627\u0631\u0643 \u0631\u0627\u0628\u0637\u0643\u060C \u0648\u062A\u0627\u0628\u0639 \u0643\u0644 \u0634\u064A \u0645\u0646 \u0644\u0648\u062D\u062A\u0643.</p></div></li>
      </ol>
      <div class="m-svcs" id="m-svcs"></div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">\u0627\u0644\u0628\u0627\u0642\u0627\u062A</h2>
      <p class="m-lead">\u0643\u0644\u0647\u0627 \u062A\u0628\u062F\u0623 \u0628\u0640 14 \u064A\u0648\u0645 \u0645\u062C\u0627\u0646\u0627\u064B. \u0628\u062F\u0648\u0646 \u0639\u0645\u0648\u0644\u0629\u060C \u0648\u062A\u0644\u063A\u064A \u0645\u062A\u0649 \u0645\u0627 \u062A\u0628\u064A.</p>
      <div class="m-plans">${b.map(a=>`
        <article class="${a.popular?"pop":""}">
          ${a.popular?"<em>\u0627\u0644\u0623\u0643\u062B\u0631 \u0627\u062E\u062A\u064A\u0627\u0631\u0627\u064B</em>":""}
          <b>${a.solo?"\u0627\u0644\u0645\u0633\u062A\u0642\u0644":a.name}</b>
          <div class="m-price">${a.month?`<strong>${f(a.month)}</strong><small>\u0631.\u0633 / \u0634\u0647\u0631</small>`:"<strong>\u0645\u062C\u0627\u0646\u0627\u064B</strong><small>\u0644\u0644\u0623\u0628\u062F</small>"}</div>
          <ul>${a.feats.slice(0,4).map(t=>`<li>${k}${t}</li>`).join("")}</ul>
          <a class="btn ${a.popular?"btn-black":"btn-outlined"} btn-block pressable" href="#start" data-plan>\u0627\u062E\u062A\u0631 ${a.solo?"\u0627\u0644\u0645\u0633\u062A\u0642\u0644":a.name}</a>
        </article>`).join("")}</div>
    </section>

    <section class="m-sec">
      <h2 class="m-h">\u0623\u0633\u0626\u0644\u0629 \u0634\u0627\u0626\u0639\u0629</h2>
      <div class="m-faq">${w.map(([a,t])=>`<details><summary>${a}${i("expand_more",22)}</summary><p>${t}</p></details>`).join("")}</div>
    </section>

    <section class="m-end">
      <h2>\u062C\u0627\u0647\u0632 \u062A\u0645\u0644\u0623 \u062C\u062F\u0648\u0644\u0643\u061F</h2>
      <a class="btn btn-lg pressable" href="#start">\u0627\u0628\u062F\u0623 \u0645\u062C\u0627\u0646\u0627\u064B</a>
    </section>`;function o(){e("#m-img").src=`img/${s}-full-960.webp`,e("#m-title").textContent=m("\u062D\u062C\u0648\u0632\u0627\u062A \u0623\u0643\u062B\u0631 \u0644\u0635\u0627\u0644\u0648\u0646\u0643","\u062D\u062C\u0648\u0632\u0627\u062A \u0623\u0643\u062B\u0631 \u0644\u0645\u062D\u0644\u0651\u0643"),e("#m-sub").textContent=m("\u0639\u0645\u064A\u0644\u0627\u062A\u0643 \u064A\u062D\u062C\u0632\u0646 \u0628\u0623\u0646\u0641\u0633\u0647\u0646 \u0645\u0646 \u0635\u0641\u062D\u0629 \u0628\u0627\u0633\u0645\u0643\u060C \u0648\u0627\u0644\u062A\u0630\u0643\u064A\u0631 \u064A\u0648\u0635\u0644\u0647\u0646 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B.","\u0632\u0628\u0627\u0626\u0646\u0643 \u064A\u062D\u062C\u0632\u0648\u0646 \u0628\u0623\u0646\u0641\u0633\u0647\u0645 \u0645\u0646 \u0635\u0641\u062D\u0629 \u0628\u0627\u0633\u0645\u0643\u060C \u0648\u0627\u0644\u062A\u0630\u0643\u064A\u0631 \u064A\u0648\u0635\u0644\u0647\u0645 \u062A\u0644\u0642\u0627\u0626\u064A\u0627\u064B."),e("#m-svcs").innerHTML=p[s].map(a=>`<span>${g(s,a.id,44)}<small>${a.name}</small></span>`).join("")}o(),v(e("#app")),e("#app").addEventListener("change",a=>{a.target.name==="type"&&(s=a.target.value,h(e(".m-art"),[{opacity:.3,transform:"scale(.96)"},{opacity:1,transform:"none"}],"gentle"),o())}),e("#app").addEventListener("click",a=>{a.target.closest('a[href="#start"]')&&(a.preventDefault(),e("#start").scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>e("#f-name")?.focus({preventScroll:!0}),450))}),e("#start").addEventListener("submit",a=>{if(a.preventDefault(),l)return;let t=e("#f-name").value.trim(),n=e("#f-phone").value.replace(/\D/g,"").replace(/^0/,"");if(t.length<2){c("\u0627\u0643\u062A\u0628 \u0627\u0633\u0645 \u0627\u0644\u0645\u062D\u0644"),e("#f-name").focus();return}if(n&&!/^5\d{8}$/.test(n)){c("\u0627\u0644\u0631\u0642\u0645 \u064A\u0628\u062F\u0623 \u0628\u0640 5 \u0648\u0645\u0643\u0648\u0651\u0646 \u0645\u0646 9 \u0623\u0631\u0642\u0627\u0645"),e("#f-phone").focus();return}let r=new URLSearchParams({s,name:t});n&&r.set("phone",n),location.href=`join.html?${r}`})}window.__softnav||y();export{y as default};
