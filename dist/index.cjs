var e=require("ulive"),t=function(e){return null==e?void 0:e._r},n=function(e){return t(e)?e.value:e},r=function(n){return t(n)?n:e.r(n)},o=function(e){return e instanceof Node?e:"function"==typeof e?e():"boolean"==typeof e||null==e?document.createComment(e):document.createTextNode(e)},f=function(f){return[].slice.call(arguments,1).flat(Infinity).flatMap(function(u){if(!t(u))return[o(u)];var c=[];return e.effect(function(){for(var e=[n(r(u))].flat(Infinity).map(function(e){var t=o(e);return f.insertBefore(t,c[0]||null),t}),t=0;t<c.length;t++)f.removeChild(c[t]);c=e}),c})},u=function(t,r){var o=/^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(t)?document.createElementNS("http://www.w3.org/2000/svg",t):document.createElement(t);return e.effect(function(){null!=r&&Object.keys(r||{}).forEach(function(e){var t=n(r[e]);if("style"===e){if("string"==typeof t)o.style.cssText=t;else if("object"==typeof t)for(var f=0,u=Object.keys(t);f<u.length;f++){var c=u[f],i=n(t[c]);o.style.setProperty(c,i)}}else"ref"===e&&"function"==typeof r.ref?r.ref(o,r):"className"===e?o.setAttribute("class",t):e.startsWith("on")&&e.toLowerCase()in window?o.addEventListener(e.toLowerCase().substring(2),t):o.setAttribute(e,t)})}),o};Object.defineProperty(exports,"effect",{enumerable:!0,get:function(){return e.effect}}),Object.defineProperty(exports,"r",{enumerable:!0,get:function(){return e.r}}),exports.Fragment=function(e){return e.children},exports.h=function(e,t){var r=[].slice.call(arguments,2);if("function"==typeof e)return(t||(t={})).children=r,e(t);if("string"==typeof e){var o=u(e,n(t));return o.append.apply(o,f.apply(void 0,[o].concat(r))),o}},exports.isR=t,exports.lazy=function(t,n){void 0===n&&(n=null);var r=e.r(n);return function(e){return t().then(function(t){r.value=t.default(e)}),r}},exports.toR=r,exports.unR=n;
