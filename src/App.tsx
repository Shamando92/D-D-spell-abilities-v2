import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Minus, 
  GripVertical,
  RotateCcw,
  UserPlus,
  Pencil,
  Save,
  Upload
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Types
type AbilityType = 
  | "Spell Slot" 
  | "Warlock Spell Slot" 
  | "Class/Race Ability" 
  | "Custom Ability" 
  | "Item";

type RechargeType = "Long Rest" | "Short Rest" | "None";

interface Ability {
  id: string;
  name: string;
  maxUsage: number;
  currentUsage: number;
  type: AbilityType;
  recharge: RechargeType;
}

interface Player {
  id: string;
  name: string;
  abilityIds: string[];
}

// Utility for tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Colors by Type
const TYPE_COLORS: Record<AbilityType, string> = {
  "Spell Slot": "bg-[#007BA7]", // Cerulean
  "Warlock Spell Slot": "bg-[#800080]", // Purple
  "Class/Race Ability": "bg-[#FFFF00]", // Yellow
  "Custom Ability": "bg-[#00FF00]", // Green
  "Item": "bg-[#00008B]", // Dark Blue
};

// Components
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  title: string; 
  children: React.ReactNode 
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#1c1c1e] border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-white mb-4">{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
};

interface SortableAbilityProps {
  key?: React.Key;
  ability: Ability;
  onUpdate: (updates: Partial<Ability>) => void;
  onDelete: () => void;
  onEdit: () => void;
}

