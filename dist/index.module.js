import{r as e,effect as t}from"ulive";export{effect,r}from"ulive";var n=function(e){return null==e?void 0:e._r},o=function(e){return n(e)?e.value:e},i=function(t){return n(t)?t:e(t)},c="Fragment";function a(e){var r=arguments;t(function(){for(var t=[].concat([].slice.call(r,1));e.firstChild;)e.removeChild(e.firstChild);for(var n=0;n<t.length;n++){var i=o(t[n]);if(null!=i){if("object"!=typeof i)i=document.createTextNode(i);else if(Array.isArray(i)){t.splice.apply(t,[n,1].concat(i)),n--;continue}e.appendChild(i)}}})}function f(e,t){var r=[].slice.call(arguments,2);if("function"==typeof e)return(t||(t={})).children=r,e(t);if("string"==typeof e){var n=l(e,o(t));return a.apply(void 0,[n].concat(r)),n}throw"Invalid "+e}var u=function(t,r){void 0===r&&(r=null);var n=e(r);return function(e){return t().then(function(t){n.value=t.default(e)}),n}};function l(e,r){if("Fragment"===e)return document.createDocumentFragment();var n=/^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(e)?document.createElementNS("http://www.w3.org/2000/svg",e):document.createElement(e);return t(function(){null!=r&&Object.keys(r||{}).forEach(function(e){var t=o(r[e]);if("style"===e){if("string"==typeof t)n.style.cssText=t;else if("object"==typeof t)for(var i=0,c=Object.keys(t);i<c.length;i++){var a=c[i],f=o(t[a]);n.style.setProperty(a,f)}}else"ref"===e&&"function"==typeof r.ref?r.ref(n,r):"className"===e?n.setAttribute("class",t):e.startsWith("on")&&e.toLowerCase()in window?n.addEventListener(e.toLowerCase().substring(2),t):n.setAttribute(e,t)})}),n}export{c as Fragment,f as h,n as isR,u as lazy,i as toR,o as unR};
