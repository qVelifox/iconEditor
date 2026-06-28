import './style.css';

let originalContent = '';
let iconsData = {};
let iconKeys = [];
let activeKey = null;
let modifiedKeys = new Set();

const fileInput = document.getElementById('fileInput');
const iconGrid = document.getElementById('iconGrid');
const emptyState = document.getElementById('emptyState');
const exportBtn = document.getElementById('exportBtn');
const resetBtn = document.getElementById('resetBtn');
const iconCount = document.getElementById('iconCount');
const editorPanel = document.getElementById('editorPanel');
const editorKey = document.getElementById('editorKey');
const editorSvg = document.getElementById('editorSvg');
const editorTitle = document.getElementById('editorTitle');
const editorPreviewSvg = document.getElementById('editorPreviewSvg');
const editorPreviewName = document.getElementById('editorPreviewName');
const editorPreviewSize = document.getElementById('editorPreviewSize');

fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      loadFromContent(ev.target.result);
      showToast('File loaded successfully', 'success');
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    }
  };
  reader.readAsText(file);
});

function loadFromContent(content) {
  originalContent = content;
  iconsData = {};
  modifiedKeys = new Set();
  activeKey = null;
  editorPanel.classList.remove('open');

  const match = content.match(/export\s+const\s+ICONS\s*=\s*\{/);
  if (!match) throw new Error('export const ICONS = { ... } not found');

  const startIdx = match.index + match[0].length;
  let depth = 1;
  let i = startIdx;
  while (i < content.length && depth > 0) {
    if (content[i] === '{') depth++;
    else if (content[i] === '}') depth--;
    if (depth > 0) i++;
  }
  const objStr = content.slice(startIdx, i);

  const pairs = parseKeyValuePairs(objStr);
  iconKeys = pairs.map(p => p.key);

  for (const p of pairs) {
    iconsData[p.key] = {
      svg: p.svg,
      originalSvg: p.svg
    };
  }

  renderGrid();
  updateToolbar();
}

function parseKeyValuePairs(str) {
  const pairs = [];
  let j = 0;
  while (j < str.length) {
    while (j < str.length && (str[j] === ' ' || str[j] === '\n' || str[j] === '\r' || str[j] === '\t' || str[j] === ',')) j++;
    if (j >= str.length) break;

    let key = '';
    while (j < str.length && /[a-zA-Z0-9_$]/.test(str[j])) {
      key += str[j];
      j++;
    }
    if (!key) {
      j++;
      continue;
    }

    while (j < str.length && str[j] !== ':' && str[j] !== '`') j++;
    if (str[j] === ':') j++;
    while (j < str.length && (str[j] === ' ' || str[j] === '\n' || str[j] === '\r' || str[j] === '\t')) j++;

    if (str[j] === '`') {
      j++;
      let svg = '';
      while (j < str.length) {
        if (str[j] === '`') break;
        if (str[j] === '$' && str[j + 1] === '{') {
          svg += '${';
          j += 2;
          let exprDepth = 1;
          while (j < str.length && exprDepth > 0) {
            if (str[j] === '{') exprDepth++;
            else if (str[j] === '}') exprDepth--;
            if (exprDepth > 0) {
              svg += str[j];
              j++;
            }
          }
          svg += '}';
        } else {
          svg += str[j];
          j++;
        }
      }
      if (str[j] === '`') j++;
      pairs.push({ key, svg });
    } else {
      j++;
    }
  }
  return pairs;
}

function renderGrid() {
  if (!iconKeys.length) {
    iconGrid.innerHTML = '<div class="empty-state">No icons found in file.</div>';
    iconGrid.querySelector('.empty-state').addEventListener('click', () => fileInput.click());
    return;
  }
  iconGrid.innerHTML = iconKeys.map(k => {
    const data = iconsData[k];
    const mod = modifiedKeys.has(k) ? 'modified' : '';
    const active = k === activeKey ? 'active' : '';
    const size = data.svg.length;
    const sizeLabel = size > 999 ? (size / 1000).toFixed(1) + 'k' : size + 'B';
    return `<div class="card ${mod} ${active}" data-key="${k}">
  <div class="card-preview">${data.svg}</div>
  <div class="card-name">${k}</div>
  <div class="card-size">${sizeLabel}</div>
</div>`;
  }).join('');

  iconGrid.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => openEditor(el.dataset.key));
  });
}

