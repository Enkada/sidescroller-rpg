import { hasFlag } from "../utils";
import { EffectFlag, type Effect } from "./Effect";
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

export class CombatEntity {
	public health: number;
	public mana: number;
	public cooldowns: Record<string, number>; // Ability ID -> Cooldown
	public talents: Record<string, number>; // Talent ID -> Level
	public usedAbilities: string[];
	public effects: { 
		id: string,
		duration: number
	}[];

	// Made constructor private to enforce factory pattern
	private constructor(
		public name: string,
		public level: number = 1,
		public attributes: Attributes = { intelligence: 0, strength: 0, agility: 0 },
		public sprite: SpriteSet
	) {
		// Initialize health and mana to max values
		this.health = this.maxHealth;
		this.mana = this.maxMana;
		this.cooldowns = {};
		this.talents = {};
		this.usedAbilities = [];
		this.effects = [];
	}

	// Calculated properties for max values
	get maxHealth(): number {
		return this.attributes.strength * 10;
	}

	get maxMana(): number {
		return this.attributes.intelligence * 10;
	}

	get attackDamage(): number {
		return this.attributes.strength * 2;
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
	}

	// Factory method to create instances
	public static create(name: string, level: number, stats: Attributes, spriteId: string): CombatEntity {
		const sprite = this.getSpriteSet(spriteId);
		return new CombatEntity(name, level, stats, sprite);
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