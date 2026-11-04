import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Lista limpia de deportistas
const ATHLETES_CREDENTIALS = [
  { name: 'Fernando', code: 'FER123' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('trainer'); // 'trainer' | 'athlete'
  const [routines, setRoutines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Estados limpios sin columnas conflictivas
  const [title, setTitle] = useState('');
  const [assignedAthlete, setAssignedAthlete] = useState('Fernando');
  const [loading, setLoading] = useState(false);

  // Estados para el acceso del deportista por clave
  const [inputCode, setInputCode] = useState('');
  const [loggedAthlete, setLoggedAthlete] = useState(null);
  const [loginError, setLoginError] = useState('');

  const [exercises, setExercises] = useState([
    { name: '', setsReps: '', weight: '', rest: '' }
  ]);

  useEffect(() => {
    fetchRoutines();
  }, []);

  const fetchRoutines = async () => {
    try {
      const { data, error } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setRoutines(data);
    } catch (err) {
      console.error('Error al cargar rutinas:', err.message);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    const athlete = ATHLETES_CREDENTIALS.find(
      (a) => a.code.trim().toUpperCase() === inputCode.trim().toUpperCase()
    );

    if (athlete) {
      setLoggedAthlete(athlete.name);
      setLoginError('');
    } else {
      setLoginError('Clave incorrecta. Inténtalo de nuevo.');
    }
  };

  const addExerciseField = () => {
    setExercises([...exercises, { name: '', setsReps: '', weight: '', rest: '' }]);
  };

  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Por favor ingresa un título para la rutina');

    setLoading(true);
    try {
      // Enviamos únicamente columnas que sabemos que existen y funcionan
      const { error } = await supabase.from('routines').insert([
        {
          title,
          assigned_athlete: assignedAthlete,
          exercises,
        }
      ]);

      if (error) throw error;

      setTitle('');
      setAssignedAthlete('Fernando');
      setExercises([{ name: '', setsReps: '', weight: '', rest: '' }]);
      setIsModalOpen(false);
      fetchRoutines();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRoutine = async (id) => {
    if (!confirm('¿Estás seguro de borrar esta rutina?')) return;
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      fetchRoutines();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      <header className="max-w-4xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            FitApp
          </h1>
          <p className="text-xs text-slate-400">Entrenamiento en tiempo real</p>
        </div>

        <div className="flex gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('trainer')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'trainer'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vista Entrenador (PC)
          </button>
          <button
            onClick={() => setActiveTab('athlete')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === 'athlete'
                ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vista Deportista (Celular)
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto">
        {activeTab === 'trainer' ? (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-xl font-bold">Panel del Entrenador</h2>
                <p className="text-xs text-slate-400">Asigna rutinas y gestiona atletas</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                + Crear Nueva Rutina
              </button>
            </div>

            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Rutinas Creadas ({routines.length})
              </h3>

              {routines.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No hay rutinas creadas aún.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {routines.map((r) => (
                    <div key={r.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3 relative">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-full font-medium border border-cyan-500/20">
                            Atleta: {r.assigned_athlete || 'Fernando'}
                          </span>
                          <h4 className="font-bold text-slate-200 mt-1">{r.title}</h4>
                        </div>
                        <button
                          onClick={() => handleDeleteRoutine(r.id)}
                          className="text-slate-500 hover:text-red-400 text-xs px-2 py-1 transition-colors"
                        >
                          🗑️ Eliminar
                        </button>
                      </div>

                      {r.exercises && r.exercises.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-800/80">
                          {r.exercises.map((ex, i) => (
                            <div key={i} className="text-xs flex justify-between bg-slate-900 p-2 rounded-lg">
                              <span className="font-medium text-slate-300">{ex.name || 'Ejercicio'}</span>
                              <span className="text-cyan-400">
                                {ex.setsReps} | {ex.weight} | {ex.rest}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="max-w-md mx-auto space-y-6">
            {!loggedAthlete ? (
              <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center space-y-4 shadow-xl">
                <div className="text-3xl">🔑</div>
                <h2 className="text-lg font-bold text-cyan-400">Acceso Deportista</h2>
                <p className="text-xs text-slate-400">Ingresa tu clave de acceso personal para ver tu rutina</p>

                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    type="text"
                    placeholder="Ej. FER123"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    className="w-full text-center tracking-widest font-mono text-lg uppercase bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  />
                  {loginError && <p className="text-xs text-red-400">{loginError}</p>}

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20"
                  >
                    Ingresar a mi Rutina
                  </button>
                </form>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-cyan-400">¡Hola, {loggedAthlete}!</h2>
                    <p className="text-xs text-slate-400">Tu plan de hoy cargado con éxito</p>
                  </div>
                  <button
                    onClick={() => {
                      setLoggedAthlete(null);
                      setInputCode('');
                    }}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 transition-colors"
                  >
                    Salir
                  </button>
                </div>

                {routines
                  .filter((r) => r.assigned_athlete === loggedAthlete)
                  .map((r) => (
                    <div key={r.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                      <div>
                        <h3 className="text-lg font-bold text-white">{r.title}</h3>
                      </div>

                      <div className="space-y-3">
                        {r.exercises && r.exercises.map((ex, i) => (
                          <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80">
                            <div className="font-bold text-sm text-cyan-300 mb-2">{ex.name}</div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="bg-slate-900 p-1.5 rounded-lg">
                                <span className="block text-[10px] text-slate-500">SERIES/REPS</span>
                                <span className="font-semibold text-slate-200">{ex.setsReps || '-'}</span>
                              </div>
                              <div className="bg-slate-900 p-1.5 rounded-lg">
                                <span className="block text-[10px] text-slate-500">PESO</span>
                                <span className="font-semibold text-slate-200">{ex.weight || '-'}</span>
                              </div>
                              <div className="bg-slate-900 p-1.5 rounded-lg">
                                <span className="block text-[10px] text-slate-500">DESCANSO</span>
                                <span className="font-semibold text-slate-200">{ex.rest || '-'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {routines.filter((r) => r.assigned_athlete === loggedAthlete).length === 0 && (
                  <div className="text-center py-8 text-slate-500 text-sm">
                    Aún no tienes rutinas asignadas. ¡Pídele a tu entrenador que te agregue una!
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Crear y Asignar Rutina</h3>

            <form onSubmit={handleSaveRoutine} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">SELECCIONAR ATLETA</label>
                <select
                  value={assignedAthlete}
                  onChange={(e) => setAssignedAthlete(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {ATHLETES_CREDENTIALS.map((athlete, idx) => (
                    <option key={idx} value={athlete.name}>
                      {athlete.name} (Clave: {athlete.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">TÍTULO DE LA RUTINA</label>
                <input
                  type="text"
                  placeholder="Ej: Día 1: Pecho y Tríceps"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs font-semibold text-cyan-400 block uppercase tracking-wider">
                  Ejercicios de la Rutina
                </label>

                <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                  {exercises.map((ex, index) => (
                    <div key={index} className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                      <input
                        type="text"
                        placeholder="Nombre (ej. Press Banco)"
                        value={ex.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                      />

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Series x Reps</span>
                          <input
                            type="text"
                            placeholder="4x10"
                            value={ex.setsReps}
                            onChange={(e) => updateExercise(index, 'setsReps', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Peso</span>
                          <input
                            type="text"
                            placeholder="60 kg"
                            value={ex.weight}
                            onChange={(e) => updateExercise(index, 'weight', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block mb-0.5">Descanso</span>
                          <input
                            type="text"
                            placeholder="90 seg"
                            value={ex.rest}
                            onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={addExerciseField}
                  className="w-full py-2 border border-dashed border-cyan-500/40 rounded-xl text-cyan-400 text-xs font-semibold hover:bg-cyan-500/10 transition-colors"
                >
                  + Agregar otro ejercicio
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {loading ? 'Guardando...' : 'Guardar y Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}