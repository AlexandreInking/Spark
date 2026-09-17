import React from "react";

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default"|"primary"|"ghost", size?: "sm"|"md"|"icon" }> = ({ variant="default", size="md", className="", children, ...props }) => {
  const v = variant==="primary" ? "btn btn-primary" : variant==="ghost" ? "btn btn-ghost" : "btn";
  const s = size==="sm" ? " btn-sm" : size==="icon" ? " btn-icon" : "";
  return <button className={`${v}${s} ${className}`} {...props}>{children}</button>;
};
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>((props, ref) => <input ref={ref} className={`input ${props.className||""}`} {...props} />);
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>((props, ref) => <textarea ref={ref} className={`textarea ${props.className||""}`} {...props} />);
export const Select: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => <select className={`select ${props.className||""}`} {...props} />;
export const Card: React.FC<{ className?: string; style?: React.CSSProperties; children: React.ReactNode; hover?: boolean }> = ({ className="", style, children, hover }) => <div className={`card ${hover?"card-hover":""} ${className}`} style={style}>{children}</div>;
export const Badge: React.FC<{ children: React.ReactNode; variant?: "default"|"danger"|"warn"|"success"|"info" }> = ({ children, variant="default" }) => {
  const map: any = { default:"", danger:"badge-danger", warn:"badge-warn", success:"badge-success", info:"badge-info"};
  return <span className={`badge ${map[variant]}`}>{children}</span>;
};
export const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => <label style={{ fontSize:12, fontWeight:600, color:"var(--text-muted)", display:"block", marginBottom:6 }}>{children}</label>;
