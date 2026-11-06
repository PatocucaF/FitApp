import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function App() {
  const [role, setRole] = useState(null); // null | 'trainer' | 'athlete'
  
  // Login Entrenador
  const [trainerUser, setTrainerUser] = useState('');
  const [trainerPass, setTrainerPass] = useState('');
  const [trainerError, setTrainerError] = useState('');

  // Login Deportista
  const [inputCode, setInputCode] = useState('');
  const [loggedAthlete, setLoggedAthlete] = useState(null);
  const [athleteError, setAthleteError] = useState('');

  // Datos globales
  const [athletes, setAthletes] = useState([]);
  const [routines, setRoutines] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [selectedDayFilter, setSelectedDayFilter] = useState('Todos');

  // Modales
  const [isNewAthleteModalOpen, setIsNewAthleteModalOpen] = useState(false);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [newAthleteCode, setNewAthleteCode] = useState('');

  const [isRoutineModalOpen, setIsRoutineModalOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [routineTitle, setRoutineTitle] = useState('');
  const [routineDay, setRoutineDay] = useState('Lunes');
  const [exercises, setExercises] = useState([{ name: '', setsReps: '', weight: '', rest: '' }]);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchAthletes();
    fetchRoutines();
  }, []);

  const fetchAthletes = async () => {
    try {
      const { data, error } = await supabase.from('athletes').select('*');
      if (error) throw error;
      if (data) setAthletes(data);
    } catch (err) {
      console.error('Error al cargar deportistas:', err.message);
    }
  };

  const fetchRoutines = async () => {
    try {
      const { data, error } = await supabase.from('routines').select('*').order('id', { ascending: false });
      if (error) throw error;
      if (data) setRoutines(data);
    } catch (err) {
      console.error('Error al cargar rutinas:', err.message);
    }
  };

  // Login Entrenador (Victor / Victor123)
  const handleTrainerLogin = (e) => {
    e.preventDefault();
    if (trainerUser === 'Victor' && trainerPass === 'Victor123') {
      setRole('trainer');
      setTrainerError('');
    } else {
      setTrainerError('Usuario o contraseña incorrectos.');
    }
  };

  // Login Deportista por clave
  const handleAthleteLogin = async (e) => {
    e.preventDefault();
    const found = athletes.find(a => a.code && a.code.trim().toUpperCase() === inputCode.trim().toUpperCase());
    if (found) {
      setLoggedAthlete(found);
      setRole('athlete');
      setAthleteError('');
    } else {
      setAthleteError('Clave de deportista incorrecta.');
    }
  };

  // Crear nuevo deportista
  const handleCreateAthlete = async (e) => {
    e.preventDefault();
    if (!newAthleteName || !newAthleteCode) return alert('Completa todos los campos');
    setLoading(true);
    try {
      const { error } = await supabase.from('athletes').insert([{ name: newAthleteName, code: newAthleteCode.toUpperCase() }]);
      if (error) throw error;
      setNewAthleteName('');
      setNewAthleteCode('');
      setIsNewAthleteModalOpen(false);
      fetchAthletes();
    } catch (err) {
      alert('Error al agregar deportista: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal rutina (Crear o Editar)
  const openRoutineModal = (routine = null) => {
    if (routine) {
      setEditingRoutineId(routine.id);
      setRoutineTitle(routine.title);
      setRoutineDay(routine.day_of_week || 'Lunes');
      setExercises(routine.exercises || [{ name: '', setsReps: '', weight: '', rest: '' }]);
    } else {
      setEditingRoutineId(null);
      setRoutineTitle('');
      setRoutineDay('Lunes');
      setExercises([{ name: '', setsReps: '', weight: '', rest: '' }]);
    }
    setIsRoutineModalOpen(true);
  };

  // Guardar rutina (Insert o Update)
  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    if (!routineTitle.trim()) return alert('Ingresa un título para la rutina');
    if (!selectedAthlete) return alert('Selecciona un deportista');

    setLoading(true);
    try {
      const payload = {
        title: routineTitle,
        assigned_athlete: selectedAthlete.name,
        day_of_week: routineDay,
        exercises,
      };

      if (editingRoutineId) {
        const { error } = await supabase.from('routines').update(payload).eq('id', editingRoutineId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('routines').insert([payload]);
        if (error) throw error;
      }

      setIsRoutineModalOpen(false);
      fetchRoutines();
    } catch (err) {
      alert('Error al guardar rutina: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Borrar rutina
  const handleDeleteRoutine = async (id) => {
    if (!confirm('¿Estás seguro de eliminar esta rutina?')) return;
    try {
      const { error } = await supabase.from('routines').delete().eq('id', id);
      if (error) throw error;
      fetchRoutines();
    } catch (err) {
      alert('Error al eliminar: ' + err.message);
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

  const logout = () => {
    setRole(null);
    setLoggedAthlete(null);
    setSelectedAthlete(null);
    setTrainerUser('');
    setTrainerPass('');
    setInputCode('');
  };

  // PANTALLA INICIAL: SELECCIÓN DE ROL / LOGIN
  if (!role) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
              FitApp
            </h1>
            <p className="text-xs text-slate-400">Selecciona tu tipo de perfil para ingresar</p>
          </div>

          <div className="space-y-6">
            {/* LOGIN DEPORTISTA */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
              <h2 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                <span>📱</span> Acceso Deportista
              </h2>
              <form onSubmit={handleAthleteLogin} className="space-y-2">
                <input
                  type="text"
                  placeholder="Tu Clave (Ej. FER123)"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  className="w-full text-center tracking-wider uppercase font-mono bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
                {athleteError && <p className="text-[11px] text-red-400 text-center">{athleteError}</p>}
                <button
                  type="submit"
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/20"
                >
                  Ver mis Rutinas
                </button>
              </form>
            </div>

            {/* LOGIN ENTRENADOR */}
            <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-3">
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <span>💻</span> Acceso Entrenador
              </h2>
              <form onSubmit={handleTrainerLogin} className="space-y-2">
                <input
                  type="text"
                  placeholder="Usuario (Victor)"
                  value={trainerUser}
                  onChange={(e) => setTrainerUser(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                <input
                  type="password"
                  placeholder="Contraseña (Victor123)"
                  value={trainerPass}
                  onChange={(e) => setTrainerPass(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
                {trainerError && <p className="text-[11px] text-red-400 text-center">{trainerError}</p>}
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
                >
                  Entrar al Panel
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 sm:p-8">
      {/* NAVBAR */}
      <header className="max-w-5xl mx-auto flex justify-between items-center pb-6 border-b border-slate-800 mb-8">
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            FitApp
          </h1>
          <p className="text-xs text-slate-400">
            {role === 'trainer' ? 'Panel de Entrenador (Víctor)' : `Deportista: ${loggedAthlete?.name}`}
          </p>
        </div>
        <button
          onClick={logout}
          className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs px-4 py-2 rounded-xl transition-colors"
        >
          Cerrar Sesión 🚪
        </button>
      </header>

      <main className="max-w-5xl mx-auto">
        {role === 'trainer' ? (
          /* PANEL ENTRENADOR */
          <div className="space-y-6">
            {!selectedAthlete ? (
              /* LISTA DE DEPORTISTAS */
              <div className="space-y-4">
                <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <div>
                    <h2 className="text-xl font-bold">Mis Deportistas</h2>
                    <p className="text-xs text-slate-400">Selecciona un atleta para ver o gestionar sus rutinas</p>
                  </div>
                  <button
                    onClick={() => setIsNewAthleteModalOpen(true)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    + Nuevo Deportista
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {athletes.map((ath) => (
                    <div
                      key={ath.id}
                      onClick={() => setSelectedAthlete(ath)}
                      className="p-5 bg-slate-900 hover:bg-slate-850 cursor-pointer rounded-2xl border border-slate-800 space-y-2 hover:border-cyan-500/50 transition-all shadow-lg group"
                    >
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">
                          {ath.name}
                        </h3>
                        <span className="text-xs bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-mono">
                          Clave: {ath.code || 'SIN CLAVE'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        {routines.filter((r) => r.assigned_athlete === ath.name).length} rutinas asignadas
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* PERFIL INDIVIDUAL DEL DEPORTISTA SELECCIONADO */
              <div className="space-y-6">
                <div className="flex justify-between items-center bg-slate-900 p-6 rounded-2xl border border-slate-800">
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => setSelectedAthlete(null)}
                      className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700"
                    >
                      ← Volver a Deportistas
                    </button>
                    <div>
                      <h2 className="text-xl font-bold text-cyan-400">{selectedAthlete.name}</h2>
                      <p className="text-xs text-slate-400">Clave de acceso: <span className="font-mono text-white">{selectedAthlete.code}</span></p>
                    </div>
                  </div>
                  <button
                    onClick={() => openRoutineModal(null)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
                  >
                    + Crear Rutina
                  </button>
                </div>

                {/* CALENDARIO DE LUNES A DOMINGO */}
                <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Filtro por Día de la Semana
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedDayFilter('Todos')}
                      className={`px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all ${
                        selectedDayFilter === 'Todos'
                          ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      Todos los Días
                    </button>
                    {DAYS.map((day) => {
                      const count = routines.filter(
                        (r) => r.assigned_athlete === selectedAthlete.name && r.day_of_week === day
                      ).length;
                      return (
                        <button
                          key={day}
                          onClick={() => setSelectedDayFilter(day)}
                          className={`px-3 py-1.5 text-xs rounded-xl font-semibold border transition-all flex items-center gap-1.5 ${
                            selectedDayFilter === day
                              ? 'bg-cyan-500 text-slate-950 border-cyan-500'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-white'
                          }`}
                        >
                          <span>{day}</span>
                          {count > 0 && (
                            <span className="bg-slate-800 text-cyan-300 px-1.5 py-0.2 text-[10px] rounded-full">
                              {count}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* RUTINAS DEL DEPORTISTA */}
                <div className="space-y-4">
                  {routines
                    .filter((r) => r.assigned_athlete === selectedAthlete.name)
                    .filter((r) => selectedDayFilter === 'Todos' || r.day_of_week === selectedDayFilter)
                    .map((r) => (
                      <div key={r.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2.5 py-1 rounded-full font-bold uppercase tracking-wider">
                              📅 {r.day_of_week || 'Lunes'}
                            </span>
                            <h3 className="text-lg font-bold text-white mt-2">{r.title}</h3>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => openRoutineModal(r)}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-cyan-400 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              onClick={() => handleDeleteRoutine(r.id)}
                              className="text-xs bg-slate-800 hover:bg-slate-700 text-red-400 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors"
                            >
                              🗑️ Eliminar
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {r.exercises && r.exercises.map((ex, i) => (
                            <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex justify-between items-center text-xs">
                              <span className="font-bold text-slate-200">{ex.name}</span>
                              <div className="flex gap-4 text-cyan-400 font-mono">
                                <span>{ex.setsReps}</span>
                                <span>{ex.weight}</span>
                                <span>{ex.rest}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VISTA Y CALENDARIO DEL DEPORTISTA */
          <div className="max-w-md mx-auto space-y-6">
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 text-center space-y-1">
              <h2 className="text-lg font-bold text-cyan-400">¡Hola, {loggedAthlete?.name}! 💪</h2>
              <p className="text-xs text-slate-400">Selecciona un día de la semana para ver tu plan</p>
            </div>

            {/* BOTONES DE DÍA (CALENDARIO) */}
            <div className="flex overflow-x-auto gap-2 pb-2">
              {DAYS.map((day) => (
                <button
                  key={day}
                  onClick={() => setSelectedDayFilter(day)}
                  className={`px-3.5 py-2 text-xs rounded-xl font-bold whitespace-nowrap border transition-all ${
                    selectedDayFilter === day
                      ? 'bg-cyan-500 text-slate-950 border-cyan-500 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                  }`}
                >
                  {day}
                </button>
              ))}
            </div>

            {/* RUTINAS DEL DÍA SELECCIONADO */}
            <div className="space-y-4">
              {routines
                .filter((r) => r.assigned_athlete === loggedAthlete?.name)
                .filter((r) => selectedDayFilter === 'Todos' || r.day_of_week === selectedDayFilter)
                .map((r) => (
                  <div key={r.id} className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold text-white">{r.title}</h3>
                      <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded-full font-bold">
                        {r.day_of_week}
                      </span>
                    </div>

                    <div className="space-y-3">
                      {r.exercises && r.exercises.map((ex, i) => (
                        <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                          <div className="font-bold text-sm text-cyan-300 mb-2">{ex.name}</div>
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div className="bg-slate-900 p-1.5 rounded-lg">
                              <span className="block text-[9px] text-slate-500">SERIES/REPS</span>
                              <span className="font-semibold text-slate-200">{ex.setsReps || '-'}</span>
                            </div>
                            <div className="bg-slate-900 p-1.5 rounded-lg">
                              <span className="block text-[9px] text-slate-500">PESO</span>
                              <span className="font-semibold text-slate-200">{ex.weight || '-'}</span>
                            </div>
                            <div className="bg-slate-900 p-1.5 rounded-lg">
                              <span className="block text-[9px] text-slate-500">DESCANSO</span>
                              <span className="font-semibold text-slate-200">{ex.rest || '-'}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </main>

      {/* MODAL CREAR NUEVO DEPORTISTA */}
      {isNewAthleteModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">Registrar Nuevo Deportista</h3>
            <form onSubmit={handleCreateAthlete} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Nombre Completo</label>
                <input
                  type="text"
                  placeholder="Ej. Lucas Silva"
                  value={newAthleteName}
                  onChange={(e) => setNewAthleteName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 block mb-1">Clave Privada de Acceso</label>
                <input
                  type="text"
                  placeholder="Ej. LUCAS456"
                  value={newAthleteCode}
                  onChange={(e) => setNewAthleteCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewAthleteModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 text-xs font-semibold text-slate-300 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20"
                >
                  {loading ? 'Guardando...' : 'Crear'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CREAR / EDITAR RUTINA CON DÍA DE LA SEMANA */}
      {isRoutineModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white">
              {editingRoutineId ? 'Editar Rutina' : 'Crear Nueva Rutina'}
            </h3>

            <form onSubmit={handleSaveRoutine} className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-400 block mb-1">TÍTULO DE LA RUTINA</label>
                  <input
                    type="text"
                    placeholder="Ej. Pecho e Hipertrofia"
                    value={routineTitle}
                    onChange={(e) => setRoutineTitle(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">DÍA DE ENTRENAMIENTO</label>
                  <select
                    value={routineDay}
                    onChange={(e) => setRoutineDay(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {DAYS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
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
                        placeholder="Nombre (ej. Press Plano)"
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
                  onClick={() => setIsRoutineModalOpen(false)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-lg shadow-emerald-500/20 transition-all"
                >
                  {loading ? 'Guardando...' : editingRoutineId ? 'Actualizar Rutina' : 'Guardar y Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}