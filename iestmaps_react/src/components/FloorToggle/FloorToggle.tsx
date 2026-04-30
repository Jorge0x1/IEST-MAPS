// selector de piso: permite cambiar entre piso 1 y piso 2
import './FloorToggle.css'

interface FloorToggleProps {
  activeFloor: 1 | 2
  onChange: (floor: 1 | 2) => void
}

function FloorToggle({ activeFloor, onChange }: FloorToggleProps) {
  // grupo de botones para cambiar de piso
  // role="group" agrupa semanticamente los botones como un grupo
  // aria-label describe el proposito del grupo para lectores de pantalla
  return (
    <div className="floor-toggle" role="group" aria-label="Selector de piso">
      {/* boton para piso 1 */}
      <button
        type="button"
        // clase activa si este es el piso seleccionado
        className={activeFloor === 1 ? 'active' : ''}
        // llama al callback cuando se hace click
        onClick={() => onChange(1)}
        // etiqueta descriptiva para accesibilidad
        aria-label="Piso 1"
        // aria-pressed indica que este boton esta presionado o no
        aria-pressed={activeFloor === 1}
      >
        1
      </button>
      {/* boton para piso 2 */}
      <button
        type="button"
        className={activeFloor === 2 ? 'active' : ''}
        onClick={() => onChange(2)}
        aria-label="Piso 2"
        aria-pressed={activeFloor === 2}
      >
        2
      </button>
    </div>
  )
}

export default FloorToggle