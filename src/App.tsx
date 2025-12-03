import { useState, useEffect } from 'react';
import { Plus, Trash2, Swords, RotateCw, Trophy, Star, Zap, CheckCircle, History, ScrollText } from 'lucide-react';
import confetti from 'canvas-confetti';
import WheelCanvas from './WheelCanvas';
import { Task, MetricType, Achievement } from './types';

// Utility for random colors that fit the theme
const colors = ['#7c2d12', '#065f46', '#1e3a8a', '#581c87', '#831843', '#4d7c0f'];
const getRandomColor = () => colors[Math.floor(Math.random() * colors.length)];

// Achievement Definitions
const ACHIEVEMENT_LIST = [
  { id: 'first_blood', name: 'First Blood', description: 'Complete your first task', icon: <Swords size={16} /> },
  { id: 'streak_3', name: 'On Fire', description: 'Complete 3 tasks in a row', icon: <Star size={16} /> },
  { id: 'streak_5', name: 'Unstoppable', description: 'Complete 5 tasks in a row', icon: <Trophy size={16} /> },
  { id: 'high_roller', name: 'High Roller', description: 'Double a task to 4x multiplier', icon: <RotateCw size={16} /> },
  { id: 'max_risk', name: 'Max Risk', description: 'Double a task to 8x multiplier', icon: <RotateCw size={16} color="red" /> },
];

const BOSSES = [
  "Vorkath", "Zulrah", "Commander Zilyana", "General Graardor", "Kree'arra", "K'ril Tsutsaroth",
  "Nex", "Corporeal Beast", "King Black Dragon", "Giant Mole", "Kalphite Queen", "Callisto",
  "Venenatis", "Vet'ion", "Chaos Fanatic", "Crazy Archaeologist", "Scorpia", "Dagannoth Kings",
  "Barrows", "Chambers of Xeric", "Theatre of Blood", "Tombs of Amascut", "The Inferno",
  "Fight Caves", "Gauntlet", "Corrupted Gauntlet", "Muspah", "Duke Sucellus", "The Leviathan",
  "The Whisperer", "Vardorvis"
];

const SKILLS = [
  "Attack", "Strength", "Defence", "Ranged", "Prayer", "Magic", "Runecraft", "Construction",
  "Hitpoints", "Agility", "Herblore", "Thieving", "Crafting", "Fletching", "Slayer", "Hunter",
  "Mining", "Smithing", "Fishing", "Cooking", "Firemaking", "Woodcutting", "Farming"
];

