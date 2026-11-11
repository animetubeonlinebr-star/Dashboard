/**
 * Reordenação de painéis por arrastar e soltar, restrita aos irmãos
 * dentro da mesma coluna. A ordem personalizada é persistida em
 * localStorage por chave de coluna.
 */

const STORAGE_KEY = 'devops-board-panel-order';

function readOrder() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; }
}
function writeOrder(obj) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(obj)); } catch { /* ignora */ }
}

export function createDnd({ onReorder } = {}) {
  let dragEl = null;

  function columnKey(col) {
    return col.dataset.colKey || (col.dataset.colKey = `col-${Array.from(col.parentElement.children).indexOf(col)}`);
  }

  function applyStoredOrder() {
    const order = readOrder();
    document.querySelectorAll('.col').forEach((col) => {
      const saved = order[columnKey(col)];
      if (!Array.isArray(saved) || !saved.length) return;
      const items = Array.from(col.children);
      const byId = new Map(items.map((el) => [el.dataset.panelId || '', el]));
      // Reinsere seguindo a ordem salva; itens ausentes permanecem no fim.
      saved.forEach((id) => {
        const el = byId.get(id);
        if (el) col.appendChild(el);
      });
    });
  }

  function saveColumn(col) {
    const order = readOrder();
    order[columnKey(col)] = Array.from(col.children)
      .map((el) => el.dataset.panelId)
      .filter(Boolean);
    writeOrder(order);
  }

  function onDragStart(ev) {
    const panel = ev.target.closest('.panel');
    if (!panel || !ev.target.closest('.drag-handle')) return;
    dragEl = panel;
    panel.classList.add('is-dragging');
    ev.dataTransfer.effectAllowed = 'move';
    ev.dataTransfer.setData('text/plain', panel.dataset.panelId || '');
  }

  function onDragOver(ev) {
    if (!dragEl) return;
    const target = ev.target.closest('.panel');
    if (!target || target === dragEl) return;
    if (target.parentElement !== dragEl.parentElement) return;
    ev.preventDefault();
    ev.dataTransfer.dropEffect = 'move';

    const rect = target.getBoundingClientRect();
    const after = ev.clientY > rect.top + rect.height / 2;
    document.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    target.classList.add('is-drop-target');
    const parent = target.parentElement;
    if (after) parent.insertBefore(dragEl, target.nextSibling);
    else parent.insertBefore(dragEl, target);
  }

  function onDragEnd() {
    if (!dragEl) return;
    dragEl.classList.remove('is-dragging');
    document.querySelectorAll('.is-drop-target').forEach((el) => el.classList.remove('is-drop-target'));
    const col = dragEl.parentElement;
    dragEl.classList.add('is-flash');
    setTimeout(() => dragEl?.classList.remove('is-flash'), 400);
    saveColumn(col);
    onReorder?.(col);
    dragEl = null;
  }

  function mount(root = document) {
    applyStoredOrder();
    root.addEventListener('dragstart', onDragStart);
    root.addEventListener('dragover', onDragOver);
    root.addEventListener('dragend', onDragEnd);
    root.addEventListener('drop', (ev) => { if (dragEl) ev.preventDefault(); });
  }

  return { mount, applyStoredOrder };
}
