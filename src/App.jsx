import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function App() {
  const [view, setView] = useState('trainer'); // 'trainer' o 'athlete'
  const [athletes, setAthletes] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para el formulario de nueva rutina
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [coachNotes, setCoachNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);
      const { data: athletesData, error: athletesError } = await supabase
        .from('athletes')
        .select('*');
      if (athletesError) throw athletesError;

      const { data: routinesData, error: routinesError } = await supabase
        .from('routines')
        .select('*')
        .order('created_at', { ascending: false });
      if (routinesError) throw routinesError;

      setAthletes(athletesData || []);
      setRoutines(routinesData || []);
    } catch (error) {
      console.error('Error cargando datos:', error.message);
    } finally {
      setLoading(false);
    }
  }

  // Guardar nueva rutina en Supabase
  async function handleCreateRoutine(e) {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);
      const { error } = await supabase.from('routines').insert([
        {
          title: title,
          coach_notes: coachNotes,
          exercises: [
            { name: 'Press de Banca Plano', sets: 4, reps: '8-10', target: '70 kg' },
            { name: 'Press Inclinado con Mancuernas', sets: 3, reps: '10-12', target: '24 kg/lado' }
          ]
        }
      ]);

      if (error) throw error;

      // Limpiar formulario y recargar datos
      setTitle('');
      setCoachNotes('');
      setShowModal(false);
      await fetchData();
    } catch (error) {
      alert('Error creando rutina: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6">
      {/* Selector de Vistas */}
      <div className="flex justify-end gap-2 mb-6">
        <button
          onClick={() => setView('trainer')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'trainer' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Vista Entrenador (PC)
        </button>
        <button
          onClick={() => setView('athlete')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            view === 'athlete' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          Vista Deportista (Celular)
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-cyan-400">Cargando FitApp desde Supabase...</div>
      ) : view === 'trainer' ? (
        /* VISTA ENTRENADOR */
        <div className="max-w-5xl mx-auto space-y-6">
          <header className="flex justify-between items-center border-b border-slate-800 pb-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Panel del Entrenador</h1>
              <p className="text-sm text-slate-400">Gestiona tus atletas y asigna rutinas diarias en tiempo real</p>
            </div>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg cursor-pointer"
            >
              + Crear Nueva Rutina
            </button>
          </header>

          {/* Atletas */}
          <section className="bg-slate-800/50 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-cyan-400">👤 Mis Atletas ({athletes.length})</h2>
            <div className="grid gap-3">
              {athletes.map((athlete) => (
                <div key={athlete.id} className="bg-slate-800 p-4 rounded-lg flex justify-between items-center border border-slate-700/50">
                  <div>
                    <h3 className="font-bold text-white text-base">{athlete.name}</h3>
                    <p className="text-xs text-slate-400">Última actividad: {athlete.last_active || 'Sin registros'}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-full font-medium">
                      🔥 {athlete.streak} días
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                      athlete.status === 'Entrenó' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {athlete.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Rutinas Guardadas */}
          <section className="bg-slate-800/50 border border-slate-800 rounded-xl p-5 shadow-xl">
            <h2 className="text-lg font-semibold mb-4 text-cyan-400">🏋️ Rutinas en la Base de Datos ({routines.length})</h2>
            {routines.length === 0 ? (
              <p className="text-slate-400 text-sm italic">No hay rutinas guardadas todavía. Haz clic en "Crear Nueva Rutina".</p>
            ) : (
              <div className="grid gap-3">
                {routines.map((routine) => (
                  <div key={routine.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700/50">
                    <h3 className="font-bold text-white text-lg">{routine.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{routine.coach_notes || 'Sin notas adicionales'}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* MODAL CREAR RUTINA */}
          {showModal && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
              <div className="bg-slate-800 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
                <h3 className="text-xl font-bold text-white">Crear Nueva Rutina</h3>
                <form onSubmit={handleCreateRoutine} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Título de la Rutina</label>
                    <input
                      type="text"
                      placeholder="Ej: Día 1: Pecho y Tríceps"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Notas del Entrenador</label>
                    <textarea
                      placeholder="Ej: Enfócate en la fase excéntrica lenta."
                      value={coachNotes}
                      onChange={(e) => setCoachNotes(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white focus:outline-none focus:border-cyan-500 h-24"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-700 hover:bg-slate-600 text-slate-200"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white font-semibold"
                    >
                      {saving ? 'Guardando...' : 'Guardar en Supabase'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* VISTA DEPORTISTA */
        <div className="max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-5 shadow-2xl space-y-4">
          <header className="text-center pb-4 border-b border-slate-700">
            <span className="text-xs uppercase tracking-widest text-cyan-400 font-bold">Modo Deportista</span>
            <h2 className="text-xl font-bold text-white mt-1">Tu Rutina Asignada</h2>
          </header>
          {routines.length > 0 ? (
            <div className="space-y-4">
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-700">
                <h3 className="font-bold text-white text-lg">{routines[0].title}</h3>
                <p className="text-xs text-slate-400 mt-1">{routines[0].coach_notes}</p>
              </div>
            </div>
          ) : (
            <p className="text-center text-slate-400 py-6">No hay rutinas asignadas todavía.</p>
          )}
        </div>
      )}
    </div>
  );
}