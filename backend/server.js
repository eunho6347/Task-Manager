const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const db = require("./database");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function mapTodoRow(row) {
  return {
    id: row.id,
    text: row.text,
    completed: Boolean(row.completed),
    category: row.category,
    priority: row.priority,
    dueDate: row.due_date || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isValidPriority(priority) {
  return ["high", "medium", "low"].includes(priority);
}

function isValidCategory(category) {
  return ["공부", "운동", "개인", "프로젝트"].includes(category);
}

app.get("/", (req, res) => {
  res.json({ message: "Student Task Manager API 서버 실행 중" });
});

app.get("/todos", (req, res) => {
  const sql = `
    SELECT * FROM todos
    ORDER BY datetime(created_at) DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "할 일 목록 조회 실패" });
    }

    res.json(rows.map(mapTodoRow));
  });
});

app.post("/todos", (req, res) => {
  const { text, category, priority, dueDate } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ message: "할 일 내용은 필수입니다." });
  }

  if (!category || !isValidCategory(category)) {
    return res.status(400).json({ message: "유효한 카테고리를 선택하세요." });
  }

  if (!priority || !isValidPriority(priority)) {
    return res.status(400).json({ message: "유효한 중요도를 선택하세요." });
  }

  const now = new Date().toISOString();
  const todo = {
    id: createId(),
    text: text.trim(),
    completed: 0,
    category,
    priority,
    dueDate: dueDate || "",
    createdAt: now,
    updatedAt: now,
  };

  const sql = `
    INSERT INTO todos (
      id, text, completed, category, priority, due_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const params = [
    todo.id,
    todo.text,
    todo.completed,
    todo.category,
    todo.priority,
    todo.dueDate,
    todo.createdAt,
    todo.updatedAt,
  ];

  db.run(sql, params, err => {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "할 일 추가 실패" });
    }

    res.status(201).json({
      id: todo.id,
      text: todo.text,
      completed: false,
      category: todo.category,
      priority: todo.priority,
      dueDate: todo.dueDate,
      createdAt: todo.createdAt,
      updatedAt: todo.updatedAt,
    });
  });
});

app.patch("/todos/:id", (req, res) => {
  const { id } = req.params;
  const { text, completed, category, priority, dueDate } = req.body;

  db.get(`SELECT * FROM todos WHERE id = ?`, [id], (findErr, row) => {
    if (findErr) {
      console.error(findErr);
      return res.status(500).json({ message: "할 일 조회 실패" });
    }

    if (!row) {
      return res.status(404).json({ message: "해당 할 일을 찾을 수 없습니다." });
    }

    const updatedTodo = {
      text: text !== undefined ? String(text).trim() : row.text,
      completed: completed !== undefined ? (completed ? 1 : 0) : row.completed,
      category: category !== undefined ? category : row.category,
      priority: priority !== undefined ? priority : row.priority,
      dueDate: dueDate !== undefined ? dueDate : row.due_date,
      updatedAt: new Date().toISOString(),
    };

    if (!updatedTodo.text) {
      return res.status(400).json({ message: "할 일 내용은 비워둘 수 없습니다." });
    }

    if (!isValidCategory(updatedTodo.category)) {
      return res.status(400).json({ message: "유효한 카테고리를 선택하세요." });
    }

    if (!isValidPriority(updatedTodo.priority)) {
      return res.status(400).json({ message: "유효한 중요도를 선택하세요." });
    }

    const sql = `
      UPDATE todos
      SET text = ?, completed = ?, category = ?, priority = ?, due_date = ?, updated_at = ?
      WHERE id = ?
    `;

    const params = [
      updatedTodo.text,
      updatedTodo.completed,
      updatedTodo.category,
      updatedTodo.priority,
      updatedTodo.dueDate,
      updatedTodo.updatedAt,
      id,
    ];

    db.run(sql, params, err => {
      if (err) {
        console.error(err);
        return res.status(500).json({ message: "할 일 수정 실패" });
      }

      res.json({
        id,
        text: updatedTodo.text,
        completed: Boolean(updatedTodo.completed),
        category: updatedTodo.category,
        priority: updatedTodo.priority,
        dueDate: updatedTodo.dueDate || "",
        createdAt: row.created_at,
        updatedAt: updatedTodo.updatedAt,
      });
    });
  });
});

app.delete("/todos/:id", (req, res) => {
  const { id } = req.params;

  db.run(`DELETE FROM todos WHERE id = ?`, [id], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "할 일 삭제 실패" });
    }

    if (this.changes === 0) {
      return res.status(404).json({ message: "해당 할 일을 찾을 수 없습니다." });
    }

    res.json({ message: "할 일이 삭제되었습니다." });
  });
});

app.delete("/todos/completed/all", (req, res) => {
  db.run(`DELETE FROM todos WHERE completed = 1`, [], function (err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ message: "완료 항목 삭제 실패" });
    }

    res.json({
      message: "완료된 항목이 삭제되었습니다.",
      deletedCount: this.changes,
    });
  });
});

app.listen(PORT, () => {
  console.log(`서버 실행: http://localhost:${PORT}`);
});