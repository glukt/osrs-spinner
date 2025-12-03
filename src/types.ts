export type MetricType = 'Kills' | 'XP' | 'Laps' | 'Actions';

export interface Task {
    id: string;
    name: string;
    color: string; // To distinguish slices
    minBase: number;
    maxBase: number;
    // The actual number displayed, affected by multiplier
    currentGoal: number;
    metric: MetricType;
    multiplier: number; // Starts at 1, goes to 2, 4, etc.
}

export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    unlockedAt?: number; // Timestamp
}
