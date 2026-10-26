// Conservative token-based syntax highlighter (js / jsx / html / bash / json / css).
// Input is already HTML-escaped; we only wrap known-safe token spans.

const JS_KEYWORDS = new Set(
  ("const let var function return if else for while do switch case break continue " +
    "new class extends super this import export from default try catch finally throw " +
    "typeof instanceof in of await async yield delete void null undefined true false " +
    "static get set")
    .split(" ")
);

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// tokenize JS-ish source line by line, tracking block comments crudely
function highlightJS(src) {
  let out = "";
  let inBlock = false;
  for (const line of src.split("\n")) {
    let i = 0;
    let lineOut = "";
    if (inBlock) {
      const end = line.indexOf("*/");
      if (end === -1) {
        out += `<span class="tok-com">${escapeHtml(line)}</span>\n`;
        continue;
      }
      lineOut += `<span class="tok-com">${escapeHtml(line.slice(0, end + 2))}</span>`;
      i = end + 2;
      inBlock = false;
    }
    while (i < line.length) {
      const rest = line.slice(i);
      // line comment
      const lineComment = rest.match(/^\/\/.*/);
      if (lineComment) {
        lineOut += `<span class="tok-com">${escapeHtml(lineComment[0])}</span>`;
        i += lineComment[0].length;
        continue;
      }
      // block comment start
      const block = rest.match(/^\/\*[\s\S]*?\*\//);
      if (block) {
        lineOut += `<span class="tok-com">${escapeHtml(block[0])}</span>`;
        i += block[0].length;
        continue;
      }
      if (rest.startsWith("/*")) {
        inBlock = true;
        lineOut += `<span class="tok-com">${escapeHtml(rest)}</span>`;
        i = line.length;
        continue;
      }
      // strings (', ", `)
      const str = rest.match(/^(['"`])(?:\\.|(?!\1)[^\\])*\1/);
      if (str) {
        lineOut += `<span class="tok-str">${escapeHtml(str[0])}</span>`;
        i += str[0].length;
        continue;
      }
      // JSX-ish tag punctuation
      const tagPunc = rest.match(/^<\/?|^\/?>|^\/>/);
      if (tagPunc) {
        lineOut += `<span class="tok-punc">${escapeHtml(tagPunc[0])}</span>`;
        i += tagPunc[0].length;
        continue;
      }
      // tag name or component after <
      const tagName = rest.match(/^[A-Za-z][\w.-]*/);
      if (tagName) {
        const word = tagName[0];
        const prev = lineOut.replace(/<[^>]+>/g, "").slice(-1);
        const isTag = prev === "<" || prev.endsWith("</");
        const isAttrNext = /[\s]$/.test(line.slice(0, i)) &&
          /^[A-Za-z_][\w-]*=/.test(rest);
        if (isTag) lineOut += `<span class="tok-tag">${escapeHtml(word)}</span>`;
        else if (isAttrNext) lineOut += `<span class="tok-attr">${escapeHtml(word)}</span>`;
        else if (JS_KEYWORDS.has(word)) lineOut += `<span class="tok-key">${escapeHtml(word)}</span>`;
        else if (/^[A-Z]/.test(word)) lineOut += `<span class="tok-fn">${escapeHtml(word)}</span>`;
        else lineOut += escapeHtml(word);
        i += word.length;
        continue;
      }
      // numbers
      const num = rest.match(/^\d+(?:\.\d+)?/);
      if (num) {
        lineOut += `<span class="tok-num">${num[0]}</span>`;
        i += num[0].length;
        continue;
      }
      lineOut += escapeHtml(line[i]);
      i++;
    }
    out += lineOut + "\n";
  }
  return out.replace(/\n$/, "");
}

function highlightBash(src) {
  return escapeHtml(src)
    .replace(/(^|\s)(#.*)$/gm, '$1<span class="tok-com">$2</span>')
    .replace(/\b(npm|npx|yarn|pnpm|node|cd|install|run|dev|build)\b/g, '<span class="tok-fn">$1</span>')
    .replace(/(&quot;|").*?(&quot;|")/g, '<span class="tok-str">$&</span>');
}

function highlightJSON(src) {
  // one tokenizing pass so digits/keywords inside strings are never re-matched
  const token = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?)|\b(true|false|null)\b/g;
  return escapeHtml(src).replace(token, (m, str, colon, num, kw) => {
    if (str)
      return colon
        ? `<span class="tok-attr">${str}</span>${colon}`
        : `<span class="tok-str">${str}</span>`;
    if (num) return `<span class="tok-num">${num}</span>`;
    if (kw) return `<span class="tok-bool">${kw}</span>`;
    return m;
  });
}

export function highlight(code, lang = "jsx") {
  const safe = escapeHtml(code);
  try {
    if (lang === "bash" || lang === "sh" || lang === "shell") return highlightBash(code);
    if (lang === "json" || lang === "jsonc") return highlightJSON(code);
    if (lang === "html") return highlightJS(code); // html snippets in docs are script-flavoured
    return highlightJS(code);
  } catch {
    return safe;
  }
}
