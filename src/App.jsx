import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'TU_SUPABASE_URL';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'TU_SUPABASE_ANON_KEY';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const DAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function App() {
  const [user, setUser] = useState(null); // { role: 'trainer' | 'athlete', data: ... }
  const [loginInput, setLoginInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados del Entrenador
  const [athletes, setAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [newAthleteName, setNewAthleteName] = useState('');
  const [newAthleteCode, setNewAthleteCode] = useState('');
  const [allProgress, setAllProgress] = useState([]);

  // Estados para Rutinas y Edición
  const [routines, setRoutines] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Lunes');
  const [routineTitle, setRoutineTitle] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '', rest: '' }]);
  const [editingRoutineId, setEditingRoutineId] = useState(null);
  const [athleteProgress, setAthleteProgress] = useState({});

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchAthletes();
      fetchAllProgress();
    } else if (user?.role === 'athlete') {
      fetchAthleteRoutines(user.data.code);
      fetchAthleteProgress(user.data.code);
    }
  }, [user]);

  useEffect(() => {
    if (selectedAthlete) {
      fetchAthleteRoutines(selectedAthlete.code);
      resetForm();
    }
  }, [selectedAthlete]);

  const fetchAthletes = async () => {
    const { data, error } = await supabase.from('athletes').select('*');
    if (!error) setAthletes(data || []);
  };

  const fetchAllProgress = async () => {
    const { data, error } = await supabase.from('routine_progress').select('*');
    if (!error) setAllProgress(data || []);
  };

  const fetchAthleteRoutines = async (code) => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('assigned_athlete', code);
    if (!error) setRoutines(data || []);
  };

  const fetchAthleteProgress = async (code) => {
    const { data, error } = await supabase
      .from('routine_progress')
      .select('*')
      .eq('athlete_code', code);
    
    if (!error && data) {
      const progressMap = {};
      data.forEach(p => {
        progressMap[p.routine_id] = p.completed_exercises || [];
      });
      setAthleteProgress(progressMap);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const userClean = loginInput.trim();
    const passClean = passwordInput.trim();

    if (userClean === 'Victor' && passClean === 'Victor123') {
      setUser({ role: 'trainer', name: 'Víctor' });
      setLoading(false);
      return;
    }

    try {
      const codeToSearch = passClean || userClean;
      const { data: foundAthletes, error } = await supabase
        .from('athletes')
        .select('*')
        .or(`code.eq.${codeToSearch},name.ilike.%${userClean}%`);

      if (!error && foundAthletes && foundAthletes.length > 0) {
        setUser({ role: 'athlete', data: foundAthletes[0] });
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Error al verificar credenciales:', err);
    }

    setLoading(false);
    setErrorMsg('Código o usuario incorrecto. Verifica tus datos de deportista.');
  };

  const handleCreateAthlete = async (e) => {
    e.preventDefault();
    if (!newAthleteName || !newAthleteCode) return;

    const { error } = await supabase.from('athletes').insert([
      { name: newAthleteName, code: newAthleteCode }
    ]);

    if (!error) {
      setNewAthleteName('');
      setNewAthleteCode('');
      fetchAthletes();
    } else {
      alert('Error al registrar deportista: ' + error.message);
    }
  };

  const handleAddExerciseRow = () => {
    setExercises([...exercises, { name: '', sets: '', reps: '', weight: '', rest: '' }]);
  };

  const handleRemoveExerciseRow = (index) => {
    if (exercises.length === 1) return;
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleExerciseChange = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  const resetForm = () => {
    setRoutineTitle('');
    setExercises([{ name: '', sets: '', reps: '', weight: '', rest: '' }]);
    setEditingRoutineId(null);
  };

  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    const athleteCode = user.role === 'trainer' ? selectedAthlete?.code : user.data.code;

    if (!athleteCode) {
      alert('Selecciona un deportista primero.');
      return;
    }

    if (!routineTitle.trim()) {
      alert('Por favor ingresa un título para la rutina.');
      return;
    }

    if (editingRoutineId) {
      const { error } = await supabase
        .from('routines')
        .update({
          title: routineTitle,
          day_of_week: selectedDay,
          exercises: exercises
        })
        .eq('id', editingRoutineId);

      if (!error) {
        resetForm();
        fetchAthleteRoutines(athleteCode);
        alert('Rutina actualizada con éxito.');
      } else {
        alert('Error al actualizar rutina: ' + error.message);
      }
    } else {
      const { error } = await supabase.from('routines').insert([
        {
          title: routineTitle,
          assigned_athlete: athleteCode,
          day_of_week: selectedDay,
          exercises: exercises
        }
      ]);

      if (!error) {
        resetForm();
        fetchAthleteRoutines(athleteCode);
        alert('Rutina guardada con éxito.');
      } else {
        alert('Error al guardar rutina: ' + error.message);
      }
    }
  };

  const handleEditRoutine = (routine) => {
    setEditingRoutineId(routine.id);
    setRoutineTitle(routine.title);
    setSelectedDay(routine.day_of_week);
    setExercises(routine.exercises || [{ name: '', sets: '', reps: '', weight: '', rest: '' }]);
  };

  const handleDeleteRoutine = async (routineId) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta rutina?')) return;

    const { error } = await supabase.from('routines').delete().eq('id', routineId);

    if (!error) {
      if (selectedAthlete) fetchAthleteRoutines(selectedAthlete.code);
      fetchAllProgress();
      if (editingRoutineId === routineId) resetForm();
      alert('Rutina eliminada correctamente.');
    } else {
      alert('Error al eliminar rutina: ' + error.message);
    }
  };

  const toggleExerciseCheck = async (routineId, exerciseIndex) => {
    const currentCompleted = athleteProgress[routineId] || [];
    let updatedCompleted;

    if (currentCompleted.includes(exerciseIndex)) {
      updatedCompleted = currentCompleted.filter(i => i !== exerciseIndex);
    } else {
      updatedCompleted = [...currentCompleted, exerciseIndex];
    }

    setAthleteProgress({
      ...athleteProgress,
      [routineId]: updatedCompleted
    });

    await supabase.from('routine_progress').upsert([
      {
        routine_id: routineId,
        athlete_code: user.data.code,
        day_of_week: selectedDay,
        completed_exercises: updatedCompleted,
        updated_at: new Date()
      }
    ], { onConflict: ['routine_id', 'athlete_code'] });
  };

  const handleLogout = () => {
    setUser(null);
    setSelectedAthlete(null);
    setRoutines([]);
    setLoginInput('');
    setPasswordInput('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center p-4">
        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl w-full max-w-md border border-slate-700">
          <h1 className="text-3xl font-bold text-center mb-2 text-emerald-400">FitApp</h1>
          <p className="text-slate-400 text-center mb-6">Plataforma de Entrenamiento</p>
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 rounded mb-4 text-sm text-center">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Usuario / Nombre</label>
              <input
                type="text"
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 focus:outline-none focus:border-emerald-500"
                placeholder="Ingrese su usuario"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-slate-300">Contraseña / Código de Atleta</label>
              <input
                type="password"
                className="w-full bg-slate-900 border border-slate-700 rounded p-3 focus:outline-none focus:border-emerald-500"
                placeholder="Ingrese su código o contraseña"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold py-3 rounded transition"
            >
              {loading ? 'Verificando...' : 'Iniciar Sesión'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (user.role === 'trainer') {
    return (
      <div className="min-h-screen bg-slate-900 text-white p-6">
        <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-emerald-400">Panel de Entrenador</h1>
            <p className="text-slate-400">Bienvenido, {user.name}</p>
          </div>
          <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded border border-slate-700 text-sm">
            Cerrar Sesión
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="space-y-6">
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h2 className="text-lg font-bold mb-4 text-emerald-400">Registrar Nuevo Deportista</h2>
              <form onSubmit={handleCreateAthlete} className="space-y-3">
                <input
                  type="text"
                  placeholder="Nombre completo"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                  value={newAthleteName}
                  onChange={(e) => setNewAthleteName(e.target.value)}
                />
                <input
                  type="text"
                  placeholder="Código único de acceso"
                  className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                  value={newAthleteCode}
                  onChange={(e) => setNewAthleteCode(e.target.value)}
                />
                <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded text-sm">
                  Agregar Deportista
                </button>
              </form>
            </div>

            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
              <h2 className="text-lg font-bold mb-4 text-slate-200">Deportistas Registrados</h2>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {athletes.map((ath) => (
                  <button
                    key={ath.id}
                    onClick={() => setSelectedAthlete(ath)}
                    className={`w-full text-left p-3 rounded flex justify-between items-center border ${
                      selectedAthlete?.id === ath.id
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <span className="font-medium">{ath.name}</span>
                    <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-400">Cod: {ath.code}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {selectedAthlete ? (
              <>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-emerald-400">
                      {editingRoutineId ? '📝 Editando Rutina' : '➕ Asignar Rutina a:'} <span className="text-white">{selectedAthlete.name}</span>
                    </h2>
                    {editingRoutineId && (
                      <button onClick={resetForm} className="text-xs bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-slate-300">
                        Cancelar Edición
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {DAYS.map((day) => (
                      <button
                        key={day}
                        onClick={() => setSelectedDay(day)}
                        className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                          selectedDay === day
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-900 text-slate-400 border border-slate-700'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>

                  <form onSubmit={handleSaveRoutine} className="space-y-4">
                    <input
                      type="text"
                      placeholder="Título de la Rutina (ej: Hipertrofia Pecho y Tríceps)"
                      className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                      value={routineTitle}
                      onChange={(e) => setRoutineTitle(e.target.value)}
                    />

                    <div className="space-y-2">
                      <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 font-bold uppercase tracking-wider px-1">
                        <span className="col-span-4">Ejercicio</span>
                        <span className="col-span-2 text-center">Series</span>
                        <span className="col-span-2 text-center">Reps</span>
                        <span className="col-span-2 text-center">Peso</span>
                        <span className="col-span-2 text-center">Descanso</span>
                      </div>

                      {exercises.map((ex, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Ejercicio"
                            className="col-span-4 bg-slate-900 border border-slate-700 rounded p-2 text-sm"
                            value={ex.name}
                            onChange={(e) => handleExerciseChange(idx, 'name', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Series"
                            className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center"
                            value={ex.sets}
                            onChange={(e) => handleExerciseChange(idx, 'sets', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Reps"
                            className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center"
                            value={ex.reps}
                            onChange={(e) => handleExerciseChange(idx, 'reps', e.target.value)}
                          />
                          <input
                            type="text"
                            placeholder="Peso"
                            className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center"
                            value={ex.weight}
                            onChange={(e) => handleExerciseChange(idx, 'weight', e.target.value)}
                          />
                          <div className="col-span-2 flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Descanso"
                              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center"
                              value={ex.rest}
                              onChange={(e) => handleExerciseChange(idx, 'rest', e.target.value)}
                            />
                            {exercises.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveExerciseRow(idx)}
                                className="text-red-400 hover:text-red-300 px-1 font-bold"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={handleAddExerciseRow}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded text-sm"
                      >
                        + Agregar Ejercicio
                      </button>
                      <button
                        type="submit"
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded text-sm transition"
                      >
                        {editingRoutineId ? 'Actualizar Rutina' : `Guardar Rutina para ${selectedDay}`}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Rutinas Guardadas con Textos Grandes y Claros para el Entrenador */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-md font-bold mb-4 text-slate-300">
                    Progreso y Rutinas de {selectedAthlete.name} ({selectedDay})
                  </h3>
                  <div className="space-y-4">
                    {routines
                      .filter((r) => r.day_of_week === selectedDay)
                      .map((r) => {
                        const progRecord = allProgress.find(
                          p => p.routine_id === r.id && p.athlete_code === selectedAthlete.code
                        );
                        const completedIndices = progRecord?.completed_exercises || [];

                        return (
                          <div key={r.id} className="bg-slate-900 border border-slate-800 p-5 rounded-xl shadow-md">
                            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-800">
                              <div>
                                <h4 className="font-bold text-emerald-400 text-lg">{r.title}</h4>
                                <span className="text-xs text-slate-400 font-medium">
                                  Progreso: {completedIndices.length}/{r.exercises?.length || 0} completados
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => handleEditRoutine(r)}
                                  className="bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs px-3 py-1.5 rounded transition font-semibold"
                                >
                                  ✏️ Editar
                                </button>
                                <button
                                  onClick={() => handleDeleteRoutine(r.id)}
                                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 text-xs px-3 py-1.5 rounded transition font-semibold"
                                >
                                  🗑️ Eliminar
                                </button>
                              </div>
                            </div>

                            <div className="space-y-3">
                              {r.exercises?.map((ex, i) => {
                                const isDone = completedIndices.includes(i);
                                return (
                                  <div key={i} className={`p-3 rounded-lg flex flex-col sm:flex-row justify-between sm:items-center gap-2 border ${isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/60 border-slate-700 text-slate-200'}`}>
                                    <span className="font-bold text-base flex items-center gap-2.5">
                                      <span>{isDone ? '✅' : '⏳'}</span>
                                      <span className={isDone ? 'line-through text-slate-400' : ''}>{ex.name}</span>
                                    </span>
                                    <div className="flex flex-wrap gap-2 text-sm font-semibold">
                                      <span className="bg-slate-900 px-3 py-1 rounded border border-slate-700 text-slate-300">🏋️‍♂️ {ex.sets} Series</span>
                                      <span className="bg-slate-900 px-3 py-1 rounded border border-slate-700 text-slate-300">🔄 {ex.reps} Reps</span>
                                      <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded border border-emerald-500/40">⚖️ {ex.weight || 'Sin peso'}</span>
                                      <span className="bg-blue-500/20 text-blue-300 px-3 py-1 rounded border border-blue-500/40">⏳ {ex.rest || '0s'} descanso</span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    {routines.filter((r) => r.day_of_week === selectedDay).length === 0 && (
                      <div className="text-center text-slate-500 py-6">
                        No hay rutinas creadas para el día {selectedDay}.
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-800/50 border border-slate-800 p-12 rounded-xl text-center text-slate-500">
                Selecciona un deportista de la lista para gestionar sus rutinas y ver su progreso.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA: DEPORTISTA CON TEXTOS GRANDES Y CÓMODOS PARA ENTRENAR ---
  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-emerald-400">Mi Plan de Entrenamiento</h1>
          <p className="text-slate-400">Atleta: {user.data.name}</p>
        </div>
        <button onClick={handleLogout} className="bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded border border-slate-700 text-sm">
          Cerrar Sesión
        </button>
      </header>

      <div className="flex overflow-x-auto gap-2 mb-6 pb-2">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded text-sm font-medium transition whitespace-nowrap ${
              selectedDay === day
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-800 text-slate-400 border border-slate-700'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="space-y-4 max-w-3xl">
        {routines
          .filter((r) => r.day_of_week === selectedDay)
          .map((r) => {
            const completedIndices = athleteProgress[r.id] || [];

            return (
              <div key={r.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-bold text-emerald-400">{r.title}</h3>
                  <span className="text-sm font-bold bg-slate-900 px-3.5 py-1.5 rounded-full border border-slate-700 text-emerald-400">
                    {completedIndices.length} de {r.exercises?.length || 0} completados
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-4">Toca la casilla de verificación en cada ejercicio a medida que los vayas realizando:</p>

                <div className="space-y-3.5">
                  {r.exercises?.map((ex, i) => {
                    const isChecked = completedIndices.includes(i);
                    return (
                      <div 
                        key={i} 
                        onClick={() => toggleExerciseCheck(r.id, i)}
                        className={`cursor-pointer p-5 rounded-xl border transition flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                          isChecked 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200' 
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}}
                            className="w-6 h-6 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className={`font-bold text-lg ${isChecked ? 'line-through text-slate-400' : 'text-white'}`}>
                            {ex.name}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2.5 text-sm font-semibold">
                          <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">🏋️‍♂️ {ex.sets} Series</span>
                          <span className="bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">🔄 {ex.reps} Reps</span>
                          <span className="bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-lg border border-emerald-500/40">⚖️ {ex.weight || 'Sin peso'}</span>
                          <span className="bg-blue-500/20 text-blue-300 px-3 py-1.5 rounded-lg border border-blue-500/40">⏳ {ex.rest || '0s'} descanso</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

        {routines.filter((r) => r.day_of_week === selectedDay).length === 0 && (
          <div className="bg-slate-800/40 border border-slate-800 p-12 rounded-xl text-center text-slate-500">
            No tienes rutinas asignadas para el día <span className="font-bold text-slate-400">{selectedDay}</span>.
          </div>
        )}
      </div>
    </div>
  );
}