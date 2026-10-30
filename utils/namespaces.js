// Optional SVG/MathML policy; custom elements remain HTML.
export const namespace = tag => tag.includes('-') ? null
    : /^(t(ext$|s)|s[vwy]|g|image)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(tag) ? 'http://www.w3.org/2000/svg'
    : /^(m(?!a|en|et))|nn|cs|nc|ma(l|t|c)/.test(tag) ? 'http://www.w3.org/1998/Math/MathML' : null;
