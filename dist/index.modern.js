import{r as e,effect as t}from"ulive";export{effect,r}from"ulive";const n=e=>null==e?void 0:e._r,o=e=>n(e)?e.value:e,s=t=>n(t)?t:e(t),i="Fragment";function c(e,r,...n){if("function"==typeof e)return(r||(r={})).children=n,e(r);if("string"==typeof e){const s=function(e,r){if("Fragment"===e)return document.createDocumentFragment();{const n=/^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(e)?document.createElementNS("http://www.w3.org/2000/svg",e):document.createElement(e);return t(()=>{null!=r&&Object.keys(r||{}).forEach(e=>{let t=o(r[e]);if("style"===e){if("string"==typeof t)n.style.cssText=t;else if("object"==typeof t)for(const e of Object.keys(t)){const r=o(t[e]);n.style.setProperty(e,r)}}else"ref"===e&&"function"==typeof r.ref?r.ref(n,r):"className"===e?n.setAttribute("class",t):e.startsWith("on")&&e.toLowerCase()in window?n.addEventListener(e.toLowerCase().substring(2),t):n.setAttribute(e,t)})}),n}}(e,o(r));return function(e,...r){t(()=>{let t=[...r];for(;e.firstChild;)e.removeChild(e.firstChild);for(let r=0;r<t.length;r++){let n=o(t[r]);if(null!=n){if("object"!=typeof n)n=document.createTextNode(n);else if(Array.isArray(n)){t.splice(r,1,...n),r--;continue}e.appendChild(n)}}})}(s,...n),s}throw`Invalid ${e}`}const l=(t,r=null)=>{const n=e(r);return e=>(t().then(t=>{n.value=t.default(e)}),n)};export{i as Fragment,c as h,n as isR,l as lazy,s as toR,o as unR};
