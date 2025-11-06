import React, { useEffect, useMemo, useState } from "react";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Legend } from "recharts";

// ---------------- UI (no external UI libs) ----------------
const styles = {
  page: { fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial", background: "#0f172a0d", minHeight: "100vh", padding: 16 },
  container: { maxWidth: 1100, margin: "0 auto" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8, flexWrap: "wrap" },
  h1: { fontSize: 22, fontWeight: 700, margin: 0 },
  card: { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  cardBody: { padding: 16 },
  grid: { display: "grid", gap: 16 },
  gridCols: (n) => ({ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }),
  label: { fontSize: 12, color: "#6b7280", marginBottom: 6, display: "block" },
  input: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb" },
  select: { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff" },
  button: { padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#111827", color: "#fff", cursor: "pointer" },
  buttonSecondary: { padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#f3f4f6", color: "#111827", cursor: "pointer" },
  danger: { background: "#dc2626", color: "#fff", border: "1px solid #b91c1c", padding: "10px 14px", borderRadius: 8, cursor: "pointer" },
  tabs: { display: "flex", gap: 8, border: "1px solid #e5e7eb", borderRadius: 8, padding: 6, background: "#fff" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 14 },
  th: { textAlign: "left", padding: 12, borderBottom: "1px solid #e5e7eb", background: "#f9fafb", position: "sticky", top: 0 },
  td: { padding: 12, borderBottom: "1px solid #f3f4f6" },
  pill: { fontSize: 12, padding: "2px 8px", borderRadius: 999, border: "1px solid #e5e7eb", display: "inline-block" },
  confirmBox: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 },
  confirmContent: { background: "#fff", padding: 24, borderRadius: 12, width: 320, textAlign: "center" },
};

// ---- THEME HELPERS (Dark/Light) ----
const pageStyle = (dark) => ({ ...styles.page, background: dark ? "#0b1220" : styles.page.background, color: dark ? "#e5e7eb" : "#111827" });
const card = (dark) => ({ ...styles.card, background: dark ? "#0f172a" : "#fff", border: `1px solid ${dark ? "#1f2937" : "#e5e7eb"}` });
const cardBody = (dark) => ({ ...styles.cardBody });
const inputStyle = (dark) => ({ ...styles.input, background: dark ? "#0b1220" : "#fff", color: dark ? "#e5e7eb" : "#111827", border: `1px solid ${dark ? "#334155" : "#e5e7eb"}` });
const selectStyle = (dark) => ({ ...styles.select, background: dark ? "#0b1220" : "#fff", color: dark ? "#e5e7eb" : "#111827", border: `1px solid ${dark ? "#334155" : "#e5e7eb"}` });
const buttonSecondaryStyle = (dark) => ({ padding: "10px 14px", borderRadius: 8, border: `1px solid ${dark ? "#374151" : "#e5e7eb"}`, background: dark ? "#111827" : "#f3f4f6", color: dark ? "#e5e7eb" : "#111827", cursor: "pointer" });
const tabBtnStyle = (active) => ({ padding: "8px 12px", borderRadius: 6, border: "1px solid #e5e7eb", background: active ? "#111827" : "#fff", color: active ? "#fff" : "#111827", cursor: "pointer" });

// ---------------- Utils ----------------
const currency = (n) => new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(+n || 0);
const fmtDate = (s) => new Date(s).toISOString().slice(0, 10);
const today = () => fmtDate(new Date());
const monthKey = (d) => { const dt = new Date(d); return `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`; };

const CATEGORY_PRESETS = ["Food","Transport","Groceries","Bills","Shopping","Health","Entertainment","Education","Other"];
const INCOME_PRESETS   = ["Salary","Freelance","Business","Gift","Interest","Investment","Refund","Other Income"];
const COLORS = ["#8884d8","#82ca9d","#ffc658","#ff7f50","#8dd1e1","#a4de6c","#d0ed57","#83a6ed","#d885d8"];

// ---------------- Local Storage Hook ----------------
const useLocal = (key, initial) => {
  const [state, setState] = useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
};

// ---------------- Reusable Confirm Dialog ----------------
function ConfirmDialog({ title = "Are you sure?", message, confirmText = "Delete", cancelText = "Cancel", onConfirm, onCancel }) {
  return (
    <div style={styles.confirmBox}>
      <div style={styles.confirmContent}>
        <h3 style={{ marginTop: 0 }}>{title}</h3>
        <p style={{ marginBottom: 16 }}>{message}</p>
        <div style={{ display: "flex", justifyContent: "space-around" }}>
          <button onClick={onCancel} style={styles.buttonSecondary}>{cancelText}</button>
          <button onClick={onConfirm} style={styles.danger}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
}

// ---------------- Expenses (+Income) ----------------
function ExpenseTracker({ pushToTrash, dark }) {
  const [entries, setEntries] = useLocal("myy.expenses", []);
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState(0);
  const [category, setCategory] = useState(CATEGORY_PRESETS[0]);
  const [note, setNote] = useState("");
  const [date, setDate] = useState(today());
  const [monthFilter, setMonthFilter] = useState(monthKey(new Date()));
  const [confirmDelete, setConfirmDelete] = useState(null);

  useEffect(() => { setCategory(type === "expense" ? CATEGORY_PRESETS[0] : INCOME_PRESETS[0]); }, [type]);

  const monthsAvailable = useMemo(() => {
    const set = new Set(entries.map((e) => monthKey(e.date)));
    return Array.from(set).sort().reverse();
  }, [entries]);

  const filtered = useMemo(() => entries.filter((e) => monthKey(e.date) === monthFilter), [entries, monthFilter]);

  const totals = useMemo(() => {
    const sumExpense = filtered.filter(e => e.type !== "income").reduce((acc, e) => acc + +e.amount, 0);
    const sumIncome  = filtered.filter(e => e.type === "income").reduce((acc, e) => acc + +e.amount, 0);
    const net = sumIncome - sumExpense;
    const byCat = filtered.filter(e => e.type !== "income").reduce((m, e) => { m[e.category] = (m[e.category] || 0) + +e.amount; return m; }, {});
    const chartData = Object.entries(byCat).map(([name, value]) => ({ name, value }));
    const byDay = {};
    filtered.forEach((e) => { const d = fmtDate(e.date); if (!byDay[d]) byDay[d] = { date: d, expense: 0, income: 0 }; if (e.type === "income") byDay[d].income += +e.amount; else byDay[d].expense += +e.amount; });
    const lineData = Object.values(byDay).sort((a,b) => a.date.localeCompare(b.date));
    return { sumExpense, sumIncome, net, chartData, lineData };
  }, [filtered]);

  const addEntry = () => {
    if (!amount || amount <= 0) return;
    setEntries((prev) => [{ id: crypto.randomUUID(), type, amount: +amount, category, note, date: fmtDate(date) }, ...prev]);
    setAmount(0); setNote(""); setDate(today());
  };

  const softDelete = (id) => setConfirmDelete(id);
  const confirmDeletion = () => {
    const id = confirmDelete; if (!id) return;
    setEntries((prev) => {
      const item = prev.find((e) => e.id === id);
      if (item) pushToTrash({ kind: "expense", item: { ...item, deletedAt: new Date().toISOString() } });
      return prev.filter((e) => e.id !== id);
    });
    setConfirmDelete(null);
  };

  const moveMonthToTrash = () => {
    if (!window.confirm("Move all this month entries to Restore?")) return;
    setEntries((prev) => {
      const keep = []; const move = [];
      prev.forEach((e) => (monthKey(e.date) === monthFilter ? move.push(e) : keep.push(e)));
      move.forEach((m) => pushToTrash({ kind: "expense", item: { ...m, deletedAt: new Date().toISOString() } }));
      return keep;
    });
  };

  return (
    <div style={{ ...styles.grid, ...styles.gridCols(3) }}>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete entry?"
          message="This will move the entry to Restore."
          confirmText="Delete"
          onConfirm={confirmDeletion}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div style={{ ...card(dark), gridColumn: "span 1" }}>
        <div style={cardBody(dark)}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Add Entry</h2>
          <div>
            <label style={styles.label}>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)} style={selectStyle(dark)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={styles.label}>Amount (₹)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g., 250" style={inputStyle(dark)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={styles.label}>Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} style={selectStyle(dark)}>
              {(type === "expense" ? CATEGORY_PRESETS : INCOME_PRESETS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={styles.label}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={inputStyle(dark)} />
          </div>
          <div style={{ marginTop: 10 }}>
            <label style={styles.label}>Note</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional" style={inputStyle(dark)} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={addEntry} style={styles.button}>Add</button>
            <button onClick={moveMonthToTrash} style={buttonSecondaryStyle(dark)}>Move Month to Trash</button>
          </div>
        </div>
      </div>

      <div style={{ gridColumn: "span 2", display: "grid", gap: 16 }}>
        <div style={card(dark)}>
          <div style={cardBody(dark)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 600 }}>This Month</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={styles.label}>Month</span>
                <select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} style={{ ...selectStyle(dark), width: 160 }}>
                  {[monthKey(new Date()), ...monthsAvailable.filter(m => m !== monthKey(new Date()))].map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ ...styles.grid, ...styles.gridCols(3), marginTop: 16 }}>
              <div style={card(dark)}><div style={cardBody(dark)}><div style={styles.label}>Total Income</div><div style={{ fontSize: 26, fontWeight: 700 }}>{currency(totals.sumIncome)}</div></div></div>
              <div style={card(dark)}><div style={cardBody(dark)}><div style={styles.label}>Total Spent</div><div style={{ fontSize: 26, fontWeight: 700 }}>{currency(totals.sumExpense)}</div></div></div>
              <div style={card(dark)}><div style={cardBody(dark)}><div style={styles.label}>Net</div><div style={{ fontSize: 26, fontWeight: 700, color: totals.net < 0 ? "#dc2626" : "#16a34a" }}>{currency(totals.net)}</div></div></div>
            </div>

            <div style={{ ...styles.grid, ...styles.gridCols(2), marginTop: 16 }}>
              <div style={card(dark)}><div style={{ ...cardBody(dark), height: 260 }}>
                <div style={styles.label}>Expenses by Category</div>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip formatter={(v, n) => [currency(v), n]} />
                      <Pie data={totals.chartData} dataKey="value" nameKey="name" outerRadius={80}>
                        {totals.chartData.map((_, i) => (<Cell key={i} fill={COLORS[i % COLORS.length]} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div></div>

              <div style={card(dark)}><div style={{ ...cardBody(dark), height: 260 }}>
                <div style={styles.label}>Daily Flow</div>
                <div style={{ height: 210 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={totals.lineData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date"/>
                      <YAxis/>
                      <Tooltip formatter={(v) => currency(v)} />
                      <Legend />
                      <Line type="monotone" dataKey="expense" name="Expense" stroke="#ef4444" strokeWidth={2} dot={false}/>
                      <Line type="monotone" dataKey="income" name="Income" stroke="#22c55e" strokeWidth={2} dot={false}/>
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div></div>
            </div>
          </div>
        </div>

        <div style={card(dark)}>
          <div style={{ ...cardBody(dark), padding: 0 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${dark ? "#1f2937" : "#e5e7eb"}` }}>
              <h3 style={{ margin: 0, fontSize: 16 }}>Recent Entries</h3>
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto" }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Date</th>
                    <th style={styles.th}>Type</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Note</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Amount</th>
                    <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.filter((e) => monthKey(e.date) === monthFilter).map((e) => (
                    <tr key={e.id}>
                      <td style={styles.td}>{fmtDate(e.date)}</td>
                      <td style={styles.td}><span style={styles.pill}>{e.type}</span></td>
                      <td style={styles.td}>{e.category}</td>
                      <td style={{ ...styles.td, maxWidth: 260, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>{e.note || "—"}</td>
                      <td style={{ ...styles.td, textAlign: "right", color: e.type === "income" ? "#16a34a" : "#dc2626", fontWeight: 600 }}>{e.type === "income" ? "+" : "-"}{currency(e.amount)}</td>
                      <td style={{ ...styles.td, textAlign: "right" }}>
                        <button onClick={() => softDelete(e.id)} style={buttonSecondaryStyle(dark)}>Delete</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------- Checklist ----------------
function Checklist({ pushToTrash, dark }) {
  const [tasks, setTasks] = useLocal("myy.tasks", []);
  const [text, setText] = useState("");
  const [due, setDue] = useState("");
  const [showDone, setShowDone] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const pending = tasks.filter((t) => !t.done);
  const completed = tasks.filter((t) => t.done);

  const add = () => {
    const trimmed = text.trim(); if (!trimmed) return;
    setTasks((prev) => [{ id: crypto.randomUUID(), text: trimmed, due: due || null, done: false, createdAt: new Date().toISOString() }, ...prev]);
    setText(""); setDue("");
  };
  const toggle = (id) => setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const askDelete = (id) => setConfirmDelete(id);
  const confirmDeletion = () => {
    const id = confirmDelete; if (!id) return;
    setTasks((prev) => {
      const item = prev.find((t) => t.id === id);
      if (item) pushToTrash({ kind: "task", item: { ...item, deletedAt: new Date().toISOString() } });
      return prev.filter((t) => t.id !== id);
    });
    setConfirmDelete(null);
  };
  const moveDoneToTrash = () => {
    if (!window.confirm("Move all completed tasks to Restore?")) return;
    setTasks((prev) => {
      const keep = []; const move = [];
      prev.forEach((t) => (t.done ? move.push(t) : keep.push(t)));
      move.forEach((m) => pushToTrash({ kind: "task", item: { ...m, deletedAt: new Date().toISOString() } }));
      return keep;
    });
  };

  const TaskRow = ({ t }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 12, borderBottom: `1px solid ${dark ? "#1f2937" : "#e5e7eb"}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <input type="checkbox" checked={t.done} onChange={() => toggle(t.id)} />
        <div>
          <div style={{ fontWeight: 600, textDecoration: t.done ? "line-through" : "none", color: t.done ? "#6b7280" : "inherit" }}>{t.text}</div>
          <div style={{ fontSize: 12, color: "#6b7280" }}>{t.due ? `Due ${fmtDate(t.due)}` : "No due date"}</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {t.done && <span style={{ ...styles.pill, borderColor: "#86efac", background: "#ecfdf5" }}>Done</span>}
        <button onClick={() => askDelete(t.id)} style={buttonSecondaryStyle(dark)}>Delete</button>
      </div>
    </div>
  );

  return (
    <div style={{ ...styles.grid, ...styles.gridCols(2) }}>
      {confirmDelete && (
        <ConfirmDialog
          title="Delete task?"
          message="This will move the task to Restore."
          confirmText="Delete"
          onConfirm={confirmDeletion}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      <div style={card(dark)}><div style={cardBody(dark)}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600, marginBottom: 10 }}>Add Task</h2>
        <div>
          <label style={styles.label}>Task</label>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="e.g., Revise CNN notes" style={inputStyle(dark)} />
        </div>
        <div style={{ marginTop: 10 }}>
          <label style={styles.label}>Due date (optional)</label>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} style={inputStyle(dark)} />
        </div>
        <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={styles.label}>Show completed</span>
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} />
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={add} style={styles.button}>Add Task</button>
          <button onClick={moveDoneToTrash} style={buttonSecondaryStyle(dark)}>Move Done to Trash</button>
        </div>
      </div></div>

      <div style={card(dark)}><div style={{ ...cardBody(dark), padding: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${dark ? "#1f2937" : "#e5e7eb"}` }}>
          <h3 style={{ margin: 0, fontSize: 16 }}>Your Tasks</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={styles.label}>Pending: {pending.length}</span>
          </div>
        </div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          {pending.length === 0 && (!showDone || completed.length === 0) && (
            <div style={{ padding: 16, fontSize: 14, color: "#6b7280" }}>No tasks yet. Add one on the left!</div>
          )}
          {pending.map((t) => <TaskRow key={t.id} t={t} />)}
          {showDone && completed.length > 0 && (
            <>
              <div style={{ padding: "6px 16px", fontSize: 11, textTransform: "uppercase", letterSpacing: 0.6, color: "#6b7280", background: dark ? "#0f172a" : "#f9fafb" }}>Completed</div>
              {completed.map((t) => <TaskRow key={t.id} t={t} />)}
            </>
          )}
        </div>
      </div></div>
    </div>
  );
}

// ---------------- Restore (Trash) ----------------
function RestoreTrash({ restoreExpense, restoreTask, dark }) {
  const [trash, setTrash] = useLocal("myy.trash", { expenses: [], tasks: [] });

  const dedupeById = (arr) => {
    const seen = new Set();
    return (arr || []).filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)));
  };
  const exp = dedupeById(trash.expenses);
  const tasks = dedupeById(trash.tasks);

  const removeExpenseFromTrash = (id) => setTrash((t) => ({ ...t, expenses: (t.expenses || []).filter((e) => e.id !== id) }));
  const removeTaskFromTrash = (id) => setTrash((t) => ({ ...t, tasks: (t.tasks || []).filter((e) => e.id !== id) }));

  const restoreE = (e) => { restoreExpense(e); removeExpenseFromTrash(e.id); };
  const restoreT = (t) => { restoreTask(t); removeTaskFromTrash(t.id); };

  const clearAll = () => {
    if (!window.confirm("Permanently delete everything in Restore?")) return;
    setTrash({ expenses: [], tasks: [] });
  };

  return (
    <div style={{ ...styles.grid, ...styles.gridCols(2) }}>
      <div style={card(dark)}><div style={{ ...cardBody(dark), padding: 0 }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${dark ? "#1f2937" : "#e5e7eb"}` }}>Deleted Expenses</div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Date</th>
                <th style={styles.th}>Type</th>
                <th style={styles.th}>Category</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Amount</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {exp.length === 0 && (
                <tr><td style={{ ...styles.td, color: "#6b7280" }} colSpan={5}>Nothing here</td></tr>
              )}
              {exp.map((e) => (
                <tr key={e.id}>
                  <td style={styles.td}>{fmtDate(e.date)}</td>
                  <td style={styles.td}>{e.type}</td>
                  <td style={styles.td}>{e.category}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>{e.type === "income" ? "+" : "-"}{currency(e.amount)}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button onClick={() => restoreE(e)} style={styles.button}>Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div></div>

      <div style={card(dark)}><div style={{ ...cardBody(dark), padding: 0 }}>
        <div style={{ padding: "10px 16px", borderBottom: `1px solid ${dark ? "#1f2937" : "#e5e7eb"}` }}>Deleted Tasks</div>
        <div style={{ maxHeight: 420, overflowY: "auto" }}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Task</th>
                <th style={styles.th}>Due</th>
                <th style={styles.th}>Done?</th>
                <th style={{ ...styles.th, textAlign: "right" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr><td style={{ ...styles.td, color: "#6b7280" }} colSpan={4}>Nothing here</td></tr>
              )}
              {tasks.map((t) => (
                <tr key={t.id}>
                  <td style={styles.td}>{t.text}</td>
                  <td style={styles.td}>{t.due ? fmtDate(t.due) : "—"}</td>
                  <td style={styles.td}>{t.done ? "Yes" : "No"}</td>
                  <td style={{ ...styles.td, textAlign: "right" }}>
                    <button onClick={() => restoreT(t)} style={styles.button}>Restore</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", padding: 16 }}>
          <button onClick={clearAll} style={styles.danger}>Empty Restore</button>
        </div>
      </div></div>
    </div>
  );
}

// ---------------- Root App ----------------
export default function MyyTracker() {
  const [trash, setTrash] = useLocal("myy.trash", { expenses: [], tasks: [] });
  const [tab, setTab] = useState("expenses"); // expenses | checklist | restore
  const [dark, setDark] = useLocal("myy.dark", false);

  // push item to trash (prevent duplicates)
  const pushToTrash = ({ kind, item }) => {
    setTrash((t) => {
      if (kind === "expense") {
        const exists = (t.expenses || []).some((x) => x.id === item.id);
        return exists ? t : { ...t, expenses: [item, ...(t.expenses || [])] };
      } else {
        const exists = (t.tasks || []).some((x) => x.id === item.id);
        return exists ? t : { ...t, tasks: [item, ...(t.tasks || [])] };
      }
    });
  };

  // restore handlers used by RestoreTrash
  const restoreExpense = (e) => {
    const raw = localStorage.getItem("myy.expenses");
    const prev = raw ? JSON.parse(raw) : [];
    localStorage.setItem("myy.expenses", JSON.stringify([e, ...prev]));
    setTrash((t) => ({ ...t, expenses: (t.expenses || []).filter((x) => x.id !== e.id) }));
  };
  const restoreTask = (task) => {
    const raw = localStorage.getItem("myy.tasks");
    const prev = raw ? JSON.parse(raw) : [];
    localStorage.setItem("myy.tasks", JSON.stringify([task, ...prev]));
    setTrash((t) => ({ ...t, tasks: (t.tasks || []).filter((x) => x.id !== task.id) }));
  };

  return (
    <div style={pageStyle(dark)}>
      <div style={styles.container}>
        <div style={styles.header}>
          <h1 style={styles.h1}>Myy Tracker</h1>
          <div style={styles.tabs}>
            <button onClick={() => setTab("expenses")} style={tabBtnStyle(tab === "expenses")}>Expenses</button>
            <button onClick={() => setTab("checklist")} style={tabBtnStyle(tab === "checklist")}>Checklist</button>
            <button onClick={() => setTab("restore")} style={tabBtnStyle(tab === "restore")}>Restore</button>
            <button onClick={() => setDark(!dark)} style={buttonSecondaryStyle(dark)}>{dark ? "Light" : "Dark"} Mode</button>
          </div>
        </div>

        {tab === "expenses" && <ExpenseTracker pushToTrash={pushToTrash} dark={dark} />}
        {tab === "checklist" && <Checklist pushToTrash={pushToTrash} dark={dark} />}
        {tab === "restore" && <RestoreTrash restoreExpense={restoreExpense} restoreTask={restoreTask} dark={dark} />}

        <div style={{ fontSize: 12, color: dark ? "#9ca3af" : "#6b7280", marginTop: 10 }}>Data is stored locally in your browser (localStorage). Want Export/Import backup? Say the word.</div>
      </div>
    </div>
  );
}
