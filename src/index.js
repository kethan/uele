// MIT License

// Copyright (c) 2021 Daniel Ethridge

let api = {
  effect: (f) => f(),
  memo: (f) => f(),
  is: (v) => false,
  get: (v) => v
},
  get = (v) =>
      isF(v)
          ? v()
          : api.is(v)
              ? api.get(v)
              : v,
  If = ({ when, children, fallback }) =>
      api.memo(() => (!!get(when) ? children : fallback)),
  For = ({ each, children, fallback }) =>
      api.memo(() =>
          get(each).length > 0
              ? get(each).map(
                  (value, index) =>
                      children && children[0] && children[0](value, index)
              )
              : fallback
      ),
  isObs = (arg) =>
      arg && !!(arg[Symbol.asyncIterator] || arg.then || arg.subscribe || api.is(arg)),
  sube = (target, next, stop) => {
      if (target) {
          if (api.is(target)) api.effect(() => next(api.get(target)))
          else if (target.subscribe?.(next));
          else if (
              target.then?.((v) => !stop && next(v)) ||
              ((async (v) => {
                  try {
                      for await (v of target) {
                          if (stop) return;
                          next(v);
                      }
                  } catch (e) { }
              })() &&
                  (() => (stop = 1)))
          );
      }
  },
  Live = () => ({
      startMarker: d.createTextNode(''),
      endMarker: d.createTextNode(''),
      replaceChildren(...xs) {
          let range = d.createRange();
          range.setStartAfter(this.startMarker);
          range.setEndBefore(this.endMarker);
          range.deleteContents();
          this.startMarker.after(...xs);
      }
  }),
  Fragment = ({ children }) => children,
  d = document,
  isF = (x) => typeof x === 'function',
  isS = (x) => typeof x === 'string',
  isO = (x) => typeof x === 'object',
  isFalsey = (x) => typeof x === 'boolean' || x === undefined || x === null,
  isSVG = (el) =>
      /^(t(ext$|s)|s[vwy]|g)|^set|tad|ker|p(at|s)|s(to|c$|ca|k)|r(ec|cl)|ew|us|f($|e|s)|cu|n[ei]|l[ty]|[GOP]/.test(
          el
      ),
  toNode = (x) => {
      if (x instanceof Node) return x;
      else if (isF(x)) return x();
      else if (isFalsey(x)) return d.createComment(x);
      else if (isO(x))
          return typeof x.valueOf() != 'object'
              ? d.createTextNode(x)
              : d.createTextNode('');
      else return d.createTextNode(x);
  },
  r = (x, f) => (isObs(x) ? sube(x, (v) => { f(v) }) && f(x()) : f(x)),
  appendChildren = (...children) =>
      children.flat(Infinity).flatMap((child) => {
          // Non-reactive values
          if (!isObs(child)) return [toNode(child)];
          else {
              let liveFragment = Live(), done = false;
              sube(child, (value) => {
                  if (done) {
                      if (!Array.isArray(value)) value = [value];
                      liveFragment.replaceChildren(...appendChildren(...value));
                  }
              });
              done = true;
              return [
                  liveFragment.startMarker,
                  ...appendChildren(toNode(child)),
                  liveFragment.endMarker,
              ];
          }

      }),
  h = (tag, props, ...children) => {
      if (isF(tag)) {
          (props || (props = {})).children = children;
          return tag(props);
      } else if (isS(tag)) {
          let element = createEl(tag, props);
          element.append(...appendChildren(...children));
          return element;
      }
  },
  applyStyles = (element, styles) => {
      for (let property in styles)
          r(styles[property], (value) => {
              if (value !== undefined) element.style.setProperty(property, value);
              else element.style.removeProperty(property);
          });
  },
  applyClasses = (element, classes) => {
      for (let name in classes)
          r(classes[name], (value) =>
              element.classList.toggle(name, value)
          );
  },
  applyAttributes = (element, attributes) => {
      for (let name in attributes) {
          r(attributes[name], (value) => {
              if (!(value)) element.removeAttribute(name);
              else element.setAttribute(name, value === true ? '' : value);
          });
      }
  },
  lazy =
      (file, fb = '') =>
          (props) =>
              file()
                  .then((f) => f.default(props))
                  .catch(() => fb),
  createEl = (tag, props) => {
      let el = isSVG(tag)
          ? d.createElementNS('http://www.w3.org/2000/svg', tag)
          : d.createElement(tag);
      if (props != null) {
          // Apply overloaded props, if possible
          // Inline style object
          if (isO(props.style) && !isObs(props.style)) {
              applyStyles(el, props.style);
              delete props.style;
          }
          // Classes object
          if (isO(props.class) && !isObs(props.class)) {
              applyClasses(el, props.class);
              delete props.class;
          }

          for (let name in props) {
              // ref prop
              if (name === 'ref' && isF(props.ref)) {
                  props.ref(el, props);
                  delete props[name];
              }
              // Event listener functions
              if (name.startsWith('on') && name.toLowerCase() in window) {
                  el.addEventListener(name.substring(2).toLowerCase(), props[name]);
                  delete props[name];
              }
          }
          // The rest of the props are attributes
          applyAttributes(el, props);
      }
      return el;
  };

export { Fragment, h, h as createElement, lazy, api, If, If as Show, For };