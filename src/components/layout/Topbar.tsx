export default function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="topbar">
      <div>
        <h2>{title}</h2>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>{actions}</div>
    </div>
  );
}
