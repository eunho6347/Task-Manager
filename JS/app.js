(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const API_BASE_URL = "http://localhost:3000";

  const form = $("#todo-form");
  const input = $("#todo-input");
  const categoryInput = $("#todo-category");
  const priorityInput = $("#todo-priority");
  const dateInput = $("#todo-date");

  const searchInput = $("#search-input");
  const sortSelect = $("#sort-select");
  const list = $("#todo-list");
  const emptyState = $("#empty-state");

  const leftCount = $("#left-count");
  const totalCount = $("#total-count");
  const progressText = $("#progress-text");
  const progressFill = $("#progress-fill");

  const filters = $$(".filters .chip");
  const clearCompletedBtn = $("#clear-completed");
  const themeToggleBtn = $("#theme-toggle");

  let state = {
    items: [],
    filter: "all",
    search: "",
    sort: "latest",
    theme: localStorage.getItem("theme") || "light",
  };

  async function fetchTodos() {
    const response = await fetch(`${API_BASE_URL}/todos`);
    if (!response.ok) {
      throw new Error("목록을 불러오지 못했습니다.");
    }
    return response.json();
  }

  async function createTodo(todoData) {
    const response = await fetch(`${API_BASE_URL}/todos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(todoData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "할 일 추가 실패");
    }

    return data;
  }

  async function updateTodo(id, updates) {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(updates),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "할 일 수정 실패");
    }

    return data;
  }

  async function deleteTodo(id) {
    const response = await fetch(`${API_BASE_URL}/todos/${id}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "할 일 삭제 실패");
    }

    return data;
  }

  async function deleteCompletedTodos() {
    const response = await fetch(`${API_BASE_URL}/todos/completed/all`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "완료 항목 삭제 실패");
    }

    return data;
  }

  async function loadTodos() {
    try {
      state.items = await fetchTodos();
      render();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function setTheme(theme) {
    state.theme = theme;
    document.body.classList.toggle("dark", theme === "dark");
    themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
    localStorage.setItem("theme", theme);
  }

  function getPriorityLabel(priority) {
    switch (priority) {
      case "high":
        return "높음";
      case "medium":
        return "보통";
      case "low":
        return "낮음";
      default:
        return "보통";
    }
  }

  function priorityScore(priority) {
    if (priority === "high") return 3;
    if (priority === "medium") return 2;
    return 1;
  }

  function dueDateScore(dueDate) {
    if (!dueDate) return Number.MAX_SAFE_INTEGER;
    return new Date(dueDate).getTime();
  }

  function formatDate(dateString) {
    if (!dateString) return "기한 없음";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "기한 없음";

    return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
      date.getDate()
    ).padStart(2, "0")}`;
  }

  function isOverdue(dateString, completed) {
    if (!dateString || completed) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const due = new Date(dateString);
    due.setHours(0, 0, 0, 0);

    return due < today;
  }

  function getVisibleItems() {
    let items = [...state.items];

    if (state.filter === "active") {
      items = items.filter(item => !item.completed);
    } else if (state.filter === "completed") {
      items = items.filter(item => item.completed);
    }

    const keyword = state.search.trim().toLowerCase();
    if (keyword) {
      items = items.filter(item =>
        item.text.toLowerCase().includes(keyword) ||
        item.category.toLowerCase().includes(keyword) ||
        getPriorityLabel(item.priority).toLowerCase().includes(keyword)
      );
    }

    items.sort((a, b) => {
      switch (state.sort) {
        case "oldest":
          return new Date(a.createdAt) - new Date(b.createdAt);
        case "priority":
          return priorityScore(b.priority) - priorityScore(a.priority);
        case "dueDate":
          return dueDateScore(a.dueDate) - dueDateScore(b.dueDate);
        case "latest":
        default:
          return new Date(b.createdAt) - new Date(a.createdAt);
      }
    });

    return items;
  }

  function render() {
    renderFilters();
    renderList();
    renderSummary();
    renderEmptyState();
  }

  function renderFilters() {
    filters.forEach(chip => {
      chip.classList.toggle("chip--active", chip.dataset.filter === state.filter);
    });

    searchInput.value = state.search;
    sortSelect.value = state.sort;
  }

  function renderList() {
    const items = getVisibleItems();
    list.innerHTML = "";

    items.forEach(item => {
      list.appendChild(createTodoElement(item));
    });
  }

  function renderSummary() {
    const total = state.items.length;
    const completed = state.items.filter(item => item.completed).length;
    const left = total - completed;
    const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

    leftCount.textContent = `${left}개 남음`;
    totalCount.textContent = `총 ${total}개`;
    progressText.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
  }

  function renderEmptyState() {
    const hasVisibleItems = getVisibleItems().length > 0;
    emptyState.classList.toggle("hidden", hasVisibleItems);
    list.classList.toggle("hidden", !hasVisibleItems);
  }

  function createTodoElement(item) {
    const li = document.createElement("li");
    li.className = "item";
    li.dataset.id = item.id;

    const overdue = isOverdue(item.dueDate, item.completed);

    li.innerHTML = `
      <input
        type="checkbox"
        class="checkbox"
        ${item.completed ? "checked" : ""}
        aria-label="완료 여부 변경"
      />

      <div class="item__main">
        <div class="item__top">
          <p class="item__text ${item.completed ? "completed" : ""}">${escapeHTML(item.text)}</p>
        </div>

        <div class="item__meta">
          <span class="badge badge--category">${escapeHTML(item.category)}</span>
          <span class="badge badge--priority-${item.priority}">
            중요도 ${escapeHTML(getPriorityLabel(item.priority))}
          </span>
          <span class="badge ${overdue ? "badge--overdue" : "badge--due"}">
            ${overdue ? "기한 지남" : "마감"}: ${escapeHTML(formatDate(item.dueDate))}
          </span>
        </div>
      </div>

      <div class="item__actions">
        <button type="button" class="icon-btn edit-btn">수정</button>
        <button type="button" class="icon-btn icon-btn--danger delete-btn">삭제</button>
      </div>
    `;

    return li;
  }

  function showEditForm(itemElement, item) {
    const main = $(".item__main", itemElement);
    if (!main) return;

    if ($(".edit-form", itemElement)) return;

    const form = document.createElement("form");
    form.className = "edit-form";

    form.innerHTML = `
      <input class="input edit-text" type="text" maxlength="120" value="${escapeAttribute(item.text)}" required />
      <select class="select edit-category">
        ${createCategoryOptions(item.category)}
      </select>
      <select class="select edit-priority">
        ${createPriorityOptions(item.priority)}
      </select>
      <input class="input" type="date" value="${escapeAttribute(item.dueDate || "")}" />
      <button type="submit" class="icon-btn">저장</button>
      <button type="button" class="icon-btn cancel-edit-btn">취소</button>
    `;

    main.appendChild(form);

    const editTextInput = $(".edit-text", form);
    editTextInput.focus();
    editTextInput.select();

    form.addEventListener("submit", async e => {
      e.preventDefault();

      const newText = $(".edit-text", form).value.trim();
      const newCategory = $(".edit-category", form).value;
      const newPriority = $(".edit-priority", form).value;
      const newDueDate = $('input[type="date"]', form).value;

      if (!newText) return;

      try {
        const updated = await updateTodo(item.id, {
          text: newText,
          category: newCategory,
          priority: newPriority,
          dueDate: newDueDate,
        });

        state.items = state.items.map(todo => (todo.id === item.id ? updated : todo));
        render();
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    });

    $(".cancel-edit-btn", form).addEventListener("click", () => {
      render();
    });
  }

  function createCategoryOptions(selected) {
    const categories = ["공부", "운동", "개인", "프로젝트"];
    return categories
      .map(category => {
        const isSelected = category === selected ? "selected" : "";
        return `<option value="${category}" ${isSelected}>${category}</option>`;
      })
      .join("");
  }

  function createPriorityOptions(selected) {
    const priorities = [
      { value: "high", label: "높음" },
      { value: "medium", label: "보통" },
      { value: "low", label: "낮음" },
    ];

    return priorities
      .map(priority => {
        const isSelected = priority.value === selected ? "selected" : "";
        return `<option value="${priority.value}" ${isSelected}>${priority.label}</option>`;
      })
      .join("");
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, ch => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      };
      return map[ch];
    });
  }

  function escapeAttribute(str) {
    return escapeHTML(str).replace(/`/g, "");
  }

  form.addEventListener("submit", async e => {
    e.preventDefault();

    try {
      const created = await createTodo({
        text: input.value,
        category: categoryInput.value,
        priority: priorityInput.value,
        dueDate: dateInput.value,
      });

      state.items.unshift(created);
      render();

      form.reset();
      priorityInput.value = "medium";
      categoryInput.value = "공부";
      input.focus();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  });

  list.addEventListener("change", async e => {
    if (!e.target.classList.contains("checkbox")) return;

    const itemElement = e.target.closest(".item");
    if (!itemElement) return;

    const id = itemElement.dataset.id;
    const targetItem = state.items.find(todo => todo.id === id);
    if (!targetItem) return;

    try {
      const updated = await updateTodo(id, {
        completed: !targetItem.completed,
      });

      state.items = state.items.map(todo => (todo.id === id ? updated : todo));
      render();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  });

  list.addEventListener("click", async e => {
    const itemElement = e.target.closest(".item");
    if (!itemElement) return;

    const id = itemElement.dataset.id;
    const targetItem = state.items.find(todo => todo.id === id);
    if (!targetItem) return;

    if (e.target.classList.contains("delete-btn")) {
      try {
        await deleteTodo(id);
        state.items = state.items.filter(todo => todo.id !== id);
        render();
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
      return;
    }

    if (e.target.classList.contains("edit-btn")) {
      showEditForm(itemElement, targetItem);
    }
  });

  filters.forEach(chip => {
    chip.addEventListener("click", () => {
      state.filter = chip.dataset.filter;
      render();
    });
  });

  searchInput.addEventListener("input", e => {
    state.search = e.target.value;
    render();
  });

  sortSelect.addEventListener("change", e => {
    state.sort = e.target.value;
    render();
  });

  clearCompletedBtn.addEventListener("click", async () => {
    try {
      await deleteCompletedTodos();
      state.items = state.items.filter(item => !item.completed);
      render();
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  });

  themeToggleBtn.addEventListener("click", () => {
    setTheme(state.theme === "dark" ? "light" : "dark");
  });

  setTheme(state.theme);
  loadTodos();
})();