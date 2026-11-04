import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase con variables de entorno
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [activeTab, setActiveTab] = useState('trainer'); // 'trainer' | 'athlete'
  const [routines, setRoutines] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  // Estado para los ejercicios dinámicos dentro del modal
  const [exercises, setExercises] = useState([
    { name: '', setsReps: '', weight: '', rest: '' }
  ]);

  // Cargar rutinas desde Supabase al montar
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

  // Agregar una casilla más de ejercicio
  const addExerciseField = () => {
    setExercises([...exercises, { name: '', setsReps: '', weight: '', rest: '' }]);
  };

  // Actualizar un campo específico de un ejercicio por índice
  const updateExercise = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  // Guardar la rutina en Supabase
  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert('Por favor ingresa un título para la rutina');

    setLoading(true);
    try {
      const { error } = await supabase.from('routines').insert([
        {
          title,
          notes,
          exercises, // Guarda la lista completa de ejercicios con peso, reps y descanso
        }
      ]);

      if (error) throw error;

      // Limpiar formulario y recargar
      setTitle('');
      setNotes('');
      setExercises([{ name: '', setsReps: '', weight: '', rest: '' }]);
      setIsModalOpen(false);
      fetchRoutines();
    } catch (err) {
      alert('Error al guardar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      {/* Navbar Superior */}
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

      {/* Contenido Principal */}
      <main className="max-w-4xl mx-auto">
        {activeTab === 'trainer' ? (
          /* PANEL DEL ENTRENADOR */
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div>
                <h2 className="text-xl font-bold">Panel del Entrenador</h2>
                <p className="text-xs text-slate-400">Gestiona las rutinas de tu atleta en tiempo real</p>
              </div>
              <button
                onClick={() => setIsModalOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-sm transition-all shadow-lg shadow-emerald-500/20"
              >
                + Crear Nueva Rutina
              </button>
            </div>

            {/* Listado de Rutinas Creadas */}
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
              <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                Rutinas en la Base de Datos ({routines.length})
              </h3>

              {routines.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">No hay rutinas creadas aún.</p>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {routines.map((r) => (
                    <div key={r.id} className="p-4 bg-slate-950/60 rounded-xl border border-slate-800 space-y-3">
                      <h4 className="font-bold text-slate-200">{r.title}</h4>
                      {r.notes && <p className="text-xs text-slate-400 italic">"{r.notes}"</p>}

                      {/* Lista de ejercicios dentro de la tarjeta */}
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
          /* VISTA DEL DEPORTISTA (CELULAR) */
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 text-center">
              <h2 className="text-lg font-bold text-cyan-400">Mi Plan de Hoy</h2>
              <p className="text-xs text-slate-400">Sincronizado con Supabase</p>
            </div>

            {routines.map((r) => (
              <div key={r.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                <div>
                  <h3 className="text-lg font-bold text-white">{r.title}</h3>
                  {r.notes && <p className="text-xs text-slate-400 mt-1">{r.notes}</p>}
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
          </div>
        )}
      </main>

      {/* MODAL / VENTANA FLOTANTE PARA CREAR RUTINA */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Crear Nueva Rutina</h3>

            <form onSubmit={handleSaveRoutine} className="space-y-4">
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

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1">NOTAS DEL ENTRENADOR</