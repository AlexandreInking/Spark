import { useEffect, useMemo, useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button, Input, Label, Select, Badge } from "../components/ui/primitives";
import { db } from "../lib/db";
import { useAuth } from "../stores/useAuth";
import { debtProgress, expenseByCategory, monthTotals, monthlySeries, pendingBills, projectedJobIncome, totalDebtPending } from "../lib/finance";
import { isHired } from "../lib/jobScore";
import type { Debt, JobOffer, MoneyTransaction, TxCategory, TxKind, TxRecurrence } from "../types";
import { TX_CATEGORIES } from "../types";
import { Trash2, Plus, Edit3, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Scale, Landmark } from "lucide-react";

const MONTHS = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

function shiftYM(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function catLabel(c: TxCategory): string {
  return TX_CATEGORIES.find(x => x.value === c)?.label || c;
}

export default function FinancePage() {
  const { user } = useAuth();
  const [items, setItems] = useState<MoneyTransaction[]>([]);
  const [jobs, setJobs] = useState<JobOffer[]>([]);
  const [reminders, setReminders] = useState<any[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [ym, setYm] = useState(() => new Date().toISOString().slice(0, 7));
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<MoneyTransaction | null>(null);
  const [showDebt, setShowDebt] = useState(false);
  const [editingDebt, setEditingDebt] = useState<Debt | null>(null);

  const load = async () => {
    if (!user) return;
    const [txs, js, rems, ds] = await Promise.all([
      db.listTransactions(user.id),
      db.listJobOffers(user.id).catch(() => [] as JobOffer[]),
      db.listReminders(user.id),
      db.listDebts(user.id).catch(() => [] as Debt[]),
    ]);
    setItems(txs); setJobs(js); setReminders(rems); setDebts(ds);
  };
  useEffect(() => { load(); }, [user?.id]);

  const totals = useMemo(() => monthTotals(items, ym), [items, ym]);
  const series = useMemo(() => monthlySeries(items, ym, 6), [items, ym]);
  const byCat = useMemo(() => expenseByCategory(items, ym), [items, ym]);
  const debtSum = useMemo(() => totalDebtPending(debts, items), [debts, items]);
  const seriesMax = Math.max(1, ...series.flatMap(p => [p.income, p.expense]));
  const catMax = Math.max(1, ...byCat.map(c => c.total));

  const payDebt = async (d: Debt) => {
    if (!user) return;
    const prog = debtProgress(d, items);
    if (prog.done) return;
    const raw = prompt(`Monto del pago a ${d.creditor} (restan S/ ${prog.remaining.toFixed(0)})`, String(Math.round(prog.remaining)));
    const amount = raw ? Number(raw) : 0;
    if (!amount || amount <= 0) return;
    await db.saveTransaction({
      id: crypto.randomUUID(), userId: user.id, kind: "gasto", category: "deudas",
      amount, date: new Date().toISOString().slice(0, 10), recurring: "none",
      note: `Pago deuda: ${d.creditor}${d.title ? ` (${d.title})` : ""}`, debtId: d.id,
      createdAt: new Date().toISOString(),
    });
    await load();
  };

  const saveDebt = async (d: Debt) => {
    if (!d.creditor.trim() || !d.total || d.total <= 0) return alert("Acreedor y total requeridos");
    await db.saveDebt(d);
    setShowDebt(false); setEditingDebt(null);
    await load();
  };
  const projIncome = useMemo(() => projectedJobIncome(jobs.filter(isHired), ym), [jobs, ym]);
  const bills = useMemo(() => pendingBills(reminders, ym), [reminders, ym]);
  const [y, m] = ym.split("-").map(Number);

  const save = async (t: MoneyTransaction) => {
    if (!t.amount || t.amount <= 0 || !t.date) return alert("Monto y fecha requeridos");
    try {
      await db.saveTransaction(t);
      setShow(false); setEditing(null);
      await load();
    } catch (e: any) {
      console.error("[Finanzas] save failed", e, t);
      alert(`No se pudo guardar: ${e?.message || e}`);
    }
  };

  const monthItems = useMemo(() => {
    const from = `${ym}-01`;
    const to = `${ym}-31`;
    return items
      .filter(t => t.date <= to && (t.recurring !== "none" || t.date >= from))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [items, ym]);

  return (
    <div style={{ flex: 1, overflow: "auto" }}>
      <Topbar title="Finanzas" subtitle="Gastos vs ingresos del mes • recurrentes + proyectado de trabajos y pagos" actions={
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <Button size="sm" onClick={() => setYm(shiftYM(ym, -1))}><ChevronLeft size={14} /></Button>
          <b style={{ fontSize: 13, minWidth: 90, textAlign: "center" }}>{MONTHS[m - 1]} {y}</b>
          <Button size="sm" onClick={() => setYm(shiftYM(ym, 1))}><ChevronRight size={14} /></Button>
          <Button variant="primary" onClick={() => { setEditing(null); setShow(true); }}><Plus size={14} /> Registrar</Button>
        </div>
      } />
      <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
        <div className="grid grid-3">
          <Card>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><TrendingUp size={14} style={{ color: "#059669" }} /><b style={{ fontSize: 12 }}>Ingresos</b></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#059669" }}>S/ {totals.income.toFixed(0)}</div>
          </Card>
          <Card>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><TrendingDown size={14} style={{ color: "#dc2626" }} /><b style={{ fontSize: 12 }}>Gastos</b></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#dc2626" }}>S/ {totals.expense.toFixed(0)}</div>
          </Card>
          <Card>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}><Scale size={14} style={{ color: "#0369a1" }} /><b style={{ fontSize: 12 }}>Balance</b></div>
            <div style={{ fontSize: 22, fontWeight: 800, color: totals.balance >= 0 ? "#059669" : "#dc2626" }}>S/ {totals.balance.toFixed(0)}</div>
            <div className="muted small">{totals.count} movimiento(s) confirmados</div>
          </Card>
        </div>

        <Card>
          <b style={{ fontSize: 12 }}>Salud económica — últimos 6 meses (confirmado)</b>
          <div style={{ display: "flex", gap: 10, alignItems: "end", height: 120, marginTop: 10 }}>
            {series.map(p => (
              <div key={p.ym} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <div style={{ display: "flex", gap: 3, alignItems: "end", height: 88 }}>
                  <div title={`Ingresos S/ ${p.income.toFixed(0)}`} style={{ width: 12, height: Math.max(3, Math.round(p.income / seriesMax * 88)), background: "#059669", borderRadius: 3 }} />
                  <div title={`Gastos S/ ${p.expense.toFixed(0)}`} style={{ width: 12, height: Math.max(3, Math.round(p.expense / seriesMax * 88)), background: "#dc2626", borderRadius: 3 }} />
                </div>
                <span className="muted" style={{ fontSize: 10 }}>{p.label}</span>
                <b style={{ fontSize: 10, color: p.balance >= 0 ? "#059669" : "#dc2626" }}>{p.balance >= 0 ? "+" : ""}{p.balance.toFixed(0)}</b>
              </div>
            ))}
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>
            <span style={{ color: "#059669" }}>■</span> Ingresos <span style={{ color: "#dc2626" }}>■</span> Gastos <span className="muted">• número = balance</span>
            {debtSum.count > 0 && <span> • <b style={{ color: "#b45309" }}>Deudas pendientes: S/ {debtSum.pending.toFixed(0)} ({debtSum.count})</b></span>}
          </div>
          {byCat.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <b style={{ fontSize: 12 }}>Gasto del mes por categoría</b>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 6 }}>
                {byCat.slice(0, 6).map(c => (
                  <div key={c.category} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 11 }}>
                    <span style={{ width: 90 }}>{catLabel(c.category)}</span>
                    <div style={{ flex: 1, height: 8, background: "var(--surface)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.round(c.total / catMax * 100)}%`, background: "#d97706" }} />
                    </div>
                    <b style={{ width: 60, textAlign: "right" }}>S/ {c.total.toFixed(0)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {(projIncome.length > 0 || bills.length > 0) && (
          <Card>
            <b style={{ fontSize: 12 }}>Proyectado (aprox, no confirmado)</b>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
              {projIncome.map((p, i) => (
                <div key={"pi" + i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>💼 {p.label} <span className="muted">({p.sub})</span></span>
                  <b style={{ color: "#059669" }}>+S/ {p.amount.toFixed(0)}</b>
                </div>
              ))}
              {bills.map((p, i) => (
                <div key={"pb" + i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span>💳 {p.label} <span className="muted">({p.sub})</span></span>
                  <b style={{ color: "#dc2626" }}>−S/ {p.amount.toFixed(0)}</b>
                </div>
              ))}
            </div>
          </Card>
        )}

        {show && (
          <TxForm key={editing?.id || "new"} userId={user!.id} initial={editing} openDebts={debts.filter(d => !debtProgress(d, items).done)} onClose={() => { setShow(false); setEditing(null); }} onSave={save} />
        )}

        {monthItems.length === 0 ? (
          <Card><p className="muted">Sin movimientos este mes. Registra el primero (ej. pasaje diario como gasto semanal).</p></Card>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {monthItems.map(t => (
              <Card key={t.id}>
                <div className="flex justify-between items-center">
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <b style={{ fontSize: 13, color: t.kind === "ingreso" ? "#059669" : "#dc2626" }}>
                      {t.kind === "ingreso" ? "+" : "−"}S/ {t.amount.toFixed(0)}
                    </b>
                    <Badge>{catLabel(t.category)}</Badge>
                    {t.recurring !== "none" && <Badge variant="info">{t.recurring}</Badge>}
                    <span className="muted small">{t.date}</span>
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <Button size="sm" onClick={() => { setEditing(t); setShow(true); }}><Edit3 size={12} /></Button>
                    <Button size="sm" onClick={async () => { if (confirm("Eliminar?")) { await db.deleteTransaction(t.id); await load(); } }}><Trash2 size={12} /></Button>
                  </div>
                </div>
                {t.note && <div className="muted small" style={{ marginTop: 4 }}>{t.note}</div>}
              </Card>
            ))}
          </div>
        )}

        {/* ===== DEUDAS ===== */}
        <div className="flex justify-between items-center" style={{ marginTop: 4 }}>
          <b style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}><Landmark size={14} /> Deudas {debtSum.count > 0 && <span className="muted">({debtSum.count} pendientes • S/ {debtSum.pending.toFixed(0)})</span>}</b>
          <Button size="sm" onClick={() => { setEditingDebt(null); setShowDebt(true); }}><Plus size={12} /> Nueva deuda</Button>
        </div>
        {showDebt && (
          <DebtForm key={editingDebt?.id || "newdebt"} userId={user!.id} initial={editingDebt} onClose={() => { setShowDebt(false); setEditingDebt(null); }} onSave={saveDebt} />
        )}
        {debts.length === 0 ? (
          <Card><p className="muted small">Sin deudas registradas. Si debes algo, créala y cada pago descuenta del saldo.</p></Card>
        ) : (
          <div className="grid grid-2">
            {debts.map(d => {
              const p = debtProgress(d, items);
              const pct = d.total > 0 ? Math.min(100, Math.round(p.paid / d.total * 100)) : 100;
              return (
                <Card key={d.id}>
                  <div className="flex justify-between items-center">
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <b style={{ fontSize: 13 }}>{d.creditor}{d.title ? ` — ${d.title}` : ""}</b>
                      {p.done && <Badge variant="success">Pagada</Badge>}
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <Button size="sm" onClick={() => { setEditingDebt(d); setShowDebt(true); }}><Edit3 size={12} /></Button>
                      <Button size="sm" onClick={async () => { if (confirm(`Eliminar deuda con ${d.creditor}? (los pagos quedan como historial)`)) { await db.deleteDebt(d.id); await load(); } }}><Trash2 size={12} /></Button>
                    </div>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginTop: 8 }}>
                    <span className="muted">Pagado S/ {p.paid.toFixed(0)} de S/ {d.total.toFixed(0)}</span>
                    <b style={{ color: p.done ? "#059669" : "#b45309" }}>{p.done ? "S/ 0" : `Resta S/ ${p.remaining.toFixed(0)}`}</b>
                  </div>
                  <div style={{ height: 8, background: "var(--surface)", borderRadius: 999, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: p.done ? "#059669" : "#d97706" }} />
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 8, alignItems: "center" }}>
                    {!p.done && <Button size="sm" variant="primary" onClick={() => payDebt(d)}>Registrar pago</Button>}
                    {d.dueDate && <span className="muted small">vence {d.dueDate}</span>}
                  </div>
                  {d.notes && <div className="muted small" style={{ marginTop: 4 }}>{d.notes}</div>}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DebtForm({ userId, initial, onClose, onSave }: { userId: string; initial: Debt | null; onClose: () => void; onSave: (d: Debt) => void }) {
  const [creditor, setCreditor] = useState(initial?.creditor || "");
  const [title, setTitle] = useState(initial?.title || "");
  const [total, setTotal] = useState(initial?.total !== undefined ? String(initial.total) : "");
  const [dueDate, setDueDate] = useState(initial?.dueDate || "");
  const [notes, setNotes] = useState(initial?.notes || "");
  return (
    <Card>
      <div className="flex justify-between items-center"><b>{initial ? "Editar" : "Nueva"} deuda</b><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div className="grid grid-3" style={{ marginTop: 10 }}>
        <div><Label>Acreedor *</Label><Input value={creditor} onChange={e => setCreditor(e.target.value)} placeholder="Banco, tienda, persona…" /></div>
        <div><Label>Concepto</Label><Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Préstamo, tarjeta…" /></div>
        <div><Label>Total (S/) *</Label><Input type="number" value={total} onChange={e => setTotal(e.target.value)} placeholder="0" /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div><Label>Vencimiento</Label><Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></div>
        <div style={{ gridColumn: "span 2" }}><Label>Notas</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Cuotas, tasa…" /></div>
      </div>
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button variant="primary" className="w-full" onClick={() => onSave({
          id: initial?.id || crypto.randomUUID(), userId, creditor: creditor.trim(),
          title: title.trim() || undefined, total: Number(total) || 0,
          dueDate: dueDate || undefined, notes: notes.trim() || undefined,
          createdAt: initial?.createdAt || new Date().toISOString(),
        })}>Guardar</Button>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
    </Card>
  );
}

function TxForm({ userId, initial, openDebts, onClose, onSave }: { userId: string; initial: MoneyTransaction | null; openDebts: Debt[]; onClose: () => void; onSave: (t: MoneyTransaction) => void }) {
  const [kind, setKind] = useState<TxKind>(initial?.kind || "gasto");
  const [category, setCategory] = useState<TxCategory>(initial?.category || "comida");
  const [amount, setAmount] = useState(initial?.amount !== undefined ? String(initial.amount) : "");
  const [date, setDate] = useState(initial?.date || new Date().toISOString().slice(0, 10));
  const [recurring, setRecurring] = useState<TxRecurrence>(initial?.recurring || "none");
  const [note, setNote] = useState(initial?.note || "");
  const [debtId, setDebtId] = useState(initial?.debtId || "");
  const isDebtPay = kind === "gasto" && category === "deudas";

  useEffect(() => {
    // si cambia el tipo, ajustar categoría a una válida de ese tipo
    if (!TX_CATEGORIES.find(c => c.value === category && c.kind === kind)) {
      setCategory(kind === "ingreso" ? "sueldo" : "comida");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  return (
    <Card>
      <div className="flex justify-between items-center"><b>{initial ? "Editar" : "Nuevo"} movimiento</b><Button size="sm" onClick={onClose}>Cerrar</Button></div>
      <div className="grid grid-3" style={{ marginTop: 10 }}>
        <div><Label>Tipo</Label><Select value={kind} onChange={e => setKind(e.target.value as TxKind)}>
          <option value="gasto">Gasto</option><option value="ingreso">Ingreso</option>
        </Select></div>
        <div><Label>Categoría</Label><Select value={category} onChange={e => setCategory(e.target.value as TxCategory)}>
          {TX_CATEGORIES.filter(c => c.kind === kind).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </Select></div>
        <div><Label>Monto (S/) *</Label><Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0" /></div>
      </div>
      <div className="grid grid-3" style={{ marginTop: 8 }}>
        <div><Label>Fecha *</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        <div><Label>Recurrencia</Label><Select value={recurring} onChange={e => setRecurring(e.target.value as TxRecurrence)}>
          <option value="none">Único</option><option value="semanal">Semanal</option>
          <option value="quincenal">Quincenal</option><option value="mensual">Mensual</option>
        </Select></div>
        <div><Label>Nota</Label><Input value={note} onChange={e => setNote(e.target.value)} placeholder="Detalle…" /></div>
      </div>
      {isDebtPay && (
        <div style={{ marginTop: 8 }}>
          <Label>Vincular a deuda (descuenta del saldo)</Label>
          <Select value={debtId} onChange={e => setDebtId(e.target.value)}>
            <option value="">Sin vincular</option>
            {openDebts.map(d => <option key={d.id} value={d.id}>{d.creditor}{d.title ? ` — ${d.title}` : ""} (S/ {d.total.toFixed(0)})</option>)}
            {initial?.debtId && !openDebts.some(d => d.id === initial.debtId) && <option value={initial.debtId}>Deuda vinculada</option>}
          </Select>
        </div>
      )}
      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <Button variant="primary" className="w-full" onClick={() => onSave({
          id: initial?.id || crypto.randomUUID(), userId, kind, category,
          amount: Number(amount) || 0, date, recurring,
          note: note.trim() || undefined,
          debtId: isDebtPay && debtId ? debtId : undefined,
          createdAt: initial?.createdAt || new Date().toISOString(),
        })}>Guardar</Button>
        <Button onClick={onClose}>Cancelar</Button>
      </div>
    </Card>
  );
}
