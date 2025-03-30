import { ACCURACY_INITIAL, ACCURACY_PER_AGI, CRIT_CHANCE_PER_AGI, CRIT_MULT_INITIAL, CRIT_MULT_PER_AGI, DMG_PER_AGI, DMG_PER_STR, EVASION_INITIAL, EVASION_PER_AGI, HEALTH_PER_STR, MAGIC_RESISTANCE_INITIAL, MANA_PER_INT, MANA_REGEN_PER_INT, PHYSICAL_RESISTANCE_INITIAL } from "../globals";
import { hasFlag } from "../utils";
import { EffectFlag, EffectType, entityEffect, type Effect } from "./Effect";
import { addFloatingText } from "./FloatingText";
import { Container, createItem, type Equipment, type ItemStats } from "./Item";
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
		idleUnarmed: Sprite
	}
	combat: CombatEntity
	flip: boolean // determines orientation: true for left, false for right
}

export class CombatEntity {
	public health: number;
	public mana: number;
	public cooldowns: Record<string, number>; // Ability ID -> Cooldown
	public talents: Record<string, number>; // Talent ID -> Level
	public usedActions: string[];
	public equipment: Equipment;
	public sprite: SpriteSet;
	public effects: { 
		id: string,
		duration: number,
		caster: CombatEntity
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
		this.usedActions = [];
		this.equipment = { 
			weapon: Container.create(1), 
			armor: Container.create(5, [
				createItem("shoulder_pads"),
				createItem("chestplate"),
				createItem("gloves"),
				createItem("pants"),
				createItem("boots")
			]), 
			ring: Container.create(2), 
			amulet: Container.create(1),
			relic: Container.create(2)
		};
		this.effects = [];		
		this.sprite = CombatEntity.getSpriteSet(spriteId);
	}

	totalEquipmentStat(stat: keyof ItemStats): number {
		if (!this.equipment) return 0;
		return Object.values(this.equipment).reduce((acc, container) => {
			return acc + container.items.reduce((itemAcc, item) => {
				const statValue = (item?.stats?.[stat] || 0) + (item?.enchantmentStats?.[stat] || 0);
				return itemAcc + statValue;
			}, 0);
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
		return this.agility * CRIT_CHANCE_PER_AGI + this.totalEquipmentStat("critChance")
			+ (entityEffect(this, "critical_chance")?.constants?.critChance || 0);
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

	get evasion(): number {
		return EVASION_INITIAL + this.agility * EVASION_PER_AGI + this.totalEquipmentStat("evasion");
	}

	get accuracy(): number {
		return ACCURACY_INITIAL + this.agility * ACCURACY_PER_AGI + this.totalEquipmentStat("accuracy");
	}

	get magicResistance(): number {
		return MAGIC_RESISTANCE_INITIAL + this.totalEquipmentStat("magicResistance");
	}

	get physicalResistance(): number {
		return PHYSICAL_RESISTANCE_INITIAL + this.totalEquipmentStat("physicalResistance");
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
		if (amount === 0) return;
		this.health += amount;
		this.healthFix();
		addFloatingText(`+${amount}`, this, "heal");
	}

	// Heal mana
	healMana(amount: number): void {
		if (amount === 0) return;
		this.mana += amount;
		this.manaFix();
		addFloatingText(`+${amount}`, this, "mana");
	}

	applyEffect(caster: CombatEntity, effect: Effect, duration: number, stacks: number = 1): void {
		const existingEffect = this.effects.find(e => e.id === effect.id);
		if (!existingEffect || hasFlag(effect.flags, EffectFlag.Stackable)) {
			for (let i = 0; i < stacks; i++) {
				this.effects.push({ id: effect.id, duration, caster });
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