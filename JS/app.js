(() => {
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const form = $("#todo-form");
  const input = $("#todo-input");
  const list = $("#todo-list");
  const leftCount = $("#left-count");
  const filters = $$(".filters .chip");
  const clearCompletedBtn = $("#clear-completed");

  const STORAGE_KEY = "todolist:v2";

  let state = {
    items: loadItems(),
    filter: "all",
  };

  // 🔹 localStorage 불러오기
  function loadItems() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  // 🔹 저장
  function saveItems() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  }

  // 🔹 추가
  function addItem(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    state.items.push({
      id: Date.now().toString(),
      text: trimmed,
      completed: false,
    });

    saveItems();
    render();
  }

  // 🔹 삭제
  function removeItem(id) {
    state.items = state.items.filter(it => it.id !== id);
    saveItems();
    render();
  }

  // 🔹 체크
  function toggleItem(id) {
    state.items = state.items.map(it =>
      it.id === id ? { ...it, completed: !it.completed } : it
    );
    saveItems();
    render();
  }

  // 🔹 완료 삭제
  function clearCompleted() {
    state.items = state.items.filter(it => !it.completed);
    saveItems();
    render();
  }

  // 🔹 필터
  function setFilter(filter) {
    state.filter = filter;
    render();
  }

  function filteredItems() {
    switch (state.filter) {
      case "active":
        return state.items.filter(it => !it.completed);
      case "completed":
        return state.items.filter(it => it.completed);
      default:
        return state.items;
    }
  }

  // 🔹 남은 개수
  function updateLeftCount() {
    const count = state.items.filter(it => !it.completed).length;
    leftCount.textContent = `${count}개 남음`;
  }

  // 🔹 렌더링
  function render() {
    list.innerHTML = "";

    for (const it of filteredItems()) {
      const li = document.createElement("li");
      li.className = "item";

      li.innerHTML = `
        <input type="checkbox" class="checkbox" ${it.completed ? "checked" : ""}>
        <span class="text ${it.completed ? "completed" : ""}">${escapeHTML(it.text)}</span>
        <button class="icon-btn">✕</button>
      `;

      li.querySelector(".checkbox").addEventListener("change", () => {
        toggleItem(it.id);
      });

      li.querySelector(".icon-btn").addEventListener("click", () => {
        removeItem(it.id);
      });

      list.appendChild(li);
    }

    filters.forEach(chip => {
      chip.classList.toggle("chip--active", chip.dataset.filter === state.filter);
    });

    updateLeftCount();
  }

  // 🔹 XSS 방지
  function escapeHTML(str) {
    return str.replace(/[&<>"']/g, s => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    }[s]));
  }

  // 🔹 이벤트
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    addItem(input.value);
    input.value = "";
  });

  filters.forEach(chip => {
    chip.addEventListener("click", () => setFilter(chip.dataset.filter));
  });

  clearCompletedBtn.addEventListener("click", clearCompleted);

  render();
})();