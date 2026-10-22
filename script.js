// ===================================================
// 39's shrine — interactions
// ===================================================

document.addEventListener('DOMContentLoaded', () => {
  initVisitorCounter();
  initDraggableStickers();
  initGuestbookForm();
  initFakeWeather();
  initSparkleOnClick();
  initDoodleBoard();
  initSongPlayer();
});

/* ---------- visitor counter (persists via localStorage) ---------- */
function initVisitorCounter() {
  const el = document.getElementById('visitor-counter');
  if (!el) return;

  const STORAGE_KEY = 'mikuShrineVisitorCount';
  let count = parseInt(localStorage.getItem(STORAGE_KEY), 10);

  if (isNaN(count)) {
    count = 0; // starting "seed" so it doesn't look brand new
  }
  count += 1;

  localStorage.setItem(STORAGE_KEY, count);
  el.textContent = String(count).padStart(6, '0');
}

/* ---------- draggable floating stickers ---------- */
function initDraggableStickers() {
  const stickers = document.querySelectorAll('.sticker');

  stickers.forEach((sticker) => {
    let isDragging = false;
    let offsetX = 0;
    let offsetY = 0;

    const startDrag = (clientX, clientY) => {
      isDragging = true;
      const rect = sticker.getBoundingClientRect();
      offsetX = clientX - rect.left;
      offsetY = clientY - rect.top;
      sticker.style.transition = 'none';
    };

    const moveDrag = (clientX, clientY) => {
      if (!isDragging) return;
      const x = clientX - offsetX;
      const y = clientY - offsetY;
      sticker.style.left = `${x}px`;
      sticker.style.top = `${y}px`;
    };

    const endDrag = () => {
      isDragging = false;
      sticker.style.transition = '';
    };

    // mouse
    sticker.addEventListener('mousedown', (e) => {
      startDrag(e.clientX, e.clientY);
      e.preventDefault();
    });
    window.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
    window.addEventListener('mouseup', endDrag);

    // touch
    sticker.addEventListener('touchstart', (e) => {
      const t = e.touches[0];
      startDrag(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      const t = e.touches[0];
      moveDrag(t.clientX, t.clientY);
    }, { passive: true });
    window.addEventListener('touchend', endDrag);
  });
}

/* ---------- guestbook with live backend persistence, auto-refresh & localStorage fallback ---------- */
function initGuestbookForm() {
  const form = document.getElementById('guestbook-form');
  const thanks = document.getElementById('gb-thanks');
  const errorEl = document.getElementById('gb-error');
  const entriesContainer = document.getElementById('guestbook-entries');
  const countEl = document.getElementById('gb-count');
  const nameInput = document.getElementById('gb-name');
  const msgInput = document.getElementById('gb-message');
  const submitBtn = document.getElementById('gb-submit');

  if (!form) return;

  const STORAGE_KEY = 'mikuShrineGuestbookEntries';

  // Base API url: supports configured remote backend (Render/Railway), localhost, or local server
  const configuredBackend = (window.BACKEND_API_URL || '').trim();
  const isLocalFile = window.location.protocol === 'file:';
  const isGitHubPages = window.location.hostname.endsWith('github.io');

  let API_ENDPOINT = null;
  if (configuredBackend) {
    API_ENDPOINT = `${configuredBackend.replace(/\/$/, '')}/api/guestbook`;
  } else if (isLocalFile) {
    API_ENDPOINT = 'http://localhost:3001/api/guestbook';
  } else if (!isGitHubPages) {
    API_ENDPOINT = '/api/guestbook';
  }

  // Cute initial sample messages if offline/empty
  const defaultEntries = [
    {
      id: "1792619683076-zhg4",
      name: "Tester ✨",
      message: "Testing persistent guestbook backend! Looks awesome!",
      date: "Oct 22, 2026, 03:24 AM",
      likes: 1
    }
  ];

  let currentEntries = [];

  function loadLocalBackup() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultEntries));
        return defaultEntries;
      }
      let parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Filter out legacy fake entries ('1', '2', '3') if still in cache
        const filtered = parsed.filter(item => item && !['1', '2', '3'].includes(String(item.id)) && item.name !== 'miku_fan_39 ✧' && item.name !== 'stargirl ⋆.˚' && item.name !== 'arpii fanclub 🌸');
        const result = filtered.length > 0 ? filtered : defaultEntries;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(result));
        return result;
      }
      return defaultEntries;
    } catch (e) {
      return defaultEntries;
    }
  }

  function saveLocalBackup(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn("Storage full or unavailable", e);
    }
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function showMessage(type, text) {
    if (type === 'thanks' && thanks) {
      if (text) thanks.textContent = text;
      thanks.classList.add('show');
      if (errorEl) errorEl.classList.remove('show');
      setTimeout(() => thanks.classList.remove('show'), 4000);
    } else if (type === 'error' && errorEl) {
      errorEl.textContent = text || 'Oops, something went wrong!';
      errorEl.classList.add('show');
      if (thanks) thanks.classList.remove('show');
      setTimeout(() => errorEl.classList.remove('show'), 5000);
    }
  }

  function renderEntries(entries) {
    if (!entriesContainer) return;
    if (countEl) countEl.textContent = entries.length;

    entriesContainer.innerHTML = '';

    if (entries.length === 0) {
      entriesContainer.innerHTML = '<div style="text-align:center; padding:15px; font-style:italic; font-size:13px; color:#555;">be the first to leave a message! ♡</div>';
      return;
    }

    entries.forEach((item) => {
      const entryEl = document.createElement('div');
      entryEl.className = 'gb-entry';
      entryEl.innerHTML = `
        <div class="gb-entry-header">
          <span class="gb-entry-name">★ ${escapeHTML(item.name)}</span>
          <span class="gb-entry-date">${escapeHTML(item.date)}</span>
        </div>
        <div class="gb-entry-body">${escapeHTML(item.message)}</div>
        <div class="gb-entry-footer">
          <button type="button" class="gb-like-btn" data-id="${item.id}" aria-label="Like message">
            <span>♡</span> <span class="like-num">${item.likes || 0}</span>
          </button>
        </div>
      `;
      entriesContainer.appendChild(entryEl);
    });

    // attach like handlers
    entriesContainer.querySelectorAll('.gb-like-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const numSpan = btn.querySelector('.like-num');

        // Micro-interaction bounce
        btn.style.transform = 'scale(1.25)';
        setTimeout(() => btn.style.transform = '', 160);

        // Optimistic UI update
        const target = currentEntries.find(e => String(e.id) === String(id));
        if (target) {
          target.likes = (target.likes || 0) + 1;
          if (numSpan) numSpan.textContent = target.likes;
          saveLocalBackup(currentEntries);
        }

        // Backend sync
        if (API_ENDPOINT) {
          try {
            const res = await fetch(`${API_ENDPOINT}/${id}/like`, { method: 'POST' });
            if (res.ok) {
              const data = await res.json();
              if (data && data.likes !== undefined && target) {
                target.likes = data.likes;
                if (numSpan) numSpan.textContent = data.likes;
                saveLocalBackup(currentEntries);
              }
            }
          } catch (e) {
            // kept optimistically in local cache
          }
        }
      });
    });
  }

  // Fetch entries from backend server with graceful fallback
  async function loadEntries() {
    if (API_ENDPOINT) {
      try {
        const res = await fetch(API_ENDPOINT, { cache: 'no-cache' });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.entries)) {
            currentEntries = data.entries;
            saveLocalBackup(currentEntries);
            renderEntries(currentEntries);
            return;
          }
        }
      } catch (err) {
        // Server not reachable (offline or pure static file mode)
      }
    }

    currentEntries = loadLocalBackup();
    renderEntries(currentEntries);
  }

  // Initial load
  loadEntries();

  // Polling every 15s to keep comments synced across visitors when connected to backend
  setInterval(() => {
    if (document.visibilityState === 'visible' && API_ENDPOINT) {
      loadEntries();
    }
  }, 15000);

  // Form submit handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameVal = (nameInput ? nameInput.value : '').trim();
    const msgVal = (msgInput ? msgInput.value : '').trim();

    if (!nameVal || !msgVal) return;

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'signing... ♡';
    }

    if (API_ENDPOINT) {
      try {
        const res = await fetch(API_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: nameVal, message: msgVal })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          showMessage('thanks', 'thank you for signing! ♡');
          form.reset();

          if (data.entry) {
            currentEntries.unshift(data.entry);
            saveLocalBackup(currentEntries);
            renderEntries(currentEntries);
          } else {
            await loadEntries();
          }
          return;
        } else {
          showMessage('error', data.message || 'Could not sign guestbook. Please try again!');
          return;
        }
      } catch (err) {
        console.warn('Backend unavailable, saving locally:', err);
      }
    }
      // Fallback: save locally so user action is never lost
      const newLocalEntry = {
        id: String(Date.now()),
        name: nameVal,
        message: msgVal,
        date: new Date().toLocaleString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        likes: 1
      };

      currentEntries.unshift(newLocalEntry);
      saveLocalBackup(currentEntries);
      renderEntries(currentEntries);
      form.reset();
      showMessage('thanks', 'thank you for signing! ♡');
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'sign!';
      }
    }
  });
}

