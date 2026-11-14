// ---- Tab switching ----
const tabs = document.querySelectorAll(".tab");
const panels = document.querySelectorAll(".panel");

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.remove("active"));
    panels.forEach((p) => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(tab.dataset.tab).classList.add("active");
  });
});

// ---- Generic list helpers (localStorage) ----
function getList(key) {
  return JSON.parse(localStorage.getItem(key) || "[]");
}

function saveList(key, items) {
  localStorage.setItem(key, JSON.stringify(items));
}

// ---- Todo List ----
const todoForm = document.getElementById("todo-form");
const todoInput = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");

function renderTodos() {
  const todos = getList("todos");
  todoList.innerHTML = "";
  todos.forEach((todo, i) => {
    const li = document.createElement("li");
    if (todo.done) li.classList.add("done");
    li.innerHTML = `
      <input type="checkbox" ${todo.done ? "checked" : ""} data-index="${i}" class="todo-check" />
      <span class="text">${escapeHtml(todo.text)}</span>
      <button class="delete" data-index="${i}" data-type="todo">✕</button>
    `;
    todoList.appendChild(li);
  });
}

todoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const todos = getList("todos");
  todos.push({ text: todoInput.value, done: false });
  saveList("todos", todos);
  todoInput.value = "";
  renderTodos();
});

todoList.addEventListener("click", (e) => {
  const todos = getList("todos");
  const i = e.target.dataset.index;
  if (e.target.classList.contains("todo-check")) {
    todos[i].done = e.target.checked;
    saveList("todos", todos);
    renderTodos();
  } else if (e.target.classList.contains("delete")) {
    todos.splice(i, 1);
    saveList("todos", todos);
    renderTodos();
  }
});

// ---- Shopping List ----
const shoppingForm = document.getElementById("shopping-form");
const shoppingInput = document.getElementById("shopping-input");
const shoppingList = document.getElementById("shopping-list");

function renderShopping() {
  const items = getList("shopping");
  shoppingList.innerHTML = "";
  items.forEach((item, i) => {
    const li = document.createElement("li");
    if (item.done) li.classList.add("done");
    li.innerHTML = `
      <input type="checkbox" ${item.done ? "checked" : ""} data-index="${i}" class="shop-check" />
      <span class="text">${escapeHtml(item.text)}</span>
      <button class="delete" data-index="${i}" data-type="shopping">✕</button>
    `;
    shoppingList.appendChild(li);
  });
}

shoppingForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const items = getList("shopping");
  items.push({ text: shoppingInput.value, done: false });
  saveList("shopping", items);
  shoppingInput.value = "";
  renderShopping();
});

shoppingList.addEventListener("click", (e) => {
  const items = getList("shopping");
  const i = e.target.dataset.index;
  if (e.target.classList.contains("shop-check")) {
    items[i].done = e.target.checked;
    saveList("shopping", items);
    renderShopping();
  } else if (e.target.classList.contains("delete")) {
    items.splice(i, 1);
    saveList("shopping", items);
    renderShopping();
  }
});

// ---- Expense Tracker ----
const expenseForm = document.getElementById("expense-form");
const expenseDesc = document.getElementById("expense-desc");
const expenseAmount = document.getElementById("expense-amount");
const expenseList = document.getElementById("expense-list");
const expenseTotal = document.getElementById("expense-total");

function renderExpenses() {
  const expenses = getList("expenses");
  expenseList.innerHTML = "";
  let total = 0;
  expenses.forEach((exp, i) => {
    total += parseFloat(exp.amount);
    const li = document.createElement("li");
    li.innerHTML = `
      <span class="text">${escapeHtml(exp.desc)}</span>
      <span class="amount">$${parseFloat(exp.amount).toFixed(2)}</span>
      <button class="delete" data-index="${i}" data-type="expense">✕</button>
    `;
    expenseList.appendChild(li);
  });
  expenseTotal.textContent = `Total: $${total.toFixed(2)}`;
}

expenseForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const expenses = getList("expenses");
  expenses.push({ desc: expenseDesc.value, amount: expenseAmount.value });
  saveList("expenses", expenses);
  expenseDesc.value = "";
  expenseAmount.value = "";
  renderExpenses();
});

expenseList.addEventListener("click", (e) => {
  if (e.target.classList.contains("delete")) {
    const expenses = getList("expenses");
    expenses.splice(e.target.dataset.index, 1);
    saveList("expenses", expenses);
    renderExpenses();
  }
});

// ---- Utility ----
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Initial render ----
renderTodos();
renderShopping();
renderExpenses();
