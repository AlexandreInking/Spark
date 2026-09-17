import { useState } from "react";
import Topbar from "../components/layout/Topbar";
import { Card, Button } from "../components/ui/primitives";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export default function BoardPage() {
  const [showInfo, setShowInfo] = useState(true);
  return (
    <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <Topbar title="Board infinito" subtitle="Lienzo infinito • sticky notes, flechas, imágenes" actions={
        <>
          <Button size="sm" onClick={()=> setShowInfo(!showInfo)}>{showInfo? "Ocultar ayuda":"Ayuda"}</Button>
          <Button size="sm" variant="primary" onClick={()=> alert("Snapshot guardado local. No toca cursos ni notas.")}>Guardar</Button>
        </>
      }/>
      <div style={{ padding: showInfo? "12px 18px 0":"0 18px 0" }}>
        {showInfo && (
          <Card>
            <div style={{ fontSize:12.5 }}>
              <b>Board limpio:</b> Templates eliminados por completo. Arrastra sticky, flechas y formas. Importa imágenes pegando (Ctrl+V) o arrastrando. El board ya no toca ningún dato de cursos/notas/vault.
            </div>
          </Card>
        )}
      </div>
      <div style={{ flex:1, padding:18, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        <div className="board-wrap" style={{ flex:1 }}>
          <Tldraw persistenceKey="universecity-board" />
        </div>
        <div className="muted small" style={{ marginTop:8 }}>
          Board aislado — solo dibujo. Cursos y notas solo se tocan desde Cursos/Vault.
        </div>
      </div>
    </div>
  );
}