function App() {
  // --- State ---
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]); // Store IDs only
  const [streak, setStreak] = useState(0);

  const [isSpinning, setIsSpinning] = useState(false);
  const [spinToken, setSpinToken] = useState(0);
  const [winner, setWinner] = useState<Task | null>(null);
  const [showWinModal, setShowWinModal] = useState(false);
  const [showAchievementModal, setShowAchievementModal] = useState<Achievement | null>(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Input States
  const [inputName, setInputName] = useState('');
  const [inputMin, setInputMin] = useState(50);
  const [inputMax, setInputMax] = useState(100);
  const [inputMetric, setInputMetric] = useState<MetricType>('Kills');

  // --- Persistence ---
  useEffect(() => {
    const savedTasks = localStorage.getItem('osrs-spinner-tasks');
    const savedActiveTask = localStorage.getItem('osrs-spinner-active-task');
    const savedCompletedTasks = localStorage.getItem('osrs-spinner-completed-tasks');
    const savedAchievements = localStorage.getItem('osrs-spinner-achievements');
    const savedStreak = localStorage.getItem('osrs-spinner-streak');

    if (savedTasks) setTasks(JSON.parse(savedTasks));
    if (savedActiveTask) setActiveTask(JSON.parse(savedActiveTask));
    if (savedCompletedTasks) setCompletedTasks(JSON.parse(savedCompletedTasks));

    // Fix crash: if achievements are objects (old format), reset them. If strings (new format), keep them.
    if (savedAchievements) {
      try {
        const parsed = JSON.parse(savedAchievements);
        if (parsed.length > 0 && typeof parsed[0] === 'object') {
          console.warn("Old achievement format detected. Resetting to fix crash.");
          setAchievements([]);
          localStorage.removeItem('osrs-spinner-achievements');
        } else {
          setAchievements(parsed);
        }
      } catch (e) {
        setAchievements([]);
      }
    }

    if (savedStreak) setStreak(parseInt(savedStreak));
  }, []);

  useEffect(() => {
    localStorage.setItem('osrs-spinner-tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    if (activeTask) {
      localStorage.setItem('osrs-spinner-active-task', JSON.stringify(activeTask));
    } else {
      localStorage.removeItem('osrs-spinner-active-task');
    }
  }, [activeTask]);

  useEffect(() => {
    localStorage.setItem('osrs-spinner-completed-tasks', JSON.stringify(completedTasks));
  }, [completedTasks]);

  useEffect(() => {
    localStorage.setItem('osrs-spinner-achievements', JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem('osrs-spinner-streak', streak.toString());
  }, [streak]);


  // --- Logic ---

  const getBossImage = (name: string) => {
    const formatted = name.replace(/ /g, '_');
    return `https://oldschool.runescape.wiki/images/${formatted}_chathead.png`;
  };

  const getSkillImage = (name: string) => {
    const formatted = name.replace(/ /g, '_');
    return `https://oldschool.runescape.wiki/images/${formatted}_icon_(detail).png`;
  };

  const unlockAchievement = (id: string) => {
    if (achievements.includes(id)) return; // Already unlocked

    const def = ACHIEVEMENT_LIST.find(a => a.id === id);
    if (!def) return;

    const newAchievement: Achievement = { ...def, unlockedAt: Date.now() };
    setAchievements(prev => [...prev, id]);
    setShowAchievementModal(newAchievement);

    // Confetti for achievement
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#ffffff']
    });

    setTimeout(() => setShowAchievementModal(null), 3000);
  };

  const addTask = (nameOverride?: string) => {
    const nameToUse = nameOverride || inputName;
    if (!nameToUse) return;

    const initialGoal = Math.floor(Math.random() * (inputMax - inputMin + 1) + inputMin);
    const newTask: Task = {
      id: crypto.randomUUID(),
      name: nameToUse,
      color: getRandomColor(),
      minBase: inputMin,
      maxBase: inputMax,
      currentGoal: initialGoal,
      metric: inputMetric,
      multiplier: 1,
    };
    setTasks([...tasks, newTask]);
    if (!nameOverride) setInputName('');
  };

  const removeTask = (id: string) => {
    setTasks(tasks.filter(t => t.id !== id));
    // Removing a task from the list doesn't punish streak anymore, only abandoning an active task would (if we implemented that)
  };

  const handleSpinClick = () => {
    if (isSpinning || tasks.length === 0) return;
    setIsSpinning(true);
    setShowWinModal(false);
    setWinner(null);
    setSpinToken(prev => prev + 1);
  };

  const handleSpinComplete = (winningTask: Task) => {
    setIsSpinning(false);
    setWinner(winningTask);
    setShowWinModal(true);

    // Small confetti burst for landing
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7 },
      colors: [winningTask.color]
    });
  };

  const handleDoubleAndSpin = () => {
    if (!winner) return;

    const newMultiplier = winner.multiplier * 2;

    // Achievement Checks
    if (newMultiplier >= 4) unlockAchievement('high_roller');
    if (newMultiplier >= 8) unlockAchievement('max_risk');

    setTasks(prevTasks => prevTasks.map(task => {
      if (task.id === winner.id) {
        return {
          ...task,
          multiplier: newMultiplier,
          currentGoal: task.currentGoal * 2
        };
      }
      return task;
    }));

    setShowWinModal(false);
    setTimeout(() => {
      handleSpinClick();
    }, 300);
  };

  const handleAcceptTask = () => {
    if (!winner) return;

    // Move to active task instead of completing immediately
    setActiveTask(winner);
    setTasks(tasks.filter(t => t.id !== winner.id));

    setShowWinModal(false);
  }

  const handleCompleteActiveTask = () => {
    if (!activeTask) return;

    // Achievement Checks
    const newStreak = streak + 1;
    setStreak(newStreak);

    unlockAchievement('first_blood');
    if (newStreak >= 3) unlockAchievement('streak_3');
    if (newStreak >= 5) unlockAchievement('streak_5');

    // Add to history
    setCompletedTasks(prev => [activeTask, ...prev]);
    setActiveTask(null);

    // Big Celebration Confetti
    confetti({
      particleCount: 150,
      spread: 100,
      origin: { y: 0.6 },
      colors: ['#d4af37', '#5b4028', '#ffffff']
    });
  };

  const handleAbandonTask = () => {
    if (!activeTask) return;
    if (confirm("Are you sure you want to abandon this task? Your streak will be reset.")) {
      setActiveTask(null);
      setStreak(0);
    }
  };


  return (
    <div className="min-h-screen bg-osrs-bg text-gray-200 font-sans flex flex-col">

      {/* Header */}
      <header className="bg-osrs-panel border-b-4 border-osrs-border p-4 shadow-lg z-30 relative">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-osrs-gold p-2 rounded-full shadow-glow">
              <Swords className="text-osrs-panel" size={24} />
            </div>
            <h1 className="text-2xl font-bold text-osrs-gold tracking-wider shadow-black drop-shadow-md">OSRS HD SPINNER</h1>
          </div>

          {/* Stats Pill */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setShowHistory(true)}
              className="flex items-center gap-2 bg-osrs-bg px-4 py-2 rounded-full border border-osrs-border hover:bg-osrs-border transition-colors"
            >
              <History size={18} className="text-osrs-accent" />
              <span className="text-sm font-bold text-white hidden sm:inline">History</span>
            </button>

            <div className="flex items-center gap-6 bg-osrs-bg px-6 py-2 rounded-full border border-osrs-border shadow-inner">
              <div className="flex items-center gap-2">
                <Trophy className="text-osrs-gold" size={18} />
                <span className="font-bold text-white">Streak: <span className="text-osrs-gold">{streak}</span></span>
              </div>
              <div className="w-px h-4 bg-osrs-border hidden sm:block"></div>
              <div className="text-sm text-osrs-accent hidden sm:block">
                {achievements.length} / {ACHIEVEMENT_LIST.length} Unlocked
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-12 p-8 max-w-7xl mx-auto w-full">

        {/* ---- Left Panel: Controls & List ---- */}
        <div className="w-full max-w-md space-y-6 flex flex-col h-full justify-center">

          {/* Active Task Card */}
          {activeTask && (
            <div className="bg-osrs-panel border-2 border-green-600 rounded-xl p-6 shadow-2xl relative overflow-hidden animate-in slide-in-from-left duration-500">
              <div className="absolute inset-0 bg-green-900/20 pointer-events-none"></div>
              <div className="relative z-10">
                <h3 className="text-green-400 font-bold uppercase tracking-wider text-xs mb-2 flex items-center gap-2">
                  <Zap size={14} /> Current Objective
                </h3>
                <div className="flex items-center gap-4 mb-4">
                  {BOSSES.includes(activeTask.name) && (
                    <img src={getBossImage(activeTask.name)} alt={activeTask.name} className="w-16 h-16 object-contain drop-shadow-lg" />
                  )}
                  {SKILLS.includes(activeTask.name) && (
                    <img src={getSkillImage(activeTask.name)} alt={activeTask.name} className="w-12 h-12 object-contain drop-shadow-lg" />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-1">{activeTask.name}</h2>
                    <p className="text-3xl font-mono text-osrs-gold">
                      {activeTask.currentGoal} <span className="text-lg text-osrs-accent">{activeTask.metric}</span>
                      {activeTask.multiplier > 1 && <span className="text-sm text-red-400 ml-2">(x{activeTask.multiplier})</span>}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handleCompleteActiveTask}
                    className="flex-1 bg-green-700 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <CheckCircle size={18} /> Complete
                  </button>
                  <button
                    onClick={handleAbandonTask}
                    className="bg-red-900/50 hover:bg-red-900 text-red-200 p-3 rounded-lg border border-red-800 transition-colors"
                    title="Abandon Task (Resets Streak)"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Input Form */}
          <div className="bg-osrs-panel border-2 border-osrs-border rounded-xl p-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-black/20 to-transparent pointer-events-none"></div>

            <div className="flex justify-between items-center mb-6 relative z-10">
              <h2 className="text-xl text-osrs-gold font-bold flex items-center gap-2">
                <Plus size={20} /> Add New Task
              </h2>
              <button
                onClick={() => setShowQuickAdd(true)}
                className="text-xs bg-osrs-gold text-osrs-panel font-bold px-3 py-1.5 rounded hover:bg-yellow-500 transition-all flex items-center gap-1 shadow-md active:translate-y-0.5"
              >
                <Zap size={14} /> Quick Add
              </button>
            </div>

            <div className="space-y-5 relative z-10">
              <div>
                <label className="block text-xs font-bold text-osrs-gold uppercase tracking-wider mb-1.5">Task Name</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="e.g., Vorkath"
                  className="w-full bg-osrs-bg border-2 border-osrs-border rounded-lg p-3 text-white focus:border-osrs-gold outline-none transition-colors placeholder-osrs-accent/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-osrs-gold uppercase tracking-wider mb-1.5">Min</label>
                  <input type="number" value={inputMin} onChange={e => setInputMin(Number(e.target.value))} className="w-full bg-osrs-bg border-2 border-osrs-border rounded-lg p-3 outline-none focus:border-osrs-gold transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-osrs-gold uppercase tracking-wider mb-1.5">Max</label>
                  <input type="number" value={inputMax} onChange={e => setInputMax(Number(e.target.value))} className="w-full bg-osrs-bg border-2 border-osrs-border rounded-lg p-3 outline-none focus:border-osrs-gold transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-osrs-gold uppercase tracking-wider mb-1.5">Metric</label>
                <select
                  value={inputMetric}
                  onChange={(e) => setInputMetric(e.target.value as MetricType)}
                  className="w-full bg-osrs-bg border-2 border-osrs-border rounded-lg p-3 outline-none focus:border-osrs-gold transition-colors appearance-none cursor-pointer"
                >
                  <option>Kills</option>
                  <option>XP</option>
                  <option>Laps</option>
                </select>
              </div>

              <button
                onClick={() => addTask()}
                disabled={!inputName}
                className="w-full bg-gradient-to-r from-osrs-gold to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-osrs-panel font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
              >
                <Plus size={20} /> Add to Wheel
              </button>
            </div>
          </div>

          {/* Task List */}
          <div className="bg-osrs-panel border-2 border-osrs-border rounded-xl p-4 shadow-2xl flex-1 min-h-[200px] max-h-[400px] overflow-hidden flex flex-col relative">
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 to-transparent pointer-events-none"></div>
            <h3 className="text-osrs-gold font-bold mb-3 sticky top-0 bg-osrs-panel z-10 pb-2 border-b border-osrs-border/50 flex justify-between items-center">
              <span>Current Tasks</span>
              <span className="bg-osrs-bg px-2 py-0.5 rounded text-xs text-white">{tasks.length}</span>
            </h3>
            <ul className="space-y-2 relative z-10 overflow-y-auto thin-scrollbar pr-2 flex-1">
              {tasks.length === 0 && (
                <li className="text-center text-osrs-accent py-8 italic">No tasks added yet. Spin the wheel of destiny!</li>
              )}
              {tasks.map(task => (
                <li key={task.id} className="flex items-center justify-between bg-osrs-bg/50 border border-osrs-border p-3 rounded-lg hover:bg-osrs-bg transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full shadow-sm ring-1 ring-white/10" style={{ backgroundColor: task.color }}></div>
                    <div className="flex flex-col">
                      <span className={`font-medium ${task.multiplier > 1 ? "text-osrs-gold" : "text-gray-200"}`}>
                        {task.name}
                      </span>
                      {task.multiplier > 1 && <span className="text-[10px] text-red-400 font-bold uppercase tracking-wide">x{task.multiplier} Multiplier Active</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-mono text-osrs-accent bg-black/20 px-2 py-1 rounded">{task.currentGoal} {task.metric}</span>
                    <button onClick={() => removeTask(task.id)} className="text-osrs-accent hover:text-red-500 transition-colors p-1"><Trash2 size={16} /></button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ---- Right Panel: The Wheel ---- */}
        <div className="flex flex-col items-center justify-center space-y-10 relative flex-1">

          <div className="relative">
            {/* Decorative glow behind wheel */}
            <div className="absolute inset-0 bg-osrs-gold/5 blur-3xl rounded-full transform scale-110 pointer-events-none"></div>
            <WheelCanvas
              tasks={tasks}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
              spinTriggerToken={spinToken}
            />
          </div>

          <button
            onClick={handleSpinClick}
            disabled={isSpinning || tasks.length === 0 || activeTask !== null}
            title={activeTask ? "Complete your current task first!" : ""}
            className="bg-gradient-to-b from-osrs-gold to-yellow-700 text-osrs-panel text-2xl font-black tracking-wide py-5 px-16 rounded-full shadow-glow transform transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed border-4 border-osrs-panel relative overflow-hidden group"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12"></div>
            <span className="relative z-10 drop-shadow-sm">
              {isSpinning ? 'SPINNING...' : activeTask ? 'TASK ACTIVE' : 'SPIN THE WHEEL'}
            </span>
          </button>

          {/* ---- Winner Modal ---- */}
          {showWinModal && winner && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
              <div className="bg-osrs-panel border-4 border-osrs-gold rounded-2xl p-10 shadow-2xl text-center max-w-lg w-full relative overflow-hidden transform animate-in zoom-in-95 duration-300">
                {winner.multiplier > 1 && <div className="absolute inset-0 bg-red-900 opacity-20 mix-blend-overlay pointer-events-none animate-pulse"></div>}

                <div className="mb-6">
                  <h3 className="text-sm text-osrs-accent uppercase tracking-[0.2em] mb-3 font-bold">The wheel has spoken</h3>

                  <div className="flex justify-center mb-4">
                    {BOSSES.includes(winner.name) && (
                      <img src={getBossImage(winner.name)} alt={winner.name} className="w-24 h-24 object-contain drop-shadow-2xl animate-in zoom-in duration-500" />
                    )}
                    {SKILLS.includes(winner.name) && (
                      <img src={getSkillImage(winner.name)} alt={winner.name} className="w-20 h-20 object-contain drop-shadow-2xl animate-in zoom-in duration-500" />
                    )}
                  </div>

                  <h2 className="text-5xl font-black text-osrs-gold mb-2 drop-shadow-md">{winner.name}</h2>
                  <div className="h-1 w-24 bg-gradient-to-r from-transparent via-osrs-gold to-transparent mx-auto opacity-50"></div>
                </div>

                <div className="bg-black/30 rounded-lg p-6 mb-8 border border-white/5">
                  <p className="text-4xl text-white font-mono font-bold flex items-center justify-center gap-3">
                    {winner.currentGoal}
                    <span className="text-xl text-osrs-accent uppercase">{winner.metric}</span>
                  </p>
                  {winner.multiplier > 1 && (
                    <div className="mt-2 inline-block bg-red-900/50 border border-red-500/30 text-red-400 px-3 py-1 rounded text-sm font-bold uppercase tracking-wider animate-pulse">
                      High Stakes: x{winner.multiplier} Multiplier
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-4 relative z-20">
                  <button
                    onClick={handleAcceptTask}
                    className="w-full bg-gradient-to-r from-green-700 to-green-800 hover:from-green-600 hover:to-green-700 text-white font-bold py-4 px-6 rounded-xl border-t border-white/10 shadow-lg hover:shadow-green-900/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 text-lg"
                  >
                    <Swords size={20} /> Accept Task
                  </button>

                  <div className="relative py-2 flex items-center justify-center">
                    <div className="absolute inset-x-0 top-1/2 h-px bg-gradient-to-r from-transparent via-osrs-border to-transparent -z-10"></div>
                    <span className="bg-osrs-panel px-4 text-xs text-osrs-accent font-bold uppercase tracking-widest">OR</span>
                  </div>

                  <button
                    onClick={handleDoubleAndSpin}
                    className="w-full bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white font-bold py-4 px-6 rounded-xl border-t border-white/10 shadow-lg hover:shadow-red-900/20 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-3 group text-lg"
                  >
                    <RotateCw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
                    Double It & Spin Again!
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ---- Quick Add Modal ---- */}
          {showQuickAdd && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowQuickAdd(false)}>
              <div className="bg-osrs-panel border-2 border-osrs-gold rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-osrs-border bg-black/20 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-osrs-gold flex items-center gap-2">
                    <Zap size={20} /> Quick Add Task
                  </h2>
                  <button onClick={() => setShowQuickAdd(false)} className="text-osrs-accent hover:text-white transition-colors">
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="overflow-y-auto p-6 thin-scrollbar">
                  <div className="mb-6">
                    <h3 className="text-sm font-bold text-osrs-accent uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Swords size={16} /> Bosses
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {BOSSES.map(boss => (
                        <button
                          key={boss}
                          onClick={() => { setInputName(boss); setInputMetric('Kills'); setShowQuickAdd(false); }}
                          className="text-left text-sm p-2 bg-osrs-bg border border-osrs-border/50 hover:border-osrs-gold hover:bg-osrs-bg/80 rounded-lg transition-all hover:shadow-md flex items-center gap-3 group"
                        >
                          <img src={getBossImage(boss)} alt={boss} className="w-8 h-8 object-contain" />
                          <span className="font-medium text-gray-300 group-hover:text-white truncate flex-1">{boss}</span>
                          <Plus size={14} className="opacity-0 group-hover:opacity-100 text-osrs-gold transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-osrs-accent uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Star size={16} /> Skills
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {SKILLS.map(skill => (
                        <button
                          key={skill}
                          onClick={() => { setInputName(skill); setInputMetric('XP'); setShowQuickAdd(false); }}
                          className="text-left text-sm p-2 bg-osrs-bg border border-osrs-border/50 hover:border-osrs-gold hover:bg-osrs-bg/80 rounded-lg transition-all hover:shadow-md flex items-center gap-3 group"
                        >
                          <img src={getSkillImage(skill)} alt={skill} className="w-6 h-6 object-contain" />
                          <span className="font-medium text-gray-300 group-hover:text-white truncate flex-1">{skill}</span>
                          <Plus size={14} className="opacity-0 group-hover:opacity-100 text-osrs-gold transition-opacity" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- History & Achievements Modal ---- */}
          {showHistory && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setShowHistory(false)}>
              <div className="bg-osrs-panel border-2 border-osrs-gold rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="p-4 border-b border-osrs-border bg-black/20 flex justify-between items-center">
                  <h2 className="text-xl font-bold text-osrs-gold flex items-center gap-2">
                    <History size={20} /> History & Achievements
                  </h2>
                  <button onClick={() => setShowHistory(false)} className="text-osrs-accent hover:text-white transition-colors">
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 thin-scrollbar">
                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Achievements Column */}
                    <div>
                      <h3 className="text-lg font-bold text-osrs-gold mb-4 flex items-center gap-2">
                        <Trophy size={18} /> Unlocked Achievements
                      </h3>
                      <div className="space-y-3">
                        {achievements.length === 0 && <p className="text-osrs-accent italic text-sm">No achievements unlocked yet.</p>}
                        {achievements.map(achId => {
                          const ach = ACHIEVEMENT_LIST.find(a => a.id === achId);
                          if (!ach) return null;
                          return (
                            <div key={ach.id} className="bg-osrs-bg border border-osrs-border p-3 rounded-lg flex items-center gap-3">
                              <div className="bg-osrs-gold p-2 rounded-full text-osrs-panel">
                                {ach.icon}
                              </div>
                              <div>
                                <h4 className="font-bold text-white text-sm">{ach.name}</h4>
                                <p className="text-xs text-osrs-accent">{ach.description}</p>
                                <p className="text-[10px] text-osrs-accent/50 mt-1">Unlocked!</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* History Column */}
                    <div>
                      <h3 className="text-lg font-bold text-osrs-gold mb-4 flex items-center gap-2">
                        <ScrollText size={18} /> Task History
                      </h3>
                      <div className="space-y-3">
                        {completedTasks.length === 0 && <p className="text-osrs-accent italic text-sm">No tasks completed yet.</p>}
                        {completedTasks.map((task, idx) => (
                          <div key={idx} className="bg-osrs-bg/50 border border-osrs-border p-3 rounded-lg flex justify-between items-center">
                            <div>
                              <span className="font-bold text-gray-200 block">{task.name}</span>
                              <span className="text-xs text-osrs-accent">{task.currentGoal} {task.metric}</span>
                            </div>
                            {task.multiplier > 1 && (
                              <span className="text-xs font-bold text-red-400 bg-red-900/20 px-2 py-1 rounded">x{task.multiplier}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---- Achievement Toast ---- */}
          {showAchievementModal && (
            <div className="fixed bottom-10 right-10 z-50 animate-in slide-in-from-bottom duration-500">
              <div className="bg-osrs-panel border-l-4 border-osrs-gold p-4 rounded shadow-2xl flex items-center gap-4 max-w-sm">
                <div className="bg-osrs-gold p-3 rounded-full text-osrs-panel shadow-lg">
                  {showAchievementModal.icon}
                </div>
                <div>
                  <h4 className="text-osrs-gold font-bold text-sm uppercase tracking-wider">Achievement Unlocked!</h4>
                  <p className="font-bold text-white text-lg">{showAchievementModal.name}</p>
                  <p className="text-sm text-osrs-accent">{showAchievementModal.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
