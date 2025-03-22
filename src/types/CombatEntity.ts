import { CRIT_CHANCE_PER_AGI, CRIT_MULT_INITIAL, CRIT_MULT_PER_AGI, DMG_PER_AGI, DMG_PER_STR, HEALTH_PER_STR, MANA_PER_INT, MANA_REGEN_PER_INT } from "../globals";
import { hasFlag } from "../utils";
import { EffectFlag, EffectType, type Effect } from "./Effect";
import { addFloatingText } from "./FloatingText";
import { Container, type Equipment, type ItemStats } from "./Item";
import { SPRITES, type Sprite, type SpriteSet } from "./Sprite";

export type Attributes = {
	intelligence: number;
	strength: number;
	agility: number;
};

export type Player = {
	x: number
	xp: number
	gold: number
	variables: Record<string, any>
	quests: Record<string, boolean> // Quest ID -> Completed
	inventory: Container
	points: {
		attributesAvailable: number
		attributesAllocated: Attributes
		talent: number
	}
	sprite: {
		run: Sprite
	}
	combat: CombatEntity
	flip: boolean // determines orientation: true for left, false for right
}

export const critCheck = (value: number, combat: CombatEntity) => {
	if (Math.random() <= combat.critChance) {
		const critValue = Math.ceil(value * combat.critMultiplier);
		addFloatingText(critValue.toString(), combat, "crit-damage");
		return critValue;
	}
	addFloatingText(value.toString(), combat, "damage");
	return value;
}

export class CombatEntity {
	public health: number;
	public mana: number;
	public cooldowns: Record<string, number>; // Ability ID -> Cooldown
	public talents: Record<string, number>; // Talent ID -> Level
	public usedAbilities: string[];
	public equipment: Equipment;
	public sprite: SpriteSet;
	public effects: { 
		id: string,
		duration: number
	}[];

	// Made constructor private to enforce factory pattern
	private constructor(
		public id: string,
		public name: string,
		public level: number = 1,
		public attributes: Attributes = { intelligence: 0, strength: 0, agility: 0 },
		public spriteId: string,
		public attackSound: { id: string, volume: number, variations: number }
	) {
		// Initialize health and mana to max values
		this.health = this.maxHealth;
		this.mana = this.maxMana;
		this.cooldowns = {};
		this.talents = {};
		this.usedAbilities = [];
		this.equipment = { 
			weapon: Container.create(1), 
			armor: Container.create(1), 
			ring: Container.create(1), 
			amulet: Container.create(1) 
		};
		this.effects = [];		
		this.sprite = CombatEntity.getSpriteSet(spriteId);
	}

	totalEquipmentStat(stat: keyof ItemStats): number {
		if (!this.equipment) return 0;
		return Object.values(this.equipment).reduce((acc, container) => {
			const item = container.items[0];
			return acc + (item && item.stats && item.stats[stat] ? item.stats[stat] : 0);
		}, 0);
	}

	get strength(): number {
		return this.attributes.strength + this.totalEquipmentStat("strength");
	}

	get agility(): number {
		return this.attributes.agility + this.totalEquipmentStat("agility");
	}
	get intelligence(): number {
		return this.attributes.intelligence + this.totalEquipmentStat("intelligence");
	}

	// Calculated properties for max values
	get maxHealth(): number {
		return this.strength * HEALTH_PER_STR + this.totalEquipmentStat("health");
	}

	get maxMana(): number {
		return this.intelligence * MANA_PER_INT + this.totalEquipmentStat("mana");
	}

	get attackDamage(): number {
		return this.strength * DMG_PER_STR + Math.floor(this.agility * DMG_PER_AGI) + this.totalEquipmentStat("attackDamage");
	}

	get critChance(): number {
		return this.agility * CRIT_CHANCE_PER_AGI + this.totalEquipmentStat("critChance");
	}

	get critMultiplier(): number {
		return CRIT_MULT_INITIAL + this.agility * CRIT_MULT_PER_AGI + this.totalEquipmentStat("critMultiplier");
	}

	get manaRegen(): number {
		return this.intelligence * MANA_REGEN_PER_INT + this.totalEquipmentStat("manaRegen");
	}

	get xp(): number {
		return this.level * 60;
	}

	healthFix(): void {
		this.health = Math.min(this.maxHealth, this.health);
	}

	manaFix(): void {
		this.mana = Math.min(this.maxMana, this.mana);
	}

	resourcesFix(): void {
		this.healthFix();
		this.manaFix();
	}

	// Heal
	heal(amount: number): void {
		this.health += amount;
		this.healthFix();
		addFloatingText(`+${amount}`, this, "heal");
	}

	applyEffect(effect: Effect, duration: number, stacks: number = 1): void {
		const existingEffect = this.effects.find(e => e.id === effect.id);
		if (!existingEffect || hasFlag(effect.flags, EffectFlag.Stackable)) {
			for (let i = 0; i < stacks; i++) {
				this.effects.push({ id: effect.id, duration });
			}
		} else {
			existingEffect.duration = duration;
		}
		
		addFloatingText(`+[${effect.name}]`, this, effect.type === EffectType.Buff ? "buff" : "debuff");
	}

	// Factory method to create instances
	public static create(id: string, name: string, level: number, stats: Attributes, spriteId: string, attackSound: { id: string, volume: number, variations: number }): CombatEntity {
		return new CombatEntity(id, name, level, stats, spriteId, attackSound);
	}

	// Separate method for sprite validation/loading
	private static getSpriteSet(spriteId: string): SpriteSet {
		const sprite = SPRITES[spriteId];
		if (!sprite || !('idle' in sprite && 'attack' in sprite && 'hit' in sprite)) {
			throw new Error(`Invalid sprite ID: ${spriteId}`);
		}
		return sprite as SpriteSet;
	}
}