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
  const [allProgress, setAllProgress] = useState([]); // Progreso de todos los atletas para Víctor

  // Estados para Rutinas y Progreso del Atleta
  const [routines, setRoutines] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Lunes');
  const [routineTitle, setRoutineTitle] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '', rest: '' }]);
  const [athleteProgress, setAthleteProgress] = useState({}); // { routineId: [indicesDeEjerciciosHechos] }

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
    }
  }, [selectedAthlete]);

  // Cargar lista de deportistas (solo Entrenador)
  const fetchAthletes = async () => {
    const { data, error } = await supabase.from('athletes').select('*');
    if (!error) setAthletes(data || []);
  };

  // Cargar el progreso de todos los deportistas para el panel de Víctor
  const fetchAllProgress = async () => {
    const { data, error } = await supabase.from('routine_progress').select('*');
    if (!error) setAllProgress(data || []);
  };

  // Cargar rutinas según el código del atleta
  const fetchAthleteRoutines = async (code) => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('assigned_athlete', code);
    if (!error) setRoutines(data || []);
  };

  // Cargar el progreso guardado del atleta
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

  // Manejo de Login Asíncrono
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const userClean = loginInput.trim();
    const passClean = passwordInput.trim();

    // 1. Credenciales de Entrenador (Víctor)
    if (userClean === 'Victor' && passClean === 'Victor123') {
      setUser({ role: 'trainer', name: 'Víctor' });
      setLoading(false);
      return;
    }

    // 2. Consulta directa a Supabase para verificar si el código de deportista existe
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

  // Crear nuevo atleta (solo Entrenador)
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

  // Agregar fila de ejercicio a la rutina
  const handleAddExerciseRow = () => {
    setExercises([...exercises, { name: '', sets: '', reps: '', weight: '', rest: '' }]);
  };

  // Actualizar campo de un ejercicio dinámico
  const handleExerciseChange = (index, field, value) => {
    const updated = [...exercises];
    updated[index][field] = value;
    setExercises(updated);
  };

  // Guardar/Actualizar Rutina
  const handleSaveRoutine = async (e) => {
    e.preventDefault();
    const athleteCode = user.role === 'trainer' ? selectedAthlete?.code : user.data.code;

    if (!athleteCode) {
      alert('Selecciona un deportista primero.');
      return;
    }

    const { error } = await supabase.from('routines').insert([
      {
        title: routineTitle,
        assigned_athlete: athleteCode,
        day_of_week: selectedDay,
        exercises: exercises
      }
    ]);

    if (!error) {
      setRoutineTitle('');
      setExercises([{ name: '', sets: '', reps: '', weight: '', rest: '' }]);
      fetchAthleteRoutines(athleteCode);
      alert('Rutina guardada con éxito.');
    } else {
      alert('Error al guardar rutina: ' + error.message);
    }
  };

  // Marcar/Desmarcar ejercicio hecho por el deportista (Check-in interactivo)
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

    // Guardar o actualizar en Supabase
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

  // Cerrar sesión
  const handleLogout = () => {
    setUser(null);
    setSelectedAthlete(null);
    setRoutines([]);
    setLoginInput('');
    setPasswordInput('');
  };

  // --- VISTA: LOGIN ---
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

  // --- VISTA: ENTRENADOR (VÍCTOR) CON SEGUIMIENTO DE PROGRESO ---
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
          {/* Columna 1: Registro y Selección de Atletas */}
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

          {/* Columna 2 y 3: Planificador y Monitoreo de Check-in */}
          <div className="lg:col-span-2 space-y-6">
            {selectedAthlete ? (
              <>
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h2 className="text-lg font-bold mb-4 text-emerald-400">
                    Asignar Rutina a: <span className="text-white">{selectedAthlete.name}</span>
                  </h2>

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
                        <div key={idx} className="grid grid-cols-12 gap-2">
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
                          <input
                            type="text"
                            placeholder="Descanso"
                            className="col-span-2 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center"
                            value={ex.rest}
                            onChange={(e) => handleExerciseChange(idx, 'rest', e.target.value)}
                          />
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
                        className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold py-2 rounded text-sm"
                      >
                        Guardar Rutina para {selectedDay}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Rutinas Guardadas y Monitoreo de Progreso en Vivo */}
                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-md font-bold mb-4 text-slate-300">
                    Progreso y Rutinas de {selectedAthlete.name} ({selectedDay})
                  </h3>
                  <div className="space-y-4">
                    {routines
                      .filter((r) => r.day_of_week === selectedDay)
                      .map((r) => {
                        // Buscar el progreso de este atleta para esta rutina
                        const progRecord = allProgress.find(
                          p => p.routine_id === r.id && p.athlete_code === selectedAthlete.code
                        );
                        const completedIndices = progRecord?.completed_exercises || [];

                        return (
                          <div key={r.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                            <div className="flex justify-between items-center mb-2">
                              <h4 className="font-bold text-emerald-400">{r.title}</h4>
                              <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300 border border-slate-700">
                                Estado: {completedIndices.length}/{r.exercises?.length || 0} completados
                              </span>
                            </div>
                            <div className="space-y-1">
                              {r.exercises?.map((ex, i) => {
                                const isDone = completedIndices.includes(i);
                                return (
                                  <div key={i} className={`text-sm flex justify-between items-center border-b border-slate-800/50 py-1.5 px-2 rounded ${isDone ? 'bg-emerald-500/10 text-emerald-300' : 'text-slate-400'}`}>
                                    <span className="flex items-center gap-2">
                                      <span>{isDone ? '✅' : '⏳'}</span>
                                      <span className={isDone ? 'line-through' : ''}>{ex.name}</span>
                                    </span>
                                    <span className="text-xs">
                                      {ex.sets}x{ex.reps} | {ex.weight} | ⏳ {ex.rest}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
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

  // --- VISTA: DEPORTISTA CON CHECK-IN INTERACTIVO ---
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
                  <span className="text-xs font-medium bg-slate-900 px-3 py-1 rounded-full border border-slate-700 text-slate-300">
                    {completedIndices.length} de {r.exercises?.length || 0} completados
                  </span>
                </div>

                <p className="text-xs text-slate-400 mb-3">Toca la casilla de verificación en cada ejercicio a medida que los vayas realizando:</p>

                <div className="space-y-3">
                  {r.exercises?.map((ex, i) => {
                    const isChecked = completedIndices.includes(i);
                    return (
                      <div 
                        key={i} 
                        onClick={() => toggleExerciseCheck(r.id, i)}
                        className={`cursor-pointer p-4 rounded-xl border transition flex flex-col sm:flex-row justify-between sm:items-center gap-3 ${
                          isChecked 
                            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-200' 
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700 text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Manejado por el div contenedor
                            className="w-5 h-5 accent-emerald-500 rounded cursor-pointer"
                          />
                          <span className={`font-semibold text-base ${isChecked ? 'line-through text-slate-400' : ''}`}>
                            {ex.name}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs">
                          <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-300">{ex.sets} Series</span>
                          <span className="bg-slate-800 px-2.5 py-1 rounded border border-slate-700 text-slate-300">{ex.reps} Reps</span>
                          <span className="bg-emerald-500/10 text-emerald-400 px-2.5 py-1 rounded border border-emerald-500/20 font-medium">{ex.weight}</span>
                          <span className="bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded border border-blue-500/20 font-medium">⏳ {ex.rest}</span>
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