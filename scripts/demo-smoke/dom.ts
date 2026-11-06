import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'http://localhost:9002/',
  pretendToBeVisual: true,
});

const w = dom.window as any;

// Node exposes some of these as getter-only globals, so define them explicitly.
function setGlobal(key: string, value: any) {
  try {
    (globalThis as any)[key] = value;
  } catch {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
  if ((globalThis as any)[key] !== value) {
    Object.defineProperty(globalThis, key, { value, configurable: true, writable: true });
  }
}

setGlobal('window', w);
setGlobal('document', w.document);
setGlobal('navigator', w.navigator);
setGlobal('HTMLElement', w.HTMLElement);
setGlobal('Element', w.Element);
setGlobal('Node', w.Node);
setGlobal('localStorage', w.localStorage);
setGlobal('sessionStorage', w.sessionStorage);
setGlobal('getComputedStyle', w.getComputedStyle);
(globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(() => cb(Date.now()), 16);
(globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
(globalThis as any).matchMedia = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});
(globalThis as any).ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};
(globalThis as any).IntersectionObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
  root = null;
  rootMargin = '';
  thresholds = [];
};
const matchMediaStub = () => ({
  matches: false,
  media: '',
  onchange: null,
  addListener: () => undefined,
  removeListener: () => undefined,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  dispatchEvent: () => false,
});
w.matchMedia = matchMediaStub;
(globalThis as any).matchMedia = matchMediaStub;

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
w.ResizeObserver = ResizeObserverStub;
(globalThis as any).ResizeObserver = ResizeObserverStub;

(globalThis as any).scrollTo = () => undefined;
w.scrollTo = () => undefined;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

// Mirror DOM globals that third-party libs (file-saver, docx, gsap) expect at import time
const DOM_GLOBALS = [
  'HTMLAnchorElement', 'HTMLElement', 'HTMLCanvasElement', 'HTMLInputElement', 'HTMLDivElement',
  'Element', 'Node', 'Blob', 'File', 'FileReader', 'Image', 'URL', 'URLSearchParams', 'Event',
  'CustomEvent', 'MutationObserver', 'DOMParser', 'XMLSerializer', 'CSSStyleDeclaration', 'Text',
  'KeyboardEvent', 'MouseEvent', 'PointerEvent', 'FormData', 'DOMRect', 'SVGElement',
  'DocumentFragment', 'ShadowRoot', 'Range', 'Selection', 'XMLHttpRequest', 'CSS', 'DOMTokenList',
];
for (const key of DOM_GLOBALS) {
  if (w[key] !== undefined) {
    setGlobal(key, w[key]);
  }
}

export const localStorageRef = w.localStorage;
