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

  // Estados para Rutinas
  const [routines, setRoutines] = useState([]);
  const [selectedDay, setSelectedDay] = useState('Lunes');
  const [routineTitle, setRoutineTitle] = useState('');
  const [exercises, setExercises] = useState([{ name: '', sets: '', reps: '', weight: '' }]);

  useEffect(() => {
    if (user?.role === 'trainer') {
      fetchAthletes();
    } else if (user?.role === 'athlete') {
      fetchAthleteRoutines(user.data.code);
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

  // Cargar rutinas según el código del atleta
  const fetchAthleteRoutines = async (code) => {
    const { data, error } = await supabase
      .from('routines')
      .select('*')
      .eq('assigned_athlete', code);
    if (!error) setRoutines(data || []);
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
    setExercises([...exercises, { name: '', sets: '', reps: '', weight: '' }]);
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
      setExercises([{ name: '', sets: '', reps: '', weight: '' }]);
      fetchAthleteRoutines(athleteCode);
      alert('Rutina guardada con éxito.');
    } else {
      alert('Error al guardar rutina: ' + error.message);
    }
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

  // --- VISTA: ENTRENADOR (VÍCTOR) ---
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

          {/* Columna 2 y 3: Planificador y Rutinas */}
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
                      <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Ejercicios</label>
                      {exercises.map((ex, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2">
                          <input
                            type="text"
                            placeholder="Ejercicio"
                            className="col-span-5 bg-slate-900 border border-slate-700 rounded p-2 text-sm"
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
                            className="col-span-3 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-center"
                            value={ex.weight}
                            onChange={(e) => handleExerciseChange(idx, 'weight', e.target.value)}
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

                <div className="bg-slate-800 p-6 rounded-xl border border-slate-700">
                  <h3 className="text-md font-bold mb-4 text-slate-300">
                    Rutinas Guardadas de {selectedAthlete.name} ({selectedDay})
                  </h3>
                  <div className="space-y-4">
                    {routines
                      .filter((r) => r.day_of_week === selectedDay)
                      .map((r) => (
                        <div key={r.id} className="bg-slate-900 border border-slate-800 p-4 rounded-lg">
                          <h4 className="font-bold text-emerald-400 mb-2">{r.title}</h4>
                          <div className="space-y-1">
                            {r.exercises?.map((ex, i) => (
                              <div key={i} className="text-sm flex justify-between border-b border-slate-800/50 py-1 text-slate-300">
                                <span>{ex.name}</span>
                                <span className="text-slate-400">{ex.sets} series x {ex.reps} reps @ {ex.weight}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-slate-800/50 border border-slate-800 p-12 rounded-xl text-center text-slate-500">
                Selecciona un deportista de la lista para gestionar sus rutinas.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- VISTA: DEPORTISTA (FERNANDO) ---
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
          .map((r) => (
            <div key={r.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl shadow-lg">
              <h3 className="text-xl font-bold text-emerald-400 mb-4">{r.title}</h3>
              <div className="space-y-3">
                {r.exercises?.map((ex, i) => (
                  <div key={i} className="bg-slate-900 p-3 rounded flex justify-between items-center border border-slate-800">
                    <span className="font-semibold text-slate-200">{ex.name}</span>
                    <div className="text-sm space-x-3 text-slate-400">
                      <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{ex.sets} Series</span>
                      <span className="bg-slate-800 px-2 py-1 rounded border border-slate-700">{ex.reps} Reps</span>
                      <span className="bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded border border-emerald-500/20">{ex.weight}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

        {routines.filter((r) => r.day_of_week === selectedDay).length === 0 && (
          <div className="bg-slate-800/40 border border-slate-800 p-12 rounded-xl text-center text-slate-500">
            No tienes rutinas asignadas para el día <span className="font-bold text-slate-400">{selectedDay}</span>.
          </div>
        )}
      </div>
    </div>
  );
}