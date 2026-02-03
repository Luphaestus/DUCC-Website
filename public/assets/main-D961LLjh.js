(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const n of document.querySelectorAll('link[rel="modulepreload"]'))a(n);new MutationObserver(n=>{for(const i of n)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&a(o)}).observe(document,{childList:!0,subtree:!0});function s(n){const i={};return n.integrity&&(i.integrity=n.integrity),n.referrerPolicy&&(i.referrerPolicy=n.referrerPolicy),n.crossOrigin==="use-credentials"?i.credentials="include":n.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function a(n){if(n.ep)return;n.ep=!0;const i=s(n);fetch(n.href,i)}})();class R{static INFO="info";static SUCCESS="success";static WARNING="warning";static ERROR="error"}const et=new Map;function Gt(t){if(!t||t.classList.contains("fade-out"))return;const e=t.dataset.caller;e&&et.get(e)?.element===t&&et.delete(e);const s=()=>{t.remove()};t.addEventListener("animationend",s,{once:!0}),setTimeout(()=>{t.parentNode&&t.remove()},500),t.classList.add("fade-out")}function v(t,e,s=R.INFO,a=5e3,n=null){const i=document.getElementById("notification-container");if(!i)return()=>{};let o;if(n&&et.has(n)){const c=et.get(n);o=c.element,clearTimeout(c.timeout),o.className="notification",o.classList.add(`notification-${s}`)}else o=document.createElement("div"),o.classList.add("notification",`notification-${s}`),n&&(o.dataset.caller=n),o.addEventListener("click",()=>{Gt(o)}),i.appendChild(o);o.innerHTML=`<strong>${t}</strong>${e?`<p>${e}</p>`:""}`;const l=setTimeout(()=>{Gt(o)},a);return n&&et.set(n,{element:o,timeout:l}),()=>{clearTimeout(l),Gt(o)}}const Aa=Object.freeze(Object.defineProperty({__proto__:null,NotificationTypes:R,notify:v},Symbol.toStringTag,{value:"Module"}));let ke=class{subscribers;constructor(){this.subscribers=new Set}subscribe(e){return this.subscribers.add(e),()=>this.unsubscribe(e)}once(e){const s=a=>{e(a),this.unsubscribe(s)};return this.subscribe(s)}unsubscribe(e){this.subscribers.delete(e)}notify(e){this.subscribers.forEach(s=>{try{s(e)}catch(a){console.error("Error in event subscriber:",a)}})}clear(){this.subscribers.clear()}};const Se=new ke,as=new ke,Ge=new ke,G=new ke,Bt=new ke,ns=new ke,is=new ke;let os=[],Ts=window.location.pathname+window.location.search;G.subscribe(({path:t})=>{os.push(Ts),Ts=t});const ls=()=>os.pop(),xs=()=>os.length>0;let Ut=!0,vt=null,We=null;async function Oe(t){if(t===null){d("GET","/api/health",!1).catch();return}if(t!==Ut)if(vt&&vt(),Ut=t,Ut)if(We&&(clearInterval(We),We=null),vt=v("Connection Restored","You are reconnected.",R.SUCCESS,5e3),St("/no-internet")){const e=ls();$(e||"/home")}else $(window.location.pathname,!0);else We||(We=setInterval(()=>{Oe(null)},500)),vt=v("Connection Lost","Disconnected from server.",R.ERROR,1e4),is.notify(),$("/no-internet")}document.addEventListener("DOMContentLoaded",()=>{G.subscribe(t=>{t.viewId!=="no-connection"&&Oe(null)})});function $t(t){if(typeof t=="string"){if(t.trim()===""||t==="-")return"-";t=parseInt(t,10)}if(t==null||isNaN(t)||t<1)return"-";const e=["th","st","nd","rd"],s=t%100;return t+(e[(s-20)%10]||e[s]||e[0])}function ea(t,e){let s;return function(...n){const i=()=>{clearTimeout(s),t(...n)};clearTimeout(s),s=window.setTimeout(i,e)}}function ta(t){const s=`; ${document.cookie}`.split(`; ${t}=`);return s.length===2&&s.pop()?.split(";").shift()||null}function ee(t){t&&(t.addEventListener("keydown",e=>{if(["Backspace","Delete","Tab","Escape","Enter","ArrowLeft","ArrowRight","Home","End","ArrowUp","ArrowDown"].includes(e.key)||e.key==="a"&&(e.ctrlKey===!0||e.metaKey===!0)||e.key==="c"&&(e.ctrlKey===!0||e.metaKey===!0)||e.key==="v"&&(e.ctrlKey===!0||e.metaKey===!0)||e.key==="x"&&(e.ctrlKey===!0||e.metaKey===!0))return;const a=t.getAttribute("step"),n=t.getAttribute("min"),i=a&&a.includes("."),o=n&&(parseInt(n)<0||n==="-");if(i&&e.key==="."){t.value.includes(".")&&e.preventDefault();return}if(o&&e.key==="-"){(t.selectionStart!==0||t.value.includes("-"))&&e.preventDefault();return}/^\d$/.test(e.key)||e.preventDefault()}),t.addEventListener("paste",e=>{const s=e.clipboardData?.getData("text/plain");if(!s)return;const a=t.getAttribute("step"),n=t.getAttribute("min");let i="^\\d*$";a&&a.includes(".")?i="^-?\\d*\\.?\\d*$":n&&parseInt(n)<0&&(i="^-?\\d*$"),new RegExp(i).test(s)||e.preventDefault()}),t.addEventListener("blur",()=>{(t.value==="."||t.value==="-")&&(t.value="")}))}function sa(t,e){const s=t.map(i=>i.map(o=>`"${(o||"").toString().replace(/"/g,'""')}"`).join(",")).join(`
`),a=new Blob(["\uFEFF"+s],{type:"text/csv;charset=utf-8;"}),n=document.createElement("a");if(n.download!==void 0){const i=URL.createObjectURL(a);n.setAttribute("href",i),n.setAttribute("download",e),n.style.visibility="hidden",document.body.appendChild(n),n.click(),document.body.removeChild(n)}}const De=new Map;function Tt(t){t&&typeof t=="string"?De.delete(t):De.clear()}is.subscribe(()=>{Tt()});function d(t,e,s=null){if(t==="GET")if(s===!0){if(De.has(e))return De.get(e)}else Tt(s);else Tt();const a=new Promise((n,i)=>{const o=new XMLHttpRequest;if(o.onreadystatechange=function(){if(o.readyState===4)if(o.status===0)Oe(!1),i({message:"Network error"});else if(o.status>=200&&o.status<300){Oe(!0);try{const l=JSON.parse(o.responseText);n(l)}catch(l){const c=o.responseText.slice(0,50);console.error(`API Parse Error [${t} ${e}]:`,o.responseText),i({message:`Failed to parse response: ${l.message}. Content: ${c}...`})}}else try{const l=JSON.parse(o.responseText);i(l)}catch{i({message:"Request failed with status: "+o.status})}},o.onerror=function(){Oe(!1),i({message:"Network error"})},o.open(t,e,!0),t!=="GET"){const l=ta("XSRF-TOKEN");l&&o.setRequestHeader("X-CSRF-Token",l)}t!=="GET"&&s?(o.setRequestHeader("Content-Type","application/json"),o.send(JSON.stringify(s))):o.send()});if(t==="GET"&&s===!0){const n=a.catch(i=>{throw De.delete(e),i});return De.set(e,n),n}return a}async function Da(t,e={}){if(!t)return null;const s=e.visibility||"events",a=e.title||`${t.name.split(".")[0]} - ${Date.now()}`,n=new FormData;return n.append("files",t),n.append("visibility",s),n.append("title",a),e.categoryId&&n.append("categoryId",e.categoryId),new Promise((i,o)=>{const l=new XMLHttpRequest;l.open("POST","/api/files",!0);const c=ta("XSRF-TOKEN");c&&l.setRequestHeader("X-CSRF-Token",c),e.onProgress&&(l.upload.onprogress=r=>{if(r.lengthComputable){const u=Math.round(r.loaded/r.total*100);e.onProgress(u)}}),l.onload=()=>{if(l.status===201)try{const r=JSON.parse(l.responseText);r.success&&r.ids.length>0?i(r.ids[0]):o(new Error("Upload succeeded but no ID returned"))}catch{o(new Error("Failed to parse upload response"))}else o(new Error("Upload failed: "+l.status))},l.onerror=()=>{Oe(!1),o(new Error("Network error during upload"))},l.send(n)})}const Ha="modulepreload",Ra=function(t){return"/"+t},Ls={},aa=function(e,s,a){let n=Promise.resolve();if(s&&s.length>0){let r=function(u){return Promise.all(u.map(p=>Promise.resolve(p).then(h=>({status:"fulfilled",value:h}),h=>({status:"rejected",reason:h}))))};var o=r;document.getElementsByTagName("link");const l=document.querySelector("meta[property=csp-nonce]"),c=l?.nonce||l?.getAttribute("nonce");n=r(s.map(u=>{if(u=Ra(u),u in Ls)return;Ls[u]=!0;const p=u.endsWith(".css"),h=p?'[rel="stylesheet"]':"";if(document.querySelector(`link[href="${u}"]${h}`))return;const m=document.createElement("link");if(m.rel=p?"stylesheet":Ha,p||(m.as="script"),m.crossOrigin="",m.href=u,c&&m.setAttribute("nonce",c),document.head.appendChild(m),p)return new Promise((f,b)=>{m.addEventListener("load",f),m.addEventListener("error",()=>b(new Error(`Unable to preload CSS for ${u}`)))})}))}function i(l){const c=new Event("vite:preloadError",{cancelable:!0});if(c.payload=l,window.dispatchEvent(c),!c.defaultPrevented)throw l}return n.then(l=>{for(const c of l||[])c.status==="rejected"&&i(c.reason);return e().catch(i)})},Be='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>',na='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-246q54-53 125.5-83.5T480-360q83 0 154.5 30.5T760-246v-514H200v514Zm280-194q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm69-80h422q-44-39-99.5-59.5T480-280q-56 0-112.5 20.5T269-200Zm211-320q-25 0-42.5-17.5T420-580q0-25 17.5-42.5T480-640q25 0 42.5 17.5T540-580q0 25-17.5 42.5T480-520Zm0 17Z"/></svg>',Ss='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M320-160h320v-120q0-66-47-113t-113-47q-66 0-113 47t-47 113v120ZM160-80v-80h80v-120q0-61 28.5-114.5T348-480q-51-32-79.5-85.5T240-680v-120h-80v-80h640v80h-80v120q0 61-28.5 114.5T612-480q51 32 79.5 85.5T720-280v120h80v80H160Z"/></svg>',ct='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m280-400 200-200 200 200H280Z"/></svg>',Fa='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-160v-80h64l79-263q8-26 29.5-41.5T420-560h120q26 0 47.5 15.5T617-503l79 263h64v80H200Zm148-80h264l-72-240H420l-72 240Zm92-400v-200h80v200h-80Zm238 99-57-57 142-141 56 56-141 142Zm42 181v-80h200v80H720ZM282-541 141-683l56-56 142 141-57 57ZM40-360v-80h200v80H40Zm440 120Z"/></svg>',xt='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m368-320 112-84 110 84-42-136 112-88H524l-44-136-44 136H300l110 88-42 136ZM160-160q-33 0-56.5-23.5T80-240v-135q0-11 7-19t18-10q24-8 39.5-29t15.5-47q0-26-15.5-47T105-556q-11-2-18-10t-7-19v-135q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v135q0 11-7 19t-18 10q-24 8-39.5 29T800-480q0 26 15.5 47t39.5 29q11 2 18 10t7 19v135q0 33-23.5 56.5T800-160H160Zm0-80h640v-102q-37-22-58.5-58.5T720-480q0-43 21.5-79.5T800-618v-102H160v102q37 22 58.5 58.5T240-480q0 43-21.5 79.5T160-342v102Zm320-240Z"/></svg>',Pt='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M80-120v-80q38 0 57-20t75-20q56 0 77 20t57 20q36 0 57-20t77-20q56 0 77 20t57 20q36 0 57-20t77-20q56 0 75 20t57 20v80q-59 0-77.5-20T748-160q-36 0-57 20t-77 20q-56 0-77-20t-57-20q-36 0-57 20t-77 20q-56 0-77-20t-57-20q-36 0-54.5 20T80-120Zm0-180v-80q38 0 57-20t75-20q56 0 77.5 20t56.5 20q36 0 57-20t77-20q56 0 77 20t57 20q36 0 57-20t77-20q56 0 75 20t57 20v80q-59 0-77.5-20T748-340q-36 0-55.5 20T614-300q-57 0-77.5-20T480-340q-38 0-56.5 20T346-300q-59 0-78.5-20T212-340q-36 0-54.5 20T80-300Zm196-204 133-133-40-40q-33-33-70-48t-91-15v-100q75 0 124 16.5t96 63.5l256 256q-17 11-33 17.5t-37 6.5q-36 0-57-20t-77-20q-56 0-77 20t-57 20q-21 0-37-6.5T276-504Zm392-336q42 0 71 29.5t29 70.5q0 42-29 71t-71 29q-42 0-71-29t-29-71q0-41 29-70.5t71-29.5Z"/></svg>',ia='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>',Oa='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z"/></svg>',Na='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h280v80H200v560h280v80H200Zm440-160-55-58 102-102H360v-80h327L585-622l55-58 200 200-200 200Z"/></svg>',Ga='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M80-80v-186l350-472-70-94 64-48 56 75 56-75 64 48-70 94 350 472v186H80Zm400-591L160-240v80h120l200-280 200 280h120v-80L480-671ZM378-160h204L480-302 378-160Zm102-280 200 280-200-280-200 280 200-280Z"/></svg>',Ua='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M260-160q-91 0-155.5-63T40-377q0-78 47-139t123-78q17-72 85-137t145-65q33 0 56.5 23.5T520-716v242l64-62 56 56-160 160-160-160 56-56 64 62v-242q-76 14-118 73.5T280-520h-20q-58 0-99 41t-41 99q0 58 41 99t99 41h480q42 0 71-29t29-71q0-42-29-71t-71-29h-60v-80q0-48-22-89.5T600-680v-93q74 35 117 103.5T760-520q69 8 114.5 59.5T920-340q0 75-52.5 127.5T740-160H260Zm220-358Z"/></svg>',Ue='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M240-120v-80l16.5-10q16.5-10 36-29.5t35.5-50q16-30.5 16-70.5 0-11-1.5-21t-3.5-19h-99v-80h60q-21-33-40.5-69.5T240-640q0-92 64-156t156-64q71 0 126 39t79 101l-74 31q-15-40-50.5-65.5T460-780q-58 0-99 41t-41 99q0 48 24 80t49 80h167v80H421q2 9 2.5 19t.5 21q0 50-17.5 90T364-200h196q40 0 61-21t29-54l70 35q-11 55-56.5 87.5T560-120H240Z"/></svg>',it='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M560-440h200v-80H560v80Zm0-120h200v-80H560v80ZM200-320h320v-22q0-45-44-71.5T360-440q-72 0-116 26.5T200-342v22Zm160-160q33 0 56.5-23.5T440-560q0-33-23.5-56.5T360-640q-33 0-56.5 23.5T280-560q0 33 23.5 56.5T360-480ZM160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h640v-480H160v480Zm0 0v-480 480Z"/></svg>',At='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M280-400q-33 0-56.5-23.5T200-480q0-33 23.5-56.5T280-560q33 0 56.5 23.5T360-480q0 33-23.5 56.5T280-400Zm0 160q-100 0-170-70T40-480q0-100 70-170t170-70q67 0 121.5 33t86.5 87h352l120 120-180 180-80-60-80 60-85-60h-47q-32 54-86.5 87T280-240Zm0-80q56 0 98.5-34t56.5-86h125l58 41 82-61 71 55 75-75-40-40H435q-14-52-56.5-86T280-640q-66 0-113 47t-47 113q0 66 47 113t113 47Z"/></svg>',ge='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M40-160v-112q0-34 17.5-62.5T104-378q62-31 126-46.5T360-440q66 0 130 15.5T616-378q29 15 46.5 43.5T680-272v112H40Zm720 0v-120q0-44-24.5-84.5T666-434q51 6 96 20.5t84 35.5q36 20 55 44.5t19 53.5v120H760ZM360-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm400-160q0 66-47 113t-113 47q-11 0-28-2.5t-28-5.5q27-32 41.5-71t14.5-81q0-42-14.5-81T544-792q14-5 28-6.5t28-1.5q66 0 113 47t47 113ZM120-240h480v-32q0-11-5.5-20T580-306q-54-27-109-40.5T360-360q-56 0-111 13.5T140-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T440-640q0-33-23.5-56.5T360-720q-33 0-56.5 23.5T280-640q0 33 23.5 56.5T360-560Zm0 320Zm0-400Z"/></svg>',rs='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z"/></svg>',oa='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z"/></svg>',Dt='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-80q-139-35-229.5-159.5T160-516v-244l320-120 320 120v244q0 152-90.5 276.5T480-80Zm0-84q104-33 172-132t68-220v-189l-240-90-240 90v189q0 121 68 220t172 132Zm0-316Z"/></svg>',Ht='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-280q17 0 28.5-11.5T520-320q0-17-11.5-28.5T480-360q-17 0-28.5 11.5T440-320q0 17 11.5 28.5T480-280Zm-40-160h80v-240h-80v240Zm40 412L346-160H160v-186L28-480l132-134v-186h186l134-132 134 132h186v186l132 134-132 134v186H614L480-28Zm0-112 100-100h140v-140l100-100-100-100v-140H580L480-820 380-720H240v140L140-480l100 100v140h140l100 100Zm0-340Z"/></svg>',Rt='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m422-232 207-248H469l29-227-185 267h139l-30 208ZM320-80l40-280H160l360-520h80l-40 320h240L400-80h-80Zm151-390Z"/></svg>',Za='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-120v-80h280v-560H480v-80h280q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H480Zm-80-160-55-58 102-102H120v-80h327L345-622l55-58 200 200-200 200Z"/></svg>',cs='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-160q75 0 127.5-52.5T660-340q0-75-52.5-127.5T480-520q-75 0-127.5 52.5T300-340q0 75 52.5 127.5T480-160ZM363-572q20-11 42.5-17.5T451-598L350-800H250l113 228Zm234 0 114-228H610l-85 170 19 38q14 4 27 8.5t26 11.5ZM256-208q-17-29-26.5-62.5T220-340q0-36 9.5-69.5T256-472q-42 14-69 49.5T160-340q0 47 27 82.5t69 49.5Zm448 0q42-14 69-49.5t27-82.5q0-47-27-82.5T704-472q17 29 26.5 62.5T740-340q0 36-9.5 69.5T704-208ZM480-80q-40 0-76.5-11.5T336-123q-9 2-18 2.5t-19 .5q-91 0-155-64T80-339q0-87 58-149t143-69L120-880h280l80 160 80-160h280L680-559q85 8 142.5 70T880-340q0 92-64 156t-156 64q-9 0-18.5-.5T623-123q-31 20-67 31.5T480-80Zm0-260ZM363-572 250-800l113 228Zm234 0 114-228-114 228ZM406-230l28-91-74-53h91l29-96 29 96h91l-74 53 28 91-74-56-74 56Z"/></svg>',Ze='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M240-160q-66 0-113-47T80-320v-320q0-66 47-113t113-47h480q66 0 113 47t47 113v320q0 66-47 113t-113 47H240Zm0-480h480q22 0 42 5t38 16v-21q0-33-23.5-56.5T720-720H240q-33 0-56.5 23.5T160-640v21q18-11 38-16t42-5Zm-74 130 445 108q9 2 18 0t17-8l139-116q-11-15-28-24.5t-37-9.5H240q-26 0-45.5 13.5T166-510Z"/></svg>',ja='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M520-600v-240h320v240H520ZM120-440v-400h320v400H120Zm400 320v-400h320v400H520Zm-400 0v-240h320v240H120Zm80-400h160v-240H200v240Zm400 320h160v-240H600v240Zm0-480h160v-80H600v80ZM200-200h160v-80H200v80Zm160-320Zm240-160Zm0 240ZM360-280Z"/></svg>',Va='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z"/></svg>',ds='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M280-240h80v-80h80v-80h-80v-80h-80v80h-80v80h80v80Zm240-140h240v-60H520v60Zm0 120h160v-60H520v60ZM160-80q-33 0-56.5-23.5T80-160v-440q0-33 23.5-56.5T160-680h200v-120q0-33 23.5-56.5T440-880h80q33 0 56.5 23.5T600-800v120h200q33 0 56.5 23.5T880-600v440q0 33-23.5 56.5T800-80H160Zm0-80h640v-440H600q0 33-23.5 56.5T520-520h-80q-33 0-56.5-23.5T360-600H160v440Zm280-440h80v-200h-80v200Zm40 220Z"/></svg>',Wa='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M280-120v-80h160v-124q-49-11-87.5-41.5T296-442q-75-9-125.5-65.5T120-640v-40q0-33 23.5-56.5T200-760h80v-80h400v80h80q33 0 56.5 23.5T840-680v40q0 76-50.5 132.5T664-442q-18 46-56.5 76.5T520-324v124h160v80H280Zm0-408v-152h-80v40q0 38 22 68.5t58 43.5Zm200 128q50 0 85-35t35-85v-240H360v240q0 50 35 85t85 35Zm200-128q36-13 58-43.5t22-68.5v-40h-80v152Zm-200-52Z"/></svg>',Ft='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z"/></svg>',za='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z"/></svg>',de='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z"/></svg>',U='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>',te='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/></svg>',Ya='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-160q-134 0-227-93t-93-227q0-134 93-227t227-93q69 0 132 28.5T720-690v-110h80v280H520v-80h168q-32-56-87.5-88T480-720q-100 0-170 70t-70 170q0 100 70 170t170 70q77 0 139-44t87-116h84q-28 106-114 173t-196 67Z"/></svg>',je='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z"/></svg>',Ot='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M840-680v480q0 33-23.5 56.5T760-120H200q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h480l160 160Zm-80 34L646-760H200v560h560v-446ZM480-240q50 0 85-35t35-85q0-50-35-85t-85-35q-50 0-85 35t-35 85q0 50 35 85t85 35ZM240-560h360v-160H240v160Zm-40-86v446-560 114Z"/></svg>',dt='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-360 280-560h400L480-360Z"/></svg>',Ka='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z"/></svg>',us='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M240-80q-50 0-85-35t-35-85v-120h120v-560h600v680q0 50-35 85t-85 35H240Zm480-80q17 0 28.5-11.5T760-200v-600H320v480h360v120q0 17 11.5 28.5T720-160ZM360-600v-80h360v80H360Zm0 120v-80h360v80H360ZM240-160h360v-80H200v40q0 17 11.5 28.5T240-160Zm0 0h-40 400-360Z"/></svg>',Qa='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-160v-80h560v80H200Zm0-140-51-321q-2 0-4.5.5t-4.5.5q-25 0-42.5-17.5T80-680q0-25 17.5-42.5T140-740q25 0 42.5 17.5T200-680q0 7-1.5 13t-3.5 11l125 56 125-171q-11-8-18-21t-7-28q0-25 17.5-42.5T480-880q25 0 42.5 17.5T540-820q0 15-7 28t-18 21l125 171 125-56q-2-5-3.5-11t-1.5-13q0-25 17.5-42.5T820-740q25 0 42.5 17.5T880-680q0 25-17.5 42.5T820-620q-2 0-4.5-.5t-4.5-.5l-51 321H200Zm68-80h424l26-167-105 46-133-183-133 183-105-46 26 167Zm212 0Z"/></svg>',Ja='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m684-389-49-49q22-26 33.5-57t11.5-65q0-40-16-76t-44-64l48-48q38 38 59 86t21 102q0 48-17 91.5T684-389ZM565-508 428-645q12-7 25-11t27-4q42 0 71 29t29 71q0 14-4 27t-11 25Zm215 214-48-48q40-45 60-101.5T812-560q0-66-24.5-127.5T716-796l48-48q55 58 85.5 131T880-560q0 74-25.5 142.5T780-294Zm11 238L520-327v207h-80v-287L280-566v6q0 40 16 76t44 64l-48 48q-38-38-59-86t-21-102q0-17 2-33t7-33l-51-51q-11 29-16.5 58t-5.5 59q0 66 24.5 127.5T244-324l-48 48q-55-58-85.5-131T80-560q0-44 9.5-86.5T118-729l-62-62 56-57 736 736-57 56Z"/></svg>',ut='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-120 300-300l58-58 122 122 122-122 58 58-180 180ZM358-598l-58-58 180-180 180 180-58 58-122-122-122 122Z"/></svg>',Xa='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m656-120-56-56 84-84-84-84 56-56 84 84 84-84 56 56-83 84 83 84-56 56-84-83-84 83Zm-176 0q-138 0-240.5-91.5T122-440h82q14 104 92.5 172T480-200q11 0 20.5-.5T520-203v81q-10 1-19.5 1.5t-20.5.5ZM120-560v-240h80v94q51-64 124.5-99T480-840q150 0 255 105t105 255h-80q0-117-81.5-198.5T480-760q-69 0-129 32t-101 88h110v80H120Zm414 190-94-94v-216h80v184l56 56-42 70Z"/></svg>',he='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z"/></svg>',en='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M80-40v-80h40q32 0 62-10t58-30q28 20 58 30t62 10q32 0 62.5-10t57.5-30q28 20 58 30t62 10q32 0 62.5-10t57.5-30q27 20 57.5 30t62.5 10h40v80h-40q-31 0-61-7.5T720-70q-29 15-59 22.5T600-40q-31 0-61-7.5T480-70q-29 15-59 22.5T360-40q-31 0-61-7.5T240-70q-29 15-59 22.5T120-40H80Zm280-160q-36 0-67-17t-53-43q-17 18-37.5 32.5T157-205q-41-11-83-26T0-260q54-23 132-47t153-36l54-167q11-34 41.5-45t57.5 3l102 52 113-60 66-148-20-53 53-119 128 57-53 119-53 20-148 334q93 11 186.5 38T960-260q-29 13-73.5 28.5T803-205q-25-7-45.5-21.5T720-260q-22 26-53 43t-67 17q-36 0-67-17t-53-43q-22 26-53 43t-67 17Zm203-157 38-85-61 32-70-36-28 86h38q21 0 42 .5t41 2.5Zm-83-223q-33 0-56.5-23.5T400-660q0-33 23.5-56.5T480-740q33 0 56.5 23.5T560-660q0 33-23.5 56.5T480-580Z"/></svg>',tn='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M610-760q-21 0-35.5-14.5T560-810q0-21 14.5-35.5T610-860q21 0 35.5 14.5T660-810q0 21-14.5 35.5T610-760Zm0 660q-21 0-35.5-14.5T560-150q0-21 14.5-35.5T610-200q21 0 35.5 14.5T660-150q0 21-14.5 35.5T610-100Zm160-520q-21 0-35.5-14.5T720-670q0-21 14.5-35.5T770-720q21 0 35.5 14.5T820-670q0 21-14.5 35.5T770-620Zm0 380q-21 0-35.5-14.5T720-290q0-21 14.5-35.5T770-340q21 0 35.5 14.5T820-290q0 21-14.5 35.5T770-240Zm60-190q-21 0-35.5-14.5T780-480q0-21 14.5-35.5T830-530q21 0 35.5 14.5T880-480q0 21-14.5 35.5T830-430ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880v80q-134 0-227 93t-93 227q0 134 93 227t227 93v80Zm0-320q-33 0-56.5-23.5T400-480q0-5 .5-10.5T403-501l-83-83 56-56 83 83q4-1 21-3 33 0 56.5 23.5T560-480q0 33-23.5 56.5T480-400Z"/></svg>',sn='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M400-240v-80h160v80H400ZM240-440v-80h480v80H240ZM120-640v-80h720v80H120Z"/></svg>',fe='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>',an='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M798-120q-125 0-247-54.5T329-329Q229-429 174.5-551T120-798q0-18 12-30t30-12h162q14 0 25 9.5t13 22.5l26 140q2 16-1 27t-11 19l-97 98q20 37 47.5 71.5T387-386q31 31 65 57.5t72 48.5l94-94q9-9 23.5-13.5T670-390l138 28q14 4 23 14.5t9 23.5v162q0 18-12 30t-30 12ZM241-600l66-66-17-94h-89q5 41 14 81t26 79Zm358 358q39 17 79.5 27t81.5 13v-88l-94-19-67 67ZM241-600Zm358 358Z"/></svg>',la='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z"/></svg>',ra='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M200-440v-80h560v80H200Z"/></svg>',nn='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z"/></svg>',ot='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M160-120q-33 0-56.5-23.5T80-200v-440q0-33 23.5-56.5T160-720h160v-80q0-33 23.5-56.5T400-880h160q33 0 56.5 23.5T640-800v80h160q33 0 56.5 23.5T880-640v440q0 33-23.5 56.5T800-120H160Zm240-600h160v-80H400v80Zm-160 80h-80v440h80v-440Zm400 440v-440H320v440h320Zm80-440v440h80v-440h-80ZM480-420Z"/></svg>',Lt='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>',ca='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M480-480q33 0 56.5-23.5T560-560q0-33-23.5-56.5T480-640q-33 0-56.5 23.5T400-560q0 33 23.5 56.5T480-480Zm0 294q122-112 181-203.5T720-552q0-109-69.5-178.5T480-800q-101 0-170.5 69.5T240-552q0 71 59 162.5T480-186Zm0 106Q319-217 239.5-334.5T160-552q0-150 96.5-239T480-880q127 0 223.5 89T800-552q0 100-79.5 217.5T480-80Zm0-480Z"/></svg>',Ve='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M640-80 240-480l400-400 71 71-329 329 329 329-71 71Z"/></svg>',da='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="m321-80-71-71 329-329-329-329 71-71 400 400L321-80Z"/></svg>',ua='<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" ><path d="M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z"/></svg>';class H{static openModals=0;id;title;content;contentId;onClose;isView;extraClasses;contentClasses;bodyClass;fallbackPath;element;_isVisible;constructor({id:e,title:s,content:a,contentId:n,onClose:i,isView:o=!1,extraClasses:l="",contentClasses:c="",bodyClass:r="c-modal-body",fallbackPath:u}){this.id=e,this.title=s,this.content=a,this.contentId=n||`${e}-content`,this.onClose=i,this.isView=o,this.extraClasses=l,this.contentClasses=c,this.bodyClass=r,this.fallbackPath=u,this.element=null,this._isVisible=!1}getHTML(){const e=`c-modal-overlay ${this.isView?"view hidden":""} ${this.extraClasses}`,s=`c-modal-content ${this.contentClasses}`;return`
            <div id="${this.id}" class="${e}">
                <div class="${s}">
                    <button class="c-modal-close-btn" data-close-modal>${te}</button>
                    ${this.title?`<div class="c-modal-header"><h2>${this.title}</h2></div>`:""}
                    <div id="${this.contentId}" class="${this.bodyClass}">${this.content||""}</div>
                </div>
            </div>
        `}attachListeners(){if(this.element=document.getElementById(this.id),!this.element)return;const e=this.element.querySelector("[data-close-modal]"),s=a=>{a&&a.stopPropagation(),this.close()};e&&(e.onclick=s),this.element.onclick=a=>{this.element&&a.target===this.element&&this.close()}}close(){this.onClose&&this.onClose(),this.isView?aa(async()=>{const{closeModal:e}=await Promise.resolve().then(()=>on);return{closeModal:e}},void 0).then(({closeModal:e})=>{const s=typeof this.fallbackPath=="function"?this.fallbackPath(window.location.pathname):this.fallbackPath;e(s)}):this.hide()}static increment(){H.openModals++,document.body.classList.add("modal-open")}static decrement(){H.openModals=Math.max(0,H.openModals-1),H.openModals===0&&document.body.classList.remove("modal-open")}hide(){this.element&&(this.element.classList.add("hidden"),this.element.classList.remove("visible"),this._isVisible&&(H.decrement(),this._isVisible=!1))}show(){this.element&&(this.element.classList.remove("hidden"),requestAnimationFrame(()=>{this.element&&this.element.classList.add("visible")}),this._isVisible||(H.increment(),this._isVisible=!0))}}const ms=[];let yt=null,gt=!1;function O(t,e,s={}){const a="^"+t.replace(/\//g,"\\/").replace(/:(\w+)/g,"([^/]+)").replace(/\*/g,".*")+"$";ms.push({pattern:t,regex:new RegExp(a),viewId:e,isOverlay:s.isOverlay||!1,titleFunc:s.titleFunc||null,changeURL:s.changeURL==null?!0:s.changeURL})}function ma(t){const e=t.split("?")[0];return ms.find(s=>s.regex.test(e))||null}function St(t){return window.location.pathname+window.location.search===t}function $(t,e=!1){if(t.startsWith("/")||(t="/"+t),t==="/")return d("GET","/api/auth/status").then(n=>{n.authenticated?$("/events"):$("/home")}).catch(()=>$("/home")),!0;const s=ma(t);if(St(t)&&!e)return!0;if(!s)return $("/error"),!1;if(!St(t)&&s.changeURL&&window.history.pushState(null,"",t),s.isOverlay?(yt=window.location.pathname+window.location.search,gt||(H.increment(),gt=!0)):gt&&(H.decrement(),gt=!1),document.querySelectorAll(".view").forEach(n=>{if(n.id===s.viewId+"-view")n.classList.remove("hidden");else{const i=n.id.replace("-view",""),o=ms.filter(r=>r.viewId===i),l=o.some(r=>r.isOverlay),c=o.some(r=>r.regex.test(window.location.pathname));l?c||n.classList.add("hidden"):s.isOverlay||n.classList.add("hidden")}}),G.notify({resolvedPath:s.pattern,viewId:s.viewId,path:t}),s.titleFunc!==null){const n=s.titleFunc(t);n&&n.length>0&&(document.title=n)}else{const n=t.match(/\/([a-zA-Z]*)/);if(n&&n[1]){const i=n[1].charAt(0).toUpperCase()+n[1].slice(1);document.title=`DUCC - ${i}`}else document.title="DUCC"}return!0}function pa(t="/"){const e=window.location.pathname+window.location.search,s=ma(e);if(s&&s.isOverlay){const a=document.getElementById(s.viewId+"-view");if(a){a.classList.add("closing");const n=()=>{a.classList.remove("closing"),a.removeEventListener("animationend",n);const i=new URLSearchParams(window.location.search),o=i.get("back")||i.get("return");yt?($(yt),yt=null):o?$(o):xs()?window.history.back():$(t)};a.addEventListener("animationend",n,{once:!0});return}}xs()?window.history.back():$(t)}function va(){$(window.location.pathname+window.location.search,!0)}window.onpopstate=va;window.onload=va;window.switchView=$;window.closeModal=pa;document.addEventListener("DOMContentLoaded",()=>{document.addEventListener("click",t=>{const s=t.target.closest("[data-nav]");s&&(t.preventDefault(),$(s.dataset.nav))})});const on=Object.freeze(Object.defineProperty({__proto__:null,ViewChangedEvent:G,addRoute:O,closeModal:pa,isCurrentPath:St,switchView:$},Symbol.toStringTag,{value:"Module"}));document.addEventListener("DOMContentLoaded",()=>{const t=document.body,e=["var(--blob-colour-1)","var(--blob-colour-2)","var(--blob-colour-3)","var(--blob-colour-4)","var(--blob-colour-5)"],s=`
        <svg viewBox="0 0 153.41 103.85" xmlns="http://www.w3.org/2000/svg">
            <g transform="translate(-247.58 -156.15)">
                <path d="m393.36 156.65-19.25 13.438c-3.561 2.483-6.2816 9.5887-7.7812 12.094l-13.125 7.875s-1.4989-0.86191-2.7188-0.6875c-2.1092 0.30157-4.666 1.3796-5.5625 3.3125-0.3685 0.79452 0 2.625 0 2.625l-8.25 5.25-0.375-3s1.3342-10.369-2.0625-13.312c-3.382-2.9307-9.4762-3.5845-11.812 3.1875-1.1943 3.4619 0.78179 10.201 3 10.875l2.625 3.7812-6 4.5-8.2812 7.875-7.875 5.25s-1.5166-0.66661-3.0625-0.40625c-1.7705 0.29818-3.2385 0.7368-4 2.3438-0.53579 1.1306 0.125 2.4062 0.125 2.4062l-16.625 10.594c-4.5642 0.0147-9.4311 1.3101-14.344 2.7188-6.8261 4.3647-13.433 9.1792-19.906 14.25l6.7812 7.875 20.969-12.781c9.5301 4.627 20.224 5.1282 30.438 5.6562 20.214 1.5302 43.913-2.4517 66.438-11.625 5.9125-2.408 8.039-10.255 3.75-19.531 0 0-4.8125 4.1561-7.75 5.1562-6.0835 2.0714-19.219 1.3438-19.219 1.3438l-0.34375-12.312s3.9604-3.8081 6.5312-5.125c2.0861-1.0686 5.0048-1.0908 6.1562-3 0.41206-0.68325 0.23374-1.6434 0-2.4062-1.3622-4.446-7.5625-10.469-7.5625-10.469l0.0625-1.9688 14.25-9.125s7.6076-0.50177 11.344-2.125c7.5511-3.2808 20.562-14.781 20.562-14.781zm-48.062 41 3.7188 1.1875 2.375-0.125 2.2812 2.6562 0.65625 3.3125-4.25-0.28125-3.8438-1.9688-5.5938 0.375-0.125-1.4375zm-23.625 19.625-0.125 13.156s-14.512-0.34089-21.094 2.25c-3.0871 1.2152-7.9688 5.9688-7.9688 5.9688-3.6453 0.61063-8.2664 1.812-8.75-0.4375 2.5469-3.4967 14.518-10.29 17.469-12.562l3.625-0.8125c3.1002 0.49708 2.2626 0.25144 5.3125 0 3.3931-0.64784 7.8201-4.3704 11.531-7.5625z" fill="currentColor"/>
            </g>
        </svg>`,a=document.createElement("div");a.id="animated-background",t.prepend(a),e.forEach((n,i)=>{const o=document.createElement("div");o.className="bg-blob";const l=40+i*10;o.style.setProperty("--blob-size",`${l}vmax`),o.style.setProperty("--blob-colour",n);const c=[{top:"-20%",left:"-20%"},{top:"-20%",left:"60%"},{top:"60%",left:"-20%"},{top:"40%",left:"40%"},{top:"70%",left:"70%"}];o.style.setProperty("--blob-top",c[i].top),o.style.setProperty("--blob-left",c[i].left),o.style.setProperty("--blob-duration",`${40+i*10}s`),o.style.setProperty("--blob-delay",`${i*-20}s`),a.appendChild(o)});for(let n=0;n<10;n++){const i=document.createElement("div");i.className="bg-icon",i.innerHTML=s;const o=60+Math.random()*100;i.style.setProperty("--icon-size",`${o}px`),i.style.setProperty("--icon-top",`${Math.random()*100}vh`);const l=40+Math.random()*60;i.style.setProperty("--icon-duration",`${l}s`),i.style.setProperty("--icon-delay",`${Math.random()*-l}s`),a.appendChild(i)}});document.addEventListener("DOMContentLoaded",()=>{const t=new IntersectionObserver(s=>{s.forEach(a=>{if(a.isIntersecting){const n=a.target,i=n.getAttribute("data-mos-delay"),o=n.getAttribute("data-mos-duration");i&&n.style.setProperty("--mos-delay",`${i}ms`),o&&n.style.setProperty("--mos-duration",`${o}ms`),n.classList.add("mos-active"),t.unobserve(n)}})},{threshold:.2});document.querySelectorAll("[data-mos]").forEach(s=>t.observe(s)),new MutationObserver(s=>{s.forEach(a=>{a.addedNodes.forEach(n=>{if(n.nodeType===1){const i=n;i.hasAttribute("data-mos")&&t.observe(i),i.querySelectorAll("[data-mos]").forEach(o=>t.observe(o))}})})}).observe(document.body,{childList:!0,subtree:!0})});O("/login","login");const ln=`<div id="login-view" class="view hidden">
            <div class="small-container">
                <div class="form-info">
                    <article class="form-box shadow" id="login-card-content">
                        <div class="center-text" style="margin-bottom: 2rem;">
                            <h2 class="no-margin">
                                ${Za}
                                Sign In
                            </h2>
                        </div>
                        
                        <div class="passkey-quick-login center-text" style="margin-bottom: 1.5rem;">
                            <button type="button" id="passkey-login-initial-btn" class="secondary outline full-width">
                                ${At} Sign in with Passkey
                            </button>
                            <div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>
                        </div>

                        <form id="login-form">
                            <label for="email">Email address</label>
                            <div class="durham-email-wrapper">
                                <input id="email" name="email" placeholder="username" autocomplete="username">
                                <span class="email-suffix">@durham.ac.uk</span>
                            </div>

                            <label for="password">Password</label>
                            <input type="password" id="password" name="password" autocomplete="current-password" placeholder="••••••••">
                            
                            <div style="margin-top: 1rem;">
                                <button type="submit" class="primary full-width">Continue with Password</button>
                            </div>
                        </form>

                        <div class="center-text" style="margin-top: 2rem; border-top: 1px solid var(--pico-muted-border-color); padding-top: 1rem;">
                            <p class="no-margin"><a data-nav="/reset-password" class="secondary">Forgot password?</a></p>
                            <p class="no-margin" style="margin-top: 0.5rem;">New here? <a data-nav="/signup">Create an account</a></p>
                        </div>
                    </article>
                </div>
            </div>
        </div>`;let ce=null,tt=null;function ps(t){Ge.notify({authenticated:!0}),v("Success",t.message||"Login successful!","success",1500,"login-status");const e=sessionStorage.getItem("redirect_after_login");if(sessionStorage.removeItem("redirect_after_login"),e)$(e);else{const s=ls();!s||["/login","/signup","/home"].includes(s)?$("/events"):$(s)}}async function zt(t=null){try{const e=await d("POST","/api/auth/passkey/login-options",{email:t}),s=await SimpleWebAuthnBrowser.startAuthentication(e),a=await d("POST","/api/auth/passkey/login-verify",s);ps(a)}catch(e){if(e.name==="NotAllowedError"||e.name==="AbortError")return;v("Error",e.message||"Passkey login failed.","error")}}async function rn(t){const e=document.getElementById("login-card-content");e.innerHTML=`
        <div class="center-text" style="margin-bottom: 2rem;">
            <h2 class="no-margin">Verify Identity</h2>
        </div>
        <p class="center-text secondary">Your account is protected with 2FA.</p>
        
        ${t.totp?`
            <form id="totp-login-form" class="modern-form">
                <label for="totp-code">Authenticator Code</label>
                <input type="text" id="totp-code" placeholder="123456" pattern="[0-9]*" inputmode="numeric" required autofocus>
                <button type="submit" class="primary full-width">Verify Code</button>
            </form>
        `:""}

        ${t.passkey?`
            <div class="passkey-login-section">
                ${t.totp?'<div class="divider" style="margin: 1.5rem 0;"><span>OR</span></div>':""}
                <button id="passkey-login-btn" class="secondary full-width">${At} Use Passkey</button>
            </div>
        `:""}

        <div class="center-text" style="margin-top: 2rem;">
            <button class="outline secondary" onclick="location.reload()">Back to Login</button>
        </div>
    `,t.totp&&(document.getElementById("totp-login-form").onsubmit=async s=>{s.preventDefault();const a=document.getElementById("totp-code").value;try{const n=await d("POST","/api/auth/verify-totp",{token:a});ps(n)}catch(n){v("Error",n.message,"error")}}),t.passkey&&(document.getElementById("passkey-login-btn").onclick=()=>zt(),t.totp||zt())}function cn({resolvedPath:t}){t==="/login"&&d("GET","/api/auth/status",!0).then((e=>{if(e.authenticated){const s=ls();!s||["/login","/signup","/home"].includes(s)?$("/events"):$(s)}})),ce&&(ce.value=""),tt&&(tt.value="")}document.addEventListener("DOMContentLoaded",()=>{const t=document.getElementById("login-form");ce=document.getElementById("email"),tt=document.getElementById("password");const e=document.getElementById("passkey-login-initial-btn");ce.addEventListener("input",()=>{ce.value.includes("@")&&(ce.value=ce.value.split("@")[0])}),e&&(e.onclick=()=>{let s=ce.value;s&&s.trim()!==""?s.includes("@")||(s+="@durham.ac.uk"):s=null,zt(s)}),t.addEventListener("submit",async s=>{s.preventDefault();const a=new FormData(t);let n=a.get("email"),i=!1;if([ce,tt].forEach(o=>{o.removeAttribute("aria-invalid"),(!o.value||o.value.trim()==="")&&(o.setAttribute("aria-invalid","true"),i=!0)}),i){v("Error","Please fill in all fields.","error",2e3,"login-status");return}n&&!n.includes("@")&&(n+="@durham.ac.uk");try{const o=await d("POST","/api/auth/login",{email:n,password:a.get("password")});o.requires2FA?rn(o.methods):ps(o)}catch(o){v("Error",o.message||o||"Login failed.","error",3e3,"login-status"),o.message&&o.message.includes("email")&&ce.setAttribute("aria-invalid","true"),o.message&&o.message.includes("password")&&tt.setAttribute("aria-invalid","true")}}),G.subscribe(cn)});document.querySelector("main").insertAdjacentHTML("beforeend",ln);const dn=[{name:"Events",group:"main",id:"nav-events",classes:"contrast",action:{run:()=>$("/events")}},{name:"Files",group:"main",id:"nav-files",classes:"contrast",action:{run:()=>$("/files")}},{name:"Swims",group:"main",id:"nav-swims",classes:"contrast",action:{run:()=>$("/swims")}},{name:"Quotes",group:"main",id:"nav-quotes",classes:"contrast",action:{run:()=>$("/quotes")}},{name:"Exec",group:"main",id:"nav-exec",classes:"contrast",action:{run:()=>$("/exec")}},{name:"Admin",group:"user",id:"admin-button",classes:"contrast",action:{run:()=>$("/admin/")}},{name:"Balance: £0.00",group:"user",id:"balance-button",classes:"contrast",action:{run:()=>$("/profile?tab=balance")}},{name:"Profile",group:"user",id:"profile-button",classes:"contrast",action:{run:()=>$("/profile")}},{name:"Login",group:"user",id:"login-button",classes:"contrast",action:{run:()=>$("/login")}}];async function ga(){const t=document.getElementById("balance-button");if(t){const[e,s]=await Promise.all([d("GET","/api/user/elements/balance").catch(()=>null),d("GET","/api/globals/MinMoney").catch(()=>({res:{MinMoney:{data:-25}}}))]);if(e&&e.balance!==void 0){const a=Number(e.balance),n=Number(s.res?.MinMoney?.data||-25);t.textContent=`Balance: £${a.toFixed(2)}`,t.classList.toggle("balance-low",a<n),t.classList.toggle("balance-warn",a>=n&&a<0)}}}function _s(t){const e=document.querySelectorAll(".navbar-items li a, .navbar-items li button"),a=new URLSearchParams(window.location.search).get("tab")==="balance";e.forEach(n=>{n.classList.remove("active"),n.removeAttribute("aria-current");let i=!1;(n.id==="nav-home"&&(t==="/home"||t==="/")||n.id==="nav-events"&&t.startsWith("/events")||n.id==="nav-files"&&t.startsWith("/files")||n.id==="nav-swims"&&t.startsWith("/swims")||n.id==="nav-quotes"&&t.startsWith("/quotes")||n.id==="nav-exec"&&t.startsWith("/exec")||n.id==="balance-button"&&t.startsWith("/profile")&&a||n.id==="profile-button"&&t.startsWith("/profile")&&!a||n.id==="admin-button"&&t.startsWith("/admin")||n.id==="login-button"&&t.startsWith("/login"))&&(i=!0),i&&(n.classList.add("active"),n.setAttribute("aria-current","page"))})}function un(t){const e=document.createElement("li"),s=document.createElement("button");return t.classes&&(s.className=t.classes),s.id=t.id||`nav-${t.name.toLowerCase().replace(/[^a-z]/g,"")}`,s.innerHTML=t.name,typeof t.action=="object"&&s.addEventListener("click",a=>{a.preventDefault(),t.action.run?.()}),e.appendChild(s),e}async function ze(t){const e=t.authenticated,s=["profile-button","balance-button","nav-swims"],a=["nav-quotes"],n=["login-button"];if(s.forEach(i=>{const o=document.getElementById(i);o&&o.parentElement&&o.parentElement.classList.toggle("hidden",!e)}),n.forEach(i=>{const o=document.getElementById(i);o&&o.parentElement&&o.parentElement.classList.toggle("hidden",e)}),e)try{const[i,o]=await Promise.all([d("GET","/api/user/elements/permissions,is_member,id").catch(h=>(console.error("Auth elements fetch failed",h),{})),d("GET","/api/user/elements/swims").catch(()=>({swims:0})),ga().catch(()=>{})]),l=i.permissions||[],c=i.is_member||!1;window.currentUser={id:i.id,permissions:l,is_member:c},a.forEach(h=>{const m=document.getElementById(h);m&&m.parentElement&&m.parentElement.classList.toggle("hidden",!c)});const r=document.getElementById("profile-button");r&&o?.swims!==void 0&&(r.textContent=`Profile (${o.swims})`);const p=document.getElementById("admin-button")?.parentElement;if(p){const h=l.length>0;p.classList.toggle("hidden",!h)}}catch(i){console.error("Failed to fully update nav",i)}else{window.currentUser=null;const o=document.getElementById("admin-button")?.parentElement;o&&o.classList.add("hidden"),a.forEach(l=>{const c=document.getElementById(l);c&&c.parentElement&&c.parentElement.classList.add("hidden")})}}let wt=()=>{};function mn(){const t=document.querySelector("nav.small-container");if(!t)return;const e=document.createElement("div");e.className="hamburger-menu";const s=document.createElement("span");s.className="hamburger-inner",e.appendChild(s);const a=document.createElement("div");a.id="mobile-menu-overlay",document.body.appendChild(a),wt=n=>{!(typeof n=="boolean"?!n:t.classList.contains("mobile-open"))?(t.classList.add("mobile-open"),document.body.classList.add("mobile-menu-open")):(t.classList.remove("mobile-open"),document.body.classList.remove("mobile-menu-open"))},e.addEventListener("click",()=>wt()),a.addEventListener("click",()=>wt(!1)),t.appendChild(e)}document.addEventListener("DOMContentLoaded",()=>{const t=document.querySelector("nav.small-container"),e=document.querySelector(".navbar-items.main-items"),s=document.querySelector(".navbar-items.user-items");if(!e||!s)return;const a=document.createElement("a");a.className="nav-logo logo-link",a.id="nav-home",a.href="#",a.onclick=n=>{n.preventDefault(),$("/home")},a.innerHTML='<img src="/images/misc/ducc.png" alt="DUCC Logo">',t&&t.prepend(a),dn.forEach(n=>{const i=un(n);n.group==="main"?e.appendChild(i):s.appendChild(i)}),mn(),d("GET","/api/auth/status",!0).then(ze).catch(()=>ze({authenticated:!1})),Ge.subscribe(ze),Se.subscribe(ga),ns.subscribe(()=>{d("GET","/api/auth/status",!0).then(ze).catch(()=>ze({authenticated:!1}))}),G.subscribe(({resolvedPath:n})=>{wt(!1),_s(n||window.location.pathname)}),_s(window.location.pathname)});const pn="home-view";O("/home","home");const vn=`
        <div id="${pn}" class="view hidden">
            <div class="hero">
                <div class="hero-title" data-mos="fade-up">
                    <h1>Welcome to<br>Durham University<br>Canoe Club</h1>
                    <p>Paddle, Compete, Explore. Connect.</p>
                </div>

                <div class="hero-offer">
                    <h3>What We Offer</h3>
                    <div class="hero-offer-boxes">
                        <div class="hero-offer-box" data-mos="zoom-in">
                            ${en}
                            <h3>Weekly Sessions</h3>
                            <p>Beginner-friendly trips of the Wear & Tees plus pool sessions.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            ${Ga}
                            <h3>UK & Europe Trips</h3>
                            <p>Exciting whitewater adventures year-round.</p>
                        </div>
                        <div class="hero-offer-box" data-mos="zoom-in">
                            ${cs}
                            <h3>Competitive Teams</h3>
                            <p>White Water Racing, Canoe Polo, Slalom & Freestyle.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="small-container">
                <h1>About Us</h1>
                <div class="about-us-para" data-mos="slide-up">
                    <p>Durham University Canoe Club is one of the most successful university canoe clubs in the country.</p>
                    <p>The club has a relaxed and friendly atmosphere. Beginners are always welcome!</p>
                    <p>Our boathouse occupies a prime spot by the River Wear at the Maiden Castle sports centre.</p>
                    <p>We run weekly sessions on the Wear and Tees, pool training, and whitewater trips across the UK and Europe.</p>
                    <p>If you're interested in joining, talk to an exec member or email us. Membership is only £55/year.</p>
                    <p>Email: <a href="mailto:canoe.club@durham.ac.uk">canoe.club@durham.ac.uk</a></p>
                </div>

                <div class="find-us-para" data-mos="zoom-in">
                    <h1>Where to Find Us</h1>
                    <p>Our boathouse is located at the Maiden Castle sports centre.</p>
                    <div class="map-container">
                        <iframe
                            data-src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d4603.299914236021!2d-1.559015!3d54.768541!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x487e87002bb2c4ad%3A0xdaca718450a9120f!2sDurham%20University%20Canoe%20Club!5e0!3m2!1sen!2suk!4v1763136022459!5m2!1sen!2suk"
                            width="600" height="450" allowfullscreen="" loading="lazy"
                            referrerpolicy="no-referrer-when-downgrade"></iframe>
                    </div>
                    <div class="find-us-images">
                        <img src="/images/misc/maiden-castle-outside.jpg" alt="Maiden Castle entrance">
                        <img src="/images/misc/boathouse-outside.jpg" alt="Path to boathouse">
                    </div>
                </div>
            </div>
        </div>`;let Me=[],Ne=0,st=null,Ee=[],at=0;function qs(){const t=document.querySelector(".map-container iframe");t&&!t.src&&t.dataset.src&&(t.src=t.dataset.src)}function Yt(t,e){let s=e?`url("${e}")`:"none";t.style.setProperty("--slide-img-url",s)}function gn(t){t.slice(0,3).forEach(e=>{const s=new Image;s.src=e}),t.length>3&&setTimeout(()=>{t.slice(3).forEach((e,s)=>{setTimeout(()=>{const a=new Image;a.src=e},s*500)})},2e3)}function hn(t){const e=1-Ne,s=Me[e],a=Me[Ne];Yt(s,t),s.classList.add("show"),a.classList.remove("show"),Ne=e}function ha(){st||Ee.length===0||(st=setInterval(()=>{at=(at+1)%Ee.length,hn(Ee[at])},5e3))}function fn(){st&&(clearInterval(st),st=null)}function bn(t){const e=document.createElement("div"),s=document.createElement("div");e.className="slide",s.className="slide",t.appendChild(e),t.appendChild(s),Me=[e,s],Ne=0,d("GET","/api/slides/images").then(a=>{Ee=a?.images||[],Ee.length&&(gn(Ee),at=Math.floor(Math.random()*Ee.length),Yt(Me[Ne],Ee[at]),Me[Ne].classList.add("show"),setTimeout(()=>{(window.location.pathname==="/home"||window.location.pathname==="/")&&ha()},50))}).catch(a=>{Yt(Me[0],null),Me[0].classList.add("show")})}document.addEventListener("DOMContentLoaded",()=>{const t=document.querySelector(".hero");t&&bn(t),G.subscribe(({resolvedPath:e})=>{e==="/home"?(ha(),qs()):fn()}),(window.location.pathname==="/home"||window.location.pathname==="/")&&qs()});document.querySelector("main")?.insertAdjacentHTML("beforeend",vn);class Ce{static getContrastColour(e){if(!e||!e.startsWith("#"))return"white";let s=e.replace("#","");if(s.length===3&&(s=s.split("").map(l=>l+l).join("")),s.length>6&&(s=s.substring(0,6)),s.length!==6)return"white";const a=parseInt(s.substr(0,2),16),n=parseInt(s.substr(2,2),16),i=parseInt(s.substr(4,2),16);return isNaN(a)||isNaN(n)||isNaN(i)?"white":(a*299+n*587+i*114)/1e3>=128?"black":"white"}static render(e,s="",a=""){const n=e.color||"var(--pico-primary)",i=Ce.getContrastColour(e.color||"");return`<span class="tag-badge ${s}" style="--tag-colour: ${n}; --tag-text-colour: ${i}; ${a}">${e.name}</span>`}static renderList(e,s=""){return!e||e.length===0?"":e.map(a=>Ce.render(a,s)).join("")}}class fa{static render(e){const s=new Date(e.start),a=new Date(e.end),n=a<new Date,i=e.is_canceled,o={hour:"numeric",minute:"2-digit",hour12:!0},l=s.toLocaleTimeString("en-UK",o),c=a.toLocaleTimeString("en-UK",o),r=Ce.renderList(e.tags||[]),u=e.is_offsite?'<span class="badge primary small-badge mr-2">External Trip</span>':"",h=`
            <div class="event-image-container">
                <div class="event-image" style="--event-image-url: url('${e.image_url||"/images/misc/ducc.png"}');"></div>
                <div class="image-overlay"></div>
                <div class="event-image-content">
                    <div class="event-tags">${u}${r}</div>
                    <h3 class="event-title-bold ${i?"strikethrough error":""}">
                        ${e.title||"Untitled Event"}
                    </h3>
                </div>
            </div>`,m=e.attendee_count!==void 0?Number(e.attendee_count):0,f=e.max_attendees,b=f>0?`${m}/${f}`:`${m}/∞`,g=f>0?`${m}/${f} Attending`:`${m} / Unlimited Attending`,T=f>0&&m>=f&&e.enable_waitlist,x=`
            <div class="attendance-count ${T?"highlight":""}" title="${g}">
                ${ge} <span>${b}</span>
            </div>`,E=e.upfront_cost>0?`
            <div class="info-item cost" title="Upfront Cost">
                ${Ue}
                <span>£${e.upfront_cost.toFixed(2)}</span>
            </div>`:"";let L="";i?L='<span class="status-badge error">Canceled</span>':n?L='<span class="status-badge neutral">Unavailable</span>':T?L='<span class="status-badge warning">Waitlist</span>':e.can_attend===!1&&!e.is_attending&&(L='<span class="status-badge neutral">Unavailable</span>');const S=["event-card","glass-panel"];return n?S.push("past-event"):i?S.push("canceled-event"):T?S.push("waitlist-active"):e.can_attend===!1&&!e.is_attending&&S.push("unavailable-event"),`
            <div class="${S.join(" ")}" data-nav="${`event/${e.id}`}" role="button" tabindex="0">
                ${h}
                <div class="event-card-content">
                    <div class="event-info-block">
                        <div class="info-item time">
                            ${la}
                            <span>${l} - ${c}</span>
                        </div>
                        <div class="info-item location">
                            ${ca}
                            <span>${e.location||"Location TBD"}</span>
                        </div>
                        ${E}
                    </div>

                    <div class="card-footer">
                        <div class="footer-left">
                            ${x}
                            ${e.is_attending?`<div class="attendance-status">${Ft} Attending</div>`:""}
                        </div>
                        <div class="footer-right">
                            ${L}
                        </div>
                    </div>
                </div>
            </div>`}}function vs(t){const e=document.createElement("div");e.innerHTML=t.getHTML();const s=e.firstElementChild;return document.body.appendChild(s),t.attachListeners(),t.show(),{element:s,cleanup:()=>{t.hide(),setTimeout(()=>{document.body.contains(s)&&document.body.removeChild(s)},300)}}}function N(t,e){return new Promise(s=>{const a=new H({id:`confirm-modal-${Date.now()}`,title:t,content:`
                <p>${e}</p>
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            `,onClose:()=>{n.cleanup(),s(!1)}}),n=vs(a);n.element.querySelector("#confirm-ok").onclick=()=>{n.cleanup(),s(!0)},n.element.querySelector("#confirm-cancel").onclick=()=>{n.cleanup(),s(!1)}})}function ba(t,e){return new Promise(s=>{const a=new H({id:`password-modal-${Date.now()}`,title:t,content:`
                <p>${e}</p>
                <input type="password" id="confirm-password" placeholder="Enter your password">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Confirm</button>
                </div>
            `,onClose:()=>{n.cleanup(),s(null)}}),n=vs(a),i=n.element.querySelector("#confirm-password");i.focus();const o=()=>{const l=i.value;l&&(n.cleanup(),s(l))};n.element.querySelector("#confirm-ok").onclick=o,n.element.querySelector("#confirm-cancel").onclick=()=>{n.cleanup(),s(null)},i.onkeydown=l=>{l.key==="Enter"&&o()}})}function yn(){return new Promise(t=>{const e=new H({id:`change-pw-modal-${Date.now()}`,title:"Change Password",content:`
                <p>Please enter your current password and a new password.</p>
                <input type="password" id="current-password" placeholder="Current Password">
                <input type="password" id="new-password" placeholder="New Password">
                <div class="modal-actions">
                    <button class="btn-cancel" id="confirm-cancel">Cancel</button>
                    <button class="btn-confirm" id="confirm-ok">Change Password</button>
                </div>
            `,onClose:()=>{s.cleanup(),t(null)}}),s=vs(e),a=s.element.querySelector("#current-password"),n=s.element.querySelector("#new-password");a.focus();const i=()=>{const o=a.value,l=n.value;o&&l&&(s.cleanup(),t({currentPassword:o,newPassword:l}))};s.element.querySelector("#confirm-ok").onclick=i,s.element.querySelector("#confirm-cancel").onclick=()=>{s.cleanup(),t(null)},n.onkeydown=o=>{o.key==="Enter"&&i()}})}function se(t,e={}){const{classes:s="",dataAttributes:a=""}=e;if(!t)return`<div class="avatar-bubble ${s}" ${a}>?</div>`;const n=t.first_name?t.first_name[0]:"",i=t.last_name?t.last_name[0]:"";let o=`${n}${i}`;t.profile_picture_initials==="first"?o=n:t.profile_picture_initials==="last"&&(o=i);const l=["#2ecc71","#3498db","#9b59b6","#f1c40f","#e67e22","#e74c3c","#1abc9c","#34495e","#d35400","#c0392b"];let c=t.profile_picture_color;if(!c){const p=((t.first_name||"")+(t.last_name||"")).split("").reduce((h,m)=>h+m.charCodeAt(0),0);c=l[p%l.length]}let r="";t.profile_picture_font==="serif"?r="font-serif":t.profile_picture_font==="outfit"?r="font-display":t.profile_picture_font==="gothic"?r="font-gothic":t.profile_picture_font==="accent"?r="font-accent":t.profile_picture_font==="mono"&&(r="font-mono");const u=t.profile_picture_path?`<img src="${t.profile_picture_path}" alt="${t.first_name} ${t.last_name}" onerror="this.style.display='none'">`:"";return`<div class="avatar-bubble ${s} ${r}" 
                 style="background-color: ${c};" 
                 ${a}>
        ${u}
        <span class="avatar-initials">${o||"?"}</span>
    </div>`}function wn(t,e,s="attendee-name-tooltip"){if(!t||!e)return;const a=()=>{if(t.querySelector(`.${s}`))return;const i=document.createElement("div");i.className=s,i.textContent=e,t.appendChild(i)},n=()=>{const i=t.querySelector(`.${s}`);i&&(i.classList.add("hiding"),i.addEventListener("animationend",()=>i.remove()))};t.onmouseenter=a,t.onmouseleave=n,t.onclick=i=>{a()}}function ya(t,e="name"){t.forEach(s=>{const a=s.dataset[e];a&&wn(s,a)})}async function Kt(t,e,s={}){if(!t)return;const a=s.exclude||[];t.innerHTML=`
        <div class="image-library-grid">
            <p class="loading-cell">Loading images...</p>
        </div>
    `;const n=t.querySelector(".image-library-grid");t._libraryParams={onSelect:e,options:s};try{const[i,o]=await Promise.all([d("GET","/api/files?limit=50&includeUsed=true"),d("GET","/api/slides/images")]),l=(i.data?.files||[]).filter(r=>{const u=r.filename.match(/\.(jpg|jpeg|png|webp|gif)$/i),p=a.includes(r.id.toString())||a.includes(`/api/files/${r.id}/download?view=true`);return u&&!p}),c=(o.images||[]).filter(r=>!a.includes(r));n.innerHTML="",c.forEach(r=>{const u=document.createElement("div");u.className="image-item",u.style.backgroundImage=`url('${r}')`,u.title=r,u.onclick=()=>e(r,null),n.appendChild(u)}),l.forEach(r=>{const u=`/api/files/${r.id}/download?view=true`,p=document.createElement("div");p.className="image-item",p.style.backgroundImage=`url('${u}')`,p.title=r.title,p.onclick=()=>e(u,r.id),n.appendChild(p)}),c.length===0&&l.length===0&&(n.innerHTML='<p class="empty-cell">No images found.</p>')}catch(i){console.error(i),n.innerHTML='<p class="error-cell">Failed to load library.</p>'}}async function Is(t){const e=t;if(e&&e._libraryParams){const{onSelect:s,options:a}=e._libraryParams;return Kt(e,s,a)}}class me{container;options;files;isUploading;libraryModal;cropper;widgetEl;previewContainer;previewEl;fileListEl;progressContainer;progressBar;progressText;inputEl;actionsRowEl;libraryBtn;urlBtn;removeBtn;urlInputContainer;urlInputField;applyUrlBtn;libContainer;modalContentArea;constructor(e,s={}){const a=typeof e=="string"?document.getElementById(e):e;if(!a)throw new Error("UploadWidget container not found");this.container=a,this.options={mode:"inline",selectMode:"single",autoUpload:!0,accept:"image/*",defaultPreview:null,enableLibrary:!0,inlineLibrary:!1,exclude:[],enableUrl:!0,enableRemove:!0,showActions:!0,showPreview:!0,enableCrop:!1,cropOptions:{aspectRatio:1,viewMode:1,dragMode:"move",autoCropArea:1,restore:!1,guides:!1,center:!1,highlight:!1,cropBoxMovable:!1,cropBoxResizable:!1,toggleDragModeOnDblclick:!1},...s},this.files=[],this.isUploading=!1,this.libraryModal=null,this.cropper=null,this.init()}init(){this.render(),this.bindEvents(),this.options.defaultPreview&&this.options.selectMode==="single"&&this.setPreview(this.options.defaultPreview),this.options.inlineLibrary&&this.renderInlineLibrary()}render(){const e=this.options.showActions?"":"no-actions";this.container.innerHTML=`
            <div class="upload-widget ${this.options.mode}-mode ${e}" id="upload-widget-${Date.now()}">
                ${this.options.showPreview?`
                <div class="preview-container ${this.options.defaultPreview?"":"hidden"}">
                    ${this.options.selectMode==="single"?`<div class="image-preview">
                                ${this.options.enableRemove?`<button type="button" class="remove-icon-btn hidden" title="Remove">${te}</button>`:""}
                        </div>`:'<div class="file-list"></div>'}
                </div>
                `:""}

                <div class="progress-container hidden">
                    <progress value="0" max="100"></progress>
                    <span class="progress-text">Uploading... 0%</span>
                </div>

                ${this.options.showActions?`
                <div class="actions-row">
                    <label class="upload-btn-label small-btn">
                        ${Lt} <span>${this.options.selectMode==="single"?"Select File":"Select Files"}</span>
                        <input type="file" 
                            ${this.options.selectMode==="multiple"?"multiple":""} 
                            accept="${this.options.accept}" 
                            class="upload-widget-input"
                            style="display:none;">
                    </label>
                    
                    ${this.options.enableLibrary&&!this.options.inlineLibrary&&this.options.selectMode==="single"?`
                        <button type="button" class="small-btn outline library-btn" title="Choose from Library">
                            ${je} Library
                        </button>
                    `:""}

                    ${this.options.enableUrl&&this.options.selectMode==="single"?`
                        <button type="button" class="small-btn outline url-btn" title="Provide Image URL">
                            ${de} URL
                        </button>
                    `:""}
                </div>
                `:`<input type="file" accept="${this.options.accept}" class="upload-widget-input" style="display:none;">`}

                <div class="url-input-container hidden">
                    <div class="glass-input-group">
                        <input type="text" placeholder="https://example.com/image.jpg" class="modern-input url-input-field">
                        <button type="button" class="small-btn apply-url-btn">Apply</button>
                    </div>
                </div>

                ${this.options.inlineLibrary?'<div class="inline-library-container"></div>':""}
            </div>
        `,this.widgetEl=this.container.querySelector(".upload-widget"),this.previewContainer=this.widgetEl.querySelector(".preview-container"),this.previewEl=this.widgetEl.querySelector(".image-preview"),this.fileListEl=this.widgetEl.querySelector(".file-list"),this.progressContainer=this.widgetEl.querySelector(".progress-container"),this.progressBar=this.widgetEl.querySelector("progress"),this.progressText=this.widgetEl.querySelector(".progress-text"),this.inputEl=this.widgetEl.querySelector(".upload-widget-input"),this.actionsRowEl=this.widgetEl.querySelector(".actions-row"),this.libraryBtn=this.widgetEl.querySelector(".library-btn"),this.urlBtn=this.widgetEl.querySelector(".url-btn"),this.removeBtn=this.widgetEl.querySelector(".remove-icon-btn"),this.urlInputContainer=this.widgetEl.querySelector(".url-input-container"),this.urlInputField=this.widgetEl.querySelector(".url-input-field"),this.applyUrlBtn=this.widgetEl.querySelector(".apply-url-btn"),this.options.defaultPreview&&this.options.selectMode==="single"&&this.removeBtn?.classList.remove("hidden")}renderInlineLibrary(){this.libContainer=this.widgetEl.querySelector(".inline-library-container"),this.libContainer&&Kt(this.libContainer,async(e,s)=>{this.setPreview(e),this.options.onImageSelect?await this.options.onImageSelect({url:e,id:s}):s&&this.options.onUploadComplete?await this.options.onUploadComplete(s):e&&this.options.onUploadComplete&&await this.options.onUploadComplete(e)},{exclude:this.options.exclude})}bindEvents(){["dragenter","dragover","dragleave","drop"].forEach(e=>{this.widgetEl.addEventListener(e,s=>{s.preventDefault(),s.stopPropagation()},!1)}),this.widgetEl.addEventListener("dragenter",()=>this.widgetEl.classList.add("drag-over")),this.widgetEl.addEventListener("dragover",()=>this.widgetEl.classList.add("drag-over")),this.widgetEl.addEventListener("dragleave",()=>this.widgetEl.classList.remove("drag-over")),this.widgetEl.addEventListener("drop",e=>{this.widgetEl.classList.remove("drag-over");const s=e.dataTransfer,a=s?s.files:null;a&&this.handleFiles(a)}),this.inputEl.addEventListener("change",e=>{const s=e.target;s.files&&this.handleFiles(s.files)}),this.libraryBtn&&this.libraryBtn.addEventListener("click",()=>this.openLibraryModal()),this.urlBtn&&this.urlBtn.addEventListener("click",()=>{this.urlInputContainer.classList.toggle("hidden"),this.urlInputContainer.classList.contains("hidden")||this.urlInputField.focus()}),this.applyUrlBtn&&(this.applyUrlBtn.addEventListener("click",async()=>{const e=this.urlInputField.value.trim();e&&(this.setPreview(e),this.options.onImageSelect?await this.options.onImageSelect({url:e,id:null}):this.options.onUploadComplete&&await this.options.onUploadComplete(e),this.urlInputContainer.classList.add("hidden"))}),this.urlInputField.addEventListener("keypress",e=>{e.key==="Enter"&&this.applyUrlBtn.click()})),this.removeBtn&&this.removeBtn.addEventListener("click",()=>this.handleRemove())}setPreview(e){this.options.showPreview&&this.previewEl&&(this.previewEl.style.backgroundImage=`url('${e}')`,this.previewContainer?.classList.remove("hidden"),this.actionsRowEl?.classList.add("hidden"),this.removeBtn?.classList.remove("hidden"))}async handleRemove(){this.options.onRemove&&await this.options.onRemove()===!1||this.reset()}openLibraryModal(){this.libraryModal||(this.libraryModal=new H({id:"upload-widget-library-modal",title:"Choose Image",content:"",contentClasses:"glass-panel"}),document.body.insertAdjacentHTML("beforeend",this.libraryModal.getHTML()),this.libraryModal.attachListeners()),this.modalContentArea=document.getElementById("upload-widget-library-modal-content"),this.modalContentArea&&Kt(this.modalContentArea,async(e,s)=>{this.options.showPreview&&this.setPreview(e),this.options.onImageSelect?await this.options.onImageSelect({url:e,id:s}):s&&this.options.onUploadComplete?await this.options.onUploadComplete(s):e&&this.options.onUploadComplete&&await this.options.onUploadComplete(e),this.libraryModal.close()},{exclude:this.options.exclude}),this.libraryModal.show()}handleFiles(e){if(this.isUploading)return;const s=Array.from(e);if(s.length!==0){if(this.options.selectMode==="single"){const a=s[0];if(this.options.enableCrop&&a.type.startsWith("image/")){this.openCropModal(a);return}if(this.files=[a],this.files[0].type.startsWith("image/")){const n=new FileReader;n.onload=i=>{this.options.showPreview&&i.target&&this.setPreview(i.target.result)},n.readAsDataURL(this.files[0])}}else this.files=[...this.files,...s],this.options.showPreview&&this.updateFileList();this.options.onFileSelect&&this.options.onFileSelect(this.files),this.options.autoUpload&&this.uploadFiles()}}openCropModal(e){if(typeof Cropper>"u"){console.error("Cropper.js not loaded"),this.files=[e],this.uploadFiles();return}const s=new FileReader;s.onload=a=>{const n="crop-modal",i=`
                <div class="crop-container">
                    <img id="crop-image" src="${a.target?.result}" style="max-width: 100%; display: block;">
                </div>
                <div class="crop-actions mt-4">
                    <button type="button" class="primary full-width" id="confirm-crop-btn">Crop & Upload</button>
                </div>
            `,o=new H({id:n,title:"Crop Image",content:i,contentClasses:"glass-panel",onClose:()=>{this.cropper&&(this.cropper.destroy(),this.cropper=null);const r=document.getElementById(n);r&&r.remove()}});document.body.insertAdjacentHTML("beforeend",o.getHTML()),o.attachListeners(),o.show();const l=document.getElementById("crop-image");if(!l){console.error("Crop image element not found");return}this.cropper=new Cropper(l,this.options.cropOptions);const c=document.getElementById("confirm-crop-btn");c&&(c.onclick=()=>{if(!this.cropper)return;const r=this.cropper.getCroppedCanvas({width:512,height:512});if(!r){console.error("Failed to get cropped canvas");return}r.toBlob(u=>{if(!u){console.error("Failed to create blob from canvas");return}const p=new File([u],e.name,{type:"image/jpeg"});this.files=[p],this.options.showPreview&&this.setPreview(r.toDataURL("image/jpeg")),this.options.onFileSelect&&this.options.onFileSelect(this.files),this.options.autoUpload&&this.uploadFiles(),o.close()},"image/jpeg")})},s.readAsDataURL(e)}updateFileList(){this.fileListEl&&(this.previewContainer?.classList.remove("hidden"),this.actionsRowEl?.classList.add("hidden"),this.fileListEl.innerHTML=this.files.map((e,s)=>`
            <div class="file-item">
                <span class="file-name" title="${e.name}">${e.name}</span>
                <span class="file-remove" data-index="${s}">${te}</span>
            </div>
        `).join(""),this.fileListEl.querySelectorAll(".file-remove").forEach(e=>{e.addEventListener("click",s=>{const a=s.currentTarget,n=parseInt(a.dataset.index);this.files.splice(n,1),this.updateFileList()})}))}async uploadFiles(e={}){if(this.files.length===0)return;this.isUploading=!0,this.progressContainer.classList.remove("hidden"),this.updateProgress(0);const s=[],a=[];try{for(const n of this.files){const i=await Da(n,{...e,onProgress:o=>this.updateProgress(o)});i!==null&&(s.push(i),a.push(`/api/files/${i}/download?view=true`))}this.updateProgress(100),this.progressText&&(this.progressText.textContent="Upload Complete!"),setTimeout(()=>this.progressContainer.classList.add("hidden"),2e3),this.libContainer&&Is(this.libContainer),this.modalContentArea&&Is(this.modalContentArea),this.options.onImageSelect&&this.options.selectMode==="single"?await this.options.onImageSelect({url:a[0],id:s[0]}):this.options.onUploadComplete&&await this.options.onUploadComplete(this.options.selectMode==="single"?s[0]:s),this.files=[],this.options.selectMode==="multiple"&&this.options.showPreview&&this.updateFileList()}catch(n){console.error(n),this.progressContainer.classList.add("hidden"),this.options.onUploadError?this.options.onUploadError(n):v("Upload Failed",n.message,"error")}finally{this.isUploading=!1}}async manualUpload(e={}){return this.uploadFiles(e)}updateProgress(e){this.progressBar&&(this.progressBar.value=e),this.progressText&&(this.progressText.textContent=`Uploading... ${Math.round(e)}%`)}reset(){this.files=[],this.inputEl.value="",this.options.selectMode==="single"?(this.previewEl&&(this.previewEl.style.backgroundImage=""),this.previewContainer?.classList.add("hidden"),this.removeBtn?.classList.add("hidden")):this.options.showPreview&&this.updateFileList(),this.actionsRowEl?.classList.remove("hidden"),this.progressContainer.classList.add("hidden"),this.isUploading=!1}}O("/event/:id","event",{isOverlay:!0});const wa=new H({id:"event-view",isView:!0,contentClasses:"modal-lg glass-panel",contentId:"event-detail",bodyClass:"",content:'<p aria-busy="true">Loading event...</p>',fallbackPath:()=>{const e=new URLSearchParams(window.location.search).get("week");return e!=null?`/events?week=${e}`:"/events"}}),En=wa.getHTML();function Ea(t,e,s=!0){return!t||t.length===0?"":t.map(a=>{const n=`${a.first_name} ${a.last_name}`,i=s&&a.is_attending===0;return se(a,{classes:`attendee-bubble ${i?"left":""} clickable`,dataAttributes:`data-name="${n}" ${e?`data-user-id="${a.id}"`:""}`})}).join("")}async function $a(t,e){try{const a=(await d("GET",`/api/event/${t}/attendees`)).attendees||[],n=document.getElementById("attendees-list-container");if(n){const i=Ea(a,e,!0);n.innerHTML=i||'<p class="no-attendees">No attendees yet.</p>',i&&ya(n.querySelectorAll(".attendee-bubble"),"name")}}catch(s){console.error("Failed to fill attendees list",s)}}async function $n(t,e,s){try{const a=await d("GET",`/api/event/${t}/waitlist`),n=document.getElementById("waitlist-summary-container");if(n)if(e&&(a.count>0||a.position)){n.classList.remove("hidden");let i="";if(a.position?i=`<p>${Ss} <strong>Waitlist:</strong> <span class="highlight-text">${a.position-1}</span> people in front of you</p>`:i=`<p>${Ss} <strong>Waitlist:</strong> <span class="highlight-text">${a.count||0}</span> people waiting</p>`,s&&a.waitlist&&a.waitlist.length>0){const o=Ea(a.waitlist,s,!1);i+=`<div class="attendee-bubbles waitlist-members mt-2">${o}</div>`}n.innerHTML=i,ya(n.querySelectorAll(".attendee-bubble"),"name")}else n.classList.add("hidden")}catch(a){console.error("Failed to fill waitlist",a)}}async function Ta(t,e,s,a){try{const i=(await d("GET","/api/auth/status").catch(()=>({authenticated:!1}))).authenticated,o=document.getElementById("attend-event-button"),l=document.getElementById("event-warning-container");if(!i){o&&(o.textContent="Login to Join",o.onclick=()=>$("/login"),o.classList.remove("hidden")),l&&(l.innerHTML="",l.classList.add("hidden"));return}const[c,r,u,p,h,m,f,b]=await Promise.all([d("GET",`/api/event/${t}/isAttending`),d("GET",`/api/event/${t}/isOnWaitlist`).catch(()=>({isOnWaitlist:!1})),d("GET",`/api/event/${t}/attendees`).catch(()=>({attendees:[]})),d("GET",`/api/event/${t}`),d("GET",`/api/event/${t}/canJoin`).catch(j=>({canJoin:!1,reason:j.message||"Error"})),d("GET",`/api/event/${t}/coachCount`).catch(()=>({count:0})),d("GET","/api/user/elements/filled_legal_info,balance,is_member,free_sessions,is_instructor").catch(()=>({})),d("GET","/api/globals/MinMoney").catch(()=>({}))]),{event:g}=p,w=m.count,T=f||{},x=b?.res?.MinMoney?.data!==void 0?parseFloat(b.res.MinMoney.data):-25;if(!g.signup_required){o&&(o.textContent="No Sign-up Required",o.disabled=!0,o.classList.remove("hidden")),l&&(l.innerHTML="",l.classList.add("hidden"));return}const E=c?.isAttending||!1,L=r?.isOnWaitlist||!1,S=u?.attendees||[],k=S.filter(j=>j.is_attending===void 0||j.is_attending===1).length,_=g.max_attendees>0&&k>=g.max_attendees;g.enable_waitlist&&await $n(t,_,a);let q="",P="Attend Event",D=null,V=!1,Z=!1;if(g.is_canceled)P="Event Canceled",V=!0;else if(E){P="Leave Event",Z=!0,D="leave";const j=new Date,y=g.upfront_refund_cutoff?new Date(g.upfront_refund_cutoff):null;g.upfront_cost>0&&y&&j>y&&(q=`<div class="glass-warning">${la} Refund period has passed. Leaving now will not trigger a refund.</div>`)}else L?(P="Leave Waiting List",Z=!0,D="waitlist_leave"):T.filled_legal_info?T.balance<x?(P="View Balance",q=`<div class="glass-warning">${de} You have outstanding debts. Please clear them before joining.</div>`,D=()=>$("profile?tab=balance")):!T.is_instructor&&w===0?(P="Cannot Join",q=`<div class="glass-warning">${te} No coach attending.</div>`,V=!0):!T.is_member&&T.free_sessions<=0?(P="Join Club",q=`<div class="glass-warning">${de} You have used all your free sessions. Please join the club to continue.</div>`,D=()=>$("/profile")):h.canJoin?_&&g.enable_waitlist&&(P="Join Waiting List",D="waitlist_join"):(V=!1,h.reason.includes("Legal info")?(P="Complete Legal Form",q=`<div class="glass-warning">${de} You must fill out the legal form before joining.</div>`,D=()=>$("/legal")):h.reason.includes("free sessions")?(P="Join Club",q=`<div class="glass-warning">${de} You have used all your free sessions. Please join the club to continue.</div>`,D=()=>$("/profile")):h.reason.includes("debts")?(P="View Balance",q=`<div class="glass-warning">${de} You have outstanding debts. Please clear them before joining.</div>`,D=()=>$("profile?tab=balance")):_&&g.enable_waitlist&&h.reason==="Event is full"?(P="Join Waiting List",q=`<div class="glass-warning">${de} This event is full. You can join the waiting list.</div>`,D="waitlist_join"):(P="Cannot Join",q=`<div class="glass-warning">${te} ${h.reason}</div>`,V=!0)):(P="Complete Legal Form",q=`<div class="glass-warning">${de} You must fill out the legal form before joining.</div>`,D=()=>$("/legal"));if(l&&(l.innerHTML=q,q?l.classList.remove("hidden"):l.classList.add("hidden")),o){const y=new Date>new Date(g.start);E&&y?o.classList.add("hidden"):(o.textContent=P,o.disabled=V,o.classList.remove("hidden"),Z?o.classList.add("delete"):o.classList.remove("delete"));const B=o.cloneNode(!0);o.parentNode&&o.parentNode.replaceChild(B,o),B.classList.contains("hidden")||B.addEventListener("click",async()=>{if(!V){if(typeof D=="function"){D();return}if(E){const I=S.filter(F=>F.is_attending===void 0||F.is_attending===1);try{if((await d("GET","/api/user/elements/is_instructor")).is_instructor&&w===1&&I.length>1&&!await N("Cancel Event?","You are the only instructor attending. If you leave, the event will be <strong>canceled</strong> and all other attendees will be notified. Are you sure?"))return}catch{}}try{let I=`/api/event/${g.id}/attend`;D==="leave"?I=`/api/event/${g.id}/leave`:D==="waitlist_leave"?I=`/api/event/${g.id}/waitlist/leave`:D==="waitlist_join"&&(I=`/api/event/${g.id}/waitlist/join`),await d("POST",I,{}),Se.notify(),Bt.notify({eventId:g.id}),await $a(t,a),await Ta(t,e,s,a)}catch(I){v("Action Failed",I.message||I,"error",5e3,"event-action")}}})}}catch(n){console.error("Failed to setup event buttons",n)}}async function Tn({viewId:t,path:e,resolvedPath:s}){if(t!=="event"){const n=document.getElementById("event-view");n&&n.classList.add("hidden");return}const a=document.getElementById("event-detail");if(a)try{const n=e.split("?")[0],i=await d("GET","/api"+n),{event:o}=i,l=(o.tags||[]).map(B=>Ce.render(B,"",`--tag-colour: ${B.color}65;`)).join(""),c=new Date(o.end).getTime()-new Date(o.start).getTime(),r=Math.floor(c/(1e3*60*60)),u=Math.floor(c%(1e3*60*60)/(1e3*60)),p=[];r>0&&p.push(`${r}h`),u>0&&p.push(`${u}m`);const h=p.length>0?p.join(" "):"0m",f=new Date(o.start).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});let b="";const g=o.difficulty_level||1;for(let B=1;B<=5;B++)b+=`<div class="difficulty-bar ${B<=g?"active":""}"></div>`;const w=o.image_url||"/images/misc/ducc.png";let T="";if(o.upfront_cost>0){const B=new Date,I=o.upfront_refund_cutoff?new Date(o.upfront_refund_cutoff):null,F=I?B>I:!1,Y={month:"short",day:"numeric",hour:"numeric",minute:"2-digit",hour12:!0},J=I?I.toLocaleString("en-UK",Y).replace(",","."):"";let ae="";I&&(F?ae=`<p class="price-detail expired">${J?"Refund period ended on "+J:"No refunds available"}</p>`:ae=`<p class="price-detail">Full refund available until ${J}</p>`),T=`
                <div class="event-price-box">
                    <div class="price-header">
                        <div class="price-title-group">
                            <div class="pound-icon-box">${Ue}</div>
                            <span class="price-label">Event Price</span>
                        </div>
                        <span class="price-value">£${o.upfront_cost.toFixed(2)}</span>
                    </div>
                    <div class="price-body">
                        <div class="price-detail-row">
                            <span class="detail-icon">${Ze}</span>
                            <p class="price-detail">Payment required upon joining</p>
                        </div>
                        ${ae?`
                        <div class="price-detail-row">
                            ${F?`<span class="detail-icon expired">${Ht}</span>`:`<span class="detail-icon">${de}</span>`}
                            ${ae}
                        </div>`:""}
                    </div>
                </div>
            `}const x=new Date(o.end)<new Date,E=o.is_canceled,L=await d("GET","/api/globals/ExpenseReportStartLimit").catch(()=>({})),S=L?.res?.ExpenseReportStartLimit?.data!==void 0?parseInt(L.res.ExpenseReportStartLimit.data):1,C=new Date,k=new Date(new Date(o.start).getTime()-S*60*60*1e3),_=C>=k&&!o.costs_released;let q="";const P=(Array.isArray(o.driver_info)?o.driver_info:o.driver_info?[o.driver_info]:[]).filter(B=>B.status==="accepted");if(_&&!E){if(P.length===1){const{id:B,start_mileage:I,end_mileage:F,trip_name:Y}=P[0];q=`
                    <div class="glass-panel drivers-section">
                        <h3 class="section-title">${ot} Driver Actions (${Y})</h3>
                        <p class="description-text mb-3">Please report your starting and ending mileage for reimbursement.</p>
                        <div class="button-group">
                            <button class="small-btn ${I!==null?"secondary outline":"primary"}" 
                                    onclick="switchView('/event/${o.id}/driver/${B}/mileage/start')">
                                ${I!==null?`Start: ${I}`:"Report Start Mileage"}
                            </button>
                            <button class="small-btn ${F!==null?"secondary outline":"primary"}" 
                                    ${I===null?'disabled title="Report start mileage first"':""}
                                    onclick="switchView('/event/${o.id}/driver/${B}/mileage/end')">
                                ${F!==null?`End: ${F}`:"Report End Mileage"}
                            </button>
                        </div>
                    </div>
                `}else if(P.length>1){const B=P.map(I=>{const{id:F,start_mileage:Y,end_mileage:J,trip_name:ae}=I;return`
                        <div class="glass-panel embedded-trip-panel mb-3">
                            <div class="trip-header">
                                <h4 class="small-title nomargin">${ae}</h4>
                            </div>
                            <p class="description-text mb-2">Report mileage for this journey:</p>
                            <div class="button-group">
                                <button class="small-btn ${Y!==null?"secondary outline":"primary"}" 
                                        onclick="switchView('/event/${o.id}/driver/${F}/mileage/start')">
                                    ${Y!==null?`Start: ${Y}`:"Report Start"}
                                </button>
                                <button class="small-btn ${J!==null?"secondary outline":"primary"}" 
                                        ${Y===null?'disabled title="Report start mileage first"':""}
                                        onclick="switchView('/event/${o.id}/driver/${F}/mileage/end')">
                                    ${J!==null?`End: ${J}`:"Report End"}
                                </button>
                            </div>
                        </div>
                    `}).join("");q=`
                    <div class="glass-panel drivers-section">
                        <h3 class="section-title">${ot} Driver Actions</h3>
                        <div class="embedded-trips-container">
                            ${B}
                        </div>
                    </div>
                `}}a.innerHTML=`
            <div class="event-modal-header ${x?"past-event":""} ${E?"canceled-event":""}" style="--event-image-url: url('${w}');">
                <div class="header-content">
                    <div class="event-tags">${l}</div>
                    <h2 class="event-title ${E?"strikethrough":""}">${o.title} ${E?"(CANCELED)":""}</h2>
                    <p class="event-location">${ca} ${o.location||"Location TBD"}</p>
                </div>
            </div>
            
            <div class="event-modal-body">
                <div class="event-info-boxes">
                    <div class="info-box">
                        <span class="box-title">${Va} DATE</span>
                        <span class="box-value">${f}</span>
                    </div>
                    <div class="info-box">
                        <span class="box-title">${tn} DURATION</span>
                        <span class="box-value">${h}</span>
                    </div>
                    <div class="info-box">
                        <span class="box-title">${Rt} DIFFICULTY</span>
                        <div class="difficulty-container">
                            ${b}
                        </div>
                    </div>
                    <div class="info-box">
                        <span class="box-title">${ge} CAPACITY</span>
                        <span class="box-value">${o.attendee_count||0}/${o.max_attendees||"∞"}</span>
                    </div>
                </div>

                ${T}

                <div class="glass-panel event-details-content">
                    <div class="description-section">
                        <h3 class="section-title">${nn} Description</h3>
                        <p class="description-text">${o.description||"No description provided."}</p>
                    </div>

                    <div class="attendees-section nomargin">
                        <h3 class="section-title">${ge} Attendees</h3>
                        <div id="attendees-list-container" class="attendee-bubbles"></div>
                        <div id="waitlist-summary-container" class="waitlist-info hidden"></div>
                    </div>
                </div>

                <div id="event-warning-container" class="hidden"></div>

                ${q}

                <div id="expense-panel-container"></div>

                <div class="event-actions">
                    ${o.costs_released?'<button id="view-settlement-btn" class="secondary outline">View Settlement</button>':""}
                    <button id="attend-event-button" class="join-btn hidden">Attend Event</button>
                    <button id="edit-event-button" class="hidden secondary">Edit Event</button>
                </div>
            </div>`;const V=(await d("GET",`/api/event/${o.id}/canManage`).catch(()=>({canManage:!1}))).canManage,j=(await d("GET",`/api/event/${o.id}/isAttending`).catch(()=>({isAttending:!1}))).isAttending;if(o.costs_released){const B=document.getElementById("view-settlement-btn");B&&(B.onclick=()=>$(`/event/${o.id}/settlement`))}if(j&&_&&!E&&xa(o.id),V){const B=document.getElementById("edit-event-button");B&&(B.classList.remove("hidden"),B.onclick=()=>$(`/admin/event/${o.id}`))}const y=o.id;await Promise.all([$a(y,V),Ta(y,e,s,V)])}catch(n){console.error("Failed to load event details",n),a.innerHTML='<p class="error-text">Failed to load event details. Please try again.</p>'}}function xa(t){const e=document.getElementById("expense-panel-container");if(!e)return;e.innerHTML=`
        <div class="glass-panel expenses-section">
            <h3 class="section-title">${Ue} Report Event Cost</h3>
            <p class="description-text mb-3">Submit an expense for this event. Please include a clear photo of your receipt.</p>
            
            <div class="expense-form">
                <div class="form-group mb-3">
                    <label class="small-title">Expense Title</label>
                    <input type="text" id="expense-description" placeholder="e.g. Fuel, Parking, Group snacks" class="modern-input">
                </div>
                
                <div class="form-group mb-3">
                    <label class="small-title">Amount (£)</label>
                    <input type="number" id="expense-amount" step="0.01" min="0.01" placeholder="0.00" class="modern-input">
                </div>

                <div class="form-group mb-4">
                    <label class="small-title">Proof of Purchase (Receipt)</label>
                    <div id="expense-upload-widget"></div>
                </div>

                <button id="submit-expense-btn" class="primary full-width">Report Cost</button>
            </div>
        </div>
    `;let s=null;const a=new me("expense-upload-widget",{mode:"inline",selectMode:"single",enableLibrary:!1,enableUrl:!1,onUploadComplete:l=>{Array.isArray(l)?s=l[0]:s=l,a.widgetEl&&(a.widgetEl.style.borderColor="")},onRemove:()=>(s=null,!0)}),n=document.getElementById("submit-expense-btn"),i=document.getElementById("expense-description"),o=document.getElementById("expense-amount");o&&ee(o),i&&o&&[i,o].forEach(l=>{l.addEventListener("input",()=>l.setAttribute("aria-invalid","false"))}),n&&n.addEventListener("click",async()=>{const l=i?.value.trim(),c=o?.value;let r=!1;if(!l&&i&&(i.setAttribute("aria-invalid","true"),r=!0),!c&&o&&(o.setAttribute("aria-invalid","true"),r=!0),s?a.widgetEl&&(a.widgetEl.style.borderColor=""):(a.widgetEl&&(a.widgetEl.style.borderColor="var(--colour-bad)"),r=!0),r){v("Missing Information","Please provide a description, amount, and receipt.","error",5e3,"event-expense");return}n.disabled=!0,n.textContent="Submitting...";try{await d("POST",`/api/events/${t}/expenses`,{description:l,amount:parseFloat(c),receiptFileId:s}),v("Success","Expense request submitted successfully.","success",5e3,"event-expense"),e.innerHTML=`
                    <div class="glass-panel expenses-section">
                        <h3 class="section-title">${Ue} Report Event Cost</h3>
                        <div class="text-center p-4">
                            <p class="description-text mb-3">Expense request submitted! You can view your expenses in your profile.</p>
                            <button id="submit-another-expense-btn" class="secondary outline small-btn">Submit Another Claim</button>
                        </div>
                    </div>
                `;const u=document.getElementById("submit-another-expense-btn");u&&(u.onclick=()=>xa(t))}catch(u){v("Submission Failed",u.message||u,"error",5e3,"event-expense"),n.disabled=!1,n.textContent="Request Reimbursement"}})}G.subscribe(Tn);const _t=document.querySelector("main");_t&&_t.insertAdjacentHTML("beforeend",En);wa.attachListeners();_t&&_t.addEventListener("click",t=>{const e=t.target.closest(".attendee-bubble[data-user-id]");if(e){const s=document.getElementById("event-view");if(s&&s.contains(e)){const a=e.dataset.userId;a&&$(`/admin/user/${a}`)}}});O("/events","events");const xn=`
    <div id="events-view" class="view hidden small-container">
        <div class="events-controls-modern">
            <div class="week-navigator glass-panel">
                <button class="nav-btn prev-week" title="Previous Page">${Ve}</button>
                <div class="current-week-display">
                    <span id="page-range-text">Loading...</span>
                </div>
                <button class="nav-btn next-week" title="Next Page">${da}</button>
            </div>

            <div class="controls-group glass-panel">
                <button id="admin-events-link" class="admin-link-btn hidden" title="Event Admin">
                    ${rs}
                    <span>Admin</span>
                </button>
                
                <button class="today-btn" title="Back to Today">
                    ${Ya}
                    <span>Today</span>
                </button>
            </div>
        </div>

        <div id="events-list">
            <div id="events-slider">
                <div class="events-page" id="events-page-current">
                    <p class="loading-text">Loading events...</p>
                </div>
            </div>
        </div>
        <div id="event-navigation"></div>
    </div>`;let oe=0,ht=!1,ft=!1;const nt=new Map;function Ye(){nt.clear()}async function La(t){if(nt.has(t))return nt.get(t);try{const e=await d("GET",`/api/events/paged/${t}`);return nt.set(t,e),e}catch(e){throw console.error(`Failed to fetch events for page ${t}`,e),e}}function Ln(t){[-2,-1,1,2].forEach(s=>{const a=t+s;nt.has(a)||La(a).catch(()=>{})})}function Sn(t,e){const s=l=>new Date(l).toLocaleDateString("en-UK",{month:"short",day:"numeric"}),a=new Date;a.setHours(0,0,0,0);const n=new Date(t),i=new Date(e);if(n.getTime()===a.getTime())return`Today - ${s(i)}`;const o=new Date(a);return o.setDate(a.getDate()-1),i.toDateString()===o.toDateString()?`${s(n)} - Yesterday`:`${s(n)} - ${s(i)}`}function _n(t=!0){const e=new URL(window.location.href);oe===0?e.searchParams.delete("page"):e.searchParams.set("page",String(oe));const s=e.pathname+e.search;t?(window.history.pushState({},"",e.toString()),G.notify({resolvedPath:"/events",viewId:"events",path:s})):window.history.replaceState({},"",e.toString())}async function Zt(){const t=document.querySelector(".admin-link-btn");if(t)try{if(!(await d("GET","/api/auth/status",!0)).authenticated){ft=!1,t.classList.add("hidden");return}const a=(await d("GET","/api/user/elements/permissions")).permissions||[];ft=a.includes("event.manage.all")||a.includes("event.manage.scoped")||a.includes("user.manage")||a.length>0,t.classList.toggle("hidden",!ft)}catch(e){e.message&&!e.message.includes("Unauthorized")&&console.warn("Failed to check admin access",e),ft=!1,t.classList.add("hidden")}}async function Ms(t,e){try{const s=await La(t),a=s.events||[],{startDate:n,endDate:i}=s,o=document.getElementById("page-range-text");o&&n&&i&&(o.textContent=Sn(n,i));const l=document.querySelector(".today-btn");if(l&&l.classList.toggle("disabled",t===0),a.length===0){e.innerHTML=`
                <div class="empty-week-state">
                    <p>No events found for this period.</p>
                </div>`;return}let c="",r=null;for(const u of a){const p=new Date(u.start),h=p.getDate();if(r!==h){r!==null&&(c+="</div></div>"),r=h;const m=p.toLocaleDateString("en-UK",{weekday:"long"}),f=p.getDate(),b=p.toLocaleDateString("en-UK",{month:"short"});c+=`
                    <div class="day-group">
                        <div class="date-strip">
                            <span class="date-num">${f}</span>
                            <div class="date-text-group">
                                <span class="day-name">${m}</span>
                                <div class="date-line"></div>
                                <span class="month-name">${b}</span>
                            </div>
                        </div>
                        <div class="day-events-grid">`}c+=fa.render(u)}a.length>0&&(c+="</div></div>"),e.innerHTML=c}catch{e.innerHTML='<p class="error-text">Failed to load events.</p>'}}async function le(t,e=!0){if(ht)return;const s=document.getElementById("events-slider"),a=document.getElementById("events-page-current");if(!s||!a)return;const n=oe;let i=oe;if(t===0?i=0:typeof t=="number"&&(i=oe+t),i===n&&t!==null)return;if(ht=!0,oe=i,_n(t!==null),!e){await Ms(oe,a),ht=!1,s.style.transition="none",s.style.transform="translateX(0%)";return}let l=t!==null?t:1;t===0&&(l=n>0?-1:1);const c=document.createElement("div");c.className="events-page",c.innerHTML='<div class="loading-container"><div class="spinner"></div></div>';const r=Ms(oe,c);s.style.transition="none",l>0?(s.appendChild(c),s.style.transform="translateX(0)"):(s.insertBefore(c,a),s.style.transform="translateX(-100%)"),s.offsetHeight,s.style.transition="transform 0.3s cubic-bezier(0.25, 1, 0.5, 1)",l>0?s.style.transform="translateX(-100%)":s.style.transform="translateX(0%)",await new Promise(u=>setTimeout(u,310));try{await r}catch(u){console.error("Failed to load page content during animation",u)}finally{a.innerHTML=c.innerHTML,s.style.transition="none",s.style.transform="translateX(0%)",c.parentNode===s&&s.removeChild(c),ht=!1,Ln(oe)}}document.addEventListener("DOMContentLoaded",()=>{Zt(),document.addEventListener("click",t=>{const e=t.target,s=e.closest(".nav-btn, .today-btn, .admin-link-btn");s&&(s.classList.add("click-animate"),s.addEventListener("animationend",()=>s.classList.remove("click-animate"),{once:!0}));const a=e.closest(".today-btn");if(a){a.classList.add("spin-active"),a.addEventListener("animationend",()=>a.classList.remove("spin-active"),{once:!0}),a.classList.add("disabled-hover");const n=()=>{a.classList.remove("disabled-hover"),a.removeEventListener("mouseleave",n)};a.addEventListener("mouseleave",n),le(0)}else e.closest(".prev-week")?le(-1):e.closest(".next-week")?le(1):e.closest(".admin-link-btn")&&$("/admin/events")}),document.addEventListener("keydown",t=>{const e=document.getElementById("events-view"),s=document.activeElement;!e||e.classList.contains("hidden")||s&&["INPUT","TEXTAREA"].includes(s.tagName)||(t.key==="ArrowLeft"?le(-1):t.key==="ArrowRight"?le(1):t.key===" "&&(t.preventDefault(),le(0)))}),Ge.subscribe(()=>{Ye(),Zt(),le(0,!1)}),as.subscribe(()=>{Ye(),le(oe,!1)}),Se.subscribe(()=>{Ye(),le(oe,!1)}),Bt.subscribe(async t=>{const e=t?.eventId;if(Ye(),!e)return;const s=document.querySelector(`.event-card[data-nav="event/${e}"]`);if(s)try{const a=await d("GET",`/api/event/${e}`),{event:n}=a,i=fa.render(n),o=document.createElement("div");o.innerHTML=i;const l=o.firstElementChild;l&&s.replaceWith(l)}catch(a){console.error("Failed to update event card",a)}}),is.subscribe(()=>{Ye()}),G.subscribe(({resolvedPath:t})=>{if(t==="/events"){Zt();const e=new URLSearchParams(window.location.search),s=parseInt(e.get("page")||"0"),a=isNaN(s)?0:s,n=document.getElementById("events-page-current");(oe!==a||n&&n.querySelector(".loading-text"))&&(oe=a,le(null,!1))}})});const Cs=document.querySelector("main");Cs&&Cs.insertAdjacentHTML("beforeend",xn);O("/signup","signup");const qn=`
        <div id="signup-view" class="view hidden">
            <div class="small-container">
                <h1>Sign Up</h1>
                <div class="form-info">
                    <article class="form-box">
                        <h3>
                            ${na}
                            Create Account
                        </h3>
                        <form id="signup-form">
                            <div>
                                <div class="grid">
                                    <div>
                                        <label for="first-name">First Name:</label>
                                        <input type="text" id="signup-first-name" name="first-name" placeholder="First Name" autocomplete="given-name">
                                    </div>
                                    <div>
                                        <label for="last-name">Last Name:</label>
                                        <input type="text" id="signup-last-name" name="last-name" placeholder="Last Name" autocomplete="family-name">
                                    </div>
                                </div>
                                <div>
                                    <label for="email">Email:</label>
                                    <div class="durham-email-wrapper">
                                        <input type="text" id="signup-email" name="email" placeholder="username" autocomplete="username">
                                        <span class="email-suffix">@durham.ac.uk</span>
                                    </div>
                                </div>
                                <div class="grid">
                                    <div>
                                        <label for="password">Password:</label>
                                        <input type="password" id="signup-password" name="password" autocomplete="new-password">
                                    </div>
                                    <div>
                                        <label for="confirm-password">Confirm Password:</label>
                                        <input type="password" id="signup-confirm-password" name="confirm-password" autocomplete="new-password">
                                    </div>
                                </div>
                            </div>
                            <div id="signup-footer">
                                <button type="submit">Sign Up</button>
                            </div>
                        </form>
                    </article>
                </div>
            </div>
        </div>`;let K=null,Q=null,W=null,re=null,Ie=null;async function In({resolvedPath:t}){if(t!=="/signup")return;if(await d("GET","/api/auth/status").then(s=>s.authenticated).catch(()=>!1)){$("/events");return}[K,Q,W,re,Ie].forEach(s=>{s&&(s.value="",s.removeAttribute("aria-invalid"))})}document.addEventListener("DOMContentLoaded",()=>{const t=document.getElementById("signup-form");if(!t)return;K=document.getElementById("signup-first-name"),Q=document.getElementById("signup-last-name"),W=document.getElementById("signup-email"),re=document.getElementById("signup-password"),Ie=document.getElementById("signup-confirm-password"),[K,Q,W,re,Ie].forEach(s=>{s&&s.addEventListener("input",()=>{s.removeAttribute("aria-invalid")})});let e=!1;K&&K.addEventListener("input",()=>{if(e||!K||!Q||!W)return;const s=K.value!==""&&Q.value!==""?".":"";W.value=`${K.value.toLowerCase()}${s}${Q.value.toLowerCase()}`}),Q&&Q.addEventListener("input",()=>{if(e||!K||!Q||!W)return;const s=K.value!==""&&Q.value!==""?".":"";W.value=`${K.value.toLowerCase()}${s}${Q.value.toLowerCase()}`}),W&&W.addEventListener("input",()=>{e=!0,W&&W.value.includes("@")&&(W.value=W.value.split("@")[0])}),t.addEventListener("submit",async s=>{if(s.preventDefault(),[K,Q,W,re,Ie].forEach(i=>{i&&(i.removeAttribute("aria-invalid"),(!i.value||i.value.trim()==="")&&i.setAttribute("aria-invalid","true"))}),re&&Ie&&re.value!==Ie.value){Ie.setAttribute("aria-invalid","true"),v("Error","Passwords do not match","error",2e3,"signup-status");return}let n=W?.value;n&&!n.includes("@")&&(n+="@durham.ac.uk");try{if(!K||!Q||!W||!re)return;await d("POST","/api/auth/signup",{first_name:K.value,last_name:Q.value,email:n,password:re.value}),v("Success","Sign up successful! Redirecting...","success",1e3,"signup-status"),setTimeout(()=>$("/login"),1e3)}catch(i){i.errors&&(i.errors.email&&W&&W.setAttribute("aria-invalid","true"),i.errors.first_name&&K&&K.setAttribute("aria-invalid","true"),i.errors.last_name&&Q&&Q.setAttribute("aria-invalid","true"),i.errors.password&&re&&re.setAttribute("aria-invalid","true")),v("Error",i.message||i||"Sign up failed.","error",2e3,"signup-status")}}),G.subscribe(In)});const ks=document.querySelector("main");ks&&ks.insertAdjacentHTML("beforeend",qn);async function gs(){try{return(await d("GET","/api/auth/status",!0)).authenticated?!0:(sessionStorage.setItem("redirect_after_login",window.location.pathname+window.location.search),$("/unauthorised"),!1)}catch(t){return console.error("Auth check failed:",t),$("/unauthorised"),!1}}const A=({id:t="",title:e="",icon:s="",content:a="",action:n="",classes:i=""})=>`
    <div ${t?`id="${t}"`:""} class="panel-widget ${i}">
        ${e?`
        <div class="box-header">
            <h3>${s} ${e}</h3>
            ${n}
        </div>
        `:""}
        ${a}
    </div>
`,Bs=({legend:t,groupName:e,yesId:s,noId:a,detailId:n,detailPlaceholder:i})=>`
    <fieldset>
        <legend>${t}</legend>
        <div class="radio-group">
            <label><input type="radio" id="${s}" name="${e}" value="yes"> Yes</label>
            <label><input type="radio" id="${a}" name="${e}" value="no"> No</label>
        </div>
        <input type="text" id="${n}" class="conditional-reveal collapsed" name="${e}-detail" placeholder="${i}">
    </fieldset>
`;function Ps(t,e,s){const a=document.getElementById(t),n=document.getElementById(e),i=document.getElementById(s);if(!a||!n||!i)return;const o=()=>{a.checked?i.classList.remove("collapsed"):(i.classList.add("collapsed"),i.value="",i.removeAttribute("aria-invalid"))};a.addEventListener("change",o),n.addEventListener("change",o),o()}const M={date_of_birth:"date",college_id:"college",emergency_contact_name:"emergency-contact-name",emergency_contact_phone:"emergency-contact-phone",home_address:"address",phone_number:"phone-number",has_medical_conditions:"medical-yes",has_medical_conditions_no:"medical-no",medical_conditions_details:"medical-condition",takes_medication:"medication-yes",takes_medication_no:"medication-no",medication_details:"medication-condition",agrees_to_fitness_statement:"no-incapacity-checkbox",agrees_to_club_rules:"terms-checkbox",agrees_to_pay_debts:"debts-checkbox",agrees_to_data_storage:"data-checkbox",agrees_to_keep_health_data:"keep-health-checkbox",name:"name",submit_btn:"health-form-submit",container:"legal-container"},hs=["date_of_birth","college_id","emergency_contact_name","emergency_contact_phone","home_address","phone_number","medical_conditions_details","medication_details"],fs=["agrees_to_fitness_statement","agrees_to_club_rules","agrees_to_pay_debts","agrees_to_data_storage","agrees_to_keep_health_data"];O("/legal","legal");const Mn=`<div id="legal-view" class="view hidden">
        <div class="legal-container" id="${M.container}">
            <h1>Legal & Medical Information Form</h1>
                <div class="legal-grid">
                    <!-- Personal Info -->
                    ${A({title:"Personal Information",icon:na,classes:"full-width",content:`
                        <form>
                            <div class="grid">
                                <label>Name* <input type="text" id="${M.name}" name="name" placeholder="e.g. John Doe"></label>
                                <label>Phone Number* <input type="tel" id="${M.phone_number}" name="phone-number" placeholder="e.g. +44 7123 456789"></label>
                            </div>
                            <div class="grid">
                                <label>Date of Birth* <input type="date" id="${M.date_of_birth}" name="date"></label>
                                <label>College*
                                    <select id="${M.college_id}" name="college">
                                        <option value="" disabled selected>Select your college</option>
                                    </select>
                                </label>
                            </div>
                            <label>Home Address* <textarea id="${M.home_address}" name="address" rows="3" placeholder="e.g. 123 River St..."></textarea></label>
                        </form>`})}

                    <!-- Emergency Contact -->
                    ${A({title:"Emergency Contact",icon:an,content:`
                        <form>
                            <label>Name* <input type="text" id="${M.emergency_contact_name}" name="emergency-contact-name" placeholder="e.g. Jane Doe"></label>
                            <label>Phone Number* <input type="tel" id="${M.emergency_contact_phone}" name="emergency-contact-phone" placeholder="e.g. +44 7123 456789"></label>
                        </form>`})}

                    <!-- Medical Information -->
                    ${A({title:"Medical Information",icon:ds,content:`
                        <form>
                            ${Bs({legend:"Medical Conditions & Allergies*",groupName:"medical-condition-radio",yesId:M.has_medical_conditions,noId:M.has_medical_conditions_no,detailId:M.medical_conditions_details,detailPlaceholder:"Please specify... (e.g. Asthma)"})}
                            
                            ${Bs({legend:"Medication*",groupName:"medication-radio",yesId:M.takes_medication,noId:M.takes_medication_no,detailId:M.medication_details,detailPlaceholder:"Please specify... (e.g. Inhaler)"})}

                            <fieldset>
                                <label><input type="checkbox" id="${M.agrees_to_fitness_statement}"> I am not suffering from any medical condition or injury that prevents full participation.*</label>
                            </fieldset>
                        </form>`})}

                    <!-- Terms -->
                    ${A({title:"Terms and Conditions",icon:us,classes:"full-width",content:`
                        <form>
                            <div class="grid">
                                <fieldset><label><input type="checkbox" id="${M.agrees_to_club_rules}"> I agree to the club rules and safety policy.*</label></fieldset>
                                <fieldset><label><input type="checkbox" id="${M.agrees_to_pay_debts}"> I agree to pay all outstanding debts.*</label></fieldset>
                            </div>
                            <div class="grid">
                                <fieldset><label><input type="checkbox" id="${M.agrees_to_data_storage}"> I agree to encrypted storage of my data.*</label></fieldset>
                                <fieldset><label><input type="checkbox" id="${M.agrees_to_keep_health_data}"> I would like my health form to be kept on the server beyond the end of the year.</label></fieldset>
                            </div>
                            <button type="submit" id="${M.submit_btn}">Submit Information</button>
                        </form>`})}
                </div>
            </div>
        </div>`,ne=t=>document.getElementById(t),Sa=t=>{t&&t.removeAttribute("aria-invalid")},As=t=>{t&&(t.ariaInvalid="true")};function Ds(t,e){return ne(t)?.checked?!0:ne(e)?.checked?!1:null}function Hs(t,e,s){s===!0?ne(t).checked=!0:s===!1&&(ne(e).checked=!0)}function Cn(){document.querySelectorAll(`#${M.container} input, #${M.container} select, #${M.container} textarea`).forEach(e=>e.addEventListener("input",()=>Sa(e))),Ps(M.has_medical_conditions,M.has_medical_conditions_no,M.medical_conditions_details),Ps(M.takes_medication,M.takes_medication_no,M.medication_details)}function kn(){const t={};return hs.forEach(e=>{const s=ne(M[e]);s&&(t[e]=s.value)}),fs.forEach(e=>{const s=ne(M[e]);s&&(t[e]=s.checked)}),t.has_medical_conditions=Ds(M.has_medical_conditions,M.has_medical_conditions_no),t.takes_medication=Ds(M.takes_medication,M.takes_medication_no),t.college_id=t.college_id?parseInt(t.college_id,10):null,t}function Bn(t){t&&(hs.forEach(e=>{const s=ne(M[e]);s&&t[e]!==null&&(s.value=t[e])}),fs.forEach(e=>{const s=ne(M[e]);s&&(s.checked=!!t[e])}),Hs(M.has_medical_conditions,M.has_medical_conditions_no,t.has_medical_conditions),Hs(M.takes_medication,M.takes_medication_no,t.takes_medication))}async function Pn(t){if(t!=="/legal"||!await gs())return;const e=ne(M.container);e&&e.classList.remove("hidden");try{const[s,a,n]=await Promise.all([d("GET","/api/colleges"),d("GET",`/api/user/elements/filled_legal_info,${hs.join(",")},${fs.join(",")},has_medical_conditions,takes_medication`),d("GET","/api/user/elements/first_name,last_name")]),i=ne(M.college_id);i&&(i.innerHTML='<option value="" disabled selected>Select your college</option>'+(s||[]).map(c=>`<option value="${c.id}">${c.name}</option>`).join(""));const o=ne(M.name),l=`${n.first_name} ${n.last_name}`;o&&l.trim()!=="undefined undefined"&&(o.value=l,o.disabled=!0),a&&a.filled_legal_info&&Bn(a),Cn()}catch(s){console.error("Legal page load error",s),v("Error","Failed to load form data.","error",3e3,"legal-status")}}function An(){const t=ne(M.submit_btn);t&&t.addEventListener("click",async e=>{e.preventDefault();const s=kn();try{await d("POST","/api/user/elements",s),v("Saved","Information updated successfully.","success",3e3,"legal-status"),as.notify(),document.querySelectorAll("[aria-invalid]").forEach(a=>Sa(a))}catch(a){if(a.errors){let n=!1;for(const[i,o]of Object.entries(a.errors))M[i]&&(As(ne(M[i])),n=!0);if((a.errors.first_name||a.errors.last_name)&&(As(ne(M.name)),n=!0),n){v("Validation Error","Please check the highlighted fields.","error",3e3,"legal-status");return}}v("Error",a.message||"Save failed.","error",3e3,"legal-status")}})}document.addEventListener("DOMContentLoaded",()=>{An(),G.subscribe(({resolvedPath:t})=>Pn(t))});const Rs=document.querySelector("main");Rs&&Rs.insertAdjacentHTML("beforeend",Mn);const Dn=(t=[])=>`
    <nav class="dashboard-sidebar glass-panel">
        ${t.map(e=>`
            <button class="nav-item ${e.active?"active":""} ${e.classes||""}" 
                ${e.id?`data-tab="${e.id}"`:""} 
                ${e.actionId?`id="${e.actionId}"`:""}>
                ${e.icon||""} ${e.label}
            </button>
        `).join("")}
    </nav>
`;function Hn(t="overview",e){const s=document.querySelectorAll(".nav-item[data-tab]"),a=document.querySelectorAll(".dashboard-section");function n(l){s.forEach(r=>{r.dataset.tab===l?r.classList.add("active"):r.classList.remove("active")}),a.forEach(r=>r.classList.remove("active"));const c=document.getElementById(`tab-${l}`);c&&c.classList.add("active")}s.forEach(l=>{l.addEventListener("click",()=>{const c=l.dataset.tab,r=new URL(window.location.href);r.searchParams.set("tab",c),window.history.pushState({},"",r),n(c)})});const o=new URLSearchParams(window.location.search).get("tab")||t;return n(o),{setActive:n}}const _a=({active:t=!1,activeText:e="Active",inactiveText:s="Action Required",content:a=""})=>`
    <div class="status-indicator-box ${t?"status-green":"status-red"}">
        <div class="indicator-header">
            ${t?Ft:Ht} 
            <span>${t?e:s}</span>
        </div>
        <div class="indicator-body">
            ${a}
        </div>
    </div>
`,Rn=({title:t,text:e,buttonText:s,buttonId:a,classes:n=""})=>`
    <div class="accent-panel ${n}">
        <div class="panel-content">
            <h2>${t}</h2>
            <p>${e}</p>
        </div>
        <div class="panel-action">
            <button id="${a}">${s}</button>
        </div>
    </div>
`,qt=({title:t="",value:e="",valueId:s="",actions:a="",valueClass:n="",classes:i="",id:o=""}={})=>`
    <div class="value-header ${i}" ${o?`id="${o}"`:""}>
        <div class="value-info">
            <span class="value-title">${t}</span>
            <span class="value-display ${n}" ${s?`id="${s}"`:""}>${e}</span>
        </div>
        <div class="value-actions">
            ${a}
        </div>
    </div>
    `,Fn=(t,e,s=null)=>{const a=document.getElementById(t);a&&(a.textContent=e,s!==null&&(a.className=`value-display ${s}`))},bs=(t=[],e)=>!t||t.length===0?'<p class="empty-text">No items found.</p>':`
    <div class="item-list">
        ${t.map(s=>e(s)).join("")}
    </div>
    `,Nt=({icon:t="",iconClass:e="",title:s="",subtitle:a="",value:n="",valueClass:i="",extra:o="",actions:l="",content:c="",classes:r="",dataAttributes:u=""})=>`
    <div class="list-item glass-panel ${r}" ${u}>
        <div class="item-icon ${e}">${t}</div>
        <div class="item-details">
            <span class="item-title">${s}</span>
            <span class="item-subtitle">${a}</span>
        </div>
        ${c}
        <div class="item-value-group">
            <span class="item-value ${i}">${n}</span>
            ${o?`<span class="item-extra">${o}</span>`:""}
        </div>
        ${l?`<div class="item-actions">${l}</div>`:""}
    </div>
`;O("/profile","profile");O("/transactions","profile");const On=[{id:"overview",label:"Overview",icon:ja,active:!0},{id:"cars",label:"Cars",icon:ge},{id:"balance",label:"Balance & History",icon:Ze},{id:"settings",label:"Account Settings",icon:rs},{label:"Sign Out",icon:Na,actionId:"sidebar-logout-btn",classes:"logout"}],Nn=`
    <div id="profile-view" class="view hidden">
        <div class="dashboard-container">
            ${Dn(On)}

            <!-- Main Content Area -->
            <main class="dashboard-content">
        
                <!-- Overview Tab -->
                <section id="tab-overview" class="dashboard-section active">
                    ${A({title:"Profile Picture",icon:it,content:`
                            <div class="profile-avatar-row">
                                <div id="profile-picture-container" class="profile-picture-container" title="Change Profile Picture">
                                    <div class="profile-picture-large" id="profile-img-wrapper">
                                        <img id="profile-img-display" src="/images/misc/ducc.png" alt="Profile Picture">
                                    </div>
                                    <div class="avatar-overlay">${Lt}</div>
                                </div>
                                <div class="profile-avatar-controls">
                                    <div id="avatar-upload-container"></div>
                                    <div class="avatar-presets no-margin no-padding">
                                        <h4 class="small-title">Color Presets</h4>
                                        <div id="color-presets" class="presets-grid"></div>

                                        <h4 class="small-title mt-4">Initials</h4>
                                        <div id="initials-presets" class="presets-grid"></div>

                                        <h4 class="small-title mt-4">Fonts</h4>
                                        <div id="font-presets" class="presets-grid"></div>
                                    </div>
                                </div>
                            </div>
                        `})}

                    <div id="membership-banner-container"></div>

                    ${A({title:"Swimming Stats",icon:Pt,action:`<button class="small-btn secondary" data-nav="/swims">${cs} View Leaderboard</button>`,content:'<div id="swim-stats-grid" class="stats-grid"><p>Loading stats...</p></div>'})}

                    <!-- Legal & Safety Row -->
                    <div class="dual-grid">
                        ${A({title:"Legal Waiver",icon:us,action:`<button class="small-btn secondary" data-nav="/legal">${he} Update</button>`,content:'<div id="legal-status-content"><p>Loading...</p></div>'})}

                        ${A({title:"Safety Info",icon:ds,action:`<button id="edit-safety-btn" class="small-btn secondary">${he} Edit</button>`,content:`
                                <div id="safety-info-display">
                                    <div class="info-rows">
                                        <div class="info-row"><span>First Aid Expiry</span><span id="display-first-aid">Not Set</span></div>
                                        <div class="info-row"><span>Emergency Contact</span><span id="display-emergency">Not Set</span></div>
                                    </div>
                                </div>
                                <form id="safety-info-form" class="hidden modern-form">
                                    <div class="grid-2-col">
                                        <label>First Aid Expiry <input type="date" id="input-first-aid"></label>
                                        <label>Emergency Contact <input type="tel" id="input-emergency" placeholder="07700 900000"></label>
                                    </div>
                                    <div class="form-actions">
                                        <button type="button" id="cancel-safety-btn" class="secondary">${te} Cancel</button>
                                        <button type="submit">${Ot} Save</button>
                                    </div>
                                </form>
                            `})}
                    </div>

                    ${A({id:"groups-teams-panel",title:"Groups & Teams",icon:ge,content:'<div id="tags-list-container" class="tags-list"><p>Loading tags...</p></div>'})}

                    ${A({content:`
                            <div class="role-toggle">
                                <div class="role-info">
                                    <h4>${Rt} Instructor Status</h4>
                                    <p id="instructor-status-text">Not an instructor</p>
                                </div>
                                <button id="toggle-instructor-btn" class="small-btn secondary">Apply</button>
                            </div>
                        `})}
                </section>

                <section id="tab-cars" class="dashboard-section">
                    ${A({title:"My Vehicles",icon:ge,action:`<button id="add-car-btn" class="small-btn primary">${U} Add Car</button>`,content:'<div id="cars-list-container" class="item-list"></div>'})}
                </section>

                <section id="tab-balance" class="dashboard-section">
                    <!-- Balance Overview -->
                    ${qt({title:"Current Balance",value:"£0.00",valueId:"balance-amount",actions:'<button id="top-up-btn" class="small-btn">Top Up</button>'})}

                    ${A({title:"Transaction History",content:'<div id="transactions-list-container"></div>'})}
                </section>

                <section id="tab-settings" class="dashboard-section">
                    <div class="settings-grid">
                        ${A({title:"Password",icon:it,content:'<button id="change-password-btn" class="outline">Change Password</button>'})}

                        ${A({title:"Two-Factor Authentication",icon:At,content:`
                                <div class="two-fa-grid dual-grid">
                                    <div class="glass-panel embedded-panel">
                                        <div class="setting-info">
                                            <strong>Authenticator (TOTP)</strong>
                                            <p id="totp-status" class="status-tag warning no-margin">Disabled</p>
                                        </div>
                                        <button id="manage-totp-btn" class="small-btn secondary">Setup</button>
                                    </div>
                                    <div class="glass-panel embedded-panel">
                                        <div class="setting-info">
                                            <strong>Passkey</strong>
                                            <p id="passkey-count">0 keys registered</p>
                                        </div>
                                        <button id="manage-passkeys-btn" class="small-btn secondary">Manage</button>
                                    </div>
                                </div>
                            `})}

                        ${A({title:"Danger Zone",icon:Ht,classes:"danger-zone",content:'<button id="delete-account-btn" class="delete outline">Delete Account</button>'})}
                    </div>
                </section>
            </main>
        </div>
    </div>`;let Le=null,Qt=null;function $e(t,e,s){v(t,e,s,3e3,"profile-status")}function Gn(t,e){const s=document.getElementById("membership-banner-container");if(!s)return;const a=t.is_member,n=t.free_sessions||0,i=Number(e.MembershipCost)||50;a?(s.classList.add("hidden"),s.innerHTML=""):(s.classList.remove("hidden"),s.innerHTML=Rn({title:"You aren't a member yet",text:`You have <strong>${n}</strong> free trial event${n!==1?"s":""} remaining before membership is required.`,buttonText:"Become a Member",buttonId:"join-membership-btn"}),document.getElementById("join-membership-btn").onclick=async()=>{if(await N("Confirm Membership",`Becoming a member costs <strong>£${i.toFixed(2)}</strong>. This will be added to your account balance. Are you sure?`))try{await d("POST","/api/user/join"),$e("Welcome!","You are now a club member.","success"),ue(),Se.notify(),ns.notify()}catch(l){$e("Error",l.message||"Failed to join.","error")}})}function Un(t){const e=document.getElementById("swim-stats-grid"),s=t||{allTime:{swims:0,rank:"-"},yearly:{swims:0,rank:"-"}};e&&(e.innerHTML=`
            <div class="stat-item">
                <span class="stat-value">${s.yearly.swims}</span>
                <span class="stat-label">Yearly Swims</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${$t(s.yearly.rank)}</span>
                <span class="stat-label">Yearly Rank</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${s.allTime.swims}</span>
                <span class="stat-label">Total Swims</span>
            </div>
            <div class="stat-item">
                <span class="stat-value">${$t(s.allTime.rank)}</span>
                <span class="stat-label">All Time Rank</span>
            </div>
        `)}function Zn(t){const e=document.getElementById("profile-img-wrapper");e&&(e.outerHTML=se(t,{classes:"large",dataAttributes:'id="profile-img-wrapper"'}),jn(t))}function jn(t){const e=document.getElementById("color-presets"),s=document.getElementById("initials-presets"),a=document.getElementById("font-presets");if(!e||!s||!a)return;const n=["#2ecc71","#3498db","#9b59b6","#f1c40f","#e67e22","#e74c3c","#1abc9c","#34495e","#d35400","#c0392b"],i=t.first_name?t.first_name[0]:"",o=t.last_name?t.last_name[0]:"",l=`${i}${o}`||"?",c=[{label:"Both",value:"both",text:l},{label:"First",value:"first",text:i},{label:"Last",value:"last",text:o}],r=[{label:"Sans",value:"sans"},{label:"Display",value:"outfit"},{label:"Serif",value:"serif"},{label:"Gothic",value:"gothic"},{label:"Retro",value:"accent"},{label:"Mono",value:"mono"}];e.innerHTML=n.map(p=>`
        <div class="preset-item color-preset ${t.profile_picture_color===p?"active":""}" 
             style="background-color: ${p};" data-color="${p}">
            ${l}
        </div>
    `).join(""),s.innerHTML=c.map(p=>`
        <div class="preset-item initials-preset ${t.profile_picture_initials===p.value?"active":""}" 
             style="background-color: var(--pico-primary);" data-initials="${p.value}">
            ${p.text}
        </div>
    `).join(""),a.innerHTML=r.map(p=>`
        <div class="preset-item font-preset font-preset-${p.value} ${t.profile_picture_font===p.value?"active":""}" 
             style="background-color: var(--pico-primary);" data-font="${p.value}">
            ${l}
        </div>
    `).join("");const u=async p=>{try{await d("POST","/api/user/profile-picture",{fileId:null,color:t.profile_picture_color,font:t.profile_picture_font,initials:t.profile_picture_initials,...p}),ue()}catch(h){v("Error",h.message,"error")}};e.querySelectorAll(".color-preset").forEach(p=>{p.onclick=()=>u({color:p.dataset.color})}),s.querySelectorAll(".initials-preset").forEach(p=>{p.onclick=()=>u({initials:p.dataset.initials})}),a.querySelectorAll(".font-preset").forEach(p=>{p.onclick=()=>u({font:p.dataset.font})})}function Vn(t){const e=document.getElementById("legal-status-content");if(!e)return;const s=!!t.filled_legal_info,a=t.legal_filled_at?new Date(t.legal_filled_at).toLocaleDateString("en-GB"):null;e.innerHTML=_a({active:s,activeText:"Active",inactiveText:"Action Required",content:`
            <p>${s?"Your legal waiver is up to date.":"You must complete the legal waiver to participate in events."}</p>
            ${s&&a?`<p class="last-filled">Last filled out: ${a}</p>`:""}
        `})}function Wn(t){document.getElementById("display-first-aid").textContent=t.first_aid_expiry||"Not Set",document.getElementById("display-emergency").textContent=t.phone_number||"Not Set",document.getElementById("input-first-aid").value=t.first_aid_expiry||"",document.getElementById("input-emergency").value=t.phone_number||""}function zn(t){const e=document.getElementById("tags-list-container");if(e)if(t&&t.length>0)e.innerHTML=Ce.renderList(t);else{const s=document.getElementById("groups-teams-panel");s&&s.classList.add("hidden")}}function Yn(t){const e=t.is_instructor,s=document.getElementById("instructor-status-text"),a=document.getElementById("toggle-instructor-btn");e?(s.textContent="Active Instructor",s.classList.add("instructor-active"),a.textContent="Resign",a.className="small-btn outline delete",a.onclick=async()=>{await N("Resign?","Are you sure you want to resign as an instructor?")&&(await d("POST","/api/user/elements",{is_instructor:!1}),ue())}):(s.textContent="Not an instructor",s.classList.remove("instructor-active"),a.textContent="Apply",a.className="small-btn secondary",a.onclick=async()=>{await d("POST","/api/user/elements",{is_instructor:!0}),ue()})}function Kn(t,e){const s=Number(t.balance);let a="balance-warning";s<e?a="balance-negative":s>=0&&(a="balance-positive"),Fn("balance-amount",`£${s.toFixed(2)}`,a)}async function ys(){const t=document.getElementById("cars-list-container");if(t)try{const s=(await d("GET","/api/cars")).data||[];t.innerHTML=bs(s,a=>{const n=a.user_id===Le?.id,i=Le?.permissions?.includes("car.manage_global"),o=n||i;return Nt({icon:ge,title:a.name,subtitle:`${a.seats} Seats • ${a.boats} Boats${a.is_global?' • <span class="badge primary">Global</span>':""}`,actions:`
                    <div class="button-group mini">
                        ${o?`
                            <button class="small-btn icon-only secondary" data-edit-car="${a.id}" title="Edit Car">
                                ${he}
                            </button>
                            <button class="small-btn icon-only delete" data-delete-car="${a.id}" title="Remove Car">
                                ${te}
                            </button>
                        `:""}
                    </div>
                `})}),t.querySelectorAll("[data-edit-car]").forEach(a=>{a.onclick=()=>{const n=s.find(i=>i.id==parseInt(a.dataset.editCar));n&&qa(n)}}),t.querySelectorAll("[data-delete-car]").forEach(a=>{a.onclick=async()=>{if(await N("Remove Car?","Are you sure you want to remove this vehicle?"))try{await d("DELETE",`/api/cars/${a.dataset.deleteCar}`),v("Success","Car removed.","success"),ys()}catch(n){v("Error",n.message,"error")}}})}catch{t.innerHTML='<p class="error-text">Failed to load cars.</p>'}}function qa(t=null){const e=!!t,s=Le?.permissions?.includes("car.manage_global"),a=`
        <form id="car-form" class="modern-form">
            <label>Car Name <input type="text" id="car-name" value="${e?t.name:""}" placeholder="e.g. Blue VW Polo" required></label>
            <div class="grid-2-col">
                <label>Seats <input type="number" id="car-seats" min="1" max="9" value="${e?t.seats:5}" required></label>
                <label>Boats <input type="number" id="car-boats" min="0" max="9" value="${e?t.boats:0}" required></label>
            </div>
            ${s?`<label class="checkbox-label"><input type="checkbox" id="car-is-global" ${e&&t.is_global?"checked":""}> Global (available for anyone to use)</label>`:""}
            <div class="form-actions">
                <button type="submit" class="primary full-width">${e?"Update Vehicle":"Add Vehicle"}</button>
            </div>
        </form>
    `,n=new H({id:"car-modal",title:e?"Edit Vehicle":"Add New Vehicle",content:a});document.body.insertAdjacentHTML("beforeend",n.getHTML()),n.attachListeners(),n.show();const i=document.getElementById("car-seats"),o=document.getElementById("car-boats");i&&ee(i),o&&ee(o),document.getElementById("car-form").onsubmit=async l=>{l.preventDefault();const c={name:document.getElementById("car-name").value,seats:document.getElementById("car-seats").value,boats:document.getElementById("car-boats").value,isGlobal:document.getElementById("car-is-global")?.checked||!1};try{e&&t?(await d("PUT",`/api/cars/${t.id}`,c),v("Success","Vehicle updated.","success")):(await d("POST","/api/cars",c),v("Success","Vehicle added.","success")),n.close(),ys()}catch(r){v("Error",r.message,"error")}}}async function Qn(){const t=document.getElementById("transactions-list-container");if(t)try{const s=(await d("GET","/api/user/elements/transactions")).transactions||[];t.innerHTML=bs(s,a=>{const n=a.amount<0;return Nt({icon:n?ra:U,iconClass:n?"negative":"positive",title:a.description,subtitle:new Date(a.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}),value:`${n?"":"+"}${a.amount.toFixed(2)}`,valueClass:n?"negative":"positive",extra:`£${a.after!==void 0?a.after.toFixed(2):"N/A"}`})})}catch{t.innerHTML='<p class="error-text">Failed to load transactions.</p>'}}async function lt(){try{const[t,e]=await Promise.all([d("GET","/api/user/elements/totp_enabled"),d("GET","/api/auth/passkeys")]),s=document.getElementById("manage-totp-btn"),a=document.getElementById("totp-status");t.totp_enabled?(a.textContent="Enabled",a.className="status-tag success no-margin no-padding",s.textContent="Disable",s.className="small-btn outline delete",s.onclick=()=>Xn()):(a.textContent="Disabled",a.className="status-tag warning no-margin no-padding",s.textContent="Setup",s.className="small-btn secondary",s.onclick=()=>Jn()),document.getElementById("passkey-count").textContent=`${e.length} key${e.length!==1?"s":""} registered`}catch(t){console.error("Failed to update 2FA UI",t)}}async function Jn(){try{const{qrCodeData:t,secret:e}=await d("GET","/api/auth/totp/setup"),s="totp-setup-modal",a=document.getElementById(s);a&&a.remove();const n=`
            <div class="totp-setup-flow">
                <p>Scan this QR code with your authenticator app (like Google Authenticator or Authy).</p>
                <div class="qr-container"><img src="${t}" alt="TOTP QR Code"></div>
                <div class="manual-secret">
                    <span>Or enter manually:</span>
                    <div class="secret-row">
                        <code id="totp-secret-code">${e}</code>
                        <button class="copy-btn" id="copy-totp-secret" title="Copy to clipboard">
                            ${Ka}
                        </button>
                    </div>
                </div>
                <form id="totp-verify-form" class="modern-form">
                    <label>Verification Code <input type="text" id="totp-code" placeholder="123456" required></label>
                    <button type="submit" class="primary full-width">Verify & Enable</button>
                </form>
            </div>
        `,i=new H({id:s,title:"Setup TOTP",content:n});document.body.insertAdjacentHTML("beforeend",i.getHTML()),i.attachListeners(),i.show(),document.getElementById("copy-totp-secret").onclick=async()=>{try{await navigator.clipboard.writeText(e),v("Copied","Secret copied to clipboard!","success")}catch{v("Error","Failed to copy.","error")}},document.getElementById("totp-verify-form").onsubmit=async o=>{o.preventDefault();const l=document.getElementById("totp-code").value;try{await d("POST","/api/auth/totp/enable",{token:l}),v("Success","TOTP enabled!","success"),i.close(),lt()}catch(c){v("Error",c.message,"error")}}}catch{v("Error","Failed to start setup.","error")}}async function Xn(){if(await N("Disable 2FA?","Are you sure you want to disable your authenticator app? This will make your account less secure."))try{await d("POST","/api/auth/totp/disable"),v("Success","TOTP disabled.","success"),lt()}catch(t){v("Error",t.message,"error")}}async function ei(){const t="passkey-modal",e=s=>{const a=document.getElementById("passkey-list");a&&(a.innerHTML=s.map(n=>Nt({icon:At,title:`Passkey (Added ${new Date(n.created_at).toLocaleDateString()})`,actions:`<button class="small-btn icon-only delete" onclick="window.deletePasskey('${n.id}')">${te}</button>`})).join(""),s.length===0&&(a.innerHTML='<p class="empty-state">No passkeys registered.</p>'))};try{const s=await d("GET","/api/auth/passkeys"),a=document.getElementById(t);a&&a.remove();const n=`
            <div class="passkey-management">
                <div id="passkey-list" class="item-list"></div>
                <button id="add-passkey-btn" class="primary full-width">${U} Add Passkey</button>
            </div>
        `,i=new H({id:t,title:"Manage Passkeys",content:n});document.body.insertAdjacentHTML("beforeend",i.getHTML()),i.attachListeners(),i.show(),e(s),window.deletePasskey=async o=>{if(await N("Delete Passkey?","Are you sure you want to remove this passkey?"))try{await d("DELETE",`/api/auth/passkeys/${o}`);const l=await d("GET","/api/auth/passkeys");e(l),lt()}catch{v("Error","Failed to delete passkey.","error")}},document.getElementById("add-passkey-btn").onclick=async()=>{try{const o=await d("GET","/api/auth/passkey/register-options"),l=await window.SimpleWebAuthnBrowser.startRegistration(o);await d("POST","/api/auth/passkey/register-verify",l),v("Success","Passkey registered!","success");const c=await d("GET","/api/auth/passkeys");e(c),lt()}catch(o){v("Error",o.message,"error")}}}catch{v("Error","Failed to load passkeys.","error")}}async function ue(){if(await gs())try{const[t,e,s,a]=await Promise.all([d("GET","/api/user/elements/id,permissions,email,first_name,last_name,is_member,is_instructor,filled_legal_info,legal_filled_at,phone_number,first_aid_expiry,free_sessions,balance,swims,swimmer_rank,profile_picture_path,profile_picture_color,profile_picture_font,profile_picture_initials,totp_enabled"),d("GET","/api/globals/MembershipCost"),d("GET","/api/user/tags").catch(()=>[]),d("GET","/api/globals/MinMoney").catch(()=>({res:{MinMoney:{data:-25}}}))]);Le=t;const n=Number(a.res?.MinMoney?.data||-25);Le&&(Zn(t),Gn(t,e.res||{}),Un(t.swimmer_stats),Vn(t),Wn(t),zn(s),Yn(t),ys(),lt()),Kn(t,n),Qn()}catch(t){console.error("Dashboard update failed",t),$e("Error","Failed to load profile data.","error")}}let Ke=null;function ti(){Qt=Hn("overview"),document.getElementById("avatar-upload-container")&&!Ke&&(Ke=new me("avatar-upload-container",{mode:"inline",enableLibrary:!1,enableUrl:!1,showActions:!1,showPreview:!1,enableCrop:!0,onImageSelect:async({id:l})=>{try{await d("POST","/api/user/profile-picture",{fileId:l}),v("Success","Profile picture updated.","success"),ue()}catch(c){v("Error",c.message,"error")}}}),document.querySelector("main").addEventListener("click",l=>{l.target.closest("#profile-picture-container")&&(Ke&&Ke.inputEl?Ke.inputEl.click():console.error("UploadWidget input element not found"))})),document.getElementById("manage-passkeys-btn").onclick=()=>ei();const t=document.getElementById("safety-info-display"),e=document.getElementById("safety-info-form"),s=document.getElementById("edit-safety-btn"),a=document.getElementById("cancel-safety-btn");s.onclick=()=>{t.classList.add("hidden"),e.classList.remove("hidden"),s.classList.add("hidden")};const n=()=>{t.classList.remove("hidden"),e.classList.add("hidden"),s.classList.remove("hidden")};a.onclick=n;const i=document.getElementById("add-car-btn");i&&(i.onclick=()=>qa()),e.onsubmit=async l=>{l.preventDefault();const c={first_aid_expiry:document.getElementById("input-first-aid").value,phone_number:document.getElementById("input-emergency").value};try{await d("POST","/api/user/elements",c),$e("Success","Safety info updated.","success"),await ue(),n()}catch(r){$e("Error",r.message,"error")}};const o=document.getElementById("top-up-btn");o&&(o.onclick=()=>{if(!Le)return;const l=Le.first_name.charAt(0).toUpperCase()+Le.last_name.toUpperCase()+"WEBSITE";N("Top Up Balance",`Please transfer the desired amount to:<br><br>
                <strong>Bank:</strong> Durham University<br>
                <strong>Sort Code:</strong> 20-27-66<br>
                <strong>Account:</strong> 53770109<br>
                <strong>Reference:</strong> ${l}<br><br>
                <p>Pressing the confirm button will notify the finance team to credit your account once the transfer is verified. Please press cancel if you have not made a transfer.</p>`)}),document.getElementById("change-password-btn").onclick=async()=>{const l=await yn();if(l)try{await d("POST","/api/auth/change-password",l),$e("Success","Password changed.","success")}catch(c){$e("Error",c.message||"Failed to change password.","error")}},document.getElementById("delete-account-btn").onclick=async()=>{const l=await ba("Delete Account","This cannot be undone. Enter password to confirm.");if(l)try{await d("POST","/api/user/deleteAccount",{password:l}),Ge.notify({authenticated:!1}),$("/home")}catch{$e("Error","Delete failed. Check password.","error")}},document.getElementById("sidebar-logout-btn").onclick=async()=>{await d("GET","/api/auth/logout"),Tt(),Ge.notify({authenticated:!1}),$("/home")}}function Jt(){const t=document.querySelector("main");t&&(document.getElementById("profile-view")||(t.insertAdjacentHTML("beforeend",Nn),ti()))}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",Jt):Jt();Ge.subscribe(()=>{document.getElementById("profile-view")?.classList.contains("hidden")||ue()});as.subscribe(()=>{document.getElementById("profile-view")?.classList.contains("hidden")||ue()});Se.subscribe(()=>{document.getElementById("profile-view")?.classList.contains("hidden")||ue()});G.subscribe(({resolvedPath:t})=>{if(t==="/profile"||t==="/transactions"){Jt();let s=new URLSearchParams(window.location.search).get("tab")||"overview";["overview","cars","balance","settings"].includes(s)||(s="overview"),Qt&&Qt.setActive(s),ue()}});O("/event/:eventId/expense/new","event-expense",{isOverlay:!0});O("/event/:eventId/expense/:expenseId/edit","event-expense",{isOverlay:!0});O("/event/:eventId/driver/:driverId/mileage/:type","event-mileage",{isOverlay:!0});const ws=new H({id:"event-expense-view",isView:!0,title:"Report Event Expense",contentClasses:"modal-lg glass-panel",contentId:"event-expense-content",fallbackPath:()=>window.location.pathname.split("/expense")[0]||"/events"}),Es=new H({id:"event-mileage-view",isView:!0,title:"Submit Mileage",contentClasses:"modal-lg glass-panel",contentId:"event-mileage-content",fallbackPath:()=>window.location.pathname.split("/driver")[0]||"/events"}),si=ws.getHTML()+Es.getHTML();async function ai({viewId:t,path:e}){t==="event-expense"?await ni(e):t==="event-mileage"&&await ii(e)}async function ni(t){const e=document.getElementById("event-expense-content");if(!e)return;const s=t.split("?")[0].split("/"),a=s[2],n=t.includes("/edit"),i=n?s[4]:null,o=n?"Edit Event Expense":"Report Event Expense",l=document.querySelector("#event-expense-view .c-modal-header h2");l&&(l.textContent=o);let c=null;if(n){e.innerHTML='<p aria-busy="true">Loading expense details...</p>';try{if(c=((await d("GET",`/api/events/${a}/expenses`)).data||[]).find(f=>f.id==i),!c)throw new Error("Expense not found")}catch(m){e.innerHTML=`<p class="error-text">Error: ${m.message}</p>`;return}}let r=c?c.receipt_file_id:null;e.innerHTML=`
        <form id="expense-view-form" class="modern-form">
            <div class="form-group mb-4">
                <label for="expense-view-amount">Amount (£)</label>
                <input type="number" id="expense-view-amount" step="0.01" value="${c?c.amount:""}" required placeholder="0.00">
            </div>
            <div class="form-group mb-4">
                <label for="expense-view-desc">Description</label>
                <input type="text" id="expense-view-desc" placeholder="e.g. Group Dinner" value="${c?c.description:""}" required>
            </div>
            <div class="form-group mb-4">
                <label>Receipt (Optional)</label>
                <div id="expense-view-upload-container"></div>
            </div>
            <div class="form-actions mt-6">
                <button type="submit" class="primary full-width">${n?"Update Expense":"Report Expense"}</button>
            </div>
        </form>
    `;const u=document.getElementById("expense-view-amount");u&&ee(u);const p=e.querySelector("#expense-view-upload-container");p&&new me(p,{mode:"inline",selectMode:"single",autoUpload:!0,defaultPreview:r?`/api/files/${r}/download?view=true`:null,onImageSelect:({id:m})=>{r=m}});const h=document.getElementById("expense-view-form");h&&(h.onsubmit=async m=>{m.preventDefault();const f=document.getElementById("expense-view-amount").value,b=document.getElementById("expense-view-desc").value,g={amount:f,description:b,receiptFileId:r};try{n?(await d("PUT",`/api/expenses/${i}`,g),v("Success","Expense updated.","success")):(await d("POST",`/api/events/${a}/expenses`,g),v("Success","Expense reported.","success")),ws.close(),Bt.notify({eventId:a})}catch(w){v("Error",w.message||"Failed to save expense.","error")}})}async function ii(t){const e=document.getElementById("event-mileage-content");if(!e)return;const s=t.split("?")[0].split("/"),a=s[2],n=s[4],i=s[6],o=`Submit ${i==="start"?"Starting":"Ending"} Mileage`,l=document.querySelector("#event-mileage-view .c-modal-header h2");l&&(l.textContent=o),e.innerHTML='<p aria-busy="true">Loading mileage details...</p>';let c="",r=null;try{const f=(await d("GET",`/api/drivers/${n}`)).data;i==="start"?(c=f.start_mileage??"",r=f.start_mileage_proof_id):(c=f.end_mileage??"",r=f.end_mileage_proof_id)}catch(m){console.error("Failed to fetch driver details",m)}e.innerHTML=`
        <form id="mileage-view-form" class="modern-form">
            <div class="form-group mb-4">
                <label for="mileage-view-input">Current Mileage</label>
                <input type="number" id="mileage-view-input" step="0.1" value="${c}" required placeholder="0.0">
            </div>
            <div class="form-group mb-4">
                <label>Photo Proof (Odometer)</label>
                <div id="mileage-view-upload-container"></div>
            </div>
            <div class="form-actions mt-6">
                <button type="submit" class="primary full-width">Submit Mileage</button>
            </div>
        </form>
    `;const u=document.getElementById("mileage-view-input");u&&ee(u);const p=e.querySelector("#mileage-view-upload-container");p&&new me(p,{mode:"inline",selectMode:"single",autoUpload:!0,enableLibrary:!1,enableUrl:!1,defaultPreview:r?`/api/files/${r}/download?view=true`:null,onImageSelect:({id:m})=>{r=m}});const h=document.getElementById("mileage-view-form");h&&(h.onsubmit=async m=>{if(m.preventDefault(),!r)return v("Error","Please upload a photo of your odometer.","error");try{const f=document.getElementById("mileage-view-input").value;await d("POST",`/api/drivers/${n}/mileage`,{type:i,mileage:f,proofId:r}),v("Success","Mileage submitted.","success"),Es.close(),Bt.notify({eventId:a})}catch(f){v("Error",f.message||"Failed to submit mileage.","error")}})}G.subscribe(ai);const Fs=document.querySelector("main");Fs&&Fs.insertAdjacentHTML("beforeend",si);ws.attachListeners();Es.attachListeners();const oi="settlement-view";O("/event/:id/settlement","settlement",{isOverlay:!0});const Ia=new H({id:oi,isView:!0,contentClasses:"modal-lg glass-panel",contentId:"settlement-detail",content:'<p aria-busy="true">Loading settlement...</p>',fallbackPath:t=>{const e=t?.split("/")[2];return e?`/event/${e}`:"/events"}}),li=Ia.getHTML();async function ri(t,e){try{const[s,a]=await Promise.all([d("GET",`/api/event/${e}`),d("GET",`/api/events/${e}/settlement`)]),n=s.event,i=a.data;if(!i){t.innerHTML='<div class="p-8 text-center"><p class="muted-text">Settlement data not available.</p></div>';return}const o=[...(i.trips||[]).map(m=>({id:`trip-${m.id}`,name:m.name,type:"Trip",share:m.share,total:m.total_reimbursement,excludedIds:m.excluded_ids||[],contributions:m.drivers.reduce((f,b)=>(f[b.user_id]=b.reimbursement,f),{})})),...(i.expenses||[]).map(m=>({id:`exp-${m.id}`,name:m.description,type:"Exp",share:m.share,total:m.amount,excludedIds:m.excluded_ids||[],contributions:{[m.payer_id]:m.amount}}))],l=(i.trips||[]).map(m=>{const f=m.drivers.map(b=>`
                <tr>
                    <td class="primary-text">${b.name}</td>
                    <td>${b.miles}</td>
                    <td class="amount">£${b.reimbursement.toFixed(2)}</td>
                    <td>${m.eligible_count}</td>
                </tr>
            `).join("");return`
                <div class="mb-6">
                    <h5 class="small-title">${ot} Trip: ${m.name}</h5>
                    <div class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table compact">
                                <thead><tr><th>Driver</th><th>Miles</th><th>Cost</th><th>Payers (Eligible)</th></tr></thead>
                                <tbody>${f}</tbody>
                                <tfoot>
                                    <tr class="sum-row">
                                        <td><strong>Total Trip Cost</strong></td>
                                        <td></td>
                                        <td class="amount"><strong>£${m.total_reimbursement.toFixed(2)}</strong></td>
                                        <td><strong>£${m.share.toFixed(2)} each</strong></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            `}).join(""),c=(i.expenses||[]).map(m=>`
            <div class="mb-6">
                <h5 class="small-title">${Ze} Expense: ${m.description}</h5>
                <div class="glass-table-container">
                    <div class="table-responsive">
                        <table class="glass-table compact">
                            <thead><tr><th>Payer</th><th>Description</th><th>Amount</th><th>Payers (Eligible)</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td class="primary-text">${m.payer_name}</td>
                                    <td>${m.description}</td>
                                    <td class="amount">£${m.amount.toFixed(2)}</td>
                                    <td>${m.eligible_count}</td>
                                </tr>
                            </tbody>
                            <tfoot>
                                <tr class="sum-row">
                                    <td colspan="2"><strong>Subtotal</strong></td>
                                    <td class="amount"><strong>£${m.amount.toFixed(2)}</strong></td>
                                    <td><strong>£${m.share.toFixed(2)} each</strong></td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            </div>
        `).join(""),r=`
            <tr>
                <th>Member</th>
                ${o.map(m=>`<th class="text-center" title="${m.type}: ${m.name}">${m.name}</th>`).join("")}
                <th class="text-right">Total Contributed</th>
                <th class="text-right">Total Share</th>
                <th class="text-right">Net Change</th>
            </tr>
        `,u=(i.breakdown||[]).map(m=>{const f=o.map(g=>{const w=g.excludedIds.includes(m.id),T=g.contributions[m.id]||0;if(w&&T===0)return'<td class="text-center muted-text">-</td>';let x="";return w||(x+=`<div style="font-size: 0.85rem;">£${g.share.toFixed(2)}</div>`),T>0&&(x+=`<div class="text-success" style="font-weight: 700; font-size: 0.8rem;">+£${T.toFixed(2)}</div>`),`<td class="text-center">${x||'<span class="muted-text">-</span>'}</td>`}).join(""),b=m.spent+m.mileage;return`
                <tr>
                    <td class="primary-text">${m.name}</td>
                    ${f}
                    <td class="amount text-right ${b>0?"text-success":"muted-text"}">
                        ${b>0?`£${b.toFixed(2)}`:"-"}
                    </td>
                    <td class="amount text-right">-£${m.shared_cost_share.toFixed(2)}</td>
                    <td class="${m.net>=0?"text-success":"text-error"} text-right amount" style="font-weight: 700;">
                        ${m.net>=0?"+":""}£${m.net.toFixed(2)}
                    </td>
                </tr>
            `}).join(""),p=()=>{const m=[];m.push([`Financial Settlement for ${n.title}`]);const f=i.released_at?new Date(i.released_at).toLocaleString():"Not Yet Finalized";m.push([`Finalized at: ${f}`]),m.push([]),m.push(["1. SHARED COST CALCULATIONS: TRIPS"]),(i.trips||[]).forEach(b=>{m.push([`Trip: ${b.name}`,`Total: £${b.total_reimbursement.toFixed(2)}`,`Share: £${b.share.toFixed(2)} each`,`${b.eligible_count} Payers`]),m.push(["Driver","Miles","Cost"]),b.drivers.forEach(g=>m.push([g.name,g.miles,g.reimbursement.toFixed(2)])),m.push([])}),m.push(["2. SHARED COST CALCULATIONS: OTHER EXPENSES"]),(i.expenses||[]).forEach(b=>{m.push([`Expense: ${b.description}`,`Total: £${b.amount.toFixed(2)}`,`Share: £${b.share.toFixed(2)} each`,`${b.eligible_count} Payers`]),m.push(["Payer","Description","Amount"]),m.push([b.payer_name,b.description,b.amount.toFixed(2)]),m.push([])}),m.push(["3. PERSONAL SETTLEMENT MATRIX"]),m.push(["Member",...o.map(b=>b.name),"Total Contributed","Total Share","Net Change"]),i.breakdown.forEach(b=>{const g=o.map(w=>{const T=w.contributions[b.id]||0,x=w.excludedIds.includes(b.id)?0:w.share;if(x===0&&T===0)return"-";let E="";return x>0&&(E+=`£${x.toFixed(2)}`),T>0&&(E+=`${E?" | ":""}Paid: +£${T.toFixed(2)}`),E});m.push([b.name,...g,(b.spent+b.mileage).toFixed(2),b.shared_cost_share.toFixed(2),b.net.toFixed(2)])}),sa(m,`settlement-${n.title.replace(/[^a-z0-9]/gi,"_")}.csv`)};t.innerHTML=`
            <div class="p-8">
                <div class="flex justify-between align-center mb-6">
                    <h2 class="nomargin">${Ue} Financial Settlement: ${n.title}</h2>
                </div>

                <div class="mb-8">
                    <h4 class="mb-4" style="font-size: 1rem;">1. Shared Cost Calculations</h4>
                    ${l}
                    ${c}
                </div>

                <div class="mb-8">
                    <h4 class="mb-4" style="font-size: 1rem;">2. Personal Settlement Matrix</h4>
                    <div class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table matrix-table">
                                <thead>${r}</thead>
                                <tbody>${u}</tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div class="mt-6 flex justify-end">
                    <button id="download-settlement-csv-btn" class="secondary outline">Download CSV</button>
                </div>
            </div>
        `;const h=t.querySelector("#download-settlement-csv-btn");h&&(h.onclick=p)}catch(s){console.error(s),t.innerHTML=`<div class="p-8 text-center"><p class="text-error">Failed to load settlement: ${s.message}</p></div>`}}G.subscribe(({viewId:t,path:e})=>{if(t==="settlement"){const s=e.split("/")[2],a=document.getElementById("settlement-detail");a&&ri(a,s)}});const Os=document.querySelector("main");Os&&Os.insertAdjacentHTML("beforeend",li);Ia.attachListeners();O("/swims","swims");const ci=`
<div id="swims-view" class="view hidden">
    <div class="small-container">
        <h1>Leaderboard</h1>
        
        <!-- Stats Mode Toggle -->
        <div class="swims-toggle-container">
            <div class="toggle-wrapper" id="swims-toggle-wrapper">
                <div class="toggle-bg"></div>
                <button id="swims-yearly-btn" class="active">This Year</button>
                <button id="swims-alltime-btn">All Time</button>
            </div>
        </div>

        <div id="admin-actions-container"></div>

        <div id="leaderboard-content">
            <p class="leaderboard-status" aria-busy="true">Loading leaderboard...</p>
        </div>
    </div>
</div>`;let He=!0;function Ns(t,e){const s=t-e;return s<=0?"bootie-green":s<=5?"bootie-yellow":"bootie-red"}async function Ma(){const t=document.getElementById("leaderboard-content"),e=document.getElementById("admin-actions-container");if(t){t.innerHTML='<p class="leaderboard-status" aria-busy="true">Loading...</p>',e&&(e.innerHTML="");try{const[s,a]=await Promise.all([d("GET",`/api/user/swims/leaderboard?yearly=${He}`),d("GET","/api/user/elements/permissions").catch(()=>({permissions:[]}))]),n=s.data;if(a.permissions?.includes("swims.manage")&&e&&(e.innerHTML=`<div class="admin-leaderboard-actions">
                <button class="small-btn primary" data-nav="/admin/users?tab=swims">${Pt} Manage Swims</button>
            </div>`),!n||n.length===0){t.innerHTML='<p class="leaderboard-status">No swims recorded yet!</p>';return}const o=n.slice(0,3),l=n.slice(3);let c='<div class="podium-container">';const r=[1,0,2],u=["gold","silver","bronze"];r.forEach(h=>{if(o[h]){const m=o[h],f=u[h],b=h+1,g=b===1?Wa:cs,w=m.is_me,T=Ns(m.swims,m.booties);c+=`
                    <div class="podium-place ${f}">
                        ${b===1?`<div class="crown-icon">${Qa}</div>`:""}
                        <div class="swimmer-avatar">
                            ${se(m,{classes:"clickable",dataAttributes:`onclick="switchView('/admin/user/${m.id}')"`})}
                        </div>
                        <div class="swimmer-name">${m.first_name} ${w?"(You)":""}</div>
                        <div class="swim-count">${m.swims} Swims</div>
                        <div class="bootie-count ${T}">${m.booties} Booties</div>
                        <div class="podium-step">
                            <div class="rank-circle">${b}</div>
                            <div class="medal-icon">${g}</div>
                        </div>
                    </div>`}}),c+="</div>";let p=`
            <div class="leaderboard-container-list">
                <div class="list-header">
                    <span>Rank</span>
                    <span>Swimmer</span>
                    <span>Count</span>
                </div>
                <div class="leaderboard-list glass-panel">`;l.forEach(h=>{const m=h.is_me,f=Ns(h.swims,h.booties);p+=`
                <div class="leaderboard-row ${m?"highlight":""}">
                    <div class="rank-box">${h.rank}</div>
                    <div class="swimmer-info">
                        ${se(h,{classes:"mini"})}
                        <span>${h.first_name} ${h.last_name}</span>
                        ${m?'<span class="you-tag">YOU</span>':""}
                    </div>
                    <div class="swims-count-group">
                        <div class="swims-count">${h.swims} <span>swims</span></div>
                        <div class="booties-count ${f}">${h.booties} <span>booties</span></div>
                    </div>
                </div>`}),p+="</div></div>",t.innerHTML=c+p}catch(s){console.error(s),t.innerHTML='<p class="leaderboard-error">Failed to load leaderboard.</p>'}}}function Gs(){const t=document.getElementById("swims-toggle-wrapper"),e=document.getElementById("swims-yearly-btn"),s=document.getElementById("swims-alltime-btn");He?(t&&t.removeAttribute("data-state"),e&&e.classList.add("active"),s&&s.classList.remove("active")):(t&&t.setAttribute("data-state","alltime"),e&&e.classList.remove("active"),s&&s.classList.add("active")),Ma()}document.addEventListener("DOMContentLoaded",()=>{G.subscribe(({resolvedPath:s})=>{s==="/swims"&&Ma()});const t=document.getElementById("swims-yearly-btn"),e=document.getElementById("swims-alltime-btn");t&&e&&(t.addEventListener("click",()=>{He||(He=!0,Gs())}),e.addEventListener("click",()=>{He&&(He=!1,Gs())}))});const Us=document.querySelector("main");Us&&Us.insertAdjacentHTML("beforeend",ci);class Pe{container;onPageChange;constructor(e,s){this.container=e,this.onPageChange=s}render(e,s){if(!this.container)return;if(s<=1){this.container.innerHTML="";return}let a=e-1;a<1&&(a=1);let n=a+2;n>s&&(n=s,a=Math.max(1,n-2));const i=document.createElement("nav");i.className="glass-pagination";const o=(l,c,r=!1,u=!1)=>{const p=document.createElement("button");return p.innerHTML=l.toString(),p.disabled=r,p.className=`page-btn ${u?"active":""}`,p.onclick=h=>{h.preventDefault(),!r&&!u&&this.onPageChange(c)},p};i.appendChild(o(Ve,e-1,e<=1));for(let l=a;l<=n;l++)i.appendChild(o(l,l,!1,l===e));i.appendChild(o(da,e+1,e>=s)),this.container.innerHTML="",this.container.appendChild(i)}}O("/quotes","quotes");const di=`
    <div id="quotes-view" class="view hidden small-container">
        <div class="quotes-header">
            <div class="quotes-title-row">
                <h1>Club Quotes</h1>
            </div>
            <div class="quotes-controls">
                <button id="manage-quotes-btn" class="hidden secondary" data-nav="/admin/quotes">Manage Quotes</button>
                <div class="search-box">
                    <span class="icon">${Be}</span>
                    <input type="text" id="quote-search" placeholder="Search quotes or person:">
                </div>
                <button id="create-quote-btn" class="button primary">${U} Create Quote</button>
            </div>
        </div>

        <div id="quotes-list" class="quotes-grid">
            <div class="loading-spinner"></div>
        </div>

        <div id="quotes-pagination" class="pagination"></div>
    </div>
`;let Ca=[],Re={page:1,limit:12,search:""};async function ui(){const t=document.getElementById("manage-quotes-btn");if(t)try{((await d("GET","/api/user/elements/permissions").catch(()=>({}))).permissions||[]).includes("quote.manage")?t.classList.remove("hidden"):t.classList.add("hidden")}catch{}}async function Xt(){const t=document.getElementById("quotes-list");if(t)try{const e={};Object.keys(Re).forEach(l=>{e[l]=String(Re[l])});const s=new URLSearchParams(e),a=await d("GET",`/api/quotes?${s.toString()}`),{quotes:n,totalPages:i}=a.data||{quotes:[],totalPages:0};if(n.length===0){t.innerHTML='<p class="no-results">No quotes found.</p>';const l=document.getElementById("quotes-pagination");l&&(l.innerHTML="");return}t.innerHTML=n.map(l=>`
            <div class="quote-card" data-mos="fade-up">
                <div class="quote-card-header">
                    ${se(l.quoted_user,{classes:"mini"})}
                    <p class="quote-author">${l.quoted_user.first_name} ${l.quoted_user.last_name}</p>
                </div>
                <p class="quote-text">"${l.text}"</p>
                ${l.submitted_by?`
                    <div class="quote-card-footer">
                        ${se(l.submitted_by,{classes:"mini"})}
                        <p class="quote-submitter">Submitted by ${l.submitted_by.first_name}</p>
                    </div>
                `:""}
            </div>
        `).join("");const o=document.getElementById("quotes-pagination");o&&new Pe(o,c=>{Re.page=c,Xt()}).render(Re.page,i)}catch(e){t.innerHTML=`<p class="error">${e.message||"Failed to load quotes."}</p>`}}async function mi(){try{Ca=await d("GET","/api/quotes/users")}catch{}}function pi(){const t=`
        <form id="create-quote-form">
            <div class="form-group">
                <label for="new-quote-text">Quote</label>
                <textarea id="new-quote-text" placeholder="What did they say?" required></textarea>
            </div>
            <div class="form-group">
                <label for="new-quote-user">Who said it?</label>
                <select id="new-quote-user" required>
                    <option value="" disabled selected>Select a person</option>
                    ${Ca.map(a=>`<option value="${a.id}">${a.first_name} ${a.last_name}</option>`).join("")}
                </select>
            </div>
            <button type="submit" class="button primary full-width">Submit Quote</button>
        </form>
    `,e=new H({id:"create-quote-modal",title:"Submit New Quote",content:t});document.body.insertAdjacentHTML("beforeend",e.getHTML()),e.attachListeners(),e.show();const s=document.getElementById("create-quote-form");s&&(s.onsubmit=async a=>{a.preventDefault();const n=document.getElementById("new-quote-text").value,i=document.getElementById("new-quote-user").value;try{await d("POST","/api/quotes",{text:n,quotedUserId:i}),v("Quote submitted for moderation.","success"),e.close()}catch(o){v(o.message||"Failed to submit quote.","error")}})}document.addEventListener("DOMContentLoaded",()=>{const t=document.querySelector("main");t&&t.insertAdjacentHTML("beforeend",di);const e=document.getElementById("quote-search"),s=document.getElementById("create-quote-btn");let a;e&&e.addEventListener("input",()=>{clearTimeout(a),a=setTimeout(()=>{Re.search=e.value,Re.page=1,Xt()},300)}),s&&(s.onclick=pi),G.subscribe(async({resolvedPath:n,viewId:i})=>{i==="quotes"&&(await ui(),await mi(),await Xt())})});O("/exec","exec");const vi=`
<div id="exec-view" class="view hidden">
    <div class="container">
        <header class="page-header">
            <div class="header-text">
                <h1>Executive Committee</h1>
                <p>The team running the club for the current academic year.</p>
            </div>
            <div id="exec-admin-actions" class="header-actions"></div>
        </header>

        <section id="current-exec-section">
            <div id="current-exec-grid" class="exec-grid">
                <p aria-busy="true">Loading committee...</p>
            </div>
        </section>

        <section id="past-exec-section" class="past-exec-section hidden">
            <h2>Past Committees</h2>
            <div id="past-exec-container" class="past-exec-container">
                <p>Loading past members...</p>
            </div>
        </section>
    </div>
</div>`;let Zs=[];async function $s(){const t=document.getElementById("current-exec-grid"),e=document.getElementById("past-exec-container"),s=document.getElementById("exec-admin-actions");if(!(!t||!e||!s))try{const[a,n]=await Promise.all([d("GET","/api/exec"),d("GET","/api/user/elements/permissions").catch(()=>({permissions:[]}))]),i=a;Zs=n.permissions||[];const o=Zs.includes("exec.manage");if(o){s.innerHTML=`
                <div class="button-group">
                    <button id="add-exec-btn" class="primary">${U} Add Member</button>
                </div>
            `;const l=document.getElementById("add-exec-btn");l&&(l.onclick=()=>jt())}if(i.current.length===0)t.innerHTML='<p class="empty-state">No current executive members listed.</p>';else{const l={};i.current.forEach(c=>{const r=c.display_order||4;l[r]||(l[r]=[]),l[r].push(c)}),t.innerHTML=Object.keys(l).map(Number).sort((c,r)=>c-r).map(c=>`
                <div class="exec-rank-row rank-${c}-row">
                    <div class="exec-grid">
                        ${l[c].map(r=>gi(r,o)).join("")}
                    </div>
                </div>
            `).join("")}if(i.past.length>0){const l=document.getElementById("past-exec-section");l&&l.classList.remove("hidden");const c={};i.past.forEach(r=>{const u=new Date(r.term_end).getFullYear();c[u]||(c[u]=[]),c[u].push(r)}),e.innerHTML=Object.keys(c).map(Number).sort((r,u)=>u-r).map(r=>`
                <div class="past-year-group">
                    <h3>Academic Year ${r-1}/${r}</h3>
                    <div class="past-exec-list">
                        ${c[r].map(u=>`
                            <div class="past-member-row">
                                <div class="past-member-avatar">
                                    ${se(u,{classes:"small"})}
                                </div>
                                <div class="past-member-info">
                                    <span class="member-role">${u.role_name}</span>
                                    <span class="member-name">${u.first_name} ${u.last_name}</span>
                                </div>
                                ${o?`
                                    <button class="past-edit-btn" onclick="window.editExecMember(${u.id})" title="Edit Record">
                                        ${he}
                                    </button>
                                `:""}
                            </div>
                        `).join("")}
                    </div>
                </div>
            `).join("")}window.editExecMember=l=>{const c=[...i.current,...i.past].find(r=>r.id==l);c&&jt(c)},t.querySelectorAll("[data-edit-exec]").forEach(l=>{l.onclick=()=>{const c=l.dataset.editExec,r=i.current.find(u=>u.id==Number(c));r&&jt(r)}}),t.querySelectorAll("[data-delete-exec]").forEach(l=>{l.onclick=async()=>{const c=l.dataset.deleteExec;await N("Remove Exec?","Are you sure you want to remove this record?")&&(await d("DELETE",`/api/exec/${c}`),v("Success","Member removed.","success"),$s())}})}catch(a){t&&(t.innerHTML=`<p class="error-text">Failed to load committee: ${a.message}</p>`)}}function gi(t,e){const s=t.display_order||4;let a="large";return s===1?a="xlarge":s>=4&&(a="medium"),`
        <article class="exec-card rank-${s}">
            <div class="exec-image">
                ${s<=2?'<div class="waves"><div class="wave"></div><div class="wave"></div><div class="wave"></div></div>':""}
                ${se(t,{classes:a})}
            </div>
            <div class="exec-info">
                <h3>${t.role_name}</h3>
                <p class="exec-name">${t.first_name} ${t.last_name}</p>
                <p class="exec-email">${t.email}</p>
            </div>
            ${e?`
                <div class="exec-actions">
                    <button class="small-btn icon-only secondary" data-edit-exec="${t.id}">${he}</button>
                    <button class="small-btn icon-only delete" data-delete-exec="${t.id}">${te}</button>
                </div>
            `:""}
        </article>
    `}function jt(t=null){const e=!!t,s="exec-modal",a=document.getElementById(s);a&&a.remove();const n=`
        <form id="exec-form" class="modern-form">
            <div class="form-section">
                <h3>Member Link</h3>
                <div class="search-field mb-4" style="position: relative;">
                    <label>Search Existing Member</label>
                    <div class="glass-input-group">
                        <span class="icon">${Be}</span>
                        <input type="text" id="exec-user-search" placeholder="Type name or email to link...">
                    </div>
                    <div id="exec-user-results" class="glass-panel hidden mt-2" style="max-height: 200px; overflow-y: auto; position: absolute; width: 100%; z-index: 100;"></div>
                </div>
                <div class="grid">
                    <input type="hidden" id="exec-user-id" value="${t?.user_id||""}">
                    <label>Role Title 
                        <input type="text" id="exec-role-name" value="${t?.role_name||""}" placeholder="e.g. Welfare Officer" required>
                    </label>
                    <label>Display Order 
                        <input type="number" id="exec-display-order" value="${t?.display_order||0}">
                    </label>
                </div>
            </div>

            <div class="form-section">
                <h3>Status & Term</h3>
                <div class="checkbox-group mb-2">
                    <label>
                        <input type="checkbox" id="exec-is-current" ${!e||t?.is_current?"checked":""}>
                        Current Committee Member
                    </label>
                </div>
                <div class="grid">
                    <label>Term Start <input type="date" id="exec-term-start" value="${t?.term_start?.split("T")[0]||""}"></label>
                    <label>Term End <input type="date" id="exec-term-end" value="${t?.term_end?.split("T")[0]||""}"></label>
                </div>
            </div>

            <div class="form-section">
                <h3>Overrides (Historical Data)</h3>
                <p class="small-text">Use these for past members or if you want to use different names/photos than their profile.</p>
                <div class="grid">
                    <label>First Name Override <input type="text" id="exec-first-name-override" value="${t?.first_name_override||""}"></label>
                    <label>Last Name Override <input type="text" id="exec-last-name-override" value="${t?.last_name_override||""}"></label>
                </div>
                <label>Email Override <input type="email" id="exec-email-override" value="${t?.email_override||""}"></label>
                
                <div class="mt-4">
                    <label>Profile Picture Override</label>
                    <div id="exec-pp-upload-container"></div>
                    <input type="hidden" id="exec-pp-override" value="${t?.profile_picture_override_id||""}">
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="primary full-width">${e?"Update Member":"Add to Committee"}</button>
            </div>
        </form>
    `,i=new H({id:s,title:e?"Edit Exec Member":"Add Exec Member",content:n,extraClasses:"large-modal"});document.body.insertAdjacentHTML("beforeend",i.getHTML()),i.attachListeners(),i.show();const o=document.getElementById("exec-pp-override");new me("exec-pp-upload-container",{mode:"inline",defaultPreview:t?.profile_picture_path&&t?.profile_picture_override_id?t.profile_picture_path:null,onUploadComplete:g=>{o&&(o.value=String(Array.isArray(g)?g[0]:g))},onRemove:()=>(o&&(o.value=""),!0),onImageSelect:g=>{o&&(o.value=g.id?String(g.id):"")}});const l=document.getElementById("exec-user-search"),c=document.getElementById("exec-user-results"),r=document.getElementById("exec-user-id"),u=document.getElementById("exec-first-name-override"),p=document.getElementById("exec-last-name-override"),h=document.getElementById("exec-email-override");let m;l&&(l.oninput=()=>{clearTimeout(m),m=setTimeout(async()=>{const g=l.value.trim();if(g.length<2){c&&c.classList.add("hidden");return}try{const T=(await d("GET",`/api/admin/users?search=${encodeURIComponent(g)}&limit=5`)).data?.users||[];c&&(T.length===0?c.innerHTML='<p class="small-text p-3">No members found.</p>':(c.innerHTML=T.map(x=>`
                                <div class="search-result-item" data-user='${JSON.stringify(x).replace(/'/g,"&apos;")}' style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(128,128,128,0.1); display: flex; align-items: center; gap: 0.75rem;">
                                    ${se(x,{classes:"mini"})}
                                    <div>
                                        <strong>${x.first_name} ${x.last_name}</strong><br>
                                        <small class="muted-text">${x.email}</small>
                                    </div>
                                </div>
                            `).join(""),c.querySelectorAll(".search-result-item").forEach(x=>{x.onclick=()=>{const E=JSON.parse(x.dataset.user);r&&(r.value=E.id),u&&!u.value&&(u.value=E.first_name),p&&!p.value&&(p.value=E.last_name),h&&!h.value&&(h.value=E.email),c.classList.add("hidden"),l.value=`${E.first_name} ${E.last_name}`}})),c.classList.remove("hidden"))}catch(w){console.error("User search failed:",w)}},300)});const f=g=>{const w=g.target;l&&c&&!l.contains(w)&&!c.contains(w)&&c.classList.add("hidden")};document.addEventListener("click",f);const b=document.getElementById("exec-form");b&&(b.onsubmit=async g=>{g.preventDefault();const w={userId:r?.value||null,roleName:document.getElementById("exec-role-name").value,displayOrder:parseInt(document.getElementById("exec-display-order").value),isCurrent:document.getElementById("exec-is-current").checked?1:0,termStart:document.getElementById("exec-term-start").value||null,termEnd:document.getElementById("exec-term-end").value||null,firstNameOverride:u?.value||null,lastNameOverride:p?.value||null,emailOverride:h?.value||null,profilePictureOverrideId:o?.value||null};try{e&&t?(await d("PUT",`/api/exec/${t.id}`,w),v("Success","Member updated.","success")):(await d("POST","/api/exec",w),v("Success","Member added.","success")),i.close(),$s()}catch(T){v("Error",T.message,"error")}finally{document.removeEventListener("click",f)}})}document.addEventListener("DOMContentLoaded",()=>{G.subscribe(({resolvedPath:t})=>{t==="/exec"&&$s()})});const js=document.querySelector("main");js&&js.insertAdjacentHTML("beforeend",vi);class mt{id;tabs;activeKey;classes;constructor({id:e,tabs:s,activeKey:a,classes:n=""}){this.id=e,this.tabs=s,this.activeKey=a,this.classes=n}getHTML(){const e=this.tabs.map(s=>{const a=Object.entries(s.data||{}).map(([i,o])=>`data-${i}="${o}"`).join(" ");return`
                <button ${s.link?`data-nav="${s.link}"`:""} ${a} class="tab-btn ${this.activeKey===s.key?"active":""}" data-key="${s.key}">
                    ${s.label}
                </button>
            `}).join("");return`
            <nav class="toggle-group ${this.classes}" id="${this.id}">
                <div class="toggle-bg"></div>
                ${e}
            </nav>
        `}init(){const e=document.getElementById(this.id);if(!e)return;if(e.dataset.initialised==="true"){e._syncToggleGroup&&e._syncToggleGroup();return}const s=e.querySelector(".toggle-bg");if(!s)return;const a=(i=!1)=>{const o=e.querySelector(".tab-btn.active")||e.querySelector("button.active");if(o){i&&(s.style.transition="none");const l={width:`${o.offsetWidth}px`,height:`${o.offsetHeight}px`,left:`${o.offsetLeft}px`,top:`${o.offsetTop}px`};s.style.setProperty("--tab-width",l.width),s.style.setProperty("--tab-height",l.height),s.style.setProperty("--tab-left",l.left),s.style.setProperty("--tab-top",l.top),e.id&&(window.__lastTogglePositions=window.__lastTogglePositions||{},window.__lastTogglePositions[e.id]=l),i&&(s.offsetHeight,s.style.transition="")}};e._syncToggleGroup=a,e.dataset.initialised="true";const n=e.id?window.__lastTogglePositions&&window.__lastTogglePositions[e.id]:null;n?(s.style.transition="none",s.style.setProperty("--tab-width",n.width),s.style.setProperty("--tab-height",n.height),s.style.setProperty("--tab-left",n.left),s.style.setProperty("--tab-top",n.top),s.offsetHeight,s.style.transition="",requestAnimationFrame(()=>a(!1))):a(!0),window.addEventListener("resize",()=>a()),s.addEventListener("transitionend",()=>a())}static initElement(e){if(!e)return;const s=e.id||`nav-${Math.random().toString(36).substr(2,9)}`;e.id||(e.id=s),new mt({id:s,tabs:[],activeKey:""}).init()}}async function hi(){const t=document.getElementById(ie);if(!t)return;const e=new URLSearchParams(window.location.search),s=e.get("search")||"",a=e.get("sort")||"last_name",n=e.get("order")||"asc",i=parseInt(e.get("page")||"1")||1;t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("users")}
                 <div class="toolbar-content">
                    <div class="search-bar">
                        <input type="text" id="user-search-input" placeholder="Search users..." value="${s}">
                        <button id="user-search-btn" class="search-icon-btn">
                            ${Be}
                        </button>
                    </div>
                 </div>
            </div>
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table users-table">
                        <thead id="users-table-head"></thead>
                        <tbody id="users-table-body">
                            <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="users-pagination"></div>
        </div>
    `;const o=document.getElementById("user-search-input"),l=document.getElementById("user-search-btn");l&&o&&(l.onclick=()=>es({search:o.value,page:1}),o.onkeypress=c=>{c.key==="Enter"&&l.click()}),await It({page:i,search:s,sort:a,order:n})}function es(t){const e=new URLSearchParams(window.location.search);for(const[s,a]of Object.entries(t))a?e.set(s,String(a)):e.delete(s);window.history.pushState({},"",`${window.location.pathname}?${e.toString()}`),It({page:parseInt(e.get("page")||"1")||1,search:e.get("search")||"",sort:e.get("sort")||"last_name",order:e.get("order")||"asc"})}async function It({page:t,search:e,sort:s,order:a}){const n=document.getElementById("users-table-head"),i=document.getElementById("users-table-body");if(!n||!i)return;const l=new URLSearchParams(window.location.search).get("tab")||"default";try{const[c,r]=await Promise.all([d("GET",`/api/admin/users?${new URLSearchParams({page:String(t),limit:"15",search:String(e),sort:String(s),order:String(a)}).toString()}`),d("GET","/api/globals/MinMoney").catch(()=>({res:{MinMoney:{data:-25}}}))]),u=c.users||[],p=c.totalPages||1,h=Number(r.res?.MinMoney?.data||-25),m=u.length>0&&u[0].balance!==void 0;let f=[{key:"name",label:"Name",sort:"last_name"}];if(l==="swims"?(f.push({key:"swims",label:"Swims",sort:"swims"}),f.push({key:"actions",label:"Quick Add"})):(f.push({key:"college",label:"College",sort:"college_id"}),f.push({key:"difficulty",label:"Difficulty",sort:"difficulty_level"}),m&&f.push({key:"balance",label:"Balance",sort:"balance"})),n.innerHTML=`<tr>${f.map(g=>`
            <th class="${g.sort?"sortable":""}" data-sort="${g.sort||""}">
                ${g.label} ${g.sort?s===g.sort?a==="asc"?ct:dt:ut:""}
            </th>
        `).join("")}</tr>`,n.querySelectorAll("th.sortable").forEach(g=>{g.onclick=()=>{const w=new URLSearchParams(window.location.search).get("sort")||"last_name",T=new URLSearchParams(window.location.search).get("order")||"asc",x=g.dataset.sort;es({sort:x,order:w===x&&T==="asc"?"desc":"asc"})}}),u.length===0)i.innerHTML=`<tr><td colspan="${f.length}" class="empty-cell">No users found.</td></tr>`;else if(i.innerHTML=u.map(g=>{const w=Number(g.balance||0);let T="text-success";w<h?T="text-danger":w<0&&(T="text-warning");const x=g.last_name?g.last_name.charAt(0)+".":"";return l==="swims"?`
                        <tr class="user-row clickable-row" data-id="${g.id}">
                            <td data-label="Name" class="primary-text name-column">
                                <div class="user-info-cell">
                                    ${se(g,{classes:"mini"})}
                                    <div class="user-names">
                                        <span class="full-name">${g.first_name} ${g.last_name}</span>
                                        <span class="thin-name">${g.first_name} ${x}</span>
                                    </div>
                                </div>
                            </td>
                            <td data-label="Swims">${g.swims||0}</td>
                            <td data-label="Quick Add" class="quick-actions-cell" onclick="event.stopPropagation()">
                                <button class="small-btn primary mini-btn" data-add-swim="${g.id}">+1 Swim</button>
                                <button class="small-btn secondary mini-btn" data-add-bootie="${g.id}">+1 Bootie</button>
                            </td>
                        </tr>
                    `:`
                    <tr class="user-row clickable-row" data-id="${g.id}">
                        <td data-label="Name" class="primary-text name-column">
                            <div class="user-info-cell">
                                ${se(g,{classes:"mini"})}
                                <div class="user-names">
                                    <span class="full-name">${g.first_name} ${g.last_name}</span>
                                    <span class="thin-name">${g.first_name} ${x}</span>
                                </div>
                            </div>
                        </td>
                        <td data-label="College">${g.college_name||"N/A"}</td>
                        <td data-label="Difficulty">
                            <span class="badge difficulty-${g.difficulty_level||1}">${g.difficulty_level||1}</span>
                        </td>
                        ${m?`<td data-label="Balance" class="${T}">£${w.toFixed(2)}</td>`:""}
                    </tr>
                `}).join(""),i.querySelectorAll(".user-row").forEach(g=>{const w=g,T=l==="swims"?`/admin/user/${w.dataset.id}?tab=swims`:`/admin/user/${w.dataset.id}`;w.onclick=()=>$(T)}),l==="swims"){const{notify:g}=await aa(async()=>{const{notify:w}=await Promise.resolve().then(()=>Aa);return{notify:w}},void 0);i.querySelectorAll("[data-add-swim]").forEach(w=>{w.onclick=async()=>{const T=w.dataset.addSwim;try{await d("POST",`/api/user/${T}/swims`,{count:1}),g("Success","Swim added.","success",1e3),It({page:t,search:e,sort:s,order:a})}catch(x){g("Error",x.message,"error")}}}),i.querySelectorAll("[data-add-bootie]").forEach(w=>{w.onclick=async()=>{const T=w.dataset.addBootie;try{await d("POST",`/api/user/${T}/booties`,{count:1}),g("Success","Bootie added.","success",1e3),It({page:t,search:e,sort:s,order:a})}catch(x){g("Error",x.message,"error")}}})}const b=document.getElementById("users-pagination");b&&new Pe(b,g=>{es({page:g})}).render(t,p)}catch{i&&(i.innerHTML='<tr><td colspan="5" class="error-cell">Error loading users.</td></tr>')}}async function Ae(t,e,s,a,n){const i=s.includes("swims.manage"),o=Number(e.balance||0),[l,c]=await Promise.all([d("GET","/api/colleges").catch(()=>[]),d("GET","/api/globals/MinMoney").catch(()=>({res:{MinMoney:{data:-25}}}))]),r=l||[],u=Number(c.res?.MinMoney?.data||-25),p=r.find(f=>f.id===e.college_id)?.name||"N/A",h=e.email?e.email.split("@")[0]:"";let m="warning";if(o<u?m="negative":o>=0&&(m="positive"),t.innerHTML=`
        <div class="dashboard-section active">
            
            <!-- Balance & Member Status -->
            <div class="dual-grid">
                ${qt({title:"Account Balance",value:`£${o.toFixed(2)}`,valueId:"balance-amount",valueClass:m,classes:"clickable",id:"admin-profile-balance-card"})}
                
                ${qt({title:"Member Status",value:e.is_member?"Active Member":e.free_sessions||0,valueClass:e.is_member?"positive":"",actions:e.is_member?"":'<span class="label label-sub">free sessions remaining</span>'})}
            </div>

            <!-- Swimming Stats & Manual Log -->
            ${A({title:"Swimming Stats",icon:Pt,action:i?`
                    <div class="panel-actions-group">
                        <button id="admin-add-swim-btn" class="small-btn icon-text-btn">${U} Log Swim</button>
                        <button id="admin-add-bootie-btn" class="small-btn secondary icon-text-btn">${U} Log Bootie</button>
                    </div>
                `:"",content:`
                    <div class="stats-grid" id="admin-swimming-stats-grid">
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-swims-yearly">${e.swimmer_stats?.yearly?.swims||0}</span>
                            <span class="stat-label">Yearly Swims</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-booties-yearly">${e.swimmer_stats?.yearly?.booties||0}</span>
                            <span class="stat-label">Yearly Booties</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-swims-total">${e.swimmer_stats?.allTime?.swims||0}</span>
                            <span class="stat-label">Total Swims</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-value" id="admin-user-booties-total">${e.swimmer_stats?.allTime?.booties||0}</span>
                            <span class="stat-label">Total Booties</span>
                        </div>
                    </div>
                `})}

            <div class="dual-grid">
                <!-- Account Metadata Editor -->
                ${A({id:"admin-account-details-panel",title:"Account Details",icon:ia,action:s.includes("user.manage.advanced")?`<button id="edit-account-btn" class="small-btn secondary">${he} Edit</button>`:"",content:`
                        <div id="account-info-display" class="info-rows">
                            <div class="info-row-modern">
                                <span class="label">Email</span>
                                <span class="value">${e.email}</span>
                            </div>
                            <div class="info-row-modern">
                                <span class="label">Phone</span>
                                <span class="value">${e.phone_number||"N/A"}</span>
                            </div>
                            <div class="info-row-modern">
                                <span class="label">College</span>
                                <span class="value">${p}</span>
                            </div>
                        </div>
                        <form id="account-info-form" class="hidden modern-form">
                            <label>Email 
                                <div class="durham-email-wrapper">
                                    <input type="text" id="input-email" value="${h}">
                                    <span class="email-suffix">@durham.ac.uk</span>
                                </div>
                            </label>
                            <label>Phone <input type="tel" id="input-phone" value="${e.phone_number||""}"></label>
                            <label>College 
                                <select id="input-college">
                                    <option value="">Select College</option>
                                    ${r.map(f=>`<option value="${f.id}" ${f.id===e.college_id?"selected":""}>${f.name}</option>`).join("")}
                                </select>
                            </label>
                            ${a?`
                                <div class="grid-2-col">
                                    <label>Free Sessions <input type="number" id="input-free-sessions" value="${e.free_sessions}"></label>
                                    <label>Swims (Total) <input type="number" id="input-total-swims" value="${e.swims}"></label>
                                </div>
                                <div class="checkbox-group">
                                    <label><input type="checkbox" id="input-is-member" ${e.is_member?"checked":""}> Is Member</label>
                                    <label><input type="checkbox" id="input-is-instructor" ${e.is_instructor?"checked":""}> Is Instructor</label>
                                </div>
                            `:""}
                            <div class="form-actions">
                                <button type="button" id="cancel-account-btn" class="secondary outline small-btn">Cancel</button>
                                <button type="submit" class="small-btn">Save</button>
                            </div>
                        </form>
                    `})}

                <!-- Instructor Status & Skill Level -->
                ${A({title:"Capabilities",icon:Rt,content:`
                        <div class="role-toggle">
                            <div class="role-info">
                                <h4>Instructor Status</h4>
                                <p class="font-size-0-85 muted-colour">Authorised to lead club sessions</p>
                            </div>
                            ${a?`
                                <label class="switch">
                                    <input type="checkbox" id="admin-user-instructor" ${e.is_instructor?"checked":""}>
                                    <span class="slider round"></span>
                                </label>
                            `:`<span class="badge ${e.is_instructor?"primary":"neutral"}">${e.is_instructor?"Yes":"No"}</span>`}
                        </div>
                        <div class="difficulty-control">
                            <label class="font-weight-600 font-size-0-9">Difficulty Level (1-5)</label>
                            <input type="range" id="admin-user-difficulty" value="${e.difficulty_level||1}" min="1" max="5" step="1">
                            <div class="range-labels font-size-0-75 muted-colour">
                                <span>Beginner</span>
                                <span>Advanced</span>
                            </div>
                        </div>
                    `})}
            </div>

            <div class="dual-grid">
                <!-- RBAC: System Role Assignment -->
                ${A({title:"System Roles",icon:it,content:`
                        <div class="card-body">
                            <p class="small-text">Define base permissions and access levels. Users can have multiple roles.</p>
                            <div class="inline-add-form mb-3">
                                <select id="admin-user-role-select">
                                    <option value="">Add Role...</option>
                                </select>
                                <button id="add-role-btn" class="icon-btn small-btn">${U}</button>
                            </div>
                            <div id="active-roles-list" class="tags-cloud">
                                ${(e.roles||[]).map(f=>`
                                    <span class="tag-chip primary">
                                        ${f.name} 
                                        <button class="remove-role-btn delete-icon-btn" data-id="${f.id}">${te}</button>
                                    </span>
                                `).join("")}
                            </div>
                        </div>
                    `})}

                <!-- Direct Permission Overrides -->
                ${A({title:"Direct Permissions",icon:Dt,content:`
                        <div class="card-body">
                            <p class="small-text">Explicitly granted permissions (overrides role).</p>
                            <div class="inline-add-form">
                                <select id="add-perm-select">
                                    <option value="">Select Permission...</option>
                                </select>
                                <button id="add-perm-btn" class="icon-btn small-btn">${U}</button>
                            </div>
                            <div id="direct-perms-list" class="tags-cloud">
                                ${(e.direct_permissions||[]).map(f=>`
                                    <span class="tag-chip neutral">
                                        ${f.slug} 
                                        <button class="remove-perm-btn delete-icon-btn" data-id="${f.id}">${te}</button>
                                    </span>
                                `).join("")}
                            </div>
                        </div>
                    `})}
            </div>
        </div>
    `,a){const f=document.getElementById("admin-user-role-select"),b=document.getElementById("add-role-btn");if(f&&b){const L=await d("GET","/api/admin/roles").catch(()=>[]);f.innerHTML='<option value="">Add Role...</option>'+L.map(S=>`<option value="${S.id}">${S.name}</option>`).join(""),b.onclick=async()=>{const S=f.value;if(!S)return;const k=L.find(q=>q.id==S)?.name==="President";let _=null;if(!(k&&(_=await ba("Transfer President Role","Transferring the President role is a <strong>critical action</strong>. This will:<br><br>1. <strong>Remove all permissions</strong> from every other Exec member.<br>2. <strong>Wipe medical information</strong> for all users who have not consented to long-term storage.<br><br>Enter your password to confirm this transfer."),!_)))try{await d("POST",`/api/admin/user/${e.id}/role`,{roleId:S,password:_}),v("Success","Role added","success");const q=await d("GET",`/api/admin/user/${e.id}`);Ae(t,q,s,a,n)}catch(q){v("Error",q.message||"Failed to add role","error")}},t.querySelectorAll(".remove-role-btn").forEach(S=>{S.onclick=async()=>{try{await d("DELETE",`/api/admin/user/${e.id}/role/${S.dataset.id}`),v("Success","Role removed","success");const C=await d("GET",`/api/admin/user/${e.id}`);Ae(t,C,s,a,n)}catch(C){v("Error",C.message||"Failed to remove role","error")}}})}const g=document.getElementById("admin-user-instructor");g&&(g.onchange=async()=>{try{await d("POST",`/api/admin/user/${e.id}/elements`,{is_instructor:g.checked}),v("Success","Instructor status updated","success"),e.is_instructor=g.checked}catch{v("Error","Failed to update instructor status","error"),g.checked=!g.checked}});const w=document.getElementById("add-perm-select");if(w){const L=await d("GET","/api/admin/roles/permissions").catch(()=>[]);w.innerHTML+=L.map(C=>`<option value="${C.id}">${C.slug}</option>`).join("");const S=document.getElementById("add-perm-btn");S&&(S.onclick=async()=>{const C=w.value;if(C)try{await d("POST",`/api/admin/user/${e.id}/permission`,{permissionId:C}),v("Success","Permission added","success");const k=await d("GET",`/api/admin/user/${e.id}`);Ae(t,k,s,a,n)}catch{v("Error","Failed to add permission","error")}}),t.querySelectorAll(".remove-perm-btn").forEach(C=>{C.onclick=async()=>{try{await d("DELETE",`/api/admin/user/${e.id}/permission/${C.dataset.id}`),v("Success","Permission removed","success");const k=await d("GET",`/api/admin/user/${e.id}`);Ae(t,k,s,a,n)}catch{v("Error","Failed to remove","error")}}})}const T=document.getElementById("edit-account-btn");if(T){const L=document.getElementById("account-info-display"),S=document.getElementById("account-info-form"),C=document.getElementById("cancel-account-btn");if(S&&L&&C){S.querySelectorAll('input[type="number"]').forEach(q=>ee(q)),T.onclick=()=>{L.classList.add("hidden"),S.classList.remove("hidden"),T.classList.add("hidden")};const k=()=>{L.classList.remove("hidden"),S.classList.add("hidden"),T.classList.remove("hidden")},_=document.getElementById("input-email");_&&_.addEventListener("input",()=>{_.value.includes("@")&&(_.value=_.value.split("@")[0])}),C.onclick=k,S.onsubmit=async q=>{q.preventDefault();let P=document.getElementById("input-email").value;P&&!P.includes("@")&&(P+="@durham.ac.uk");const D={email:P,phone_number:document.getElementById("input-phone").value,college_id:parseInt(document.getElementById("input-college").value)||null};a&&(D.free_sessions=parseInt(document.getElementById("input-free-sessions").value),D.swims=parseInt(document.getElementById("input-total-swims").value),D.is_member=document.getElementById("input-is-member").checked,D.is_instructor=document.getElementById("input-is-instructor").checked);try{await d("POST",`/api/admin/user/${e.id}/elements`,D),v("Success","Account details updated","success"),Object.assign(e,D),ns.notify(),Ae(t,e,s,a,n)}catch(V){v("Error",V.message,"error")}}}}const x=document.getElementById("admin-profile-balance-card");if(x&&(x.onclick=()=>{const L=document.querySelector('button[data-tab="transactions"]');L&&L.click()}),i){const L=document.getElementById("admin-add-swim-btn");L&&(L.onclick=async()=>{try{await d("POST",`/api/user/${e.id}/swims`,{count:1});const C=await d("GET",`/api/user/${e.id}/elements/swimmer_rank`);C.swimmer_stats&&(e.swimmer_stats=C.swimmer_stats);const k=document.getElementById("admin-user-swims-yearly"),_=document.getElementById("admin-user-rank-yearly"),q=document.getElementById("admin-user-swims-total"),P=document.getElementById("admin-user-rank-total");k&&(k.textContent=e.swimmer_stats.yearly.swims),_&&(_.textContent=$t(e.swimmer_stats.yearly.rank)),q&&(q.textContent=e.swimmer_stats.allTime.swims),P&&(P.textContent=$t(e.swimmer_stats.allTime.rank)),v("Success","Swim logged","success")}catch{v("Error","Failed to log swim","error")}});const S=document.getElementById("admin-add-bootie-btn");S&&(S.onclick=async()=>{try{await d("POST",`/api/user/${e.id}/booties`,{count:1});const C=await d("GET",`/api/user/${e.id}/elements/swimmer_rank`);C.swimmer_stats&&(e.swimmer_stats=C.swimmer_stats);const k=document.getElementById("admin-user-booties-yearly"),_=document.getElementById("admin-user-booties-total");k&&(k.textContent=e.swimmer_stats.yearly.booties),_&&(_.textContent=e.swimmer_stats.allTime.booties),v("Success","Bootie logged","success")}catch(C){v("Error",C.message||"Failed to log bootie","error")}})}const E=document.getElementById("admin-user-difficulty");E&&(E.onchange=async()=>{try{await d("POST",`/api/admin/user/${e.id}/elements`,{difficulty_level:E.value}),v("Success","Difficulty level updated","success"),e.difficulty_level=E.value}catch{v("Error","Failed to update level","error")}})}}function fi(t,e){const s=!!e.filled_legal_info,a=e.legal_filled_at?new Date(e.legal_filled_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"}):"Never";t.innerHTML=`
        <div class="profile-layout-grid">
            <div class="column">
                <!-- Legal Status Card -->
                ${A({title:"Legal Status",icon:us,content:`
                        <div class="card-body">
                            ${_a({active:s,activeText:"Signed",inactiveText:"Missing",content:`
                                    <div class="info-item-modern">
                                        <span class="label">Last Signed:</span> 
                                        <span class="value">${a}</span>
                                    </div>
                                `})}
                        </div>
                    `})}

                ${s?`
                <!-- Personal & Emergency Card -->
                ${A({title:"Identity & Contact",icon:ia,content:`
                        <div class="card-body detail-info-group">
                            <!-- Identity Details -->
                            <div class="detail-info-box">
                                <span class="box-label">${it} Identity Details</span>
                                <div class="box-value-grid">
                                    <div class="row">
                                        <span class="label-sub">Date of Birth</span>
                                        <span>${e.date_of_birth||"N/A"}</span>
                                    </div>
                                    <div class="row">
                                        <span class="label-sub">First Aid Expiry</span>
                                        <span>${e.first_aid_expiry||"N/A"}</span>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Address -->
                            <div class="detail-info-box">
                                <span class="box-label">${Oa} Home Address</span>
                                <span class="box-value">${e.home_address||"N/A"}</span>
                            </div>
                            
                            <!-- Emergency Contact -->
                            <div class="detail-info-box warning">
                                <span class="box-label">${Fa} Emergency Contact</span>
                                <div class="box-value">
                                    <strong class="contact-name">${e.emergency_contact_name||"N/A"}</strong>
                                    <span class="contact-phone">${e.emergency_contact_phone||"N/A"}</span>
                                </div>
                            </div>
                        </div>
                    `})}
                `:""}
            </div>

            ${s?`
                <div class="column">
                    <!-- Medical Details Card -->
                    ${A({title:"Health Information",icon:ds,content:`
                            <div class="card-body detail-info-group">
                                <!-- Conditions -->
                                <div class="medical-section">
                                    <div class="info-item-modern compact">
                                        <span class="label">Medical Conditions:</span> 
                                        <span class="badge ${e.has_medical_conditions?"warning":"success"}">${e.has_medical_conditions?"Yes":"None Reported"}</span>
                                    </div>
                                    ${e.has_medical_conditions?`<div class="detail-info-box">${e.medical_conditions_details}</div>`:""}
                                </div>

                                <!-- Medication -->
                                <div class="medical-section">
                                    <div class="info-item-modern compact">
                                        <span class="label">Medication:</span>
                                        <span class="badge ${e.takes_medication?"warning":"success"}">${e.takes_medication?"Yes":"None Reported"}</span>
                                    </div>
                                    ${e.takes_medication?`<div class="detail-info-box">${e.medication_details}</div>`:""}
                                </div>

                                <!-- GDPR / Privacy Consent -->
                                <div class="info-item-modern border-top">
                                    <span class="label">Data Consent:</span>
                                    <span class="badge ${e.agrees_to_keep_health_data?"success":"neutral"}">
                                        ${e.agrees_to_keep_health_data?"Keep Health Data":"Wipe Medical on Exit"}
                                    </span>
                                </div>
                            </div>
                        `})}
                </div>
            `:""}
        </div>
    `}async function bi(t,e){t.innerHTML='<p class="loading-text">Loading tags...</p>';try{const[s,a,n]=await Promise.all([d("GET","/api/tags"),d("GET",`/api/user/${e}/tags`),d("GET",`/api/admin/user/${e}`)]),i=s.data||[],o=n.direct_managed_tags||[],l=(r,u,p)=>`
            <div class="card-body">
                <p class="helper-text">${p}</p>
                <div class="tags-selection-grid">
                    ${i.map(h=>{const m=r.some(f=>f.id===h.id);return`
                            <label class="tag-checkbox">
                                <input type="checkbox" class="${u}" value="${h.id}" ${m?"checked":""} style="display:none;">
                                <span class="tag-badge ${m?"selected":""}" 
                                      style="--tag-colour: ${h.color}; background-color: var(--tag-colour);">
                                    ${h.name}
                                </span>
                            </label>`}).join("")}
                </div>
            </div>`;t.innerHTML=`
            <div class="profile-layout-grid">
                <div class="column">
                    ${A({title:"Whitelisted Tags",icon:xt,content:l(a,"user-tag-cb","Tags this user is explicitly whitelisted for.")})}
                </div>
                <div class="column">
                    ${A({title:"Managed Tags (Scoped)",icon:Dt,content:l(o,"managed-tag-cb","Tags this user can manage events for.")})}
                </div>
            </div>`;const c=(r,u)=>{t.querySelectorAll(r).forEach(p=>{const h=p;h.onchange=async()=>{const m=h.value,f=h.checked,b=h.nextElementSibling,{method:g,url:w,body:T,successMsg:x}=u(m,f);try{await d(g,w,T),b.classList.toggle("selected",f),x&&v("Success",x,"success")}catch{h.checked=!f,v("Error","Update failed","error")}}})};c(".user-tag-cb",(r,u)=>({method:u?"POST":"DELETE",url:u?`/api/tags/${r}/whitelist`:`/api/tags/${r}/whitelist/${e}`,body:u?{userId:e}:{},successMsg:u?"User whitelisted":"Whitelist removed"})),c(".managed-tag-cb",(r,u)=>({method:u?"POST":"DELETE",url:u?`/api/admin/user/${e}/managed_tag`:`/api/admin/user/${e}/managed_tag/${r}`,body:u?{tagId:r}:{},successMsg:u?"Tag scope added":"Tag scope removed"}))}catch{t.innerHTML='<p class="error-text">Failed to load tags.</p>'}}async function Mt(t,e){t.innerHTML='<p class="loading-text">Loading transactions...</p>';try{const[s,a]=await Promise.all([d("GET",`/api/admin/user/${e}/transactions`),d("GET","/api/globals/MinMoney").catch(()=>({res:{MinMoney:{data:-25}}}))]),n=(s||[]).reverse(),i=Number(a.res?.MinMoney?.data||-25),o=n.length>0?n[0].after:0;let l="warning";o<i?l="negative":o>=0&&(l="positive"),t.innerHTML=`
            <div class="transactions-tab-wrapper">
                ${qt({title:"Account Balance",value:`£${o.toFixed(2)}`,valueId:"balance-amount",valueClass:l})}

                ${A({title:"Transaction History",icon:Ze,content:`
                        <div class="card-body">
                            <div class="transaction-item glass-panel new-entry-row">
                                <div class="tx-edit-grid">
                                    <input id="new-tx-desc" type="text" placeholder="Description (e.g. Top Up)" class="compact-input">
                                    <input id="new-tx-amount" type="number" step="0.01" placeholder="Amount" class="compact-input">
                                    <button id="add-tx-btn" class="small-btn icon-text-btn min-w-100">${U} Add</button>
                                </div>
                            </div>

                            <div id="admin-tx-list">
                                ${bs(n,r=>{const u=r.amount<0,p=u?ra:U,h=u?"negative":"positive",m=new Date(r.created_at).toLocaleDateString("en-GB",{day:"numeric",month:"short",year:"numeric"});return Nt({classes:"transaction-item",dataAttributes:`data-id="${r.id}"`,icon:p,iconClass:h,title:r.description,subtitle:m,value:`${u?"":"+"}${r.amount.toFixed(2)}`,valueClass:h,extra:`£${r.after!==void 0?r.after.toFixed(2):"N/A"}`,content:`
                                            <div class="tx-edit-grid no-btn hidden">
                                                <input class="tx-desc-input compact-input" value="${r.description}">
                                                <input type="number" step="0.01" class="tx-amount-input compact-input" value="${r.amount}">
                                            </div>
                                        `,actions:`
                                            <button class="icon-btn edit-tx-btn" data-id="${r.id}" title="Edit">${he}</button>
                                            <button class="icon-btn save-tx-btn hidden success" data-id="${r.id}" title="Save">${Ot}</button>
                                            <button class="icon-btn cancel-tx-btn hidden warning" data-id="${r.id}" title="Cancel">${te}</button>
                                            <button class="icon-btn delete-tx-btn delete" data-id="${r.id}" title="Delete">${fe}</button>
                                        `})})}
                            </div>
                        </div>
                    `})}
            </div>
        `,t.querySelectorAll('input[type="number"]').forEach(r=>ee(r));const c=document.getElementById("add-tx-btn");c&&(c.onclick=async()=>{const r=document.getElementById("new-tx-amount").value,u=document.getElementById("new-tx-desc").value;if(!r||!u)return v("Error","Please fill all fields","error");try{await d("POST",`/api/admin/user/${e}/transaction`,{amount:r,description:u}),Se.notify(),v("Success","Transaction added","success"),Mt(t,e)}catch{v("Error","Failed to add","error")}}),t.querySelectorAll(".delete-tx-btn").forEach(r=>{const u=r;u.onclick=async()=>{if(await N("Delete Transaction","Are you sure you want to delete this transaction? This action cannot be undone."))try{await d("DELETE",`/api/admin/transaction/${u.dataset.id}`),Se.notify(),v("Success","Transaction deleted","success"),Mt(t,e)}catch{v("Error","Failed to delete","error")}}}),yi(t,e)}catch(s){console.error(s),t.innerHTML='<p class="error-text">Error loading transactions.</p>'}}function yi(t,e){const s=(a,n)=>{const i=a.querySelector(".item-details"),o=a.querySelector(".item-value-group"),l=a.querySelector(".tx-edit-grid"),c=a.querySelector(".item-actions"),r=p=>p?.classList.remove("hidden"),u=p=>p?.classList.add("hidden");n?(u(i),u(o),r(l),u(c.querySelector(".edit-tx-btn")),r(c.querySelector(".save-tx-btn")),r(c.querySelector(".cancel-tx-btn")),u(c.querySelector(".delete-tx-btn"))):(r(i),r(o),u(l),r(c.querySelector(".edit-tx-btn")),u(c.querySelector(".save-tx-btn")),u(c.querySelector(".cancel-tx-btn")),r(c.querySelector(".delete-tx-btn")))};t.querySelectorAll(".edit-tx-btn").forEach(a=>{const n=a;n.onclick=()=>s(n.closest(".transaction-item"),!0)}),t.querySelectorAll(".cancel-tx-btn").forEach(a=>{const n=a;n.onclick=()=>s(n.closest(".transaction-item"),!1)}),t.querySelectorAll(".save-tx-btn").forEach(a=>{const n=a;n.onclick=async()=>{const i=n.closest(".transaction-item"),o=n.dataset.id,l=i.querySelector(".tx-amount-input").value,c=i.querySelector(".tx-desc-input").value;try{await d("PUT",`/api/admin/transaction/${o}`,{amount:l,description:c}),Se.notify(),v("Success","Transaction updated","success"),Mt(t,e)}catch{v("Error","Failed to update transaction","error")}}})}async function wi(t,e){t.innerHTML='<p aria-busy="true">Loading swim records...</p>';try{const s=await d("GET",`/api/user/${e.id}/elements/swims,booties`);t.innerHTML=`
            <div class="swims-management-grid">
                <div class="swim-control-card glass-panel">
                    <div class="card-header">
                        ${Pt}
                        <h3>Manage Swims</h3>
                    </div>
                    <div class="current-count">
                        <span class="count-label">Current Swims:</span>
                        <span class="count-value" id="admin-swim-count">${s.swims||0}</span>
                    </div>
                    <div class="control-actions">
                        <div class="input-group">
                            <input type="number" id="swim-change-amount" value="1" min="1">
                            <div class="button-group">
                                <button id="add-swims-btn" class="primary">${U} Add</button>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="swim-control-card glass-panel">
                    <div class="card-header">
                        <div class="bootie-icon">🥾</div>
                        <h3>Manage Booties</h3>
                    </div>
                    <div class="current-count">
                        <span class="count-label">Current Booties:</span>
                        <span class="count-value" id="admin-bootie-count">${s.booties||0}</span>
                    </div>
                    <div class="control-actions">
                        <div class="input-group">
                            <input type="number" id="bootie-change-amount" value="1" min="1">
                            <div class="button-group">
                                <button id="add-booties-btn" class="secondary">${U} Add</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;const a=document.getElementById("add-swims-btn");a&&(a.onclick=async()=>{const o=document.getElementById("swim-change-amount")?.value||"0";try{await d("POST",`/api/user/${e.id}/swims`,{count:o}),v("Success","Swims added.","success");const l=(s.swims||0)+parseInt(o),c=document.getElementById("admin-swim-count");c&&(c.textContent=String(l)),s.swims=l}catch(l){v("Error",l.message,"error")}});const n=document.getElementById("add-booties-btn");n&&(n.onclick=async()=>{const o=document.getElementById("bootie-change-amount")?.value||"0";try{await d("POST",`/api/user/${e.id}/booties`,{count:o}),v("Success","Booties added.","success");const l=(s.booties||0)+parseInt(o),c=document.getElementById("admin-bootie-count");c&&(c.textContent=String(l)),s.booties=l}catch(l){v("Error",l.message,"error")}})}catch{t.innerHTML='<p class="error-text">Failed to load swim records.</p>'}}async function Ei(t){const e=document.getElementById(ie);if(!e)return;e.innerHTML='<p aria-busy="true">Loading user details...</p>';const s=document.getElementById("admin-header-actions");if(s){s.innerHTML=`<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${Ve} Back to Users</button>`;const a=document.getElementById("admin-back-btn");a&&(a.onclick=()=>$("/admin/users"))}try{const a=await d("GET",`/api/admin/user/${t}`),i=(await d("GET","/api/user/elements/permissions").catch(()=>({}))).permissions||[],o=i.includes("user.manage"),l=i.includes("transaction.manage"),c=i.includes("swims.manage"),r=i.length>0,u=[{label:"Profile",key:"profile",data:{tab:"profile"}}];o&&(u.push({label:"Legal",key:"legal",data:{tab:"legal"}}),u.push({label:"Tags",key:"tags",data:{tab:"tags"}})),l&&u.push({label:"Transactions",key:"transactions",data:{tab:"transactions"}}),c&&u.push({label:"Swims",key:"swims",data:{tab:"swims"}});const p=new URLSearchParams(window.location.search).get("tab")||"profile",h=new mt({id:"admin-user-tabs",tabs:u,activeKey:p});e.innerHTML=`
            <div class="glass-layout">
                ${A({content:`
                        <header class="user-detail-header">
                            <div class="user-identity">
                                ${se(a,{classes:"medium"})}
                                <div class="user-info">
                                    <h2 class="user-name-header">${a.first_name} ${a.last_name}</h2>
                                    <span class="user-id-badge">ID: ${a.id}</span>
                                </div>
                            </div>
                            ${h.getHTML()}
                        </header>
                        <div id="admin-tab-content" class="tab-content-area"></div>
                    `})}
            </div>
        `;const m=document.getElementById("admin-user-tabs");if(m){const f=m.querySelectorAll("button");h.init(),f.forEach(b=>{b.onclick=()=>{f.forEach(w=>w.classList.remove("active")),b.classList.add("active"),h.init();const g=new URL(window.location.href);g.searchParams.set("tab",b.dataset.tab),window.history.replaceState({},"",g.toString()),Vs(b.dataset.tab,a,i,o,r)}})}Vs(p,a,i,o,r)}catch(a){console.error(a),e.innerHTML=`
            <div class="form-info">
                <article class="form-box admin-card">
                    <h3 class="error-text">Error</h3>
                    <p>Failed to load user details.</p>
                </article>
            </div>`}}async function Vs(t,e,s,a,n){const i=document.getElementById("admin-tab-content");i&&(t==="profile"?Ae(i,e,s,a,n):t==="legal"?fi(i,e):t==="transactions"?Mt(i,e.id):t==="tags"?bi(i,e.id):t==="swims"&&wi(i,e))}async function $i(){const t=document.getElementById(ie);if(!t)return;const e=new URLSearchParams(window.location.search),s=e.get("search")||"",a=e.get("sort")||"start",n=e.get("order")||"asc",i=parseInt(e.get("page")||"1")||1,o=e.get("showPast")==="true",l=e.get("minCost")||"",c=e.get("maxCost")||"",r=e.get("difficulty")||"",u=e.get("location")||"";t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("events")}
                 <div class="toolbar-content">
                    <div class="toolbar-left">
                        <div class="search-bar">
                            <input type="text" id="event-search-input" placeholder="Search events..." value="${s}">
                            <button id="event-search-btn" class="search-icon-btn" title="Search">
                                ${Be}
                            </button>
                        </div>
                    </div>
                    
                    <div class="toolbar-right">
                         <button id="toggle-filters-btn" class="small-btn outline secondary">
                            ${sn} Filters
                         </button>
                         <button data-nav="/admin/event/new" class="small-btn">Create Event</button>
                        
                        <div id="advanced-filters-panel" class="glass-filter-panel hidden">
                            <div class="filter-grid">
                                    <label>
                                    Events Display
                                    <select id="filter-show-past">
                                        <option value="false" ${o?"":"selected"}>Upcoming Only</option>
                                        <option value="true" ${o?"selected":""}>All Events</option>
                                    </select>
                                </label>
                                <label>
                                    Difficulty
                                    <input type="number" id="filter-difficulty" value="${r}" placeholder="Exact">
                                </label>
                                <label>
                                    Min Cost
                                    <input type="number" id="filter-min-cost" value="${l}" step="0.01">
                                </label>
                                    <label>
                                    Max Cost
                                    <input type="number" id="filter-max-cost" value="${c}" step="0.01">
                                </label>
                                <label>
                                    Location
                                    <input type="text" id="filter-location" value="${u}" placeholder="Contains...">
                                </label>
                            </div>
                            <div class="filter-actions">
                                <button id="apply-filters-btn" class="small-btn">Apply Filters</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table">
                        <thead id="events-table-head"></thead>
                        <tbody id="events-table-body">
                            <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="events-pagination"></div>
        </div>
    `;const p=document.getElementById("event-search-input"),h=document.getElementById("event-search-btn"),m=document.getElementById("toggle-filters-btn"),f=document.getElementById("advanced-filters-panel"),b=document.getElementById("apply-filters-btn"),g=document.getElementById("filter-difficulty"),w=document.getElementById("filter-min-cost"),T=document.getElementById("filter-max-cost");g&&ee(g),w&&ee(w),T&&ee(T),h&&p&&(h.onclick=()=>Ct({search:p.value,page:1}),p.onkeypress=x=>{x.key==="Enter"&&h.click()}),m&&f&&(m.onclick=()=>{f.classList.toggle("hidden")}),b&&(b.onclick=()=>{Ct({showPast:document.getElementById("filter-show-past").value,minCost:document.getElementById("filter-min-cost").value,maxCost:document.getElementById("filter-max-cost").value,difficulty:document.getElementById("filter-difficulty").value,location:document.getElementById("filter-location").value,page:1})}),await ka({page:i,search:s,sort:a,order:n,showPast:o,minCost:l,maxCost:c,difficulty:r,location:u})}function Ct(t){const e=new URLSearchParams(window.location.search);for(const[s,a]of Object.entries(t))a==null||a===""||a===!1?e.delete(s):e.set(s,String(a));window.history.pushState({},"",`${window.location.pathname}?${e.toString()}`),ka({page:parseInt(e.get("page")||"1")||1,search:e.get("search")||"",sort:e.get("sort")||"start",order:e.get("order")||"asc",showPast:e.get("showPast")==="true",minCost:e.get("minCost")||"",maxCost:e.get("maxCost")||"",difficulty:e.get("difficulty")||"",location:e.get("location")||""})}async function ka({page:t,search:e,sort:s,order:a,showPast:n,minCost:i,maxCost:o,difficulty:l,location:c}){const r=document.getElementById("events-table-head"),u=document.getElementById("events-table-body");try{const p=new URLSearchParams({page:String(t),limit:"10",search:String(e),sort:String(s),order:String(a),showPast:String(n),minCost:String(i),maxCost:String(o),difficulty:String(l),location:String(c)}).toString(),h=await d("GET",`/api/admin/events?${p}`),m=h.events||[],f=h.totalPages||1,b=[{key:"title",label:"Title",sort:"title"},{key:"start",label:"Date",sort:"start"},{key:"location",label:"Location",sort:"location"},{key:"difficulty_level",label:"Difficulty",sort:"difficulty_level"},{key:"upfront_cost",label:"Cost",sort:"upfront_cost"}];r&&(r.innerHTML=`<tr>${b.map(w=>`
                <th class="sortable" data-sort="${w.sort}">
                    ${w.label} ${s===w.sort?a==="asc"?ct:dt:ut}
                </th>
            `).join("")}</tr>`,r.querySelectorAll("th.sortable").forEach(w=>{const T=w;T.onclick=()=>{const x=new URLSearchParams(window.location.search).get("sort")||"start",E=new URLSearchParams(window.location.search).get("order")||"asc",L=T.dataset.sort;Ct({sort:L,order:x===L&&E==="asc"?"desc":"asc"})}})),u&&(m.length===0?u.innerHTML='<tr><td colspan="5" class="empty-cell">No events found.</td></tr>':(u.innerHTML=m.map(w=>`
                    <tr class="event-row clickable-row" data-id="${w.id}">
                        <td data-label="Title" class="primary-text">${w.title}</td>
                        <td data-label="Date">${new Date(w.start).toLocaleString()}</td>
                        <td data-label="Location">${w.location}</td>
                        <td data-label="Difficulty"><span class="badge difficulty-${w.difficulty_level}">${w.difficulty_level}</span></td>
                        <td data-label="Cost">£${w.upfront_cost.toFixed(2)}</td>
                    </tr>
                `).join(""),u.querySelectorAll(".event-row").forEach(w=>{const T=w;T.onclick=x=>{const E=x.target;E.tagName==="BUTTON"||E.closest("button")||$(`/admin/event/${T.dataset.id}`)}})));const g=document.getElementById("events-pagination");g&&new Pe(g,T=>{Ct({page:T})}).render(t,f)}catch{u&&(u.innerHTML='<tr><td colspan="5" class="error-cell">Error loading events.</td></tr>')}}async function Ws(t,e,s,a,n){t.innerHTML=`
        <form id="event-form">
            <div class="modern-form-group">
                <label class="form-label-top">Event Title
                    <input type="text" name="title" value="${e.title}" required class="full-width-input title-input" placeholder="e.g. Weekly Training">
                </label>
            </div>

            <div class="event-content-split">
                <div class="event-details-section">
                    <h3 class="section-header-modern">
                        ${de} Basic Details
                    </h3>
                    
                    <div class="grid-2-col">
                        <label>Start Time <input type="datetime-local" name="start" value="${e.start}" required></label>
                        <label>End Time <input type="datetime-local" name="end" value="${e.end}" required></label>
                    </div>
                    
                    <label>Location <input type="text" name="location" value="${e.location||""}" placeholder="Where is it happening?"></label>
                    
                    <label>Description <textarea name="description" rows="5" placeholder="What's the plan?">${e.description||""}</textarea></label>
                    
                    <div class="grid-2-col">
                        <label>Difficulty (1-5) <input type="number" name="difficulty_level" min="1" max="5" value="${e.difficulty_level}" required></label>
                        <label>Cost (£) <input type="number" step="0.01" name="upfront_cost" value="${e.upfront_cost||0}"></label>
                    </div>

                    <div class="form-divider"></div>

                    <div class="settings-group">
                        <div class="signup-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" id="signup_required_toggle" name="signup_required" ${e.signup_required?"checked":""}> 
                                Signup Required
                            </label>
                            <div id="max-attendees-wrapper" class="conditional-input ${e.signup_required?"":"hidden"}">
                                <label>Max Attendees
                                    <input type="number" name="max_attendees" value="${e.max_attendees||0}" placeholder="0 = Unlimited">
                                </label>
                            </div>
                        </div>

                        <div class="refund-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" id="allow-refunds" ${e.upfront_refund_cutoff?"checked":""}> 
                                Allow Refunds
                            </label>
                            <div id="refund-cutoff-wrapper" class="conditional-input ${e.upfront_refund_cutoff?"":"hidden"}">
                                <label>Refund Cutoff Date
                                    <input type="datetime-local" name="upfront_refund_cutoff" value="${e.upfront_refund_cutoff||""}">
                                </label>
                            </div>
                        </div>

                        <div class="trip-policy">
                            <label class="checkbox-label">
                                <input type="checkbox" name="is_offsite" ${e.is_offsite?"checked":""}> 
                                External Trip (Requires Transport)
                            </label>
                        </div>
                    </div>

                    <h3>Tags</h3>
                    <div class="tags-selection-grid">
                        ${s.map(m=>`
                            <label class="tag-checkbox">
                                <input type="checkbox" name="tags" value="${m.id}" ${e.tags?.find(f=>f.id===m.id)?"checked":""} style="display:none;">
                                <span class="tag-badge ${e.tags?.find(f=>f.id===m.id)?"selected":""}" style="--tag-colour: ${m.color}; background-color: var(--tag-colour);">${m.name}</span>
                            </label>
                        `).join("")}
                    </div>
                </div>

                <div class="event-image-section">
                    <h3 class="section-header-modern">
                        ${je} Event Image
                    </h3>
                    <div id="upload-widget-container"></div>
                    <input type="hidden" name="image_id" id="image_id_input" value="${e.image_id||""}">
                </div>
            </div>
            
            <div class="form-actions mt-6">
                <button type="submit" class="wide-btn primary">${a?"Create Event":"Save Changes"}</button>
            </div>
        </form>
    `;const i=t.querySelector("#image_id_input"),o=t.querySelector("#event-form");o.querySelectorAll('input[type="number"]').forEach(m=>ee(m));const l=async()=>{if(i.value){c.setPreview(`/api/files/${i.value}/download?view=true`);return}const m=Array.from(o.querySelectorAll('input[name="tags"]:checked')).map(f=>parseInt(f.value));try{const f=await d("POST","/api/admin/events/calculate-fallback-image",{tagIds:m});c.setPreview(f.url||n)}catch{c.setPreview(n)}},c=new me(t.querySelector("#upload-widget-container"),{mode:"inline",selectMode:"single",autoUpload:!0,defaultPreview:e.image_url||n,onImageSelect:async({id:m})=>{i.value=String(m),await l()},onRemove:async()=>{if(a)return i.value="",await l(),!0;if(!await N("Remove Image","Remove manual image and reset to default?"))return!1;try{return await d("POST",`/api/admin/event/${e.id}/reset-image`),v("Success","Image reset to default","success"),i.value="",await l(),!1}catch(m){return v("Error",m.message,"error"),!1}}});o.querySelectorAll('input[name="tags"]').forEach(m=>{m.addEventListener("change",()=>{const f=m,b=f.nextElementSibling;f.checked?b.classList.add("selected"):b.classList.remove("selected"),l()})});const r=o.querySelector("#allow-refunds"),u=o.querySelector("#refund-cutoff-wrapper");r.onchange=()=>{u.classList.toggle("hidden",!r.checked),r.checked||(u.querySelector("input").value="")};const p=o.querySelector("#signup_required_toggle"),h=o.querySelector("#max-attendees-wrapper");p.onchange=()=>{h.classList.toggle("hidden",!p.checked)},o.onsubmit=async m=>{m.preventDefault();const f=new FormData(o),b=Object.fromEntries(f.entries());b.tags=Array.from(o.querySelectorAll('input[name="tags"]:checked')).map(g=>parseInt(g.value)),b.signup_required=p.checked,b.is_offsite=o.querySelector('input[name="is_offsite"]').checked,b.image_id=i.value?parseInt(i.value):null,r.checked||(b.upfront_refund_cutoff=null);try{if(a){const g=await d("POST","/api/admin/event",b);v("Success","Event created","success"),$(`/admin/event/${g.data.id}`)}else await d("PUT",`/api/admin/event/${e.id}`,b),v("Success","Event updated","success")}catch(g){v("Error",g.message,"error")}}}async function Ti(t,e,s,a){t.innerHTML=`
        <div class="finance-management-layout">
            <div id="admin-attendees-container" class="mb-6"></div>
            
            ${e.is_offsite?'<div id="admin-transport-container" class="mb-6"></div>':""}

            <div id="admin-expenses-container" class="mb-6"></div>

            <div id="finance-summary-section" class="hidden"></div>
        </div>
    `;const n=t.querySelector("#admin-attendees-container"),i=t.querySelector("#admin-transport-container"),o=t.querySelector("#admin-expenses-container"),l=t.querySelector("#finance-summary-section");let c=1;const r=5;let u="",p=[];const h=async()=>{try{const[m,f,b,g,w]=await Promise.all([d("GET",`/api/event/${e.id}/attendees`),e.is_offsite?d("GET",`/api/events/${e.id}/trips`):Promise.resolve({data:[]}),e.is_offsite?d("GET",`/api/admin/events/${e.id}/drivers`):Promise.resolve({data:[]}),d("GET",`/api/events/${e.id}/expenses`),d("GET",`/api/admin/events/${e.id}/finance-summary`)]);p=m.attendees||[];const T=f.data||[],x=b.data||[],E=g.data||[],L=w.data||{breakdown:[]},S=()=>{const _=a.includes("transaction.manage")||a.includes("event.manage.all"),q=p.filter(y=>`${y.first_name} ${y.last_name}`.toLowerCase().includes(u.toLowerCase())||y.email&&y.email.toLowerCase().includes(u.toLowerCase())),P=Math.ceil(q.length/r);c>P&&P>0&&(c=P);const D=q.slice((c-1)*r,c*r);n.innerHTML=A({title:"Participant Management",icon:ge,action:`
                        <div class="admin-attendee-controls" style="display: flex; gap: 0.5rem; align-items: center;">
                            <input type="text" id="attendee-filter-input" placeholder="Filter list..." class="modern-input small" style="margin-bottom: 0; width: 180px;" value="${u}">
                            ${e.costs_released?"":`<button id="admin-add-participant-btn" class="small-btn primary mini-btn">${U} Add</button>`}
                        </div>
                    `,content:`
                        <div id="admin-attendees-list">
                            <div class="glass-table-container">
                                <div class="table-responsive">
                                    <table class="glass-table">
                                        <thead>
                                            <tr><th>Attendee</th><th>Status</th><th class="text-right">Action</th></tr>
                                        </thead>
                                        <tbody>
                                            ${D.map(y=>`
                                                <tr>
                                                    <td class="primary-text">
                                                        <div class="user-info-cell">
                                                            ${se(y,{classes:"mini"})}
                                                            <span>${y.first_name} ${y.last_name}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        ${y.is_attending?`<span class="badge success">Attending${y.upfront_refunded?" - Refunded":""}</span>`:`<span class="badge neutral">Left${y.upfront_refunded?" - Refunded":""}</span>`}
                                                    </td>
                                                    <td class="text-right">
                                                        <div class="button-group mini justify-end">
                                                            ${y.is_attending&&!e.costs_released?`<button class="small-btn outline delete" data-remove-attendee="${y.id}">Remove</button>`:""}
                                                            ${_&&y.payment_transaction_id&&!y.upfront_refunded?`<button class="small-btn outline secondary" data-refund-upfront="${y.id}">Refund</button>`:""}
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join("")||'<tr><td colspan="3" class="empty-cell">No participants found.</td></tr>'}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                            <div id="attendees-pagination" class="mt-4 flex justify-center"></div>
                        </div>
                    `});const V=n.querySelector("#attendee-filter-input");V.oninput=y=>{u=y.target.value,S();const B=n.querySelector("#attendee-filter-input");B.focus(),B.setSelectionRange(u.length,u.length)};const Z=n.querySelector("#admin-add-participant-btn");Z&&(Z.onclick=()=>xi(e.id,h));const j=n.querySelector("#attendees-pagination");j&&new Pe(j,B=>{c=B,S()}).render(c,P),n.querySelectorAll("[data-remove-attendee]").forEach(y=>{y.onclick=async()=>{if(await N("Remove?","Remove participant?"))try{await d("DELETE",`/api/admin/events/${e.id}/attendees/${y.dataset.removeAttendee}`),v("Success","Removed.","success",5e3,"admin-attendee"),h()}catch(B){v("Error",B.message,"error",5e3,"admin-attendee")}}}),n.querySelectorAll("[data-refund-upfront]").forEach(y=>{y.onclick=async()=>{if(await N("Refund?","Refund upfront fee?"))try{await d("POST",`/api/admin/events/${e.id}/attendees/${y.dataset.refundUpfront}/refund-upfront`),v("Success","Refunded.","success",5e3,"admin-attendee"),h()}catch(B){v("Error",B.message,"error",5e3,"admin-attendee")}}})};if(S(),i){i.innerHTML=A({title:"Trips & Transport",icon:ot,action:e.costs_released?"":`<button type="button" id="admin-add-trip-btn" class="small-btn primary mini-btn">${U} New Trip</button>`,content:`
                        <div id="admin-trips-list" class="finance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                            ${T.map(q=>{const P=x.filter(Z=>Z.trip_id===q.id),D=P.filter(Z=>Z.status==="accepted").reduce((Z,j)=>Z+j.seats,0),V=P.filter(Z=>Z.status==="accepted").reduce((Z,j)=>Z+j.boats,0);return`
                                    <div class="trip-admin-card glass-panel secondary-bg">
                                        <div class="trip-info"><strong>${q.name}</strong><br><small>${D} Seats / ${V} Boats</small></div>
                                        <div class="trip-actions mt-4">
                                            <button type="button" class="small-btn secondary full-width mb-2" data-manage-trip-drivers="${q.id}">${e.costs_released?"View Drivers":"Drivers"} (${P.length})</button>
                                            ${e.costs_released?"":`<button type="button" class="small-btn outline full-width" data-manage-trip-exclusions="${q.id}">Exclusions</button>`}
                                        </div>
                                    </div>
                                `}).join("")||'<p class="muted-text">No trips defined.</p>'}
                        </div>
                    `});const _=i.querySelector("#admin-add-trip-btn");_&&(_.onclick=()=>Li(e.id,h)),i.querySelectorAll("[data-manage-trip-drivers]").forEach(q=>{q.onclick=()=>Qe(e.id,parseInt(q.dataset.manageTripDrivers),p,h,e.costs_released)}),i.querySelectorAll("[data-manage-trip-exclusions]").forEach(q=>{q.onclick=()=>zs("trip",parseInt(q.dataset.manageTripExclusions),p,h)})}o.innerHTML=A({title:"Event Expenses",icon:Ze,action:e.costs_released?"":`<button type="button" id="admin-add-expense-btn" class="small-btn primary mini-btn">${U} New Expense</button>`,content:`
                    <div id="admin-expenses-list" class="finance-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem;">
                        ${E.map(_=>`
                            <div class="expense-admin-card glass-panel secondary-bg">
                                <div class="expense-info"><strong>£${_.amount.toFixed(2)}</strong> - ${_.first_name}<p class="desc small-text mt-1">${_.description}</p></div>
                                ${e.costs_released?"":`<div class="expense-actions mt-4"><button type="button" class="small-btn outline full-width" data-manage-expense-exclusions="${_.id}">Exclusions</button></div>`}
                            </div>
                        `).join("")||'<p class="muted-text">No expenses reported.</p>'}
                    </div>
                `});const C=o.querySelector("#admin-add-expense-btn");if(C&&(C.onclick=()=>qi(e.id,p,h)),o.querySelectorAll("[data-manage-expense-exclusions]").forEach(_=>{_.onclick=()=>zs("expense",parseInt(_.dataset.manageExpenseExclusions),p,h)}),E.length>0||L.breakdown&&L.breakdown.some(_=>_.spent>0||_.mileage>0)){l.classList.remove("hidden");const _=[...(L.trips||[]).map(y=>({id:`trip-${y.id}`,name:y.name,type:"Trip",share:y.share,total:y.total_reimbursement,excludedIds:y.excluded_ids||[],contributions:y.drivers.reduce((B,I)=>(B[I.user_id]=I.reimbursement,B),{})})),...(L.expenses||[]).map(y=>({id:`exp-${y.id}`,name:y.description,type:"Exp",share:y.share,total:y.amount,excludedIds:y.excluded_ids||[],contributions:{[y.payer_id]:y.amount}}))],q=(L.trips||[]).map(y=>{const B=y.drivers.map(I=>`
                        <tr>
                            <td class="primary-text">${I.name}</td>
                            <td>${I.miles}</td>
                            <td class="amount">£${I.reimbursement.toFixed(2)}</td>
                            <td>${y.eligible_count}</td>
                        </tr>
                    `).join("");return`
                        <div class="mb-6">
                            <h5 class="small-title">${ot} Trip: ${y.name}</h5>
                            <div class="glass-table-container">
                                <div class="table-responsive">
                                    <table class="glass-table compact">
                                        <thead><tr><th>Driver</th><th>Miles</th><th>Cost</th><th>Payers (Eligible)</th></tr></thead>
                                        <tbody>${B}</tbody>
                                        <tfoot>
                                            <tr class="sum-row">
                                                <td><strong>Total Trip Cost</strong></td>
                                                <td></td>
                                                <td class="amount"><strong>£${y.total_reimbursement.toFixed(2)}</strong></td>
                                                <td><strong>£${y.share.toFixed(2)} each</strong></td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    `}).join(""),P=(L.expenses||[]).map(y=>`
                    <div class="mb-6">
                        <h5 class="small-title">${Ze} Expense: ${y.description}</h5>
                        <div class="glass-table-container">
                            <div class="table-responsive">
                                <table class="glass-table compact">
                                    <thead><tr><th>Payer</th><th>Description</th><th>Amount</th><th>Payers (Eligible)</th></tr></thead>
                                    <tbody>
                                        <tr>
                                            <td class="primary-text">${y.payer_name}</td>
                                            <td>${y.description}</td>
                                            <td class="amount">£${y.amount.toFixed(2)}</td>
                                            <td>${y.eligible_count}</td>
                                        </tr>
                                    </tbody>
                                    <tfoot>
                                        <tr class="sum-row">
                                            <td colspan="2"><strong>Subtotal</strong></td>
                                            <td class="amount"><strong>£${y.amount.toFixed(2)}</strong></td>
                                            <td><strong>£${y.share.toFixed(2)} each</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                `).join(""),D=`
                    <tr>
                        <th>Member</th>
                        ${_.map(y=>`<th class="text-center" title="${y.type}: ${y.name}">${y.name}</th>`).join("")}
                        <th class="text-right">Total Contributed</th>
                        <th class="text-right">Total Share</th>
                        <th class="text-right">Net Change</th>
                    </tr>
                `,V=(L.breakdown||[]).map(y=>{const B=_.map(F=>{const Y=F.excludedIds.includes(y.id),J=F.contributions[y.id]||0;if(Y&&J===0)return'<td class="text-center muted-text">-</td>';let ae="";return Y||(ae+=`<div style="font-size: 0.85rem;">£${F.share.toFixed(2)}</div>`),J>0&&(ae+=`<div class="text-success" style="font-weight: 700; font-size: 0.8rem;">+£${J.toFixed(2)}</div>`),`<td class="text-center">${ae||'<span class="muted-text">-</span>'}</td>`}).join(""),I=y.spent+y.mileage;return`
                        <tr>
                            <td class="primary-text">${y.name}</td>
                            ${B}
                            <td class="amount text-right ${I>0?"text-success":"muted-text"}">
                                ${I>0?`£${I.toFixed(2)}`:"-"}
                            </td>
                            <td class="amount text-right">-£${y.shared_cost_share.toFixed(2)}</td>
                            <td class="${y.net>=0?"text-success":"text-error"} text-right amount" style="font-weight: 700;">
                                ${y.net>=0?"+":""}£${y.net.toFixed(2)}
                            </td>
                        </tr>
                    `}).join(""),Z=()=>{const y=[];y.push([`Financial Settlement for ${e.title}`]);const B=L.released_at?new Date(L.released_at).toLocaleString():"Not Yet Finalized";y.push([`Finalized at: ${B}`]),y.push([]),y.push(["1. SHARED COST CALCULATIONS: TRIPS"]),(L.trips||[]).forEach(I=>{y.push([`Trip: ${I.name}`,`Total: £${I.total_reimbursement.toFixed(2)}`,`Share: £${I.share.toFixed(2)} each`,`${I.eligible_count} Payers`]),y.push(["Driver","Miles","Cost"]),I.drivers.forEach(F=>y.push([F.name,F.miles.toString(),F.reimbursement.toFixed(2)])),y.push([])}),y.push(["2. SHARED COST CALCULATIONS: OTHER EXPENSES"]),(L.expenses||[]).forEach(I=>{y.push([`Expense: ${I.description}`,`Total: £${I.amount.toFixed(2)}`,`Share: £${I.share.toFixed(2)} each`,`${I.eligible_count} Payers`]),y.push(["Payer","Description","Amount"]),y.push([I.payer_name,I.description,I.amount.toFixed(2)]),y.push([])}),y.push(["3. PERSONAL SETTLEMENT MATRIX"]),y.push(["Member",..._.map(I=>I.name),"Total Contributed","Total Share","Net Change"]),L.breakdown.forEach(I=>{const F=_.map(Y=>{const J=Y.contributions[I.id]||0,ae=Y.excludedIds.includes(I.id)?0:Y.share;if(ae===0&&J===0)return"-";let pt="";return ae>0&&(pt+=`£${ae.toFixed(2)}`),J>0&&(pt+=`${pt?" | ":""}Paid: +£${J.toFixed(2)}`),pt});y.push([I.name,...F,(I.spent+I.mileage).toFixed(2),I.shared_cost_share.toFixed(2),I.net.toFixed(2)])}),sa(y,`settlement-${e.title.replace(/[^a-z0-9]/gi,"_")}.csv`)};l.innerHTML=A({title:"Financial Settlement",icon:Ue,content:`
                        <div class="mb-8">
                            <h4 class="mb-4" style="font-size: 1rem;">1. Shared Cost Calculations</h4>
                            ${q}
                            ${P}
                        </div>

                        <div class="mb-8">
                            <h4 class="mb-4" style="font-size: 1rem;">2. Personal Settlement Matrix</h4>
                            <div class="glass-table-container">
                                <div class="table-responsive">
                                    <table class="glass-table matrix-table">
                                        <thead>${D}</thead>
                                        <tbody>${V}</tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div class="summary-footer-actions mt-6 flex justify-end">
                            <div class="button-group" style="gap: 1rem;">
                                <button id="download-settlement-csv-btn" class="secondary outline">Download CSV</button>
                                <button id="release-funds-btn" class="primary" ${e.costs_released?"disabled":""}>
                                    ${e.costs_released?"Funds Released":"Release Funds"}
                                </button>
                            </div>
                        </div>

                        ${e.costs_released?"":'<p class="small-text warning-text mt-4"><strong>Note:</strong> Releasing funds will update all attendee balances. This action is final.</p>'}
                    `}),l.querySelector("#download-settlement-csv-btn").onclick=Z;const j=l.querySelector("#release-funds-btn");j&&(j.onclick=async()=>{if(await N("Release Funds?","Finalize the budget and update all member balances? This cannot be undone."))try{await d("POST",`/api/admin/events/${e.id}/release-costs`),v("Success","Funds released successfully.","success",5e3,"admin-finance"),$(`/admin/event/${e.id}?tab=finance`,!0)}catch(y){v("Error",y.message,"error",5e3,"admin-finance")}})}else l.classList.add("hidden")}catch(m){console.error(m)}};await h()}function xi(t,e){const s=`
        <div class="modern-form">
            <div class="form-group">
                <label>Search Member</label>
                <input type="text" id="add-attendee-search-input" placeholder="Type name or email..." class="modern-input">
                <div id="add-attendee-results-dropdown" class="glass-panel hidden mt-2" style="max-height: 200px; overflow-y: auto;"></div>
            </div>
        </div>
    `,a=new H({id:`add-participant-modal-${Date.now()}`,title:"Add Participant",content:s});document.body.insertAdjacentHTML("beforeend",a.getHTML()),a.attachListeners(),a.show();const n=document.getElementById("add-attendee-search-input"),i=document.getElementById("add-attendee-results-dropdown");let o;n.oninput=()=>{clearTimeout(o),o=setTimeout(async()=>{const l=n.value.trim();if(l.length<2){i.classList.add("hidden");return}try{const r=(await d("GET",`/api/admin/users?search=${encodeURIComponent(l)}&limit=5`)).data||[];r.length===0?i.innerHTML='<p class="small-text p-3">No members found.</p>':(i.innerHTML=r.map(u=>`
                        <div class="search-result-item" data-user-id="${u.id}" style="padding: 0.75rem; cursor: pointer; border-bottom: 1px solid rgba(128,128,128,0.1); display: flex; align-items: center; gap: 0.75rem;">
                            ${se(u,{classes:"mini"})}
                            <div>
                                <strong>${u.first_name} ${u.last_name}</strong><br>
                                <small class="muted-text">${u.email}</small>
                            </div>
                        </div>
                    `).join(""),i.querySelectorAll(".search-result-item").forEach(u=>{u.onclick=async()=>{if(await N("Add?",`Add ${u.querySelector("strong").textContent} to the event?`))try{await d("POST",`/api/admin/events/${t}/attendees`,{userId:u.dataset.userId}),v("Success","Added.","success",5e3,"admin-attendee"),a.close(),e()}catch(p){v("Error",p.message,"error",5e3,"admin-attendee")}}})),i.classList.remove("hidden")}catch{}},300)}}function Li(t,e){const s='<form id="add-trip-form" class="modern-form"><label>Trip Name <input type="text" id="trip-name" placeholder="e.g. Drive to Lake" required></label><button type="submit" class="primary full-width">Create Trip</button></form>',a=new H({id:`add-trip-modal-${Date.now()}`,title:"New Trip",content:s});document.body.insertAdjacentHTML("beforeend",a.getHTML()),a.attachListeners(),a.show(),document.getElementById("add-trip-form").onsubmit=async n=>{n.preventDefault();try{await d("POST",`/api/admin/events/${t}/trips`,{name:document.getElementById("trip-name").value}),v("Success","Trip created.","success",5e3,"admin-transport"),a.close(),e()}catch(i){v("Error",i.message,"error",5e3,"admin-transport")}}}async function Qe(t,e,s,a,n=!1){const o=((await d("GET",`/api/admin/events/${t}/drivers`)).data||[]).filter(r=>r.trip_id==e),l=`
        <div class="header-row mb-4" style="display:flex; justify-content: space-between; align-items:center;">
            <p class="nomargin small-text muted-text">${n?"View drivers for this trip.":"Manage volunteers and manual drivers."}</p>
            ${n?"":`<button type="button" id="admin-add-driver-btn" class="small-btn primary mini-btn">${U} Add Driver</button>`}
        </div>
        <div class="glass-table-container">
            <div class="table-responsive">
                <table class="glass-table">
                    <thead><tr><th>Driver</th><th>Status</th><th>Capacity</th><th>Mileage</th>${n?"":'<th class="text-right">Action</th>'}</tr></thead>
                    <tbody>
                        ${o.map(r=>`
                            <tr>
                                <td data-label="Driver" class="primary-text">
                                    <div class="user-info-cell">
                                        ${se(r,{classes:"mini"})}
                                        <div>
                                            ${r.first_name} ${r.last_name}<br><small class="muted-text">${r.car_name}</small>
                                        </div>
                                    </div>
                                </td>
                                <td data-label="Status"><span class="badge ${r.status}">${r.status}</span></td>
                                <td data-label="Capacity">${r.seats}S / ${r.boats}B</td>
                                <td data-label="Mileage">
                                    <div class="mileage-display">
                                        <span>${r.start_mileage!==null?r.start_mileage:"-"} / ${r.end_mileage!==null?r.end_mileage:"-"}</span>
                                        ${n?"":`<button class="small-btn icon-only tertiary mini-btn" data-edit-mileage="${r.id}" title="Edit Mileage">${he}</button>`}
                                    </div>
                                    ${r.start_mileage_proof_id?`<a href="/api/files/${r.start_mileage_proof_id}/download?view=true" target="_blank" class="small-text">S-Proof</a>`:""}
                                    ${r.end_mileage_proof_id?`<a href="/api/files/${r.end_mileage_proof_id}/download?view=true" target="_blank" class="small-text">E-Proof</a>`:""}
                                </td>
                                ${n?"":`
                                <td data-label="Action" class="text-right">
                                    <div class="button-group mini justify-end">
                                        <button class="small-btn success icon-only" data-driver-status="accepted" data-id="${r.id}" title="Accept">${Ft}</button>
                                        <button class="small-btn warning icon-only" data-driver-status="declined" data-id="${r.id}" title="Decline">${te}</button>
                                        <button class="small-btn delete icon-only" data-remove-driver="${r.id}" title="Remove Driver">${fe}</button>
                                    </div>
                                </td>`}
                            </tr>
                        `).join("")||`<tr><td colspan="${n?4:5}" class="empty-cell">No drivers for this trip.</td></tr>`}
                    </tbody>
                </table>
            </div>
        </div>
    `,c=new H({id:`manage-drivers-modal-${Date.now()}`,title:n?"View Drivers":"Manage Drivers",content:l,contentClasses:"modal-lg"});if(document.body.insertAdjacentHTML("beforeend",c.getHTML()),c.attachListeners(),c.show(),c.element){const r=c.element.querySelector("#admin-add-driver-btn");r&&(r.onclick=()=>Si(e,s,()=>{c.close(),Qe(t,e,s,a,n)})),c.element.querySelectorAll("[data-driver-status]").forEach(u=>{u.onclick=async()=>{try{await d("POST",`/api/admin/drivers/${u.dataset.id}/status`,{status:u.dataset.driverStatus}),v("Success",`Driver marked as ${u.dataset.driverStatus}.`,"success",5e3,"admin-transport"),c.close(),Qe(t,e,s,a,n),a()}catch(p){v("Error",p.message,"error",5e3,"admin-transport")}}}),c.element.querySelectorAll("[data-remove-driver]").forEach(u=>{u.onclick=async()=>{if(await N("Remove Driver?","Are you sure you want to remove this driver from the trip?"))try{await d("DELETE",`/api/admin/drivers/${u.dataset.removeDriver}`),v("Success","Driver removed.","success",5e3,"admin-transport"),c.close(),Qe(t,e,s,a,n),a()}catch(p){v("Error",p.message,"error",5e3,"admin-transport")}}}),c.element.querySelectorAll("[data-edit-mileage]").forEach(u=>{u.onclick=()=>{const p=o.find(h=>h.id==parseInt(u.dataset.editMileage));_i(p,()=>{c.close(),Qe(t,e,s,a,n),a()})}})}}function Si(t,e,s){const a=`
        <form id="add-driver-form" class="modern-form">
            <label>Driver
                <select id="driver-user-id" required>
                    <option value="" disabled selected>Select attendee</option>
                    ${e.map(c=>`<option value="${c.id}">${c.first_name} ${c.last_name}</option>`).join("")}
                </select>
            </label>
            <label>Car
                <select id="driver-car-id" required disabled>
                    <option value="" disabled selected>Select user first</option>
                </select>
            </label>
            <button type="submit" class="primary full-width" disabled id="add-driver-submit">Add Driver</button>
        </form>
    `,n=new H({id:`add-driver-modal-${Date.now()}`,title:"Add Driver",content:a});document.body.insertAdjacentHTML("beforeend",n.getHTML()),n.attachListeners(),n.show();const i=document.getElementById("driver-user-id"),o=document.getElementById("driver-car-id"),l=document.getElementById("add-driver-submit");i.onchange=async()=>{const c=i.value;o.disabled=!0,o.innerHTML='<option value="" disabled selected>Loading cars...</option>';try{const u=(await d("GET",`/api/cars?userId=${c}`)).data||[];o.innerHTML=u.map(p=>`<option value="${p.id}">${p.name} (${p.seats}S / ${p.boats}B)</option>`).join("")||'<option value="" disabled>No cars found for user</option>',o.disabled=u.length===0,l.disabled=u.length===0}catch{o.innerHTML='<option value="" disabled>Error loading cars</option>'}},document.getElementById("add-driver-form").onsubmit=async c=>{c.preventDefault();try{await d("POST",`/api/admin/trips/${t}/drivers`,{userId:i.value,carId:o.value}),v("Success","Driver added.","success",5e3,"admin-transport"),n.close(),s()}catch(r){v("Error",r.message,"error",5e3,"admin-transport")}}}function _i(t,e){const s=`
        <form id="edit-mileage-form" class="modern-form">
            <label>Start Mileage
                <input type="number" id="edit-start-mileage" value="${t.start_mileage||""}" placeholder="0">
            </label>
            <label>End Mileage
                <input type="number" id="edit-end-mileage" value="${t.end_mileage||""}" placeholder="0">
            </label>
            <p class="small-text muted-text">Manual edits do not require proof images.</p>
            <button type="submit" class="primary full-width">Save Mileage</button>
        </form>
    `,a=new H({id:`edit-mileage-modal-${Date.now()}`,title:`Edit Mileage: ${t.first_name}`,content:s});document.body.insertAdjacentHTML("beforeend",a.getHTML()),a.attachListeners(),a.show();const n=document.getElementById("edit-start-mileage"),i=document.getElementById("edit-end-mileage");n&&ee(n),i&&ee(i),document.getElementById("edit-mileage-form").onsubmit=async o=>{o.preventDefault();const l=document.getElementById("edit-start-mileage").value,c=document.getElementById("edit-end-mileage").value;try{await d("POST",`/api/admin/drivers/${t.id}/mileage`,{startMileage:l,endMileage:c}),v("Success","Mileage updated.","success",5e3,"admin-transport"),a.close(),e()}catch(r){v("Error",r.message,"error",5e3,"admin-transport")}}}function qi(t,e,s){const a=`
        <form id="add-expense-form" class="modern-form">
            <label>Payer
                <select id="expense-user-id" required>
                    <option value="" disabled selected>Select attendee</option>
                    ${e.map(o=>`<option value="${o.id}">${o.first_name} ${o.last_name}</option>`).join("")}
                </select>
            </label>
            <label>Amount (£)
                <input type="number" id="expense-amount" step="0.01" placeholder="0.00" required>
            </label>
            <label>Description
                <input type="text" id="expense-description" placeholder="e.g. Petrol, Entry fee" required>
            </label>
            <button type="submit" class="primary full-width">Add Expense</button>
        </form>
    `,n=new H({id:`add-expense-modal-${Date.now()}`,title:"Add Expense",content:a});document.body.insertAdjacentHTML("beforeend",n.getHTML()),n.attachListeners(),n.show();const i=document.getElementById("expense-amount");i&&ee(i),document.getElementById("add-expense-form").onsubmit=async o=>{o.preventDefault();const l={userId:document.getElementById("expense-user-id").value,amount:document.getElementById("expense-amount").value,description:document.getElementById("expense-description").value};try{await d("POST",`/api/admin/events/${t}/expenses`,l),v("Success","Expense added.","success",5e3,"admin-finance"),n.close(),s()}catch(c){v("Error",c.message,"error",5e3,"admin-finance")}}}async function zs(t,e,s,a){const i=(await d("GET",`/api/admin/${t}s/${e}/exclusions`)).data||[],o=`
        <p class="small-text mb-4">Select people who should <strong>not</strong> pay for this ${t}.</p>
        <form id="exclusions-form" class="modern-form">
            <div class="exclusions-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; max-height: 300px; overflow-y: auto;">
                ${s.map(c=>`
                    <label class="checkbox-label">
                        <input type="checkbox" name="userIds" value="${c.id}" ${i.includes(c.id)?"checked":""}>
                        ${c.first_name} ${c.last_name}
                    </label>
                `).join("")}
            </div>
            <button type="submit" class="primary full-width mt-4">Save Exclusions</button>
        </form>
    `,l=new H({id:`exclusions-modal-${Date.now()}`,title:`Manage ${t} Exclusions`,content:o});document.body.insertAdjacentHTML("beforeend",l.getHTML()),l.attachListeners(),l.show(),document.getElementById("exclusions-form").onsubmit=async c=>{c.preventDefault();const r=Array.from(new FormData(c.target).getAll("userIds")).map(u=>parseInt(u));try{await d("POST",`/api/admin/${t}s/${e}/exclusions`,{userIds:r}),v("Success","Exclusions updated.","success",5e3,"admin-finance"),l.close(),a()}catch(u){v("Error",u.message,"error",5e3,"admin-finance")}}}async function Ii(t){const e=document.getElementById(ie);if(!e)return;if(t==="new"){e.innerHTML='<div class="glass-layout"><div id="admin-tab-content"></div></div>';const a=document.getElementById("admin-tab-content");if(a){const i=(await d("GET","/api/tags")).data||[],l=(await d("GET","/api/globals/DefaultEventImage")).res?.DefaultEventImage?.data||"/images/misc/ducc.png";await Ws(a,{title:"",start:"",end:"",tags:[]},i,!0,l)}return}e.innerHTML='<p aria-busy="true">Loading event dashboard...</p>';try{const[a,n,i,o,l,c]=await Promise.all([d("GET",`/api/admin/event/${t}`),d("GET",`/api/admin/event/${t}/raw`),d("GET","/api/tags"),d("GET",`/api/event/${t}/attendees`),d("GET","/api/globals/DefaultEventImage"),d("GET","/api/user/elements/permissions")]),r=o.attendees||[],u=c.permissions||[],p=l.res?.DefaultEventImage?.data||"/images/misc/ducc.png",h=document.getElementById("admin-header-actions");if(h){h.innerHTML=`
                <div class="button-group">
                    <button id="admin-delete-event-btn" class="small-btn outline delete">${Xa} Delete</button>
                    <button id="admin-cancel-event-btn" class="small-btn outline warning">${te} Cancel</button>
                    <button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${Ve} Back to Events</button>
                </div>
            `;const T=document.getElementById("admin-back-btn");T&&(T.onclick=()=>$("/admin/events"));const x=document.getElementById("admin-delete-event-btn");x&&(x.onclick=async()=>{if(await N("Delete Event","Delete event permanently? This cannot be undone."))try{await d("DELETE",`/api/admin/event/${t}`),v("Success","Event deleted","success"),$("/admin/events")}catch(L){v("Error",L.message,"error")}});const E=document.getElementById("admin-cancel-event-btn");E&&(E.onclick=async()=>{if(await N("Cancel Event","Cancel this event? Attendees will be notified and refunded."))try{await d("POST",`/api/admin/event/${t}/cancel`),v("Success","Event canceled","success"),$("/admin/events")}catch(L){v("Error",L.message,"error")}})}const m=[{label:"Edit",key:"details"},{label:"Finance",key:"finance"}],f=new URLSearchParams(window.location.search).get("tab")||"details",b=new mt({id:"admin-event-tabs",tabs:m,activeKey:f});e.innerHTML=`
            <div class="glass-layout">
                ${A({content:`
                        <header class="event-dashboard-header" style="display:flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem; margin-bottom: 1rem;">
                            <div class="event-identity">
                                <h2 class="nomargin">${a.title}</h2>
                                <span class="badge ${a.costs_released?"success":"neutral"}">${a.costs_released?"Costs Released":"Finance Open"}</span>
                            </div>
                            ${b.getHTML()}
                        </header>
                        <div id="admin-tab-content" class="tab-content-area mt-4"></div>
                    `})}
            </div>
        `,b.init();const g=T=>{const x=document.getElementById("admin-tab-content");x&&(T==="details"?Ws(x,{...a,image_id:n.image_id},i.data,!1,p):T==="finance"&&Ti(x,a,r,u))},w=document.querySelectorAll("#admin-event-tabs button");w.forEach(T=>{T.onclick=()=>{const x=T.dataset.key;if(!x)return;const E=new URL(window.location.href);E.searchParams.set("tab",x),window.history.replaceState({},"",E.toString()),w.forEach(L=>L.classList.remove("active")),T.classList.add("active"),b.init(),g(x)}}),g(f)}catch(a){console.error(a),e.innerHTML='<p class="error-text">Failed to load event dashboard.</p>'}}async function Mi(){const t=document.getElementById(ie);t&&(t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("tags")}
                 <div class="toolbar-content">
                    <div class="toolbar-left hidden"></div>
                    <div class="toolbar-right">
                        <button data-nav="/admin/tag/new" class="small-btn">Create New Tag</button>
                    </div>
                </div>
            </div>
                <div class="glass-table-container">
                    <div class="table-responsive">
                        <table class="glass-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Colour</th>
                                    <th>Min Difficulty</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody id="tags-table-body">
                                <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
    `,await Ci())}async function Ci(){try{const e=(await d("GET","/api/tags")).data||[],s=document.getElementById("tags-table-body");s&&(e.length===0?s.innerHTML='<tr><td colspan="4" class="empty-cell">No tags found.</td></tr>':(s.innerHTML=e.map(a=>`
                    <tr class="tag-row clickable-row" data-id="${a.id}">
                        <td data-label="Name" class="primary-text">${a.name}</td>
                        <td data-label="Colour">
                            <!-- Preview the colour badge -->
                            ${Ce.render({name:a.color,color:a.color})}
                        </td>
                        <td data-label="Min Difficulty"><span class="badge ${a.min_difficulty?`difficulty-${a.min_difficulty}`:"neutral"}">${a.min_difficulty||"-"}</span></td>
                        <td data-label="Description" class="description-cell">${a.description||"-"}</td>
                    </tr>
                `).join(""),s.querySelectorAll(".tag-row").forEach(a=>{a.onclick=()=>$(`/admin/tag/${a.dataset.id}`)})))}catch{const e=document.getElementById("tags-table-body");e&&(e.innerHTML='<tr><td colspan="4" class="error-cell">Error loading tags.</td></tr>')}}async function ki(t){const e=document.getElementById(ie);if(!e)return;const s=document.getElementById("admin-header-actions");s&&(s.innerHTML=`<button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${Ve} Back to Tags</button>`);const a=document.getElementById("admin-back-btn");a&&(a.onclick=()=>$("/admin/tags"));const i=((await d("GET","/api/user/elements/permissions").catch(()=>({}))).permissions||[]).includes("user.manage"),o=t==="new";let l={name:"",color:"#808080",description:"",min_difficulty:"",priority:0,join_policy:"open",view_policy:"open",image_id:null},c=[],r=[];if(!o)try{if(l=((await d("GET","/api/tags")).data||[]).find(k=>k.id==t),!l)throw new Error("Tag not found");const[S,C]=await Promise.all([d("GET",`/api/tags/${t}/whitelist`),d("GET",`/api/tags/${t}/managers`)]);c=S.data||[],r=C.data||[]}catch{e.innerHTML="<p>Error loading tag.</p>";return}const p=(await d("GET","/api/globals/DefaultEventImage")).res?.DefaultEventImage?.data||"/images/misc/ducc.png",h=l.image_id?`/api/files/${l.image_id}/download?view=true`:p;e.innerHTML=`
        <div class="glass-layout">
            ${A({title:o?"Create New Tag":"Edit Tag",action:o?"":`<button type="button" id="delete-tag-btn" class="small-btn delete outline" title="Delete">${fe} Delete</button>`,content:`
                    <form id="tag-form" class="modern-form">
                        <div class="event-content-split">
                            <div class="event-details-section">
                                <div class="grid-2-col">
                                    <label>Name <input type="text" name="name" value="${l.name}" required placeholder="Tag Name"></label>
                                    <label>Colour <input type="color" name="color" value="${l.color}" required class="colour-input"></label>
                                </div>
                                
                                <label>Description <textarea name="description" rows="3">${l.description||""}</textarea></label>
                                
                                <div class="grid-2-col">
                                    <label>Min Difficulty Requirement <input type="number" name="min_difficulty" value="${l.min_difficulty??""}" min="1" max="5" placeholder="Optional (1-5)"></label>
                                    <label>Priority <input type="number" name="priority" value="${l.priority||0}" placeholder="Default 0"></label>
                                </div>

                                <div class="grid-2-col">
                                    <label>Join Policy
                                        <select name="join_policy" class="modern-select">
                                            <option value="open" ${l.join_policy==="open"?"selected":""}>Open</option>
                                            <option value="whitelist" ${l.join_policy==="whitelist"?"selected":""}>Whitelist Only</option>
                                            <option value="role" ${l.join_policy==="role"?"selected":""}>Role Only</option>
                                        </select>
                                    </label>
                                    <label>View Policy
                                        <select name="view_policy" class="modern-select">
                                            <option value="open" ${l.view_policy==="open"?"selected":""}>Open</option>
                                            <option value="whitelist" ${l.view_policy==="whitelist"?"selected":""}>Whitelist Only</option>
                                            <option value="role" ${l.view_policy==="role"?"selected":""}>Role Only</option>
                                        </select>
                                    </label>
                                </div>
                            </div>

                            <!-- Tag Image Section -->
                            <div class="event-image-section">
                                <h3 class="section-header-modern">
                                    ${je} Default Event Image
                                </h3>
                                <div id="upload-widget-container"></div>
                                <input type="hidden" name="image_id" id="image_id_input" value="${l.image_id||""}">
                            </div>
                        </div>                    
                        <div class="form-actions-footer ${o?"":"hidden"}">
                            <button type="submit" class="wide-btn">${o?"Create":"Save Changes"}</button>
                        </div>
                    </form>
                `})}

            ${!o&&i?`
                <div class="divider"></div>
                
                <div class="dual-grid">
                    <!-- Designated Managers Section -->
                    ${A({title:"Designated Managers",icon:Dt,content:`
                                    <div class="permission-section">
                                        <p class="helper-text">Users allowed to manage (create/edit/read) events with this tag.</p>
                                        
                                        <form id="managers-form" class="inline-add-form">
                                            <input list="managers-datalist" id="managers-user-input" placeholder="Search by name or email..." autocomplete="off">
                                            <datalist id="managers-datalist"></datalist>
                                            <button type="submit" class="small-btn" title="Add Manager">${U}</button>
                                        </form>
                                        <div class="glass-table-container">
                                    <div class="table-responsive">
                                        <table class="glass-table">
                                            <thead><tr><th>Name</th><th>Email</th><th class="action-col">Remove</th></tr></thead>
                                            <tbody id="managers-table-body">${Je(r,t,"remove-manager-btn")}</tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        `})}

                    <!-- Whitelist Access Section -->
                    ${A({title:"Whitelist Access",icon:xt,content:`
                                    <div class="permission-section">
                                        <p class="helper-text">Restricts event visibility/joining to specific users.</p>
                                        
                                        <form id="whitelist-form" class="inline-add-form">
                                            <input list="users-datalist" id="whitelist-user-input" placeholder="Search by name or email..." autocomplete="off">
                                            <datalist id="users-datalist"></datalist>
                                            <button type="submit" class="small-btn" title="Add User">${U}</button>
                                        </form>
                                        <div class="glass-table-container">
                                    <div class="table-responsive">
                                        <table class="glass-table">
                                            <thead><tr><th>Name</th><th>Email</th><th class="action-col">Remove</th></tr></thead>
                                            <tbody id="whitelist-table-body">${Je(c,t,"remove-whitelist-btn")}</tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        `})}
                </div>
            `:""}
        </div>
    `;const m=document.getElementById("tag-form");m&&m.querySelectorAll('input[type="number"]').forEach(E=>ee(E));const f=document.getElementById("image_id_input"),b=new me("upload-widget-container",{mode:"inline",selectMode:"single",autoUpload:!0,defaultPreview:h,onImageSelect:({url:E,id:L})=>{if(!L&&!E.includes("/api/files")){v("Warning","Tags currently only support uploaded library files, not slides.",R.WARNING),b.reset();return}f&&(f.value=String(L||"")),v("Success","Image updated","success"),o||w()},onRemove:async()=>{if(o)return f&&(f.value=""),!0;if(!await N("Remove Image","Remove tag image?"))return!1;try{if(!(await d("POST",`/api/tags/${t}/reset-image`)).ok)throw new Error("Failed to reset image");return v("Success","Image removed","success"),f&&(f.value=""),b.setPreview(p),!1}catch(E){return v("Error",E.message,"error"),!1}},onUploadError:E=>{v("Error",E.message||"Upload failed","error")}}),g=()=>{const E=document.getElementById("tag-form"),L=new FormData(E),S=Object.fromEntries(L.entries());return S.min_difficulty=S.min_difficulty===""?null:parseInt(S.min_difficulty),S.priority=parseInt(S.priority)||0,S.image_id=S.image_id===""?null:parseInt(S.image_id),S},w=async()=>{if(o)return;const E=g();try{await d("PUT",`/api/tags/${t}`,E)}catch(L){v("Auto-save failed",L.message,R.ERROR)}},T=ea(w,1e3);if(!o){const E=document.getElementById("tag-form");E&&E.querySelectorAll("input, textarea, select").forEach(L=>{const S=L;S.type==="text"||S.tagName==="TEXTAREA"||S.type==="number"?S.addEventListener("input",T):S.addEventListener("change",w)})}const x=document.getElementById("tag-form");if(x&&(x.onsubmit=async E=>{if(E.preventDefault(),!o)return;const L=g();try{o&&(await d("POST","/api/tags",L),v("Success","Tag saved",R.SUCCESS),$("/admin/tags"))}catch{v("Error","Save failed",R.ERROR)}}),!o){const E=document.getElementById("delete-tag-btn");if(E&&(E.onclick=async()=>{await N("Delete Tag","Delete tag?")&&(await d("DELETE",`/api/tags/${t}`),v("Success","Tag deleted",R.SUCCESS),$("/admin/tags"))}),i){d("GET","/api/admin/users?limit=1000").then(C=>{const k=C.users||[],_=document.getElementById("users-datalist");_&&(_.innerHTML=k.map(q=>`<option value="${q.id} - ${q.first_name} ${q.last_name} (${q.email})">`).join(""))}).catch(()=>{}),d("GET","/api/admin/users?limit=1000").then(C=>{const k=C.users||[],_=document.getElementById("managers-datalist");_&&(_.innerHTML=k.map(q=>`<option value="${q.id} - ${q.first_name} ${q.last_name} (${q.email})">`).join(""))}).catch(()=>{});const L=document.getElementById("managers-form");L&&(L.onsubmit=async C=>{C.preventDefault();const k=document.getElementById("managers-user-input"),_=parseInt(k.value.split(" - ")[0]);if(!_||isNaN(_))return v("Warning","Select a valid user",R.WARNING);try{await d("POST",`/api/tags/${t}/managers`,{userId:_}),v("Success","Manager added",R.SUCCESS);const P=(await d("GET",`/api/tags/${t}/managers`)).data||[],D=document.getElementById("managers-table-body");D&&(D.innerHTML=Je(P,t,"remove-manager-btn")),k.value=""}catch{v("Error","Add failed",R.ERROR)}});const S=document.getElementById("whitelist-form");S&&(S.onsubmit=async C=>{C.preventDefault();const k=document.getElementById("whitelist-user-input"),_=parseInt(k.value.split(" - ")[0]);if(!_||isNaN(_))return v("Warning","Select a valid user",R.WARNING);try{await d("POST",`/api/tags/${t}/whitelist`,{userId:_}),v("Success","Added to whitelist",R.SUCCESS);const P=(await d("GET",`/api/tags/${t}/whitelist`)).data||[],D=document.getElementById("whitelist-table-body");D&&(D.innerHTML=Je(P,t,"remove-whitelist-btn")),k.value=""}catch{v("Error","Add failed",R.ERROR)}})}Ys(t,"managers-table-body","remove-manager-btn","managers"),Ys(t,"whitelist-table-body","remove-whitelist-btn","whitelist")}}function Je(t,e,s){return!t||t.length===0?'<tr><td colspan="3" class="empty-cell">None.</td></tr>':t.map(a=>`
        <tr>
            <td data-label="Name" class="primary-text">${a.first_name} ${a.last_name}</td>
            <td data-label="Email">${a.email}</td>
            <td data-label="Action" class="action-cell"><button class="${s} delete-icon-btn outline" data-user-id="${a.id}">${fe}</button></td>
        </tr>
    `).join("")}function Ys(t,e,s,a){const n=document.getElementById(e);n&&(n.onclick=async i=>{const l=i.target.closest(`.${s}`);if(l){const c=l.dataset.userId;try{await d("DELETE",`/api/tags/${t}/${a}/${c}`),v("Success","User removed",R.SUCCESS);const u=(await d("GET",`/api/tags/${t}/${a}`)).data||[];n.innerHTML=Je(u,t,s)}catch{v("Error","Removal failed",R.ERROR)}}})}async function Bi(){const t=document.getElementById(ie);t&&(t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("roles")}
                 <div class="toolbar-content">
                    <div class="toolbar-left hidden"></div>
                    <div class="toolbar-right">
                        <button data-nav="/admin/role/new" class="small-btn">Create New Role</button>
                    </div>
                </div>
            </div>
            
            <div class="roles-sections">
                ${A({title:"System Roles",content:`
                        <div class="table-responsive">
                            <table class="glass-table">
                                <thead><tr><th>Name</th><th>Permissions</th></tr></thead>
                                <tbody id="roles-table-body">
                                    <tr><td colspan="2" class="loading-cell">Loading roles...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `})}

                ${A({title:"Permission Definitions",classes:"mt-4",content:`
                        <div class="table-responsive">
                            <table class="glass-table">
                                <thead><tr><th>Slug</th><th>Description</th><th class="text-right">Action</th></tr></thead>
                                <tbody id="permissions-table-body">
                                    <tr><td colspan="3" class="loading-cell">Loading permissions...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    `})}
            </div>
        </div>
    `,await Promise.all([Pi(),Ai()]))}async function Pi(){try{const t=await d("GET","/api/admin/roles"),e=document.getElementById("roles-table-body");if(!e)return;t.length===0?e.innerHTML='<tr><td colspan="2" class="empty-cell">No roles found.</td></tr>':(e.innerHTML=t.map(s=>`
                <tr class="role-row clickable-row" data-id="${s.id}">
                    <td data-label="Name" class="primary-text">${s.name}</td>
                    <td data-label="Permissions">
                        <div class="permission-tags">
                            ${s.permissions.map(a=>`<span class="badge neutral">${a}</span>`).join("")}
                        </div>
                    </td>
                </tr>
            `).join(""),e.querySelectorAll(".role-row").forEach(s=>{s.onclick=()=>$(`/admin/role/${s.dataset.id}`)}))}catch{const e=document.getElementById("roles-table-body");e&&(e.innerHTML='<tr><td colspan="2" class="error-cell">Error loading roles.</td></tr>')}}async function Ai(){try{const t=await d("GET","/api/admin/roles/permissions"),e=document.getElementById("permissions-table-body");if(!e)return;e.innerHTML=t.map(s=>`
            <tr>
                <td class="primary-text"><code>${s.slug}</code></td>
                <td><input type="text" class="mini-input" id="perm-desc-${s.id}" value="${s.description||""}" placeholder="No description"></td>
                <td class="text-right">
                    <button class="small-btn primary mini-btn" data-save-perm="${s.id}">Save</button>
                </td>
            </tr>
        `).join(""),e.querySelectorAll("[data-save-perm]").forEach(s=>{s.onclick=async()=>{const a=s.dataset.savePerm,n=document.getElementById(`perm-desc-${a}`).value;try{await d("PUT",`/api/admin/permissions/${a}`,{description:n}),v("Success","Permission updated.","success")}catch(i){v("Error",i.message,"error")}}})}catch{const e=document.getElementById("permissions-table-body");e&&(e.innerHTML='<tr><td colspan="3">Error loading permissions.</td></tr>')}}async function Di(t){const e=document.getElementById(ie);if(!e)return;e.innerHTML='<p class="loading-cell">Loading role details...</p>';const s=document.getElementById("admin-header-actions");if(s){s.innerHTML=`
            <button id="admin-delete-role-btn" class="small-btn outline danger icon-text-btn">${fe} Delete</button>
            <button id="admin-back-btn" class="small-btn outline secondary icon-text-btn">${Ve} Back to Roles</button>
        `;const a=document.getElementById("admin-back-btn");a&&(a.onclick=()=>$("/admin/roles"));const n=document.getElementById("admin-delete-role-btn");n&&(n.onclick=()=>Ri(t))}try{const a=t==="new",n=a?{name:"",description:"",permissions:[],exec_ranking:4}:await d("GET",`/api/admin/roles/${t}`),i=await d("GET","/api/admin/roles/permissions");e.innerHTML=`
            <div class="glass-layout">
                ${A({title:a?"Create New Role":"Edit Role",content:`
                        <form id="role-form" class="modern-form">
                            <div class="grid-2-col">
                                <label class="form-label-top">Role Name
                                    <input type="text" name="name" value="${n.name}" required class="full-width-input" placeholder="e.g. Moderator">
                                </label>
                                <label class="form-label-top">Description
                                    <input type="text" name="description" value="${n.description||""}" class="full-width-input" placeholder="Role purpose">
                                </label>
                                <label class="form-label-top">Exec Ranking
                                    <input type="number" name="execRanking" value="${n.exec_ranking||4}" class="full-width-input" min="1" max="10">
                                    <small>1 = Top (President), 2 = Important (VP), 4 = Standard</small>
                                </label>
                            </div>

                            <h3>Permissions</h3>
                        <div class="tag-cloud">
                            ${i.map(u=>`
                                <label class="checkbox-label">
                                    <input type="checkbox" name="permissions" value="${u.slug}" ${(n.permissions||[]).includes(u.slug)?"checked":""}> ${u.key||u.slug}
                                </label>
                            `).join("")}
                        </div>

                            <div class="form-actions-footer mt-2 ${a?"":"hidden"}">
                                <button type="submit" class="primary-btn wide-btn">${Ot} ${a?"Create":"Save Changes"}</button>
                            </div>
                        </form>
                    `})}
            </div>
        `;const o=()=>{const u=document.getElementById("role-form"),p=new FormData(u);return{name:p.get("name"),description:p.get("description"),execRanking:p.get("execRanking"),permissions:p.getAll("permissions")}},l=async()=>{if(a)return;const u=o();try{await d("PUT",`/api/admin/roles/${t}`,u)}catch(p){v("Auto-save failed",p.message,R.ERROR)}},c=ea(l,1e3),r=document.getElementById("role-form");r&&(r.onsubmit=u=>Hi(u,t),a||r.querySelectorAll("input").forEach(u=>{const p=u;p.type==="text"?p.addEventListener("input",c):p.addEventListener("change",l)}))}catch(a){console.error(a),e.innerHTML='<p class="error-cell">Failed to load role.</p>'}}async function Hi(t,e){if(t.preventDefault(),e!=="new")return;const s=new FormData(t.target),a={name:s.get("name"),description:s.get("description"),execRanking:s.get("execRanking"),permissions:s.getAll("permissions")};try{await d("POST","/api/admin/roles",a),v("Success","Role created",R.SUCCESS),$("/admin/roles")}catch(n){v("Error",n.message,R.ERROR)}}async function Ri(t){if(t==="new"){$("/admin/roles");return}if(await N("Delete Role","Are you sure you want to delete this role? This might affect many users."))try{await d("DELETE",`/api/admin/roles/${t}`),v("Success","Role deleted",R.SUCCESS),$("/admin/roles")}catch(e){v("Error",e.message,R.ERROR)}}let _e=null,ts=null;async function Fi(){const t=document.getElementById(ie);t&&(_e=new H({id:"image-picker-modal",title:"Choose Image",content:'<div id="modal-upload-widget"></div>',contentClasses:"glass-panel modal-lg"}),t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("globals")}
            </div>
                <div class="glass-table-container">
                    <div class="table-responsive">
                        <table class="glass-table">
                            <thead>
                                <tr>
                                    <th>Setting</th>
                                    <th>Description</th>
                                    <th>Value</th>
                                    <th class="action-col">Action</th>
                                </tr>
                            </thead>
                            <tbody id="globals-table-body">
                                <tr><td colspan="4" class="loading-cell">Loading...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
        </div>

        ${_e.getHTML()}
    `,Oi(),await Gi())}function Oi(){_e&&(_e.attachListeners(),ts=new me("modal-upload-widget",{mode:"inline",selectMode:"single",autoUpload:!0,enableLibrary:!1,inlineLibrary:!0,enableRemove:!1,onImageSelect:({url:t,id:e})=>{Ni(t)},onUploadError:t=>{v("Upload failed",t.message,"error")}}))}let ve=null;async function Ni(t){if(!ve)return;const e=document.querySelector(`.global-input[data-key="${ve}"]`);if(e){e.value=t,document.querySelectorAll(`.image-preview-global[data-key="${ve}"]`).forEach(i=>{const o=i;o.style.backgroundImage=`url('${t}')`;const l=o.querySelector("img");l&&(l.src=t)});const n=(await d("GET","/api/globals").then(i=>i.res||{}))[ve]?.name||ve;await Ba(ve,t,n)}_e&&_e.close()}async function Gi(){const t=document.getElementById("globals-table-body");if(t)try{const s=(await d("GET","/api/globals")).res||{};if(Object.keys(s).length===0){t.innerHTML='<tr><td colspan="4" class="empty-cell">No settings found.</td></tr>';return}t.innerHTML=Object.entries(s).map(([a,n])=>{const i=n?.name||a,o=n?.description||"",l=n?.type||"text";let c="",r="";return l==="image"?(c=`
                    <div class="image-global-display">
                        <div class="image-preview-global" data-key="${a}" style="background-image: url('${n?.data||"/images/misc/ducc.png"}')">
                            <img src="${n?.data||"/images/misc/ducc.png"}" class="uncropped-hover-preview">
                        </div>
                        <input type="hidden" class="global-input" data-key="${a}" value="${n?.data}">
                    </div>
                `,r=`<button class="small-btn picker-btn" data-key="${a}" title="Change Image">${je}</button>`):(c=`<input type="${l}" class="global-input modern-input" data-key="${a}" value="${n?.data}">`,r=`<button class="save-global-btn icon-btn" data-key="${a}" title="Save">${Ot}</button>`),`
                    <tr class="global-row" data-key="${a}">
                        <td data-label="Setting" class="primary-text"><strong>${i}</strong></td>
                        <td data-label="Description" class="description-cell">${o}</td>
                        <td data-label="Value">${c}</td>
                        <td data-label="Actions">${r}</td>
                    </tr>`}).join(""),t.querySelectorAll(".picker-btn").forEach(a=>{a.onclick=()=>{if(ve=a.dataset.key||null,_e&&ve){_e.show();const n=t.querySelector(`.global-input[data-key="${ve}"]`)?.value;n&&ts&&ts.setPreview(n)}}}),t.querySelectorAll(".image-preview-global").forEach(a=>{a.onclick=n=>{n.stopPropagation();const i=a.classList.contains("preview-open");document.querySelectorAll(".image-preview-global.preview-open").forEach(o=>o.classList.remove("preview-open")),i||a.classList.add("preview-open")}}),document.addEventListener("click",()=>{document.querySelectorAll(".image-preview-global.preview-open").forEach(a=>{a.classList.remove("preview-open")})},{once:!1});for(const[a]of Object.entries(s)){const n=t.querySelector(`.save-global-btn[data-key="${a}"]`);n&&n.addEventListener("click",async()=>{const i=t.querySelector(`.global-input[data-key="${a}"]`);if(i){const o=i.value,l=s[a]?.name||a;await Ba(a,o,l)}})}}catch(e){console.error(e),t.innerHTML='<tr><td colspan="4" class="error-cell">Error loading globals.</td></tr>'}}async function Ba(t,e,s){const n={value:isNaN(e)||e.trim()===""?e:parseFloat(e)};await d("POST",`/api/globals/${t}`,n).then(()=>{v("Success",`Updated ${s}`,"success")}).catch(i=>{v(`Failed to Update ${s}`,i.message||i,"error")})}let z={page:1,limit:15,search:"",sort:"date",order:"desc",categoryId:""},ye=null,we=null,Fe=null;async function Ui(){const t=document.getElementById(ie);t&&(ye=new H({id:"upload-files-modal",title:"Upload Files",contentClasses:"glass-panel",content:`
            <form id="multi-upload-form" class="modern-form">
                <div id="bulk-upload-widget"></div>
                <div class="grid-2-col">
                    <label>Category
                        <select class="category-select modern-select" name="categoryId" required></select>
                    </label>
                    <label>Visibility
                        <select name="visibility" class="modern-select">
                            <option value="members">Members</option>
                            <option value="public">Public</option>
                            <option value="execs">Execs Only</option>
                        </select>
                    </label>
                </div>
                <footer>
                    <button type="submit" class="wide-btn">Upload All</button>
                </footer>
            </form>
        `}),we=new H({id:"edit-file-modal",title:"Edit File",contentClasses:"glass-panel",content:`
            <form id="edit-file-form" class="modern-form">
                <input type="hidden" name="id">
                <label>Title
                    <input type="text" name="title" required>
                </label>
                <div class="grid-2-col">
                    <label>Author
                        <input type="text" name="author" required>
                    </label>
                    <label>Date
                        <input type="date" name="date" required>
                    </label>
                </div>
                <div class="grid-2-col">
                    <label>Category
                        <select class="category-select modern-select" name="categoryId" required></select>
                    </label>
                    <label>Visibility
                        <select name="visibility" class="modern-select">
                            <option value="members">Members</option>
                            <option value="public">Public</option>
                            <option value="execs">Execs Only</option>
                        </select>
                    </label>
                </div>
                <footer>
                    <button type="submit" class="wide-btn">Save Changes</button>
                </footer>
            </form>
        `}),Fe=new H({id:"categories-modal",title:"Manage Categories",contentClasses:"glass-panel",content:`
            <div id="categories-list-container" class="categories-list"></div>
            <form id="new-category-form" class="inline-add-form">
                <input type="text" name="name" placeholder="New Category Name" required class="flex-grow">
                <select name="default_visibility" class="modern-select compact">
                    <option value="members">Members</option>
                    <option value="public">Public</option>
                    <option value="execs">Execs</option>
                </select>
                <button type="submit" class="icon-btn">${Lt}</button>
            </form>
        `}),t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                ${await qe("files")}
                <div class="toolbar-content">
                    <div class="toolbar-left">
                        <div class="search-bar">
                            <input type="text" id="admin-file-search-input" placeholder="Search title, content or filename: content:" value="${z.search}">
                            <button id="admin-file-search-btn" class="search-icon-btn" title="Search">
                                ${Be}
                            </button>
                        </div>
                    </div>
                    <div class="toolbar-right">
                        <select id="admin-category-filter" class="modern-select compact">
                            <option value="">All Categories</option>
                        </select>
                        <button id="manage-categories-btn" class="small-btn outline secondary">${ua} Categories</button>
                        <button id="upload-files-btn" class="small-btn">${Lt} Upload</button>
                    </div>
                </div>
            </div>

            ${A({content:`
                    <div id="files-admin-content" class="glass-table-container">
                        <div class="table-responsive">
                            <table class="glass-table files-table">
                                <thead id="files-table-head"></thead>
                                <tbody id="admin-files-list">
                                    <tr><td colspan="6" class="loading-cell">Loading...</td></tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div id="admin-files-pagination" class="pagination"></div>
                `})}
        </div>

        ${ye.getHTML()}
        ${we.getHTML()}
        ${Fe.getHTML()}
    `,Zi(),await Promise.all([Te(),Et()]))}async function Te(){const t=document.getElementById("admin-files-list"),e=document.getElementById("files-table-head");if(!t||!e)return;const s=[{key:"title",label:"Title",sort:"title"},{key:"category_name",label:"Category",sort:"category_name"},{key:"author",label:"Author",sort:"author"},{key:"visibility",label:"Visibility",sort:"visibility"},{key:"date",label:"Date",sort:"date"}];e.innerHTML=`<tr>${s.map(i=>`
        <th class="sortable" data-sort="${i.sort}" data-label="${i.label}">
            ${i.label} ${z.sort===i.sort?z.order==="asc"?ct:dt:ut}
        </th>
    `).join("")}<th data-label="Actions" class="action-col">Actions</th></tr>`,e.querySelectorAll("th.sortable").forEach(i=>{i.onclick=()=>{const o=i.dataset.sort;z.sort===o?z.order=z.order==="asc"?"desc":"asc":(z.sort=o,z.order="asc"),Te()}});const a={};Object.keys(z).forEach(i=>{a[i]=String(z[i])});const n=new URLSearchParams(a).toString();try{const i=await d("GET",`/api/files?${n}`),{files:o,totalPages:l}=i.data;if(o.length===0){t.innerHTML='<tr><td colspan="6" class="empty-cell">No files found.</td></tr>';return}t.innerHTML=o.map(r=>`
            <tr>
                <td data-label="Title" class="primary-text"><strong>${r.title}</strong></td>
                <td data-label="Category"><span class="badge neutral">${r.category_name||"Uncategorised"}</span></td>
                <td data-label="Author">${r.author}</td>
                <td data-label="Visibility"><span class="tag-badge ${r.visibility}">${r.visibility}</span></td>
                <td data-label="Date">
                    <span class="full-date">${new Date(r.date).toLocaleDateString("en-GB")}</span>
                </td>
                <td data-label="Actions">
                    <div class="row-actions">
                        <button class="icon-btn edit-file" data-id="${r.id}" title="Edit">${he}</button>
                        <button class="icon-btn delete-file delete" data-id="${r.id}" title="Delete">${fe}</button>
                    </div>
                </td>
            </tr>
        `).join("");const c=document.getElementById("admin-files-pagination");c&&new Pe(c,u=>{z.page=u,Te()}).render(z.page,l)}catch{t.innerHTML='<tr><td colspan="6" class="error-cell">Error loading files.</td></tr>'}}async function Et(){const t=document.getElementById("admin-category-filter");if(t)try{const s=(await d("GET","/api/file-categories")).data||[];t.innerHTML='<option value="">All Categories</option>'+s.map(a=>`<option value="${a.id}">${a.name}</option>`).join(""),t.value=z.categoryId}catch(e){console.error("Failed to load categories",e)}}async function Ks(){try{const e=(await d("GET","/api/file-categories")).data||[];document.querySelectorAll(".category-select").forEach(a=>{a.innerHTML=e.map(n=>`<option value="${n.id}">${n.name}</option>`).join("")})}catch{}}async function Vt(){const t=document.getElementById("categories-list-container");if(t)try{const s=(await d("GET","/api/file-categories")).data||[];t.innerHTML=s.map(a=>`
            <div class="category-item">
                <input type="text" class="cat-name-input compact-input" value="${a.name}" data-id="${a.id}">
                <select class="cat-visibility-select modern-select compact" data-id="${a.id}">
                    <option value="members" ${a.default_visibility==="members"?"selected":""}>Members</option>
                    <option value="public" ${a.default_visibility==="public"?"selected":""}>Public</option>
                    <option value="execs" ${a.default_visibility==="execs"?"selected":""}>Execs</option>
                </select>
                <button class="icon-btn delete-cat delete" data-id="${a.id}" title="Delete">${fe}</button>
            </div>
        `).join("")}catch{}}function Zi(){const t=document.getElementById("admin-file-search-input"),e=document.getElementById("admin-file-search-btn");e&&t&&(e.onclick=()=>{z.search=t.value,z.page=1,Te()},t.onkeypress=h=>{h.key==="Enter"&&e.click()});const s=document.getElementById("admin-category-filter");s&&(s.onchange=h=>{z.categoryId=h.target.value,z.page=1,Te()}),ye&&ye.attachListeners(),we&&we.attachListeners(),Fe&&Fe.attachListeners();const a=document.getElementById("upload-files-btn");a&&(a.onclick=async()=>{await Ks(),ye&&ye.show()});const n=document.getElementById("manage-categories-btn");n&&(n.onclick=async()=>{await Vt(),Fe&&Fe.show()});const i=new me("bulk-upload-widget",{mode:"modal",selectMode:"multiple",autoUpload:!1,onUploadComplete:async()=>{ye&&ye.close(),await Te(),v("Success","Files uploaded","success"),i.reset()}}),o=document.getElementById("multi-upload-form");o&&(o.onsubmit=async h=>{if(h.preventDefault(),i.files.length===0){v("Warning","Please select files to upload",R.WARNING);return}const m=new FormData(h.target);i.manualUpload({categoryId:m.get("categoryId"),visibility:m.get("visibility")})});const l=document.getElementById("edit-file-form");l&&(l.onsubmit=async h=>{h.preventDefault();const m=new FormData(h.target),f=m.get("id");try{await d("PUT",`/api/files/${f}`,{title:m.get("title"),author:m.get("author"),date:m.get("date"),categoryId:m.get("categoryId"),visibility:m.get("visibility")}),we&&we.close(),await Te(),v("Success","File updated","success")}catch{v("Error","Update failed","error")}});const c=document.getElementById("new-category-form");c&&(c.onsubmit=async h=>{h.preventDefault();const m=new FormData(h.target);try{await d("POST","/api/file-categories",{name:m.get("name"),default_visibility:m.get("default_visibility")}),h.target.reset(),await Vt(),await Et(),v("Success","Category created","success")}catch{v("Error","Creation failed","error")}});const r=async h=>{const m=h.target,f=m.closest(".edit-file");if(f){const w=f.dataset.id;await Ks();const x=(await d("GET","/api/files?limit=1000")).data.files.find(E=>E.id==w);if(x){const E=document.getElementById("edit-file-form");E&&(E.elements.namedItem("id").value=x.id,E.elements.namedItem("title").value=x.title,E.elements.namedItem("author").value=x.author,E.elements.namedItem("date").value=x.date.split("T")[0],E.elements.namedItem("categoryId").value=x.category_id||"",E.elements.namedItem("visibility").value=x.visibility,we&&we.show())}}const b=m.closest(".delete-file");if(b){const w=b.dataset.id;await N("Delete File","Are you sure you want to delete this file?")&&(await d("DELETE",`/api/files/${w}`),await Te(),v("Success","File deleted","success"))}const g=m.closest(".delete-cat");if(g){const w=g.dataset.id;await N("Delete Category","Delete category? Files in this category will be uncategorised.")&&(await d("DELETE",`/api/file-categories/${w}`),await Vt(),await Et(),v("Success","Category removed","success"))}},u=document.getElementById("admin-files-list");u&&(u.onclick=r);const p=document.getElementById("categories-list-container");p&&(p.onclick=r,p.onchange=async h=>{const m=h.target,f=m.dataset.id,b=m.closest(".category-item");if(!f||!b)return;const g=b.querySelector(".cat-name-input").value,w=b.querySelector(".cat-visibility-select").value;try{await d("PUT",`/api/file-categories/${f}`,{name:g,default_visibility:w}),await Et(),v("Success","Category updated",R.SUCCESS)}catch{v("Error","Failed to update category",R.ERROR)}})}let xe=null,ss=null;async function ji(){const t=document.getElementById(ie);t&&(xe=new H({id:"slide-upload-modal",title:"Add Slide",content:'<div id="slide-upload-widget"></div>',contentClasses:"glass-panel modal-lg"}),t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("slides")}
            </div>
            
            ${A({title:"Manage Slideshow",icon:je,action:`<button id="add-slide-btn" class="main-btn small-btn">${U} Add Slide</button>`,content:`
                    <div id="slides-grid" class="image-grid mt-2">
                        <p class="loading-cell">Loading slides...</p>
                    </div>
                `})}
        </div>

        ${xe.getHTML()}
    `,Vi(),await kt())}function Vi(){if(!xe)return;xe.attachListeners();const t=document.getElementById("add-slide-btn");t&&(t.onclick=()=>{xe&&xe.show()}),ss=new me("slide-upload-widget",{mode:"inline",selectMode:"single",autoUpload:!0,enableLibrary:!1,inlineLibrary:!0,accept:"image/*",onImageSelect:async({url:e,id:s})=>{await Wi(e,s)},onUploadError:e=>{v("Error",e.message,R.ERROR)}})}async function Wi(t,e){xe&&xe.close();try{if(e)await d("POST","/api/slides/import",{fileId:e});else if(t){v("Info","Direct URL slides are not supported via import. Please upload files.",R.INFO);return}v("Success","Slide added",R.SUCCESS),await kt(),setTimeout(async()=>await kt(),500)}catch{v("Error","Failed to add slide",R.ERROR)}}async function kt(){const t=document.getElementById("slides-grid");if(t)try{t.innerHTML='<p class="loading-cell">Loading slides...</p>';const s=(await d("GET","/api/slides/images")).slides||[];if(s.length===0){t.innerHTML='<p class="empty-cell">No slides found.</p>';return}t.innerHTML=s.map(a=>`
            <div class="image-item slide-item" style="background-image: url('${a.url}')">
                <div class="slide-actions">
                    <button class="delete-slide-btn delete-icon-btn" data-file-id="${a.id}" title="Delete Slide">
                        ${fe}
                    </button>
                </div>
            </div>
        `).join(""),t.querySelectorAll(".delete-slide-btn").forEach(a=>{a.onclick=async n=>{if(n.stopPropagation(),!await N("Delete Slide","Are you sure you want to delete this slide?"))return;const i=a.dataset.fileId;try{await d("DELETE","/api/slides",{fileId:i}),v("Success","Slide deleted",R.SUCCESS),await kt()}catch{v("Error","Failed to delete slide",R.ERROR)}}}),ss&&(ss.options.exclude=s.map(a=>a.url))}catch{t.innerHTML='<p class="error-cell">Failed to load slides.</p>'}}async function zi(){const t=document.getElementById(ie);if(!t)return;const e=new URLSearchParams(window.location.search),s=e.get("search")||"",a=e.get("sort")||"created_at",n=e.get("order")||"desc",i=parseInt(e.get("page")||"1")||1;t.innerHTML=`
        <div class="glass-layout">
            <div class="glass-toolbar">
                 ${await qe("quotes")}
                 <div class="toolbar-content">
                    <div class="search-bar">
                        <input type="text" id="quote-search-input" placeholder="Search quotes..." value="${s}">
                        <button id="user-search-btn" class="search-icon-btn">
                            ${Be}
                        </button>
                    </div>
                 </div>
            </div>
            <div class="glass-table-container">
                <div class="table-responsive">
                    <table class="glass-table quotes-table">
                        <thead id="quotes-table-head"></thead>
                        <tbody id="quotes-table-body">
                            <tr><td colspan="5" class="loading-cell">Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            <div id="quotes-pagination"></div>
        </div>
    `;const o=document.getElementById("quote-search-input"),l=document.getElementById("user-search-btn");l&&o&&(l.onclick=()=>Xe({search:o.value,page:1}),o.onkeypress=c=>{c.key==="Enter"&&l.click()}),await Pa({page:i,search:s,sort:a,order:n})}function Xe(t){const e=new URLSearchParams(window.location.search);for(const[s,a]of Object.entries(t))a?e.set(s,String(a)):e.delete(s);window.history.pushState({},"",`${window.location.pathname}?${e.toString()}`),Pa({page:parseInt(e.get("page")||"1")||1,search:e.get("search")||"",sort:e.get("sort")||"created_at",order:e.get("order")||"desc"})}async function Pa({page:t,search:e,sort:s,order:a}){const n=document.getElementById("quotes-table-head"),i=document.getElementById("quotes-table-body");if(!n||!i)return;const o=[{key:"text",label:"Quote",sort:"text"},{key:"quoted_user",label:"Person",sort:"quoted_user"},{key:"submitted_by",label:"Submitter",sort:null},{key:"visibility",label:"Status",sort:"visibility"}];n.innerHTML=`<tr>${o.map(l=>`
        <th class="${l.sort?"sortable":""}" data-sort="${l.sort||""}">
            ${l.label} ${l.sort?s===l.sort?a==="asc"?ct:dt:ut:""}
        </th>
    `).join("")}<th class="text-right">Actions</th></tr>`,n.querySelectorAll("th.sortable").forEach(l=>{l.onclick=()=>{const c=new URLSearchParams(window.location.search).get("sort")||"created_at",r=new URLSearchParams(window.location.search).get("order")||"desc",u=l.dataset.sort;Xe({sort:u,order:c===u&&r==="asc"?"desc":"asc"})}});try{const l=new URLSearchParams({page:String(t),limit:"15",search:String(e),sort:String(s),order:String(a)}),c=await d("GET",`/api/admin/quotes?${l.toString()}`),r=c.data.quotes||[],u=c.data.totalPages||1;r.length===0?i.innerHTML='<tr><td colspan="5" class="empty-cell">No quotes found matching criteria.</td></tr>':(i.innerHTML=r.map(h=>`
                <tr class="quote-row">
                    <td data-label="Quote" class="primary-text quote-text-cell">"${h.text}"</td>
                    <td data-label="Person">${h.quoted_user.first_name} ${h.quoted_user.last_name}</td>
                    <td data-label="Submitter">${h.submitted_by?`${h.submitted_by.first_name} ${h.submitted_by.last_name}`:"Unknown"}</td>
                    <td data-label="Status">
                        <span class="status-badge status-${h.visibility}">${h.visibility}</span>
                    </td>
                    <td data-label="Actions" class="text-right action-cell">
                        <div class="button-group">
                            ${h.visibility!=="public"?`
                                <button class="button success icon-only mini-btn" data-action="release" data-id="${h.id}" title="Release">
                                    ${Ft}
                                </button>
                            `:""}
                            ${h.visibility!=="hidden"?`
                                <button class="button warning icon-only mini-btn" data-action="hide" data-id="${h.id}" title="Hide">
                                    ${te}
                                </button>
                            `:""}
                            <button class="button danger icon-only mini-btn" data-action="delete" data-id="${h.id}" title="Delete">
                                ${fe}
                            </button>
                        </div>
                    </td>
                </tr>
            `).join(""),i.querySelectorAll("button[data-action]").forEach(h=>{h.onclick=async m=>{m.stopPropagation();const f=h.dataset.action,b=h.dataset.id;if(f==="delete"){if(!confirm("Are you sure you want to delete this quote?"))return;try{await d("DELETE",`/api/admin/quotes/${b}`),v("Quote deleted.","success"),Xe({})}catch(g){v(g.message||"Failed to delete quote.","error")}}else{const g=f==="release"?"public":"hidden";try{await d("POST",`/api/admin/quotes/${b}/visibility`,{visibility:g}),v(`Quote marked as ${g}.`,"success"),Xe({})}catch(w){v(w.message||"Failed to update visibility.","error")}}}}));const p=document.getElementById("quotes-pagination");p&&new Pe(p,h=>{Xe({page:h})}).render(t,u)}catch{i&&(i.innerHTML='<tr><td colspan="5" class="error-cell">Error loading quotes for moderation.</td></tr>')}}const ie="admin-content";async function qe(t){const e=document.getElementById("admin-main-nav");e&&e._syncToggleGroup&&e._syncToggleGroup();const[s,a]=await Promise.all([d("GET","/api/user/elements/permissions",!0).catch(()=>({})),d("GET","/api/globals/status",!0).catch(()=>null)]),n=s.permissions||[],i=!!a,o=n.includes("user.manage"),l=n.includes("event.manage.all")||n.includes("event.manage.scoped"),c=n.includes("transaction.manage"),r=n.includes("role.manage"),u=n.includes("document.write")||n.includes("document.edit"),p=n.includes("quote.manage"),h=n.length>0,m=(f,b,g)=>`
        <button data-nav="${f}" class="tab-btn ${t===g?"active":""}">
            ${b}
        </button>
    `;return setTimeout(()=>{const f=document.getElementById("admin-main-nav");f&&mt.initElement(f)},50),`
        <nav class="toggle-group admin-nav-group" id="admin-main-nav">
            <div class="toggle-bg"></div>
            ${o||c||h?m("/admin/users","Users","users"):""}
            ${l?m("/admin/events","Events","events"):""}
            ${l?m("/admin/tags","Tags","tags"):""}
            ${u?m("/admin/files","Files","files"):""}
            ${p?m("/admin/quotes","Quotes","quotes"):""}
            ${r?m("/admin/roles","Roles","roles"):""}
            ${h?m("/admin/slides","Slides","slides"):""}
            ${i?m("/admin/globals","Globals","globals"):""}
        </nav>
    `}O("/admin","admin");O("/admin/*","admin");const Yi=`
<div id="admin-view" class="view hidden small-container">
    <div class="admin-header-modern">
        <h1 id="admin-dashboard-title">Admin Dashboard</h1>
        <div id="admin-header-actions" class="header-actions"></div>
    </div>
    <div id="${ie}" class="admin-content-wrapper">
        <p class="loading-text">Loading...</p>
    </div>
</div>`;function pe(t){const e=document.getElementById("admin-dashboard-title");e&&(t?e.innerHTML=`<span class="admin-title-section">${t}</span>`:e.innerHTML='<span class="admin-title-section">Dashboard</span>')}async function Ki({viewId:t,path:e}){if(t!=="admin")return;document.querySelectorAll(".toggle-group[id]").forEach(k=>{const _=k;_._syncToggleGroup&&_._syncToggleGroup()});const[s,a,n]=await Promise.all([gs(),d("GET","/api/user/elements/permissions",!0),d("GET","/api/globals/status",!0).catch(()=>({}))]);if(!s)return;const i=a.permissions||[];if(i.length===0){$("/unauthorised");return}const o=i.includes("user.manage"),l=i.includes("event.manage.all")||i.includes("event.manage.scoped"),c=i.includes("transaction.manage"),r=i.includes("role.manage"),u=i.includes("document.write")||i.includes("document.edit"),p=i.includes("quote.manage"),h=i.length>0,m=!!n,f=document.getElementById(ie);if(!f)return;const b=document.getElementById("admin-header-actions");pe(),b&&(b.innerHTML="");const g=e.split("?")[0],w=o||c||h,T=l,x=l,E=r,L=m,S=u,C=p;if(g==="/admin/users"||g.match(/^\/admin\/user\/\d+$/)){if(!w)return $("/unauthorised");pe(g.match(/\d+$/)?"User Details":"Users"),g==="/admin/users"?await hi():await Ei(g.split("/").pop())}else if(g==="/admin/events"||g.match(/^\/admin\/event\/(new|\d+)$/)){if(!T)return $("/unauthorised");pe(g.match(/(new|\d+)$/)?"Event Details":"Events"),g==="/admin/events"?await $i():await Ii(g.split("/").pop())}else if(g==="/admin/tags"||g.match(/^\/admin\/tag\/(new|\d+)$/)){if(!x)return $("/unauthorised");pe(g.match(/(new|\d+)$/)?"Tag Details":"Tags"),g==="/admin/tags"?await Mi():await ki(g.split("/").pop())}else if(g==="/admin/roles"||g.match(/^\/admin\/role\/(new|\d+)$/)){if(!E)return $("/unauthorised");pe(g.match(/(new|\d+)$/)?"Role Details":"Roles"),g==="/admin/roles"?await Bi():await Di(g.split("/").pop())}else if(g==="/admin/files"){if(!S)return $("/unauthorised");pe("Files"),await Ui()}else if(g==="/admin/quotes"){if(!C)return $("/unauthorised");pe("Quotes"),await zi()}else if(g==="/admin/globals"){if(!L)return $("/unauthorised");pe("Globals"),await Fi()}else if(g==="/admin/slides"){if(!h)return $("/unauthorised");pe("Slides"),await ji()}else if(g==="/admin"||g==="/admin/"){let k="";w&&(k+=be("Users","Manage members & permissions",ge,"/admin/users")),h&&(k+=be("Slides","Homepage slideshow",je,"/admin/slides")),T&&(k+=be("Events","Schedule & attendance",za,"/admin/events")),x&&(k+=be("Tags","Event categories & styles",xt,"/admin/tags")),S&&(k+=be("Files","Documents & resources",ua,"/admin/files")),C&&(k+=be("Quotes","Moderate club quotes",xt,"/admin/quotes")),E&&(k+=be("Roles","User roles & access",it,"/admin/roles")),L&&(k+=be("Globals","System configuration",rs,"/admin/globals")),f.innerHTML=`
            <div class="dashboard-grid">
                ${k}
            </div>
        `}}function be(t,e,s,a){return`
        <button class="dashboard-card" data-nav="${a}">
            <div class="card-icon">${s}</div>
            <div class="card-content">
                <h3>${t}</h3>
                <p>${e}</p>
            </div>
        </button>
    `}G.subscribe(Ki);const Qs=document.querySelector("main");Qs&&Qs.insertAdjacentHTML("beforeend",Yi);O("/files","files");const Qi=`
<div id="files-view" class="view hidden small-container">
    <div class="files-header">
        <div class="files-title-row">
            <h1>Files</h1>
        </div>
        <div class="files-controls">
            <button id="manage-files-btn" class="hidden secondary" data-nav="/admin/files">Manage Files</button>
            <div class="search-box">
                <span class="icon">${Be}</span>
                <input type="text" id="file-search" placeholder="Search title, content or filename: content:">
            </div>
            <select id="category-filter">
                <option value="">All Categories</option>
            </select>
        </div>
    </div>

    <div class="files-table-wrapper">
        <table class="files-table">
            <thead id="files-table-head"></thead>
            <tbody id="files-list">
                <tr><td colspan="5" class="text-centre">Loading...</td></tr>
            </tbody>
        </table>
    </div>

    <div id="files-pagination" class="pagination"></div>
</div>`;let X={page:1,limit:15,search:"",sort:"date",order:"desc",categoryId:""};function Ji(t){if(t===0)return"0 B";const e=1024,s=["B","KB","MB","GB"],a=Math.floor(Math.log(t)/Math.log(e));return parseFloat((t/Math.pow(e,a)).toFixed(1))+" "+s[a]}async function Xi(){const t=document.getElementById("category-filter");if(t)try{const s=(await d("GET","/api/file-categories")).data||[];t.innerHTML='<option value="">All Categories</option>'+s.map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}catch(e){console.error("Failed to load categories",e)}}async function eo(){const t=document.getElementById("manage-files-btn");if(t)try{const s=(await d("GET","/api/user/elements/permissions").catch(()=>({}))).permissions||[];s.includes("file.write")||s.includes("file.edit")?t.classList.remove("hidden"):t.classList.add("hidden")}catch{}}async function rt(){const t=document.getElementById("files-list"),e=document.getElementById("files-table-head");if(!t||!e)return;const s=[{key:"title",label:"Title",sort:"title"},{key:"author",label:"Author",sort:"author"},{key:"date",label:"Date",sort:"date"},{key:"size",label:"Size",sort:"size"}];e.innerHTML=`<tr>${s.map(i=>`
        <th class="sortable" data-sort="${i.sort}" data-label="${i.label}">
            ${i.label} ${X.sort===i.sort?X.order==="asc"?ct:dt:ut}
        </th>
    `).join("")}<th data-label="Action">Action</th></tr>`,e.querySelectorAll("th.sortable").forEach(i=>{i.onclick=()=>{const o=i.dataset.sort;X.sort===o?X.order=X.order==="asc"?"desc":"asc":(X.sort=o,X.order="asc"),rt()}});const a={};Object.keys(X).forEach(i=>{a[i]=String(X[i])});const n=new URLSearchParams(a).toString();try{const i=await d("GET",`/api/files?${n}`),{files:o,totalPages:l}=i.data;if(o.length===0){t.innerHTML='<tr><td colspan="5" class="text-centre">No files found.</td></tr>';return}t.innerHTML=o.map(r=>{const u=["pdf","jpg","jpeg","png","gif","svg","webp","txt","mp4","webm","mp3"],p=r.filename.split(".").pop()?.toLowerCase()||"",h=u.includes(p),m=`/api/files/${r.id}/download${h?"?view=true":""}`,f=h?'target="_blank"':"";return`
                <tr>
                    <td data-label="Title">
                        <div class="file-title">
                            <strong>${r.title}</strong>
                            <span class="file-category">${r.category_name||"Uncategorised"}</span>
                        </div>
                    </td>
                    <td data-label="Author">${r.author}</td>
                    <td data-label="Date">
                        <span class="full-date">${new Date(r.date).toLocaleDateString("en-GB")}</span>
                        <span class="short-date">
                            <span>${new Date(r.date).getDate().toString().padStart(2,"0")}</span>
                            <span>${new Date(r.date).toLocaleString("en-GB",{month:"short"})}</span>
                            <span>${new Date(r.date).getFullYear().toString().slice(-2)}</span>
                        </span>
                    </td>
                    <td data-label="Size">${Ji(r.size)}</td>
                    <td data-label="Action">
                        <a href="${m}" class="download-btn" title="${h?"View":"Download"}" ${f}>
                            ${Ua}
                        </a>
                    </td>
                </tr>
            `}).join("");const c=document.getElementById("files-pagination");c&&new Pe(c,u=>{X.page=u,rt()}).render(X.page,l)}catch{t.innerHTML='<tr><td colspan="5" class="text-centre error">Failed to load files.</td></tr>'}}G.subscribe(async({viewId:t})=>{t==="files"&&(await eo(),await Xi(),await rt())});document.addEventListener("DOMContentLoaded",()=>{const t=document.querySelector("main");t&&t.insertAdjacentHTML("beforeend",Qi),document.addEventListener("input",e=>{const s=e.target;s.id==="file-search"&&(X.search=s.value,X.page=1,rt())}),document.addEventListener("change",e=>{const s=e.target;s.id==="category-filter"&&(X.categoryId=s.value,X.page=1,rt())})});const Js=`

    <footer>

        <div class="small-container">

            <div id="footer-quote-container" class="footer-quote hidden">

                <p id="footer-quote-text"></p>

                <cite id="footer-quote-author"></cite>

            </div>

            <div class="footer-content">

                <div class="social-links">

                    <a href="https://www.facebook.com/DurhamUniversityCanoeClub" target="_blank" aria-label="Facebook">

                        <img src="/images/icons/outline/brand-facebook.svg" alt="Facebook">

                    </a>

                    <a href="https://www.instagram.com/durhamuniversitycanoe/" target="_blank" aria-label="Instagram">

                        <img src="/images/icons/outline/brand-instagram.svg" alt="Instagram">

                    </a>

                    <a href="mailto:canoe.club@durham.ac.uk" aria-label="Email">

                        ${oa}

                    </a>

                </div>

            </div>

            <div class="footer-bottom">

                <p>&copy; 2025 Durham University Canoe Club. All rights reserved.</p>

            </div>

        </div>

    </footer>

`,Xs=document.querySelector("main");Xs?Xs.insertAdjacentHTML("afterend",Js):document.body.insertAdjacentHTML("beforeend",Js);async function to(){try{const t=await d("GET","/api/quotes/random"),e=document.getElementById("footer-quote-container"),s=document.getElementById("footer-quote-text"),a=document.getElementById("footer-quote-author");t&&e&&s&&a&&(s.textContent=`"${t.text}"`,a.textContent=`- ${t.quoted_first_name} ${t.quoted_last_name}`,e.classList.remove("hidden"))}catch{}}document.addEventListener("DOMContentLoaded",to);O("/reset-password","reset-password");const so=`
<div id="reset-password-view" class="view hidden">
    <div class="small-container">
        <h1>Reset Password</h1>
        <div class="form-info">
            <article class="form-box">
                <h3>
                    ${oa}
                    Request Password Reset
                </h3>
                <form id="reset-password-form">
                    <div>
                        <label for="reset-email">Email:</label>
                        <div class="durham-email-wrapper">
                            <input id="reset-email" name="email" placeholder="username">
                            <span class="email-suffix">@durham.ac.uk</span>
                        </div>
                    </div>
                    <div id="reset-password-footer">
                        <button type="submit">Send Reset Link</button>
                    </div>
                </form>
                <p>Remembered it? <a data-nav="/login">Login</a></p>
            </article>
        </div>
    </div>
</div>`;function ao({resolvedPath:t}){if(t==="/reset-password"){d("GET","/api/auth/status").then((s=>{s.authenticated&&$("/events")}));const e=document.getElementById("reset-email");e&&(e.value="")}}document.addEventListener("DOMContentLoaded",()=>{document.querySelector("main").insertAdjacentHTML("beforeend",so);const t=document.getElementById("reset-password-form"),e=document.getElementById("reset-email");e.addEventListener("input",()=>{e.removeAttribute("aria-invalid"),e.value.includes("@")&&(e.value=e.value.split("@")[0])}),t.addEventListener("submit",async s=>{s.preventDefault();let a=document.getElementById("reset-email").value;a&&!a.includes("@")&&(a+="@durham.ac.uk");try{const n=await d("POST","/api/auth/reset-password-request",{email:a});v("Success",n.message||"Reset link sent! Please check your email.","success",5e3,"reset-status")}catch(n){v("Error",n.message||n||"Failed to send reset link.","error",2e3,"reset-status"),e.ariaInvalid="true"}}),G.subscribe(ao)});O("/set-password","set-password");const no=`
<div id="set-password-view" class="view hidden">
    <div class="small-container">
        <h1>Set New Password</h1>
        <div class="form-info">
            <article class="form-box">
                <h3>
                    ${Rt}
                    Enter New Password
                </h3>
                <form id="set-password-form">
                    <input type="hidden" id="set-password-token">
                    <div>
                        <label for="new-password">New Password:</label>
                        <input type="password" id="new-password" name="newPassword">
                    </div>
                    <div>
                        <label for="confirm-password">Confirm Password:</label>
                        <input type="password" id="confirm-password" name="confirmPassword">
                    </div>
                    <div id="set-password-footer">
                        <button id="set-password-submit" type="submit">Update Password</button>
                    </div>
                </form>
            </article>
        </div>
    </div>
</div>`;function io({resolvedPath:t}){if(t==="/set-password"){d("GET","/api/auth/status").then((l=>{l.authenticated&&$("/events")}));const s=new URLSearchParams(window.location.search).get("token"),a=document.getElementById("set-password-token"),n=document.getElementById("set-password-form");if(s)a&&(a.value=s),n&&(n.querySelector("button").disabled=!1);else{n&&(n.querySelector("button").disabled=!0),v("Error","Invalid or missing token.","error",3e3),setTimeout(()=>$("/reset-password"),3e3);return}const i=document.getElementById("new-password"),o=document.getElementById("confirm-password");i&&(i.value=""),o&&(o.value="")}}document.addEventListener("DOMContentLoaded",()=>{document.querySelector("main").insertAdjacentHTML("beforeend",no);const t=document.getElementById("set-password-form"),e=document.getElementById("set-password-token");t.addEventListener("submit",async s=>{s.preventDefault();const a=e.value,n=document.getElementById("new-password"),i=n.value,o=document.getElementById("confirm-password"),l=o.value,c=document.getElementById("set-password-submit"),r=[n,o];let u=!1;if(r.forEach(p=>{p.removeAttribute("aria-invalid"),(!p.value||p.value.trim()==="")&&(p.setAttribute("aria-invalid","true"),u=!0)}),u){v("Error","Please fill in all fields.","error",2e3,"set-password-status");return}if(i!==l){v("Error","Passwords do not match.","error",2e3,"set-password-status"),o.setAttribute("aria-invalid","true");return}o.removeAttribute("aria-invalid");try{const p=await d("POST","/api/auth/reset-password",{token:a,newPassword:i});v(p.message||"Success","Password updated successfully. Redirecting to login...","success",1500,"set-password-status"),setTimeout(()=>$("/login"),1e3)}catch(p){v("Error",p.message||p||"Failed to set new password.","error",2e3,"set-password-status"),p.message&&p.message.toLowerCase().includes("token")&&(c.disabled=!0,setTimeout(()=>$("/reset-password"),2e3))}}),G.subscribe(io)});O("/error","error",{changeURL:!1,titleFunc:()=>"Error - Page Not Found"});O("/unauthorised","unauthorised",{titleFunc:()=>"Error - Access Denied",changeURL:!1});O("/no-internet","no-connection",{isOverlay:!0,titleFunc:()=>"Error - No Internet Connection"});const Wt=(t,e,s,a)=>`
    <div id="${t}" class="view hidden">
        <div class="container">
            <div class="error-icon">
                ${e}
            </div>
            <h1>${s}</h1>
            <p>${a}</p>
            <div class="error-actions">
                <!-- Buttons injected dynamically -->
            </div>
        </div>
    </div>
`,bt=document.querySelector("main");bt&&(bt.insertAdjacentHTML("beforeend",Wt("error-view",Ht,"404 - Page Not Found","Oops! The page you are looking for does not exist.<br>It might have been moved, deleted, or you may have typed the address incorrectly.")),bt.insertAdjacentHTML("beforeend",Wt("unauthorised-view",Dt,"Access Denied","You do not have permission to view this page.")),bt.insertAdjacentHTML("beforeend",Wt("no-connection-view",Ja,"No Internet Connection","Please check your network settings.<br>We'll try to reconnect automatically...")));async function oo({viewId:t}){if(t==="error"){const e=document.querySelector("#error-view .error-actions");e&&!e.hasChildNodes()&&(e.innerHTML='<button data-nav="/home">Go to Homepage</button>')}if(t!=="no-connection"){const e=t==="unauthorised"?"unauthorised-view":"error-view",s=document.querySelector(`#${e} .error-actions`);if(!s)return;s.innerHTML='<button disabled aria-busy="true" class="secondary outline">Checking...</button>';try{(await d("GET","/api/auth/status")).authenticated?s.innerHTML=`
                    <button data-nav="/home">Go to Home</button>
                    <button class="secondary outline" data-nav="/events">View Events</button>
                `:s.innerHTML=`
                    <button data-nav="/login">Login</button>
                    <button class="secondary outline" data-nav="/home">Go to Home</button>
                `}catch{s.innerHTML='<button data-nav="/home">Go to Home</button>'}}}G.subscribe(oo);
