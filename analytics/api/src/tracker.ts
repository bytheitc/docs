// The script every page loads: <script defer src="<PUBLIC_URL>/script.js" data-site="<site id>">.
//
// About a kilobyte, no cookies, no storage except the opt-out flag, nothing read from the page but
// its URL, the referrer and the viewport width. It counts:
//   · the first page view, and every client-side navigation after it (Next.js uses pushState)
//   · custom events: itc("signup") from code, or data-itc-event="signup" on anything clickable
// It stays silent on localhost, under automation, and when the browser sends Do Not Track or
// Global Privacy Control. localStorage.itc_ignore = "1" opts one browser out (for staff).
//
// Written as ES5 by hand so it runs untranspiled everywhere, and kept here as a string so the
// service has no build step for it.
export const TRACKER = `(function(){
var d=document,w=window,n=navigator,l=location;
var s=d.currentScript||d.querySelector('script[data-site][src*="/script.js"]');
if(!s)return;
var site=s.getAttribute("data-site"),api=s.src.replace(/\\/script\\.js(\\?.*)?$/,"")+"/api/event";
var off=!site||n.doNotTrack==="1"||w.doNotTrack==="1"||n.globalPrivacyControl===true||n.webdriver||/^(localhost|127\\.|0\\.0\\.0\\.0|\\[::1\\])/.test(l.hostname)||l.protocol==="file:";
try{if(w.localStorage.getItem("itc_ignore")==="1")off=true}catch(e){}
var first=true,last=null;
function send(name){
if(off)return;
var b={s:site,u:l.href,w:w.innerWidth};
if(name)b.n=name;
if(first&&!name){b.r=d.referrer;first=false}
var body=JSON.stringify(b);
try{if(n.sendBeacon&&n.sendBeacon(api,body))return}catch(e){}
try{fetch(api,{method:"POST",body:body,keepalive:true,credentials:"omit",mode:"no-cors"})}catch(e){}
}
function page(){if(l.pathname===last)return;last=l.pathname;send()}
var push=history.pushState;
if(push){history.pushState=function(){var r=push.apply(this,arguments);page();return r}}
w.addEventListener("popstate",page);
w.itc=function(name){if(name)send(String(name))};
d.addEventListener("click",function(e){var t=e.target;while(t&&t.getAttribute){var v=t.getAttribute("data-itc-event");if(v){send(v);return}t=t.parentNode}},true);
if(d.visibilityState==="prerender"){d.addEventListener("visibilitychange",function v(){if(d.visibilityState!=="prerender"){d.removeEventListener("visibilitychange",v);page()}})}else page();
})();
`;
