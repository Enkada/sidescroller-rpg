export enum Window {
	Character,
	Inventory,
	TalentTree
}

export const hasFlag = (state: number | undefined, flag: number): boolean => ((state ?? 0) & flag) === flag;

export const getById = <T extends { id: string }>(array: T[], id: string): T => {
    return array.find(x => x.id === id) || array[0];
}

export const getXP = (level: number): number => level * 100;