const SortableAbility = ({ 
  ability, 
  onUpdate, 
  onDelete,
  onEdit
}: SortableAbilityProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ability.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  const colorClass = TYPE_COLORS[ability.type];

  const handleAdd = () => {
    if (ability.currentUsage < ability.maxUsage) {
      onUpdate({ currentUsage: ability.currentUsage + 1 });
    }
  };

  const handleSubtract = () => {
    if (ability.currentUsage > 0) {
      onUpdate({ currentUsage: ability.currentUsage - 1 });
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn(
        "flex items-center gap-2 group",
        isDragging && "opacity-50"
      )}
    >
      {/* Subtract Button */}
      <button 
        onClick={handleSubtract}
        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10 shadow-lg"
      >
        <Minus size={24} />
      </button>

      {/* Ability Card */}
      <div className="flex-1 bg-[#2c2c2e] border border-white/5 rounded-xl p-4 flex flex-col gap-3 relative min-w-[160px]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-white/20 hover:text-white/40">
              <GripVertical size={16} />
            </button>
            <span className="text-sm font-medium text-white truncate max-w-[100px]">{ability.name}</span>
          </div>
          <div className="flex gap-1">
            <button 
              onClick={onEdit}
              className="text-white/20 hover:text-blue-400 transition-colors"
            >
              <Pencil size={14} />
            </button>
            <button 
              onClick={onDelete}
              className="text-white/20 hover:text-red-500 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-white/40 font-semibold">
            <span>{ability.type}</span>
            <span>{ability.recharge !== "None" ? ability.recharge : ""}</span>
          </div>

          {/* Representation */}
          <div className="h-8 flex items-center justify-center">
            {ability.maxUsage <= 5 ? (
              <div className="flex gap-1.5 justify-center">
                {Array.from({ length: ability.maxUsage }).map((_, i) => (
                  <div 
                    key={i}
                    onClick={() => onUpdate({ currentUsage: i + 1 })}
                    className={cn(
                      "w-3 h-6 rounded-sm border border-white/10 transition-all duration-300 cursor-pointer",
                      i < ability.currentUsage ? colorClass : "bg-white/5"
                    )}
                  />
                ))}
              </div>
            ) : (
              <div 
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = e.clientX - rect.left;
                  const percentage = x / rect.width;
                  const newUsage = Math.round(percentage * ability.maxUsage);
                  onUpdate({ currentUsage: Math.max(0, Math.min(ability.maxUsage, newUsage)) });
                }}
                className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 cursor-pointer"
              >
                <div 
                  className={cn("h-full transition-all duration-500", colorClass)}
                  style={{ width: `${(ability.currentUsage / ability.maxUsage) * 100}%` }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-center mt-1">
            <span className="text-xs font-mono text-white/60">
              {ability.currentUsage} / {ability.maxUsage}
            </span>
          </div>
        </div>
      </div>

      {/* Add Button */}
      <button 
        onClick={handleAdd}
        className="w-10 h-10 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10 shadow-lg"
      >
        <Plus size={24} />
      </button>
    </div>
  );
};

export default function App() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [abilities, setAbilities] = useState<Record<string, Ability>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Modals
  const [isAddPlayerOpen, setIsAddPlayerOpen] = useState(false);
  const [isAddAbilityOpen, setIsAddAbilityOpen] = useState<{ playerId: string } | null>(null);
  const [isEditAbilityOpen, setIsEditAbilityOpen] = useState<{ abilityId: string } | null>(null);
  const [isDeleteConfirm, setIsDeleteConfirm] = useState<{ type: 'player' | 'ability', id: string, playerId?: string } | null>(null);

  // Form states
  const [newPlayerName, setNewPlayerName] = useState("");
  const [newAbility, setNewAbility] = useState<{
    name: string;
    maxUsage: string;
    type: AbilityType;
    recharge: RechargeType;
  }>({
    name: "",
    maxUsage: "",
    type: "Spell Slot",
    recharge: "Long Rest"
  });

  const [editMaxUsage, setEditMaxUsage] = useState<string>("");

  // Load from local storage
  useEffect(() => {
    const saved = localStorage.getItem('dnd-dm-dashboard');
    if (saved) {
      try {
        const { players, abilities } = JSON.parse(saved);
        setPlayers(players || []);
        setAbilities(abilities || {});
      } catch (e) {
        console.error("Failed to parse saved data", e);
      }
    }
  }, []);

  // Save to local storage
  useEffect(() => {
    localStorage.setItem('dnd-dm-dashboard', JSON.stringify({ players, abilities }));
  }, [players, abilities]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleAddPlayer = () => {
    if (!newPlayerName.trim()) return;
    const newPlayer: Player = {
      id: crypto.randomUUID(),
      name: newPlayerName.trim(),
      abilityIds: []
    };
    setPlayers([...players, newPlayer]);
    setNewPlayerName("");
    setIsAddPlayerOpen(false);
  };

  const handleAddAbility = () => {
    if (!isAddAbilityOpen || !newAbility.name.trim()) return;
    
    const player = players.find(p => p.id === isAddAbilityOpen.playerId);
    if (!player) return;

    // Check for duplicate name
    const playerAbilities = player.abilityIds.map(id => abilities[id]);
    if (playerAbilities.some(a => a.name.toLowerCase() === newAbility.name.toLowerCase())) {
      alert("An ability with this name already exists for this player.");
      return;
    }

    const maxUsageNum = parseInt(newAbility.maxUsage) || 1;
    const abilityId = crypto.randomUUID();
    const ability: Ability = {
      id: abilityId,
      name: newAbility.name,
      maxUsage: maxUsageNum,
      currentUsage: maxUsageNum,
      type: newAbility.type,
      recharge: newAbility.recharge
    };

    setAbilities(prev => ({ ...prev, [abilityId]: ability }));
    setPlayers(prev => prev.map(p => 
      p.id === isAddAbilityOpen.playerId 
        ? { ...p, abilityIds: [...p.abilityIds, abilityId] }
        : p
    ));

    setNewAbility({
      name: "",
      maxUsage: "",
      type: "Spell Slot",
      recharge: "Long Rest"
    });
    setIsAddAbilityOpen(null);
  };

  const handleEditAbility = () => {
    if (!isEditAbilityOpen) return;
    const newMax = parseInt(editMaxUsage) || 1;
    setAbilities(prev => ({
      ...prev,
      [isEditAbilityOpen.abilityId]: {
        ...prev[isEditAbilityOpen.abilityId],
        maxUsage: newMax,
        currentUsage: Math.min(prev[isEditAbilityOpen.abilityId].currentUsage, newMax)
      }
    }));
    setIsEditAbilityOpen(null);
  };

  const handleDelete = () => {
    if (!isDeleteConfirm) return;

    if (isDeleteConfirm.type === 'player') {
      const playerToDelete = players.find(p => p.id === isDeleteConfirm.id);
      if (playerToDelete) {
        setAbilities(prev => {
          const next = { ...prev };
          playerToDelete.abilityIds.forEach(id => delete next[id]);
          return next;
        });
        setPlayers(prev => prev.filter(p => p.id !== isDeleteConfirm.id));
      }
    } else if (isDeleteConfirm.type === 'ability' && isDeleteConfirm.playerId) {
      setPlayers(prev => prev.map(p => 
        p.id === isDeleteConfirm.playerId 
          ? { ...p, abilityIds: p.abilityIds.filter(id => id !== isDeleteConfirm.id) }
          : p
      ));
      setAbilities(prev => {
        const next = { ...prev };
        delete next[isDeleteConfirm.id];
        return next;
      });
    }
    setIsDeleteConfirm(null);
  };

  const handleRest = (type: "Long Rest" | "Short Rest") => {
    setAbilities(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(id => {
        if (next[id].recharge === type) {
          next[id].currentUsage = next[id].maxUsage;
        }
      });
      return next;
    });
  };

  const handleDragEnd = (event: DragEndEvent, playerId: string) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setPlayers(prev => prev.map(p => {
        if (p.id === playerId) {
          const oldIndex = p.abilityIds.indexOf(active.id as string);
          const newIndex = p.abilityIds.indexOf(over.id as string);
          return { ...p, abilityIds: arrayMove(p.abilityIds, oldIndex, newIndex) };
        }
        return p;
      }));
    }
  };

  const scrollToPlayer = (id: string) => {
    const element = document.getElementById(`player-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSave = () => {
    const data = JSON.stringify({ players, abilities }, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `dnd-dashboard-save-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleLoad = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const { players: loadedPlayers, abilities: loadedAbilities } = JSON.parse(content);
        if (Array.isArray(loadedPlayers) && loadedAbilities) {
          setPlayers(loadedPlayers);
          setAbilities(loadedAbilities);
        } else {
          alert("Invalid save file format.");
        }
      } catch (err) {
        console.error("Failed to load file", err);
        alert("Failed to load file. Make sure it's a valid JSON save.");
      }
    };
    reader.readAsText(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="min-h-screen bg-[#000000] text-white font-[-apple-system,BlinkMacSystemFont,'Segoe_UI',Roboto,Helvetica,Arial,sans-serif] selection:bg-blue-500/30">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur-md border-b border-white/10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <h1 className="text-2xl font-bold tracking-tight">DM Dashboard</h1>
              <div className="flex gap-2">
                <button 
                  onClick={handleSave}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors border border-white/10"
                >
                  <Save size={14} />
                  Save
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition-colors border border-white/10"
                >
                  <Upload size={14} />
                  Load
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleLoad} 
                  accept=".json" 
                  className="hidden" 
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleRest("Short Rest")}
                className="flex items-center gap-2 px-4 py-2 bg-[#2c2c2e] hover:bg-[#3a3a3c] rounded-full text-sm font-medium transition-colors border border-white/5"
              >
                <RotateCcw size={16} />
                Short Rest
              </button>
              <button 
                onClick={() => handleRest("Long Rest")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-full text-sm font-medium transition-colors shadow-lg shadow-blue-600/20"
              >
                <RotateCcw size={16} />
                Long Rest
              </button>
              <button 
                onClick={() => setIsAddPlayerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-white text-black hover:bg-white/90 rounded-full text-sm font-bold transition-colors"
              >
                <UserPlus size={16} />
                Add Player
              </button>
            </div>
          </div>

          {/* Player Navigation */}
          {players.length > 0 && (
            <nav className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
              {players.map(player => (
                <button 
                  key={player.id}
                  onClick={() => scrollToPlayer(player.id)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border border-white/5"
                >
                  {player.name}
                </button>
              ))}
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6 flex flex-col gap-12">
        {players.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-white/20">
              <UserPlus size={40} />
            </div>
            <div>
              <h2 className="text-xl font-semibold">No players added yet</h2>
              <p className="text-white/40 text-sm">Start by adding your party members to the dashboard.</p>
            </div>
            <button 
              onClick={() => setIsAddPlayerOpen(true)}
              className="mt-2 px-6 py-2 bg-white text-black rounded-full font-bold hover:bg-white/90 transition-colors"
            >
              Add Your First Player
            </button>
          </div>
        ) : (
          players.map(player => (
            <section key={player.id} id={`player-${player.id}`} className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-3xl font-bold tracking-tight">{player.name}</h2>
                  <button 
                    onClick={() => setIsAddAbilityOpen({ playerId: player.id })}
                    className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors border border-white/10"
                  >
                    <Plus size={18} />
                  </button>
                </div>
                <button 
                  onClick={() => setIsDeleteConfirm({ type: 'player', id: player.id })}
                  className="text-white/20 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              </div>

              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(e) => handleDragEnd(e, player.id)}
              >
                <SortableContext 
                  items={player.abilityIds}
                  strategy={rectSortingStrategy}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {player.abilityIds.map(id => (
                      <SortableAbility 
                        key={id} 
                        ability={abilities[id]} 
                        onUpdate={(updates) => setAbilities(prev => ({
                          ...prev,
                          [id]: { ...prev[id], ...updates }
                        }))}
                        onDelete={() => setIsDeleteConfirm({ type: 'ability', id, playerId: player.id })}
                        onEdit={() => {
                          setEditMaxUsage(abilities[id].maxUsage.toString());
                          setIsEditAbilityOpen({ abilityId: id });
                        }}
                      />
                    ))}
                    {player.abilityIds.length === 0 && (
                      <div className="col-span-full py-12 border-2 border-dashed border-white/5 rounded-2xl flex flex-col items-center justify-center text-white/20 gap-2">
                        <Plus size={24} />
                        <span className="text-sm font-medium">No abilities added</span>
                      </div>
                    )}
                  </div>
                </SortableContext>
              </DndContext>
            </section>
          ))
        )}
      </main>

      {/* Modals */}
      <Modal 
        isOpen={isAddPlayerOpen} 
        onClose={() => setIsAddPlayerOpen(false)} 
        title="Add New Player"
      >
        <div className="flex flex-col gap-4">
          <input 
            autoFocus
            type="text" 
            placeholder="Player Name" 
            className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddPlayer()}
          />
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setIsAddPlayerOpen(false)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddPlayer}
              className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors"
            >
              Add Player
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!isAddAbilityOpen} 
        onClose={() => setIsAddAbilityOpen(null)} 
        title="Add New Ability"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold ml-1">Name</label>
            <input 
              autoFocus
              type="text" 
              placeholder="e.g. Fireball, Rage, Healing Potion" 
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={newAbility.name}
              onChange={(e) => setNewAbility({ ...newAbility, name: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold ml-1">Max Usage</label>
              <input 
                type="text" 
                inputMode="numeric"
                placeholder="Empty"
                className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={newAbility.maxUsage}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || /^\d+$/.test(val)) {
                    setNewAbility({ ...newAbility, maxUsage: val });
                  }
                }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold ml-1">Type</label>
              <select 
                className="bg-[#2c2c2e] border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
                value={newAbility.type}
                onChange={(e) => {
                  const type = e.target.value as AbilityType;
                  setNewAbility({ 
                    ...newAbility, 
                    type,
                    recharge: type === "Item" ? "None" : newAbility.recharge
                  });
                }}
              >
                <option value="Spell Slot">Spell Slot</option>
                <option value="Warlock Spell Slot">Warlock Spell Slot</option>
                <option value="Class/Race Ability">Class/Race Ability</option>
                <option value="Custom Ability">Custom Ability</option>
                <option value="Item">Item</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold ml-1">Recharge</label>
            <div className="flex gap-2">
              {(["Short Rest", "Long Rest"] as const).map(r => (
                <button
                  key={r}
                  disabled={newAbility.type === "Item"}
                  onClick={() => setNewAbility({ ...newAbility, recharge: r })}
                  className={cn(
                    "flex-1 py-3 rounded-xl border transition-all text-sm font-medium",
                    newAbility.recharge === r 
                      ? "bg-blue-600 border-blue-500 text-white" 
                      : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10",
                    newAbility.type === "Item" && "opacity-20 cursor-not-allowed"
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => setIsAddAbilityOpen(null)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleAddAbility}
              className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors"
            >
              Add Ability
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!isEditAbilityOpen} 
        onClose={() => setIsEditAbilityOpen(null)} 
        title="Edit Maximum Usage"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] uppercase tracking-wider text-white/40 font-bold ml-1">New Max Usage</label>
            <input 
              autoFocus
              type="text" 
              inputMode="numeric"
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={editMaxUsage}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "" || /^\d+$/.test(val)) {
                  setEditMaxUsage(val);
                }
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleEditAbility()}
            />
          </div>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setIsEditAbilityOpen(null)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleEditAbility}
              className="flex-1 px-4 py-3 rounded-xl bg-white text-black font-bold hover:bg-white/90 transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={!!isDeleteConfirm} 
        onClose={() => setIsDeleteConfirm(null)} 
        title={`Delete ${isDeleteConfirm?.type === 'player' ? 'Player' : 'Ability'}`}
      >
        <div className="flex flex-col gap-4">
          <p className="text-white/60 text-sm">
            Are you sure you want to remove this {isDeleteConfirm?.type}? This action cannot be undone.
          </p>
          <div className="flex gap-2 mt-2">
            <button 
              onClick={() => setIsDeleteConfirm(null)}
              className="flex-1 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleDelete}
              className="flex-1 px-4 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-500 transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
