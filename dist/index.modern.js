import{r as e,effect as t}from"ulive";export{effect,r}from"ulive";const n=e=>null==e?void 0:e._r,o=e=>n(e)?e.value:e,s=t=>n(t)?t:e(t);let l=e=>e instanceof Node?e:"boolean"==typeof e||null==e?document.createComment(e):document.createTextNode(e),c=(...e)=>e.flat(Infinity).flatMap(e=>{if(!n(e))return[l(e)];let r=l(o(e));return t(()=>{let t=r;r=l(o(e)),t.replaceWith(r)}),[r]});const a=(t,r=null)=>{const n=e(r);return e=>(t().then(t=>{n.value=t.default(e)}),n)},f=(e,r,...s)=>{if("string"==typeof e){let a=(l=e,(...e)=>{if(n(r=e[0])||r instanceof Node||Array.isArray(r)||null==r||"function"!=typeof r&&"object"!=typeof r){const t=document.createElement(l);return t.append(...c(...e)),t}var r;let[s,...a]=e;const f=(e=>/^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(e))(l)?document.createElementNS("http://www.w3.org/2000/svg",l):document.createElement(l);return t(()=>{null!=s&&Object.keys(s||{}).forEach(e=>{let t=o(s[e]);if("style"===e){if("string"==typeof t)f.style.cssText=t;else if("object"==typeof t)for(const e of Object.keys(t)){const r=o(t[e]);f.style.setProperty(e,r)}}else"ref"===e&&"function"==typeof s.ref?s.ref(f,s):"className"===e?f.setAttribute("class",t):e.startsWith("on")&&e.toLowerCase()in window?f.addEventListener(e.toLowerCase().substring(2),t):f.setAttribute(e,t)})}),f.append(...c(...a)),f});return r?a(r,...s):a(...s)}var l;return(r||(r={})).children=s,e(r)},i=({children:e})=>e;export{i as Fragment,f as h,n as isR,a as lazy,s as toR,o as unR};