/* ---------- decorative "weather" text (no real API, just flavor) ---------- */
function initFakeWeather() {
  const el = document.getElementById('weather-text');
  if (!el) return;

  const moods = [
    'sunny with a chance of vocaloid ☀',
    'cyber-teal skies ahead ⋆',
    'raining glowsticks ☂',
    'clear skies, 39% chance of singing 🎤',
  ];
  el.textContent = moods[Math.floor(Math.random() * moods.length)];
}

/* ---------- tiny sparkle burst on click, for fun ---------- */
function initSparkleOnClick() {
  document.addEventListener('click', (e) => {
    // skip clicks on interactive elements and canvas so it doesn't get annoying
    if (e.target.closest('a, button, input, textarea, canvas, .mspaint-window')) return;

    const sparkle = document.createElement('span');
    sparkle.textContent = '✦';
    sparkle.style.position = 'fixed';
    sparkle.style.left = `${e.clientX}px`;
    sparkle.style.top = `${e.clientY}px`;
    sparkle.style.color = '#39c5bb';
    sparkle.style.fontSize = '16px';
    sparkle.style.pointerEvents = 'none';
    sparkle.style.zIndex = '999';
    sparkle.style.transform = 'translate(-50%, -50%)';
    sparkle.style.transition = 'transform 0.6s ease, opacity 0.6s ease';
    document.body.appendChild(sparkle);

    requestAnimationFrame(() => {
      sparkle.style.transform = 'translate(-50%, -140%) scale(1.6)';
      sparkle.style.opacity = '0';
    });

    setTimeout(() => sparkle.remove(), 650);
  });
}

