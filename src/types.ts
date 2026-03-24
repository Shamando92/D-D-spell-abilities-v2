export type AbilityType = 
  | "Spell Slot" 
  | "Warlock Spell Slot" 
  | "Class/Race Ability" 
  | "Custom Ability" 
  | "Item";

export type RechargeType = "Long Rest" | "Short Rest" | "None";

export interface Ability {
  id: string;
  name: string;
  maxUsage: number;
  currentUsage: number;
  type: AbilityType;
  recharge: RechargeType;
}

export interface Player {
  id: string;
  name: string;
  abilityIds: string[]; // For sorting
}

export interface AppState {
  players: Player[];
  abilities: Record<string, Ability>;
}
