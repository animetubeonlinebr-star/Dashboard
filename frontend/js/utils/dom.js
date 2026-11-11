/** Helpers mínimos de DOM e de eventos. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/**
 * Cria um elemento a partir de uma string HTML (primeiro nó de elemento).
 * @param {string} html
 * @returns {HTMLElement}
 */
export function h(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

/** Delegação de eventos: registra handler por seletor dentro de um root. */
export function delegate(root, eventName, selector, handler) {
  root.addEventListener(eventName, (ev) => {
    const target = ev.target.closest(selector);
    if (target && root.contains(target)) handler(ev, target);
  });
}

/** Executa fn após N ms sem novas chamadas (debounce). */
export function debounce(fn, wait = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/** Move o scroll do elemento para o fim (usado no console de logs). */
export function scrollToEnd(el) {
  el.scrollTop = el.scrollHeight;
}