/* ===================================================
   RETRO MS PAINT DOODLE BOARD (doodlebox 5)
   Inspired by classic Windows Paint & retro art prompts
=================================================== */
function initDoodleBoard() {
  const canvas = document.getElementById('doodle-canvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // State variables
  let isDrawing = false;
  let lastX = 0;
  let lastY = 0;
  let currentTool = 'pencil'; // pencil, brush, stamp, eraser, bucket
  let currentSize = 5;
  let currentColor = '#39c5bb';
  let currentStamp = '★';
  const undoStack = [];
  const MAX_UNDO = 20;

  // DOM Elements
  const statusHelp = document.getElementById('paint-status-help');
  const statusTool = document.getElementById('paint-status-tool');
  const statusCoords = document.getElementById('paint-status-coords');
  const activeColorIndicator = document.getElementById('active-color-indicator');
  const customColorPicker = document.getElementById('custom-color-picker');
  const toolButtons = document.querySelectorAll('.paint-tool-btn');
  const sizeButtons = document.querySelectorAll('.size-btn');
  const stampChips = document.querySelectorAll('.stamp-chip');
  const colorSwatches = document.querySelectorAll('.color-swatch');
  const undoBtn = document.getElementById('paint-undo');
  const clearBtn = document.getElementById('paint-clear');
  const saveBtn = document.getElementById('paint-save');
  const minBtn = document.getElementById('paint-btn-min');
  const maxBtn = document.getElementById('paint-btn-max');
  const closeBtn = document.getElementById('paint-btn-close');
  const mspaintApp = document.getElementById('mspaint-app');

  function setStatusHelp(text) {
    if (statusHelp) statusHelp.textContent = text;
  }

  function updateStatusTool() {
    if (!statusTool) return;
    if (currentTool === 'stamp') {
      statusTool.textContent = `Tool: Stamp (${currentStamp})`;
    } else {
      statusTool.textContent = `Tool: ${currentTool.charAt(0).toUpperCase() + currentTool.slice(1)} (${currentSize}px)`;
    }
  }

  function saveUndoState() {
    if (undoStack.length >= MAX_UNDO) {
      undoStack.shift();
    }
    undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  }

  function undo() {
    if (undoStack.length > 0) {
      const state = undoStack.pop();
      ctx.putImageData(state, 0, 0);
      setStatusHelp('Undid previous action. ⋆.˚');
    } else {
      setStatusHelp('Nothing left to undo!');
    }
  }

  // Pre-draw cute retro doodle template
  function resetToDefaultCanvas() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw cute retro title and decorative stars/hearts
    ctx.save();

    // Subtle decorative grid dots
    ctx.fillStyle = 'rgba(210, 230, 230, 0.45)';
    for (let x = 20; x < canvas.width; x += 24) {
      for (let y = 20; y < canvas.height; y += 24) {
        ctx.fillRect(x, y, 2, 2);
      }
    }

    // Cute retro greeting in center
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = 'bold 22px "Courier New", monospace';
    ctx.fillStyle = '#ff70a6';
    ctx.fillText('⋆.˚ doodle here! what are u drawing? ⋆.˚', canvas.width / 2, canvas.height / 2 - 25);

    ctx.font = '14px "Trebuchet MS", sans-serif';
    ctx.fillStyle = '#39c5bb';
    ctx.fillText('pick a tool, cute stamp (★, ♡, 🎀, ✨), or color & draw freely! ヾ(≧▽≦*)o', canvas.width / 2, canvas.height / 2 + 10);

    ctx.font = '11px monospace';
    ctx.fillStyle = '#999999';
    ctx.fillText('(click clear anytime for a blank page)', canvas.width / 2, canvas.height / 2 + 35);

    // Cute decorative corner stamps
    ctx.font = '24px "Segoe UI Emoji", sans-serif';
    ctx.fillText('✧', 35, 35);
    ctx.fillText('💖', canvas.width - 35, 35);
    ctx.fillText('🌸', 35, canvas.height - 35);
    ctx.fillText('★', canvas.width - 35, canvas.height - 35);

    ctx.restore();
  }

  resetToDefaultCanvas();

  // Get precise canvas coordinates
  function getCanvasPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = e.clientX;
    let clientY = e.clientY;

    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  // Draw stamp
  function drawStamp(x, y, stamp) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    let fontSize = 28;
    if (currentSize <= 2) fontSize = 18;
    else if (currentSize <= 5) fontSize = 28;
    else if (currentSize <= 10) fontSize = 42;
    else fontSize = 58;

    ctx.font = `${fontSize}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", "Trebuchet MS", sans-serif`;

    // Only apply fillStyle if symbol is monochrome ascii/text
    const isColorEmoji = ['✨', '💖', '🎀', '🌸', '🍓', '🧅'].includes(stamp);
    if (!isColorEmoji) {
      ctx.fillStyle = currentColor;
    }

    ctx.fillText(stamp, x, y);
    ctx.restore();
  }

  // Flood fill algorithm
  function floodFill(startX, startY, fillColorHex) {
    const width = canvas.width;
    const height = canvas.height;
    const imgData = ctx.getImageData(0, 0, width, height);
    const data = imgData.data;

    const r = parseInt(fillColorHex.slice(1, 3), 16);
    const g = parseInt(fillColorHex.slice(3, 5), 16);
    const b = parseInt(fillColorHex.slice(5, 7), 16);
    const a = 255;

    startX = Math.floor(startX);
    startY = Math.floor(startY);
    if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

    const startIdx = (startY * width + startX) * 4;
    const targetR = data[startIdx];
    const targetG = data[startIdx + 1];
    const targetB = data[startIdx + 2];
    const targetA = data[startIdx + 3];

    if (targetR === r && targetG === g && targetB === b && targetA === a) return;

    function matchStartColor(idx) {
      return Math.abs(data[idx] - targetR) < 32 &&
             Math.abs(data[idx + 1] - targetG) < 32 &&
             Math.abs(data[idx + 2] - targetB) < 32 &&
             Math.abs(data[idx + 3] - targetA) < 32;
    }

    const queue = [[startX, startY]];
    const visited = new Uint8Array(width * height);
    visited[startY * width + startX] = 1;

    let count = 0;
    const maxPixels = width * height;

    while (queue.length > 0 && count < maxPixels) {
      const [x, y] = queue.pop();
      const idx = (y * width + x) * 4;

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = a;
      count++;

      const neighbors = [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1]
      ];

      for (let i = 0; i < 4; i++) {
        const nx = neighbors[i][0];
        const ny = neighbors[i][1];
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nPos = ny * width + nx;
          if (!visited[nPos]) {
            visited[nPos] = 1;
            if (matchStartColor(nPos * 4)) {
              queue.push([nx, ny]);
            }
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  // Start Drawing
  function startDraw(e) {
    saveUndoState();
    isDrawing = true;
    const pos = getCanvasPos(e);
    lastX = pos.x;
    lastY = pos.y;

    if (currentTool === 'stamp') {
      drawStamp(pos.x, pos.y, currentStamp);
      return;
    }

    if (currentTool === 'bucket') {
      floodFill(pos.x, pos.y, currentColor);
      isDrawing = false;
      return;
    }

    if (currentTool === 'pencil') {
      const pSize = Math.max(1, Math.floor(currentSize / 2));
      ctx.fillStyle = currentColor;
      ctx.fillRect(Math.floor(pos.x), Math.floor(pos.y), pSize, pSize);
    } else if (currentTool === 'brush') {
      ctx.fillStyle = currentColor;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, currentSize / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (currentTool === 'eraser') {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pos.x - currentSize, pos.y - currentSize, currentSize * 2, currentSize * 2);
    }
  }

  // Draw motion
  function draw(e) {
    const pos = getCanvasPos(e);

    if (statusCoords) {
      statusCoords.textContent = `${Math.round(pos.x)}, ${Math.round(pos.y)}px`;
    }

    if (!isDrawing) return;

    if (currentTool === 'stamp') {
      const dist = Math.hypot(pos.x - lastX, pos.y - lastY);
      if (dist >= 35) {
        drawStamp(pos.x, pos.y, currentStamp);
        lastX = pos.x;
        lastY = pos.y;
      }
      return;
    }

    if (currentTool === 'pencil') {
      ctx.lineWidth = Math.max(1, Math.floor(currentSize / 2));
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = currentColor;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'brush') {
      ctx.lineWidth = currentSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = currentColor;
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    } else if (currentTool === 'eraser') {
      ctx.lineWidth = currentSize * 2;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.strokeStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(lastX, lastY);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }

    lastX = pos.x;
    lastY = pos.y;
  }

  // Stop Drawing
  function endDraw() {
    isDrawing = false;
  }

  // Mouse Listeners
  canvas.addEventListener('mousedown', startDraw);
  canvas.addEventListener('mousemove', draw);
  window.addEventListener('mouseup', endDraw);
  canvas.addEventListener('mouseleave', () => {
    if (statusCoords) statusCoords.textContent = '0, 0px';
  });

  // Touch Listeners
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDraw(e);
  }, { passive: false });

  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    draw(e);
  }, { passive: false });

  window.addEventListener('touchend', endDraw);

  // Tool Buttons
  toolButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      toolButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTool = btn.dataset.tool;
      updateStatusTool();

      const hints = {
        pencil: 'Pencil: Fine retro lines. Click & drag to sketch!',
        brush: 'Brush: Smooth strokes with selected width.',
        stamp: 'Stamps: Pick any cute star, heart, or sparkle stamp & click canvas!',
        eraser: 'Eraser: Erases to white background.',
        bucket: 'Fill Bucket: Fills enclosed area with active color.'
      };
      setStatusHelp(hints[currentTool] || 'Doodle pad ready! ⋆.˚');
    });
  });

  // Size Buttons
  sizeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      sizeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentSize = parseInt(btn.dataset.size, 10);
      updateStatusTool();
      setStatusHelp(`Brush size set to ${currentSize}px.`);
    });
  });

  // Stamp Chip Selection
  stampChips.forEach(chip => {
    chip.addEventListener('click', () => {
      stampChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentStamp = chip.dataset.stamp;

      // Automatically switch tool to stamp
      currentTool = 'stamp';
      toolButtons.forEach(b => {
        b.classList.toggle('active', b.dataset.tool === 'stamp');
      });

      updateStatusTool();
      setStatusHelp(`Selected stamp "${currentStamp}"! Click or drag on canvas to stamp.`);
    });
  });

  // Color Swatches Selection
  function setColor(color) {
    currentColor = color;
    if (activeColorIndicator) {
      activeColorIndicator.style.backgroundColor = color;
    }
    if (customColorPicker) {
      customColorPicker.value = color;
    }
  }

  colorSwatches.forEach(swatch => {
    swatch.addEventListener('click', () => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      swatch.classList.add('active');
      setColor(swatch.dataset.color);
      setStatusHelp(`Color changed to ${swatch.dataset.color}`);
    });
  });

  if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
      colorSwatches.forEach(s => s.classList.remove('active'));
      setColor(e.target.value);
    });
  }

  // Undo Button
  if (undoBtn) {
    undoBtn.addEventListener('click', undo);
  }

  // Clear Button
  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      saveUndoState();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      setStatusHelp('Canvas cleared! Fresh white page. ⋆.˚');
    });
  }

  // Save PNG Button
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      const link = document.createElement('a');
      link.download = 'doodle.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
      setStatusHelp('Artwork saved as "doodle.png"! Yayy! (｡♥‿♥｡)');
    });
  }

  // Window Controls
  if (minBtn) {
    minBtn.addEventListener('click', () => {
      const ws = mspaintApp.querySelector('.mspaint-workspace');
      const pal = mspaintApp.querySelector('.mspaint-palette-bar');
      if (ws && pal) {
        const isCollapsed = ws.style.display === 'none';
        ws.style.display = isCollapsed ? 'flex' : 'none';
        pal.style.display = isCollapsed ? 'flex' : 'none';
        minBtn.textContent = isCollapsed ? '_' : '⤢';
        setStatusHelp(isCollapsed ? 'Paint window restored.' : 'Paint window minimized.');
      }
    });
  }

  if (maxBtn) {
    maxBtn.addEventListener('click', () => {
      const wrapper = canvas.closest('.canvas-scroll-wrapper');
      if (wrapper) {
        if (wrapper.style.minHeight === '520px') {
          wrapper.style.minHeight = '370px';
          setStatusHelp('Canvas restored to normal size.');
        } else {
          wrapper.style.minHeight = '520px';
          setStatusHelp('Canvas maximized view!');
        }
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      setStatusHelp("Miku says: no closing Paint until you finish your cute doodle! (≧◡≦) ♡");
    });
  }

  // Menu bar hover hints
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('mouseenter', () => {
      setStatusHelp(`Menu: ${item.textContent.trim()} ⋆`);
    });
    item.addEventListener('click', () => {
      const name = item.textContent.trim();
      if (name.includes('File')) {
        saveBtn.click();
      } else if (name.includes('Edit')) {
        undo();
      } else if (name.includes('Help')) {
        setStatusHelp('Paint Help: Pick pencil, brush, or stamps to draw cute art! Press Save when done.');
      }
    });
  });

  updateStatusTool();
}