function updateToolbar() {
  const n = iconKeys.length;
  iconCount.textContent = n + ' icon' + (n > 1 ? 's' : '');
  exportBtn.disabled = iconKeys.length === 0;
  resetBtn.disabled = modifiedKeys.size === 0;
}

function openEditor(key) {
  activeKey = key;
  const data = iconsData[key];
  if (!data) return;

  editorKey.value = key;
  editorSvg.value = data.svg;
  editorTitle.textContent = 'Edit: ' + key;
  updateEditorPreview(key);
  editorPanel.classList.add('open');
  renderGrid();
}

function updateEditorPreview(key) {
  const data = iconsData[key];
  if (!data) return;
  editorPreviewSvg.innerHTML = data.svg;
  editorPreviewName.textContent = key;
  editorPreviewSize.textContent = data.svg.length + ' B';
}

editorSvg.addEventListener('input', () => {
  if (activeKey) {
    editorPreviewSvg.innerHTML = editorSvg.value;
    editorPreviewName.textContent = activeKey;
    editorPreviewSize.textContent = editorSvg.value.length + ' B';
  }
});

document.getElementById('editorApply').addEventListener('click', () => {
  if (!activeKey) return;
  const newSvg = editorSvg.value.trim();
  if (!newSvg) {
    showToast('SVG cannot be empty', 'error');
    return;
  }

  iconsData[activeKey].svg = newSvg;
  modifiedKeys.add(activeKey);

  renderGrid();
  updateToolbar();
  editorPanel.classList.remove('open');
  showToast(`"${activeKey}" updated`, 'success');
});

document.getElementById('editorCancel').addEventListener('click', () => {
  if (activeKey) {
    editorSvg.value = iconsData[activeKey].svg;
    updateEditorPreview(activeKey);
  }
  editorPanel.classList.remove('open');
});

document.getElementById('editorClose').addEventListener('click', () => {
  if (activeKey) {
    editorSvg.value = iconsData[activeKey].svg;
    updateEditorPreview(activeKey);
  }
  editorPanel.classList.remove('open');
});

resetBtn.addEventListener('click', () => {
  for (const k of modifiedKeys) {
    iconsData[k].svg = iconsData[k].originalSvg;
  }
  modifiedKeys.clear();
  renderGrid();
  updateToolbar();
  if (activeKey && editorPanel.classList.contains('open')) {
    editorSvg.value = iconsData[activeKey].svg;
    updateEditorPreview(activeKey);
  }
  showToast('All changes reverted', 'success');
});

exportBtn.addEventListener('click', () => {
  if (iconKeys.length === 0) return;

  let result = originalContent;

  for (const k of modifiedKeys) {
    const data = iconsData[k];
    const orig = data.originalSvg;
    const escapedOrig = escapeRegExp(orig);
    result = result.replace(new RegExp(escapedOrig), data.svg);
  }

  const blob = new Blob([result], {
    type: 'text/javascript'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'icons.js';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  for (const k of modifiedKeys) {
    iconsData[k].originalSvg = iconsData[k].svg;
  }
  modifiedKeys.clear();
  renderGrid();
  updateToolbar();
  showToast('Exported: icons.js', 'success');
});

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function showToast(msg, type) {
  const t = document.createElement('div');
  t.className = 'toast ' + (type || '');
  t.innerHTML = `<span class="toast-dot"></span>${msg}`;
  document.body.appendChild(t);
  setTimeout(() => {
    t.remove();
  }, 2500);
}

emptyState.addEventListener('click', () => fileInput.click());

document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file && file.name.endsWith('.js')) {
    fileInput.files = e.dataTransfer.files;
    fileInput.dispatchEvent(new Event('change'));
  }
});