/* ---------- Interactive Song Player (Play, Pause, Next, Prev with real audio previews) ---------- */
function initSongPlayer() {
  const prevBtn = document.getElementById('song-prev-btn');
  const playBtn = document.getElementById('song-play-btn');
  const nextBtn = document.getElementById('song-next-btn');
  const songTitleEl = document.getElementById('current-song-title');
  const songLinkEl = document.getElementById('song-title-link');
  const visualizerEl = document.getElementById('song-visualizer');
  const progressBar = document.getElementById('song-progress-bar');
  const progressFill = document.getElementById('song-progress-fill');
  const timeEl = document.getElementById('song-time');

  if (!playBtn || !songTitleEl) return;

  const tracks = [
    {
      title: "Shut up My Moms Calling",
      artist: "Hotel Ugly",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/bb/ce/24/bbce2411-6acf-0990-9ea4-bcb3cff6fee2/mzaf_8185330043116677918.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/3hxIUxnT27p5WcmjGUXNwx"
    },
    {
      title: "Romantic Homicide",
      artist: "d4vd",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/a1/f5/40/a1f5405d-408f-d84e-1775-b87b30174067/mzaf_5384372198207712281.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/1xK59OXxi2TAAAbmZK0kBL"
    },
    {
      title: "we fell in love in october",
      artist: "girl in red",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/85/0b/0b/850b0b97-9255-b5f5-d05e-0e03a1e9b8e7/mzaf_9835609236239012360.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/6IPwKM3fUUzlElbvKw2sKl"
    },
    {
      title: "Sweater Weather",
      artist: "The Neighbourhood",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/8c/37/20/8c372047-2727-8054-9411-0e4867643dd8/mzaf_10169659262182214119.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/2QjOHCTQ1Jl3zawyYOpxh6"
    },
    {
      title: "Heather",
      artist: "Conan Gray",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview211/v4/df/b0/08/dfb008d8-bd86-4091-21d5-8216881e3414/mzaf_5288004330582456914.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/4xqrdfXkTW4T0RauPLv3WA"
    },
    {
      title: "Always Forever",
      artist: "Cults",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/20/0e/16/200e167e-0537-b81c-b931-c45f0298e460/mzaf_15927120508454290485.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/2enPRFda84VE2wtI8c86Uf"
    },
    {
      title: "Dark Red",
      artist: "Steve Lacy",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/20/9a/0c/209a0c57-2234-f660-e31e-9df4be89b1d6/mzaf_13317414679944797201.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/3EaJDYHA0KnX88JvDhL9oa"
    },
    {
      title: "Melting",
      artist: "Kali Uchis",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ac/d0/74/acd07468-abfa-758d-4fe8-394906dea051/mzaf_13804564233748557729.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/6lnqe1urLVOV4tn0YgmnIw"
    },
    {
      title: "505",
      artist: "Arctic Monkeys",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/d1/0d/ab/d10dabc8-cceb-e718-401f-01516b009460/mzaf_13845311225859403599.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/0BxE4FqsDD1Ot4YuBXwAPp"
    },
    {
      title: "Sex, Drugs, Etc.",
      artist: "Beach Weather",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/87/52/44/87524482-e1b0-159a-a254-50d540feaa2a/mzaf_1605272030647816641.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/7MlDNspYwfqnHxORufupwq"
    },
    {
      title: "This Side of Paradise",
      artist: "Coyote Theory",
      previewUrl: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview221/v4/ea/51/12/ea5112f3-5547-f276-9830-1e563bd8327b/mzaf_7272796339010096859.plus.aac.p.m4a",
      spotifyUrl: "https://open.spotify.com/track/79EkGysjP2dL5GdpeQjRxT"
    }
  ];

  let currentTrackIdx = 0;
  let isPlaying = false;
  const audio = new Audio();
  audio.preload = 'metadata';

  function formatTime(sec) {
    if (isNaN(sec) || sec <= 0) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  function updateTrackUI() {
    const track = tracks[currentTrackIdx];
    songTitleEl.textContent = `${track.title} - ${track.artist} (${currentTrackIdx + 1}/${tracks.length})`;
    if (songLinkEl) {
      songLinkEl.href = track.spotifyUrl;
      songLinkEl.title = `Listen to "${track.title}" on Spotify`;
    }
    if (progressFill) progressFill.style.width = '0%';
    if (timeEl) timeEl.textContent = '0:00 / 0:30';
  }

  function loadTrack(playImmediately = false) {
    const track = tracks[currentTrackIdx];
    updateTrackUI();
    audio.src = track.previewUrl;
    audio.load();
    if (playImmediately) {
      audio.play().then(() => {
        setPlayingState(true);
      }).catch((e) => {
        console.warn("Audio play prevented:", e);
        setPlayingState(false);
      });
    }
  }

  function setPlayingState(playing) {
    isPlaying = playing;
    if (playing) {
      playBtn.textContent = '⏸ pause';
      playBtn.classList.add('is-playing');
      playBtn.setAttribute('aria-label', 'Pause');
      if (visualizerEl) visualizerEl.classList.add('playing');
    } else {
      playBtn.textContent = '▶ play';
      playBtn.classList.remove('is-playing');
      playBtn.setAttribute('aria-label', 'Play');
      if (visualizerEl) visualizerEl.classList.remove('playing');
    }
  }

  function play() {
    if (!audio.src || !audio.src.includes('http')) {
      loadTrack(true);
      return;
    }
    audio.play().then(() => {
      setPlayingState(true);
    }).catch(err => {
      console.warn("Playback error:", err);
      loadTrack(true);
    });
  }

  function pause() {
    audio.pause();
    setPlayingState(false);
  }

  function togglePlay() {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }

  function nextTrack() {
    currentTrackIdx = (currentTrackIdx + 1) % tracks.length;
    loadTrack(isPlaying);
  }

  function prevTrack() {
    currentTrackIdx = (currentTrackIdx - 1 + tracks.length) % tracks.length;
    loadTrack(isPlaying);
  }

  playBtn.addEventListener('click', togglePlay);
  if (nextBtn) nextBtn.addEventListener('click', nextTrack);
  if (prevBtn) prevBtn.addEventListener('click', prevTrack);

  audio.addEventListener('timeupdate', () => {
    const cur = audio.currentTime || 0;
    const dur = audio.duration || 30;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;
    if (progressFill) progressFill.style.width = `${pct}%`;
    if (timeEl) timeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
  });

  audio.addEventListener('ended', () => {
    nextTrack();
  });

  audio.addEventListener('error', (e) => {
    console.warn("Audio element error on preview track:", e);
    setPlayingState(false);
  });

  if (progressBar) {
    progressBar.addEventListener('click', (e) => {
      const rect = progressBar.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const width = rect.width;
      if (width > 0 && audio.duration) {
        audio.currentTime = (clickX / width) * audio.duration;
      }
    });
  }

  // Initial setup with first track
  updateTrackUI();
  audio.src = tracks[0].previewUrl;
}