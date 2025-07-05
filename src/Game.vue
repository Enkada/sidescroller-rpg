<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import { ABILITIES, AbilityFlag, type Ability } from './types/Ability';
import { SCREEN_WIDTH, SCREEN_HEIGHT, PLAYER_WIDTH, SCREEN_SWITCH_THRESHOLD, PLAYER_SPEED, COMBAT_RANGE, ANIMATION_SPEED, INTERACTION_RANGE, FOOTSTEP_COOLDOWN } from './globals';
import { CombatEntity, type Player } from './types/CombatEntity';
import EntityFrame from './components/EntityFrame.vue';
import AbilityButton from './components/AbilityButton.vue';
import { createSprite, SPRITES, type Sprite, type SpriteSet } from './types/Sprite';
import { getById, getXP, hasFlag, Window, playSound, SETTINGS, percentageValue, type ScreenObject, InteractionType, type ScreenEnemy, type Screen, toggleFullscreen, type SaveData, updateFPS, FRAMES_PER_SECOND } from './utils';
import { EffectFlag, EFFECTS, entityEffect, type Effect } from './types/Effect';
import { getTalentById, TalentType } from './types/Talent';
import TalentTree from './components/TalentTree.vue';
import PlayerInfo from './components/PlayerInfo.vue';
import { CHEST_LOOT_TABLE, Container, ContainerContext, createItem, generateLoot, GLOBAL_LOOT_TABLE, ITEMS, ItemType, type Item, type LootTable } from './types/Item';
import Inventory from './components/Inventory.vue';
import Shop from './components/Shop.vue';
import ItemContainer from './components/ItemContainer.vue';
import { addFloatingText, floatingText } from './types/FloatingText';
import { QUESTS, type Quest } from './types/Quest';
import QuestLog from './components/QuestLog.vue';
import QuestShowcase from './components/QuestShowcase.vue';
import Settings from './components/Settings.vue';
import ToolBar from './components/ToolBar.vue';
import FloatingTextList from './components/FloatingTextList.vue';
import { script, scriptIndex, scriptActor, scriptMessage, scriptMenu, parseArguments, getScriptLines, type ScriptMenuItem, type DialogueOption, DialogueType } from './types/Script';
import Dialogue from './components/Dialogue.vue';
import EquipmentUpgrade from './components/EquipmentUpgrade.vue';
import DevTools from './components/DevTools.vue';
import BuildInfo from './components/BuildInfo.vue';
import Guide from './components/Guide.vue';
import SaveLoad from './components/SaveLoad.vue';
import Tutorial from './components/Tutorial.vue';

const props = defineProps<{
    loadData?: SaveData | null
}>();

let lastFootstepTime = 0;

const windows = ref<Window[]>([]);
const windowWidth = ref(window.innerWidth);

const toggleWindow = (window: Window) => {
	if (windows.value.includes(window)) {
		closeWindow(window);
	} else {
		openWindow(window);
	}
}

const openWindow = (window: Window) => {
	const largeWindows = [
		Window.TalentTree,
		Window.DevTools,
		Window.Guide,
		Window.SaveLoad
	];

	// If opening large window, close all other windows
	if (largeWindows.includes(window)) {
		windows.value = [window];
		closeShop();
		closeLootMenu();
		return;
	}

	// If opening QuestLog, close Character window
	if (window === Window.Quest) {
		windows.value = windows.value.filter(w => w !== Window.Character);
	}

	// If opening Character, close QuestLog window
	if (window === Window.Character) {
		windows.value = windows.value.filter(w => w !== Window.Quest);
	}

	// Close large window when opening any other window
	windows.value = windows.value.filter(w => !largeWindows.includes(w));

	// Add the new window if it's not already open
	if (!windows.value.includes(window)) {
		windows.value.push(window);
	}
}

const closeWindow = (window: Window) => {
	windows.value = windows.value.filter(w => w !== window);
}

const isWindowOpen = (window: Window) => windows.value.includes(window);

const createScreenEnemy = (id: string, chance: number = 0.5, level: number = -1): ScreenEnemy => {
	return {
		id,
		chance,
		level
	}
}

enum CombatTurn {
	Player,
	Enemy,
	Pause
}

type Combat = {
	isInProgress: boolean
	turn: CombatTurn
	enemy: CombatEntity | null
	sprite: {
		player: {
			id: string
			start: number
		},
		enemy: {
			id: string
			start: number
		}
	}
}

const combat = reactive<Combat>({
	isInProgress: false,
	turn: CombatTurn.Player,
	enemy: null,
	sprite: {
		player: {
			id: "idle",
			start: 0
		},
		enemy: {
			id: "idle",
			start: 0
		}
	}
});

const createScreenObject = (name: string, sprite: Sprite, width: number, x: number[], y: number = 0): ScreenObject => {
	return {
		uuid: crypto.randomUUID(),
		name,
		width,
		x,
		y,
		sprite,
		interaction: InteractionType.None
	}
}

const ENEMIES: Record<string, {
	lootTable: LootTable
	combat: (level: number) => CombatEntity
}> = {
	fly: {
		lootTable: [
			{ item: "gold", chance: 1, level: 1, count: { min: 1, max: 10 } },
			{ item: "bug_meat", chance: .5, level: 1 },
		],
		combat: (level: number) => CombatEntity.create("fly", "Fly", level, {
			intelligence: 10,
			strength: 10 + (level - 1),
			agility: 10 + Math.floor(level / 2)
		}, "fly", { id: "attack_claw", volume: 1, variations: 3 })
	},
	spider: {
		lootTable: [
			{ item: "gold", chance: 1, level: 1, count: { min: 1, max: 10 } },
			{ item: "bug_meat", chance: .5, level: 1 },
		],
		combat: (level: number) => CombatEntity.create("spider", "Spider", level, {
			intelligence: 10,
			strength: 10 + (level - 1),
			agility: 10 + Math.floor(level / 2)
		}, "spider", { id: "attack_claw", volume: 1, variations: 3 })
	}
}

const shopContainer = ref<Container | undefined>(undefined);
const upgradeConsumable = ref<Item | undefined>(undefined);
const dialogueMenu = ref<DialogueOption[]>([]);
const nearestScreenObject = ref<ScreenObject | null>(null);
const questShowcaseId = ref<string | null>(null);

const SCREENS: Screen[] = [ // TODO: change to a Record
	{
		id: "initial_screen",
		name: "Initial Screen",
		background: "field_mountains.png",
		left: "forest_1",
		right: "cave_entrance",
		objects: [
			{
				...createScreenObject(
					"Girl",
					createSprite("./entity/girl.png", 512, 512, 40, 84), 460,
					[600], 40
				),
				interaction: InteractionType.Dialogue,
				dialogue: [
					{
						text: "Who are you?",
						type: DialogueType.Talk,
						script: "girl_greeting"
					},
					{
						type: DialogueType.QuestAccept,
						quest: getById(QUESTS, "gold_collector"),
						script: "quest/accept/gold_collector"
					},
					{
						type: DialogueType.QuestComplete,
						quest: getById(QUESTS, "gold_collector"),
						script: "quest/complete/gold_collector"
					},
					{
						type: DialogueType.QuestAccept,
						quest: getById(QUESTS, "fly_hunter"),
						script: "quest/accept/fly_hunter"
					},
					{
						type: DialogueType.QuestComplete,
						quest: getById(QUESTS, "fly_hunter"),
						script: "quest/complete/fly_hunter"
					}
				]
			},
			{
				...createScreenObject(
					"Some Guy",
					createSprite("./entity/halberd.png", 291, 267, 24), 320,
					[980], 80
				),
				interaction: InteractionType.Dialogue,
				dialogue: [
					{
						type: DialogueType.Shop,
							shop: Container.create(8, [
								createItem("axe"),
								createItem("health_potion"),
								createItem("ring_of_hell"),
							])
					},
					{
						text: "Ask about the land",
						type: DialogueType.Talk,
						isUnique: true,
						script: "old_man"
					}
				]
			},
		]
	},
	{
		id: "forest_1",
		name: "Forest",
		background: "forest.png",
		left: "forest_2",
		right: "initial_screen",
		enemies: [createScreenEnemy("fly", 0.5), createScreenEnemy("spider", 1)],
		objects: [		
			{
				...createScreenObject(
					"Chest",
					createSprite("./object/chest.png", 256, 256), 180,
					[SCREEN_WIDTH * 0.3], 40
				),
				interaction: InteractionType.Container,
				chance: 0.1,
				lootTable: CHEST_LOOT_TABLE
			},
			{
				...createScreenObject(
					"Fern",
					createSprite("./object/fern.png", 256, 256), 100,
					[SCREEN_WIDTH * 0.4, SCREEN_WIDTH * 0.6, SCREEN_WIDTH * 0.8], 40
				),
				interaction: InteractionType.Container,
				chance: 0.5,
				removeOnEmpty: true,
				container: Container.create(1, [
					createItem("fern")
				])
			}
		]
	},
	{
		id: "forest_2",
		name: "Forest",
		background: "forest_r.png",
		left: null,
		right: "forest_1",
		enemies: [createScreenEnemy("fly", 0.5), createScreenEnemy("spider", 1)]
	},
	{
		id: "field_1",
		name: "Field",
		background: "field.png",
		left: "cave_entrance",
		right: null,
		enemies: [createScreenEnemy("fly")]
	},
	{
		id: "cave_entrance",
		name: "Cave Entrance",
		background: "cave_entrance.png",
		left: "initial_screen",
		right: "field_1",
		enemies: [createScreenEnemy("fly")],		
		objects: [		
			{
				...createScreenObject(
					"Cave Entrance",
					createSprite("./object/cave_entrance.png", 280, 419), 280,
					[620 + 280 / 2], 0
				),
				interaction: InteractionType.Entrance,
				screen: "cave_1",
				screenX: SCREEN_SWITCH_THRESHOLD,
			}
		]
	},
	{
		id: "cave_1",
		name: "Cave Entrance",
		background: "cave.png",
		left: "cave_entrance",
		leftX: 620 + 280 / 2,
		right: null,
	}
];

const player = ref<Player>({
	x: 200,
	xp: 0,
	gold: 10,
	variables: {
		save_start_time: new Date().toISOString(),
	},
	quests: {
		// fly_hunter: false,
		// gold_collector: false
	},
	inventory: Container.create(16),
	points: {
		attributesAvailable: 3,
		attributesAllocated: {
			strength: 0,
			agility: 0,
			intelligence: 0
		},
		talent: 1
	},
	sprite: {
		run: createSprite("./entity/sara/run.png", 512, 512, 24, 36),
		idleUnarmed: createSprite("./entity/sara/idle_ooc.png", 512, 512, 24),
	},
	combat: CombatEntity.create(
		"player", 
		"Sara", 
		1, 
		{ intelligence: 10, strength: 10, agility: 10 }, 
		"sara", 
		{ id: "attack", volume: .8, variations: 4 }),
	flip: false
})

const processStartOfTurn = (combatEntity: CombatEntity) => {
	// Decrease cooldowns and remove if cooldown is 0
	if (combatEntity.cooldowns) {
		for (const ability in combatEntity.cooldowns) {
			if (combatEntity.cooldowns[ability] > 1) {
				combatEntity.cooldowns[ability]--;
			}
			else {
				delete combatEntity.cooldowns[ability];
			}
		}
	}

	// Reset used abilities
	combatEntity.usedActions = [];

	const skipTurn = combatEntity.effects.some((effect) => {
		return hasFlag(getById(EFFECTS, effect.id).flags, EffectFlag.SkipTurn);
	});

	return skipTurn;
}

const processEndOfTurn = (currentTurn: CombatTurn) => {
	const combatEntity = currentTurn === CombatTurn.Player ? player.value.combat : combat.enemy;
	if (!combatEntity) return;

	// Process effects 
	for (const entityEffect of combatEntity.effects) {
		const effect = getById(EFFECTS, entityEffect.id);

		processAction(ActionType.Effect, effect, entityEffect.caster, combatEntity);
	}

	// Check if enemy died from effects
	if (currentTurn === CombatTurn.Enemy && combat.enemy && combat.enemy.health <= 0) {
		combat.sprite.enemy.id = "death";
		combat.sprite.enemy.start = performance.now();

		setTimeout(() => {
			processEndOfCombat();
		}, combat.enemy.sprite.death.animationSpeed * combat.enemy.sprite.death.frameCount);
		return;
	}

	// Reduce effect durations
	if (combatEntity.effects) {
		for (const effect of combatEntity.effects) {
			if (effect.duration > 1) {
				effect.duration--;
			} else {
				combatEntity.effects = combatEntity.effects.filter(e => e.id !== effect.id);
				addFloatingText(`-[${getById(EFFECTS, effect.id).name}]`, combatEntity, "debuff");
			}
		}
	}

	combat.turn = currentTurn === CombatTurn.Player ? CombatTurn.Enemy : CombatTurn.Player;
}

watch(() => combat.turn, (newTurn, oldTurn) => {
	if (!combat.isInProgress) return;

	// Player start of turn logic
	if (newTurn === CombatTurn.Player && oldTurn !== CombatTurn.Player) {
		const skipTurn = processStartOfTurn(player.value.combat);

		if (skipTurn) {
			processEndOfTurn(CombatTurn.Player);
			return;
		}
	}

	// Enemy turn logic
	if (newTurn === CombatTurn.Enemy && oldTurn !== CombatTurn.Enemy && combat.enemy) {
		const skipTurn = processStartOfTurn(combat.enemy);

		if (skipTurn) {
			processEndOfTurn(CombatTurn.Enemy);
			return;
		}

		const ability = getById(ABILITIES, "attack");
		castAbility(ability, combat.enemy, player.value.combat);
	} else if (newTurn === CombatTurn.Player && oldTurn !== CombatTurn.Player && combat.enemy) {
		player.value.combat.mana = Math.min(player.value.combat.mana + player.value.combat.manaRegen, player.value.combat.maxMana);
	}
});

const lootMenu = ref<{
	isOpen: boolean;
	xp: number;
	container: Container;
	message: string;
}>({
	isOpen: false,
	xp: 0,
	container: Container.create(4),
	message: ""
});

const processEndOfCombat = () => {
	const enemy = { ...combat.enemy } as CombatEntity;
	const xp = combat.enemy?.xp || 0;

	lootMenu.value.isOpen = true;
	lootMenu.value.xp = xp;
	lootMenu.value.message = `You've defeated ${combat.enemy && combat.enemy.name } and received ${ lootMenu.value.xp } XP.`;
	
	lootMenu.value.container.items = [];
	const loot: Item[] = generateLoot([...screenEnemy.value?.lootTable || [], ...GLOBAL_LOOT_TABLE], player.value.combat.level);

	for (const item of loot) {
		lootMenu.value.container.add(item);
	}

	incrementVariable("kill", enemy.id);
	playSound("combat_end", 1);

	setTimeout(() => {
		player.value.xp += xp;
	}, 1000);
}

const endCombat = () => {
	combat.isInProgress = false;
	combat.enemy = null;
	combat.turn = CombatTurn.Player;

	screenEnemy.value = null;

	player.value.combat.effects = [];
	player.value.combat.armor = player.value.combat.maxArmor;

	closeLootMenu();
}

const closeLootMenu = () => {
	lootMenu.value.isOpen = false;
	lootMenu.value.xp = 0;

	if (
		nearestScreenObject.value && 
	 	nearestScreenObject.value.interaction === InteractionType.Container && 
		nearestScreenObject.value.container && 
		nearestScreenObject.value.container.items.length === 0 &&
		nearestScreenObject.value.removeOnEmpty &&
		currentScreen.value.objects
	) {
		currentScreen.value.objects = currentScreen.value.objects.filter(obj => obj.uuid !== nearestScreenObject.value?.uuid);
	}
}

// Watch xp for level up
watch(() => player.value.xp, (newXp) => {
	if (newXp >= getXP(player.value.combat.level)) {
		player.value.xp -= getXP(player.value.combat.level);
		player.value.combat.level++;

		playSound("levelup", 1);

		player.value.points.attributesAvailable += 3;
		player.value.points.talent++;
	}
})

const enum ActionType {
	Ability,
	Effect,
	Item
}

const enum DamageType {
	Physical,
	Magic
}

const useItem = (item: Item) => {
	if (['chisel', 'gem', 'enchantment'].includes(item.id)) {
		upgradeConsumable.value = item;
		openWindow(Window.EquipmentUpgrade);
	}
	else {
		processAction(ActionType.Item, item, player.value.combat, combat.enemy || player.value.combat);
		player.value.inventory.consume(item);
	}
}

const processAction = (type: ActionType, action: Ability | Effect | Item, caster: CombatEntity, target: CombatEntity) => {
	let physicalDamageCaster = 0;
	let physicalDamageTarget = 0;
	let magicDamageCaster = 0;
	let magicDamageTarget = 0;
	let healCaster = 0;
	let healTarget = 0;
	let manaCaster = 0;
	let manaTarget = 0;
	let critChance = 0;
	let isMiss = Math.random() <= (1 - (caster.accuracy - target.evasion));
	let effectsCaster: { id: string, duration: number, caster: CombatEntity }[] = [];
	let effectsTarget: { id: string, duration: number, caster: CombatEntity }[] = [];

	if (type === ActionType.Ability) {
		const ability = action as Ability;
		switch (ability.id) {
			case "attack":
			case "heavy_attack":
			case "morbid_strike":
				physicalDamageTarget = ability.values?.damage(caster);
				break;
			case "fireball":
				magicDamageTarget = ability.values?.damage(caster);
				break;
			case "precise_strike":
				physicalDamageTarget = ability.values?.damage(caster);
				critChance = ability.constants?.critChance || 0;
				break;
			case "heal":
				healCaster = ability.values?.heal(caster);
				break;
			case "stun":
				effectsTarget.push({ id: ability.constants?.effect, duration: ability.constants?.duration, caster });
				break;
			case "critical_focus":
				effectsCaster.push({ id: ability.constants?.effect, duration: ability.constants?.duration, caster });
				break;
			case "bleeding_strike":
				effectsTarget.push({ id: ability.constants?.effect, duration: ability.constants?.duration, caster });
				break;
			case "healing_touch":
				effectsCaster.push({ id: ability.constants?.effect, duration: ability.constants?.duration, caster });
				break;
		}
	}
	else if (type === ActionType.Effect) {
		const effect = action as Effect;
		isMiss = false;

		switch (effect.id) {
			case "regeneration":
				healCaster = effect.values?.heal(caster, target);
				break;
			case "bleeding":
				physicalDamageTarget = effect.values?.damage(caster, target);
				break;
		}
	}
	else if (type === ActionType.Item) {
		const item = action as Item;
		switch (item.id) {
			case "health_potion":
				healCaster = item.constants?.health || 0;
				break;
			case "mana_potion":
				manaCaster = item.constants?.mana || 0;
				break;
		}
		caster.usedActions.push(item.id);

		if (item.sound) {
			playSound(item.sound.id, item.sound.volume, item.sound.variations);
		}
	}

	const damage = (value: number, damageType: DamageType) => {
		if (value === 0) return 0;

		if (isCrit) {
			if (isMiss) {
				value = percentageValue(value, Math.max(0, 1 - (damageType === DamageType.Physical ? caster.physicalResistance : caster.magicResistance)));
				addFloatingText(value.toString(), caster, "damage");
				playSound(
					action.sound?.id || caster.attackSound.id, 
					action.sound?.volume || caster.attackSound.volume, 
					action.sound?.variations || caster.attackSound.variations
				);
				return value;
			}

			const critValue = percentageValue(Math.ceil(value * caster.critMultiplier), Math.max(0, 1 - (damageType === DamageType.Physical ? caster.physicalResistance : caster.magicResistance)));
			addFloatingText(critValue.toString(), caster, "crit-damage");
			playSound(
				action.sound?.id || caster.attackSound.id, 
				action.sound?.volume || caster.attackSound.volume, 
				action.sound?.variations || caster.attackSound.variations
			);
			playSound("crit", 1);
			return critValue;
		}

		if (isMiss) {
			addFloatingText("Miss", target, "miss");
			playSound("miss", .8, 3);
			return 0;
		}

		value = percentageValue(value, Math.max(0, 1 - (damageType === DamageType.Physical ? caster.physicalResistance : caster.magicResistance)));

		addFloatingText(value.toString(), caster, "damage");
		playSound(
			action.sound?.id || caster.attackSound.id, 
			action.sound?.volume || caster.attackSound.volume, 
			action.sound?.variations || caster.attackSound.variations
		);
		return value;
	}

	let isCrit = Math.random() <= (caster.critChance + critChance);

	caster.armor -= damage(physicalDamageCaster, DamageType.Physical) + damage(magicDamageCaster, DamageType.Magic);
	target.armor -= damage(physicalDamageTarget, DamageType.Physical) + damage(magicDamageTarget, DamageType.Magic);

	console.log("Caster armor after damage:", caster.armor);
	console.log("Target armor after damage:", target.armor);

	caster.health += Math.min(0, caster.armor);
	target.health += Math.min(0, target.armor);
	caster.heal(healCaster);
	target.heal(healTarget);
	caster.healMana(manaCaster);
	target.healMana(manaTarget);

	// Reset armor to 0 if it goes below 0
	caster.armor = Math.max(0, caster.armor);
	target.armor = Math.max(0, target.armor);

	for (const effect of effectsCaster) {	
		caster.applyEffect(caster, getById(EFFECTS, effect.id), effect.duration);
		if (action.sound) {
			playSound(action.sound.id, action.sound.volume, action.sound.variations);
		}
	}

	if (!isMiss || isCrit) {
		for (const effect of effectsTarget) {
			target.applyEffect(caster, getById(EFFECTS, effect.id), effect.duration);
			if (action.sound) {
				playSound(action.sound.id, action.sound.volume, action.sound.variations);
			}
		}
	}
	else if (effectsTarget.length) {
		addFloatingText("Miss", target, "miss");
		playSound("miss", .8, 3);
	}
}

const castAbility = (ability: Ability, caster: CombatEntity, target: CombatEntity) => {
	const processAbility = () => {
		processAction(ActionType.Ability, ability, caster, target);

		caster.mana = Math.max(0, caster.mana - ability.cost);

		if (ability.cooldown) {
			caster.cooldowns[ability.id] = ability.cooldown + 1;
		}

		caster.usedActions.push(ability.id);

		const isTargetAlive = target.health > 0;

		// Death animation
		if (!isTargetAlive) {
			combat.sprite[targetType].id = "death";
			combat.sprite[targetType].start = performance.now();

			// End of combat
			setTimeout(() => {
				processEndOfCombat();
			}, target.sprite.death.animationSpeed * target.sprite.death.frameCount);
		}

		return isTargetAlive;
	}

	const preserveTurn = hasFlag(ability.flags, AbilityFlag.PreserveTurn);
	combat.turn = preserveTurn ? combat.turn : CombatTurn.Pause;

	const casterType = caster === player.value.combat ? "player" : "enemy";
	const targetType = target === player.value.combat ? "player" : "enemy";

	const showAnimation = !hasFlag(ability.flags, AbilityFlag.NoAnimation);

	if (showAnimation) {
		// Animation for the caster
		combat.sprite[casterType].id = "attack";
		combat.sprite[casterType].start = performance.now();

		// Reset to idle after attack animation
		setTimeout(() => {
			combat.sprite[casterType].id = "idle";
			combat.sprite[casterType].start = performance.now();
		}, caster.sprite.attack.animationSpeed * caster.sprite.attack.frameCount);

		// Animation for the target being hit
		setTimeout(() => {
			combat.sprite[targetType].id = "hit";
			combat.sprite[targetType].start = performance.now();

			const isTargetAlive = processAbility();

			if (!isTargetAlive) return;

			setTimeout(() => {
				combat.sprite[targetType].id = "idle";
				combat.sprite[targetType].start = performance.now();

				if (!preserveTurn) {
					setTimeout(() => {
						processEndOfTurn(casterType === "player" ? CombatTurn.Player : CombatTurn.Enemy);
					}, 300);
				}
			}, target.sprite.hit.animationSpeed * (target.sprite.hit.frameCount - 1));
		}, caster.sprite.attack.animationSpeed * (caster.sprite.attack.frameCount - 8));
	}
	else {
		const isTargetAlive = processAbility();

		if (!isTargetAlive) return;

		if (!preserveTurn) {
			setTimeout(() => {
				processEndOfTurn(casterType === "player" ? CombatTurn.Player : CombatTurn.Enemy);
			}, 300);
		}
	}
}

// Canvas ref and context
const canvasRef = ref<HTMLCanvasElement | null>(null);
const contextRef = ref<CanvasRenderingContext2D | null>(null);
const initialTick = performance.now();
let animationFrameId: number | null = null;

const currentScreen = ref<Screen>({ ... SCREENS[0]});
const screenRandom = ref<number>(Math.random());
const screenEnemy = ref<{
	combat: CombatEntity
	lootTable: LootTable
	position: "left" | "right"
} | null>(null);

// --- Keyboard Input ---
const keys = {
	a: false,
	d: false,
	e: false,
	alt: false,
};

const onKeyDown = (e: KeyboardEvent) => {
	const key = e.key.toLowerCase();
	switch (key) {
		case 'a':
		case 'd':
		case 'e':
		case 'alt':
			e.preventDefault();
			keys[key] = true;
	}
};

const onKeyUp = (e: KeyboardEvent) => {
	const key = e.key.toLowerCase();
	console.log('key up', key);
	switch (key) {
		case 'a':
		case 'd':
		case 'e':
		case 'alt':
			e.preventDefault();
			keys[key] = false;
			break;
		case 'c':
			toggleWindow(Window.Character);
			break;
		case 'n':
			toggleWindow(Window.TalentTree);
			break;
		case 'b':
			toggleWindow(Window.Inventory);
			break;
		case 'l':
			toggleWindow(Window.Quest);
			break;
		case 'o':
			toggleWindow(Window.Settings);
			break;
		case 'u':
			toggleWindow(Window.EquipmentUpgrade);
			break;
		case '`':
			toggleWindow(Window.DevTools);
			break;
		case 'p':
			toggleWindow(Window.Guide);
			break;
		case 'i':
			if (!combat.isInProgress) {
				toggleWindow(Window.SaveLoad);
			}
			break;
		case 'f':
			if (e.shiftKey) {
				toggleFullscreen();
			}
			break;
		case 'g':
			player.value.inventory.add(createItem(ITEMS.filter(x => x.type !== ItemType.Armor).map(x => x.id)[Math.floor(Math.random() * ITEMS.filter(x => x.type !== ItemType.Armor).map(x => x.id).length)]));
			break;
		case 'h':
			player.value.inventory.add(createItem("enchantment"));
			break;
		case 'j':
			player.value.inventory.items = [];
			break;
	}
};

// --- Drawing function ---
const drawEntitySprite = (
	sprite: Sprite,
	x: number,
	y: number,
	width: number,
	flip: boolean = false,
	initialTick: number = 0,
	isFinite: boolean = false,
	isHighlighted: boolean = false,
	isShadowVisible: boolean = true
) => {
	const ctx = contextRef.value;
	const canvas = canvasRef.value;
	if (!ctx || !canvas) return;

	ctx.save();
	const tick = performance.now();
	const currentFrame =
		isFinite
			? Math.min(Math.floor((tick - initialTick) / sprite.animationSpeed), sprite.frameCount - 1)
			: Math.floor((tick - initialTick) / sprite.animationSpeed) % sprite.frameCount;
	const height = width * sprite.height / sprite.width;

	// Translate and flip if necessary
	ctx.translate(x, y);
	ctx.scale(flip ? -1 : 1, 1);
	ctx.translate(-x, -y);

	// Show shadow within bounds which is a darker version of the sprite
	if (SETTINGS.value.shadows && isShadowVisible) {
		ctx.save();
		ctx.globalAlpha = 0.3;
		ctx.filter = 'brightness(0) blur(2px)';
		const newX = x - width / 2;
		const newY = SCREEN_HEIGHT - y - height + sprite.bounds.y * width / sprite.width;
		ctx.translate(newX, newY);
		ctx.scale(1, -.5);
		ctx.translate(-newX, -newY);
		ctx.drawImage(
			sprite.image,
			sprite.width * currentFrame,
			sprite.bounds.y,
			sprite.width,
			sprite.height,
			newX,
			newY - 3 * (sprite.bounds.height * width / sprite.width) + 20,
			width,
			height
		);
		ctx.restore();
	}

	if (isHighlighted) {
		ctx.filter = 'drop-shadow(0 0 8px hsla(0, 0%, 100%, 0.4))';
	}

	ctx.drawImage(
		sprite.image,
		sprite.width * currentFrame,
		0,
		sprite.width,
		sprite.height,
		x - width / 2,
		SCREEN_HEIGHT - y - height, //720 - y - height + 20,
		width,
		height
	);
	ctx.restore();
}

const switchScreen = (screen: Screen, position: "left" | "right") => {
	screenEnemy.value = null;

	// Deep copy the screen and its objects
	const newScreen: Screen = {
		...screen,
		objects: screen.objects?.map(obj => ({
			...obj,
			x: [...obj.x],
			container: obj.container ? obj.container.copy() : undefined,
		}))
	};

	// Remove screen objects by chance
	newScreen.objects = newScreen.objects?.filter((entity: ScreenObject) => !entity.chance || Math.random() <= entity.chance);
	
	if (newScreen.objects) {
		for (const entity of newScreen.objects) {
			// Set screen objects x to a random position
			if (entity.x.length > 1) {
				entity.x = [entity.x[Math.floor(Math.random() * entity.x.length)]];
			}

			// Fill screen objects container with loot
			if (entity.lootTable) {
				if (!entity.container) {
					entity.container = Container.create(4, []);
				}
				let loot: Item[] = [];
				// Keep generating loot until at least one item is present
				while (loot.length === 0) {
					loot = generateLoot(entity.lootTable, player.value.combat.level);
				}
				for (const item of loot) {
					entity.container.add(item);
				}
			}
		}
	}	

	currentScreen.value = newScreen;
	screenRandom.value = Math.random();

	if (screen.enemies) {
		for (const enemy of screen.enemies.sort((a, b) => a.chance - b.chance)) {
			if (Math.random() < enemy.chance) {
				const level = enemy.level === -1 ? player.value.combat.level : enemy.level;
				const enemyData = ENEMIES[enemy.id];
				screenEnemy.value = {
					combat: enemyData.combat(level),
					lootTable: enemyData.lootTable,
					position
				}
				return;
			}
		}
	}
}

// --- Game Loop ---
function gameLoop() {
	if (!contextRef.value || !canvasRef.value) return;
	const ctx: CanvasRenderingContext2D = contextRef.value;
	ctx.imageSmoothingEnabled = SETTINGS.value.imageSmoothing;

	// Clear canvas
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	const outOfCombat = () => {
		const allowMovement = !dialogueMenu.value.length && !script.value && !lootMenu.value.isOpen;

		// Update Player Position based on keys
		if (allowMovement) {
			if (keys.a) {
				player.value.x -= PLAYER_SPEED(FRAMES_PER_SECOND.value);
				player.value.flip = true;
			}
			if (keys.d) {
				player.value.x += PLAYER_SPEED(FRAMES_PER_SECOND.value);
				player.value.flip = false;
			}
		}

		// Interaction with Screen Objects
		if (nearestScreenObject.value && keys.e && allowMovement) {

			if (nearestScreenObject.value.interaction === InteractionType.Dialogue && nearestScreenObject.value.dialogue) {
				// Filter out unique dialogue options that have already been seen and already accepted quests
				const filteredDialogue = nearestScreenObject.value.dialogue.filter(option => {
					if (option.type === DialogueType.Talk && option.isUnique && option.script) {
						return !player.value.variables[`script:${option.script}`];
					}
					if (option.type === DialogueType.QuestAccept && option.quest) {
						return !(option.quest.id in player.value.quests);
					}
					if (option.type === DialogueType.QuestComplete && option.quest) {
						// Check if quest is complete by verifying all objectives are met
						return option.quest.id in player.value.quests && 
							!player.value.quests[option.quest.id] && // Not already completed
							option.quest.objectives.every(obj => obj.condition.current(player.value) >= obj.condition.required);
					}
					return true;
				});

				if (filteredDialogue.length === 1 && filteredDialogue[0].type === DialogueType.Shop) {
					shopContainer.value = filteredDialogue[0].shop;
					openWindow(Window.Inventory);
				}
				else if (filteredDialogue.length === 1 && filteredDialogue[0].type === DialogueType.Talk) {
					runScript(filteredDialogue[0].script || "");
				}
				else {				
					dialogueMenu.value = filteredDialogue || [];
				}
			}
			else if (nearestScreenObject.value.interaction === InteractionType.Container) {
				lootMenu.value.isOpen = true;
				lootMenu.value.message = `You opened ${nearestScreenObject.value.name}.`;

				if (nearestScreenObject.value.container) {
					lootMenu.value.container = nearestScreenObject.value.container;
				}
			}
			else if (nearestScreenObject.value.interaction === InteractionType.Entrance && nearestScreenObject.value.screen) {
				const nextScreen = SCREENS.find(screen => screen.id === nearestScreenObject.value?.screen);
				if (nextScreen) {
					switchScreen(nextScreen, "left");
					player.value.x = nearestScreenObject.value.screenX ? nearestScreenObject.value.screenX : SCREEN_WIDTH / 2; // Reset player position to entrance
				}
			}
		}

		// Screen Switching
		if (player.value.x < SCREEN_SWITCH_THRESHOLD) {
			if (currentScreen.value.left) {
				const nextScreen = SCREENS.find(screen => screen.id === currentScreen.value.left);
				if (nextScreen) {
					const leftX = currentScreen.value.leftX;
					switchScreen(nextScreen, "left");
					player.value.x = leftX ? leftX : SCREEN_WIDTH - SCREEN_SWITCH_THRESHOLD; // appear on right side
				}
			} else {
				player.value.x = SCREEN_SWITCH_THRESHOLD;
			}
		}
		if (player.value.x > SCREEN_WIDTH - SCREEN_SWITCH_THRESHOLD) {
			if (currentScreen.value.right) {
				const nextScreen = SCREENS.find(screen => screen.id === currentScreen.value.right);
				if (nextScreen) {
					const rightX = currentScreen.value.rightX;
					switchScreen(nextScreen, "right");
					player.value.x = rightX ? rightX : SCREEN_SWITCH_THRESHOLD; // appear on left side
				}
			} else {
				player.value.x = SCREEN_WIDTH - SCREEN_SWITCH_THRESHOLD;
			}
		}

		// Combat start check
		if (screenEnemy.value && Math.abs(player.value.x - (screenEnemy.value.position === "left" ? 300 : SCREEN_WIDTH - 300)) < COMBAT_RANGE) {
			combat.isInProgress = true;
			combat.enemy = screenEnemy.value.combat;
			combat.turn = CombatTurn.Player;
			combat.sprite.player.id = "idle";
			combat.sprite.player.start = 0;
			combat.sprite.enemy.id = "idle";
			combat.sprite.enemy.start = 0;
			player.value.combat.usedActions = [];
			player.value.combat.cooldowns = {};

			playSound("combat_start", 1);

			applyAttributeAllocation();
			return;
		}

		// --- Draw Screen Entities ---
		currentScreen.value.objects?.forEach((entity: ScreenObject) => {
			drawEntitySprite(
				entity.sprite,
				entity.x[0],
				entity.y,
				entity.width,
				false,
				0,
				false,
				nearestScreenObject.value ? entity.uuid === nearestScreenObject.value.uuid : false,
				entity.interaction !== InteractionType.Entrance
			);
		});
		if (screenEnemy.value) {
			drawEntitySprite(
				screenEnemy.value.combat.sprite.idle,
				screenEnemy.value.position === "left" ? 300 : SCREEN_WIDTH - 300,
				SPRITES[screenEnemy.value.combat.spriteId].y,
				PLAYER_WIDTH,
				screenEnemy.value.position === "right"
			);
		}

		// Draw Player 
		// Use the run sprite when moving, idle otherwise. The sprite remains flipped if previously set.
		const isMoving = ((keys.a && !keys.d) || (!keys.a && keys.d)) && allowMovement;

		const currentTime = performance.now();

		if (isMoving && (currentTime - lastFootstepTime >= FOOTSTEP_COOLDOWN)) {
			playSound("footstep", .15, 7);
			lastFootstepTime = currentTime;
		}
		else if (!isMoving) {
			lastFootstepTime = 0;
		}

		const currentPlayerSprite = isMoving ? player.value.sprite.run : player.value.sprite.idleUnarmed;
		drawEntitySprite(
			currentPlayerSprite,
			player.value.x,
			SPRITES[player.value.combat.spriteId].y,
			PLAYER_WIDTH,
			player.value.flip
		);
	}

	const inCombat = () => {
		const drawPlayer = () => drawEntitySprite(
			player.value.combat.sprite[combat.sprite.player.id as keyof SpriteSet],
			SCREEN_WIDTH * 2 / 5,
			SPRITES[player.value.combat.spriteId].y,
			PLAYER_WIDTH,
			false,
			combat.sprite.player.start,
			combat.sprite.player.id === "death"
		);

		const drawEnemy = () => {
			if (!combat.enemy) return;
			drawEntitySprite(
				combat.enemy.sprite[combat.sprite.enemy.id as keyof SpriteSet],
				SCREEN_WIDTH * 3 / 5,
				SPRITES[combat.enemy.spriteId].y,
				PLAYER_WIDTH,
				true,
				combat.sprite.enemy.start,
				combat.sprite.enemy.id === "death"
			);
		}

		if (combat.turn === CombatTurn.Player) {
			drawEnemy();
			drawPlayer();
		} else {
			drawPlayer();
			drawEnemy();
		}
	}

	if (combat.isInProgress) {
		inCombat();
	} else {
		outOfCombat();
	}

	animationFrameId = requestAnimationFrame(gameLoop);
}

const regenInterval = ref<number | null>(null);

const startRegen = () => {
	if (regenInterval.value) return;
	regenInterval.value = setInterval(() => {
		if (!combat.isInProgress) {
			player.value.combat.health = Math.min(player.value.combat.health + 10, player.value.combat.maxHealth);
			player.value.combat.mana = Math.min(player.value.combat.mana + 10, player.value.combat.maxMana);
		}
	}, 2000);
};

const stopRegen = () => {
	if (regenInterval.value) {
		clearInterval(regenInterval.value);
		regenInterval.value = null;
	}
};

const buttonClick = (e: Event) => {
	if (e.target instanceof HTMLButtonElement || (e.target instanceof HTMLElement && e.target.classList.contains('btn'))) {
		playSound("button", .5);
	}
};

const handleResize = () => {
	windowWidth.value = window.innerWidth;
};

onMounted(() => {
	contextRef.value = canvasRef.value?.getContext('2d') || null;
	canvasRef.value?.addEventListener('contextmenu', event => event.preventDefault());
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	window.addEventListener('resize', handleResize);
	updateFPS(); // Initialize FPS
	
	// Update FPS periodically every 5 seconds
	const fpsUpdateInterval = setInterval(() => {
		updateFPS();
	}, 1000);
	
	gameLoop();
	startRegen();
	document.addEventListener('click', buttonClick);
	
	// Load game data if provided from main menu
	if (props.loadData) {
		loadGameData(props.loadData);
	}
	
	// Store interval reference for cleanup
	(window as any).fpsUpdateInterval = fpsUpdateInterval;
});

onBeforeUnmount(() => {
	if (animationFrameId) cancelAnimationFrame(animationFrameId);
	canvasRef.value?.removeEventListener('contextmenu', event => event.preventDefault());
	window.removeEventListener('keydown', onKeyDown);
	window.removeEventListener('keyup', onKeyUp);
	window.removeEventListener('resize', handleResize);
	stopRegen();
	document.removeEventListener('click', buttonClick);
	
	// Clean up FPS update interval
	if ((window as any).fpsUpdateInterval) {
		clearInterval((window as any).fpsUpdateInterval);
	}
});

watch(() => combat.isInProgress, (isInProgress) => {
	if (isInProgress) {
		stopRegen();
	} else {
		startRegen();
	}
});

watch(() => player.value.x, () => {
	let newNearest: ScreenObject | null = null;
	let nearestDistance = Infinity;

	for (const entity of currentScreen.value.objects ?? []) {

		const distance = Math.abs(player.value.x - entity.x[0]);
		if (
			distance < nearestDistance &&
			distance < INTERACTION_RANGE &&
			entity.interaction !== InteractionType.None
		) {
			newNearest = entity;
			nearestDistance = distance;
		}
	}

	nearestScreenObject.value = newNearest;
})

watch(() => nearestScreenObject.value, (newNearest, oldNearest) => {
	if (oldNearest && !newNearest) {
		closeShop();
	}
})

const applyAttributeAllocation = () => {
	player.value.points.attributesAllocated.strength = 0;
	player.value.points.attributesAllocated.agility = 0;
	player.value.points.attributesAllocated.intelligence = 0;
}

const getPlayerAbilities = (): Ability[] => {
	return [
		getById(ABILITIES, "attack"),
		...Object.keys(player.value.combat.talents)
			.filter(x => getTalentById(x).type === TalentType.Ability)
			.map(key => getById(ABILITIES, key) as Ability)
	];
}

const selectDialogueOption = (option: DialogueOption) => {
	if (option.shop) {
		shopContainer.value = option.shop;
		openWindow(Window.Inventory);
	}
	else if (option.script) {
		runScript(option.script);
	}
	dialogueMenu.value = [];
}

const closeShop = () => {
	shopContainer.value = undefined;
	closeWindow(Window.Inventory);
}

const takeAllLoot = () => {
	if (!lootMenu.value.container) return;

	[...lootMenu.value.container.items].forEach((item) => {
		if (item.id === 'gold') {
			player.value.gold += item.count || 1;
			lootMenu.value.container.remove(item);
		}
		else {
			lootMenu.value.container.move(item, player.value.inventory);
		}
	});

	if (combat.isInProgress) {
		endCombat();
	} else {
		closeLootMenu();
	}	
}

const incrementVariable = (type: string, name: string) => {
	player.value.variables[`${type}:${name}`] = (player.value.variables[`${type}:${name}`] || 0) + 1;
}

const loadGameData = (data: SaveData) => {
	// Update player data while preserving object references
	Object.assign(player.value, data.player);
	
	// Update current screen
	Object.assign(currentScreen.value, data.currentScreen);
	
	// Update screen random
	screenRandom.value = data.screenRandom;
	
	// Update screen enemy
	screenEnemy.value = data.screenEnemy;
	
	// Fix resources after loading
	player.value.combat.resourcesFix();

	closeWindow(Window.SaveLoad);
};

// Script Start
function scriptNextLine() {
	if (scriptMenu.value.length !== 0) return;

	let nextIndex = scriptIndex.value + 1;
	const line = getScriptLines()[scriptIndex.value + 1];
	const args = parseArguments(line);

	const exit = () => {
		script.value = '';
		scriptIndex.value = -1;
	}

	const _goto = (label: string) => {
		const labelIndex = getScriptLines().findIndex(line => line.includes(`label ${label}`));
		nextIndex = labelIndex;
	}

	const menu = (json: string) => {
		const menuItems = JSON.parse(json.replace(/'/g, '"').replace("&apos;", "'"));
		scriptMenu.value = menuItems.filter((item: ScriptMenuItem & { condition: string }) =>
			!("condition" in item) || eval(`${item.condition}`) === true
		).map((item: ScriptMenuItem) => ({
			label: item.label,
			title: item.title
		}));
	}

	const quest = (questId: string) => {
		player.value.quests[questId] = false;
		questShowcaseId.value = null;
		playSound("quest_accept", 1);
	}

	const quest_reward = (questId: string) => {
		const quest = getById(QUESTS, questId);
		if (!quest) return;

		// Add XP
		player.value.xp += quest.xp;

		// Add items from reward container
		if (quest.reward) {
			[...quest.reward.items].forEach(item => {
				if (item.id === 'gold') {
					player.value.gold += item.count || 1;
				} else {
					player.value.inventory.add(item);
				}
			});
		}

		// Mark quest as completed
		player.value.quests[questId] = true;
		playSound("quest_complete", 1);
	}

	const say = (message: string) => {
		console.log('say', message);
		scriptMessage.value = message;
	}

	const name = (name: string) => {
		scriptActor.value = name;
	}

	const label = () => { }	

	const quest_showcase = (questId: string) => {
		questShowcaseId.value = questId;
	}

	const quest_showcase_hide = () => {
		questShowcaseId.value = null;
	}

	if (args.length > 0) {
		const command = args[0];
		console.log('eval', `${command}(\`${args.slice(1).join('\`, \`')}\`)`);
		eval(`${command}(\`${args.slice(1).join('\`, \`')}\`)`);
	}

	scriptIndex.value = nextIndex;
}

watch(scriptIndex, () => {
	if (scriptIndex.value === -1) {
		scriptNextLine();
		return;
	}

	if (["eval", "label", "name", "quest_reward", "quest_showcase", "quest_showcase_hide", "quest_complete", "quest", "quest_showcase_hide"].includes(parseArguments(getScriptLines()[scriptIndex.value])[0])) {
		scriptNextLine();
	}
});

const runScript = async (name: string) => {
	const response = await fetch(`/script/${name}`);

	incrementVariable("script", name);

	script.value = await response.text();
	scriptIndex.value = -1;
	scriptActor.value = '';
	scriptMessage.value = '';
	scriptMenu.value = [];

	scriptNextLine();
};
// Script End
</script>

<template>
	<div class="game" :style="{ 
			backgroundImage: `url('/bg/${currentScreen.background}')`, 
			width: `${SCREEN_WIDTH}px`, 
			height: `${SCREEN_HEIGHT}px`, 
			'--scale-factor': windowWidth / SCREEN_WIDTH,
		}">
		<canvas ref="canvasRef" class="canvas" :width="SCREEN_WIDTH" :height="SCREEN_HEIGHT"></canvas>
		<div class="ui">
			<BuildInfo />
			<EntityFrame :entity="player.combat" :player="player"
				:showXPBar="!combat.isInProgress || lootMenu.isOpen" />
			<EntityFrame v-if="combat.enemy" :entity="combat.enemy" :isEnemy="true" />
			<template v-if="combat.isInProgress && combat.turn === CombatTurn.Player && combat.enemy">
				<div class="ability-list debug">
					<AbilityButton v-for="ability in ABILITIES" :ability="ability" :player="player.combat"
						:enemy="combat.enemy" :castAbility="castAbility" :key="ability.name" />
				</div>
				<div class="ability-list">
					<AbilityButton v-for="ability in getPlayerAbilities()" :ability="ability" :player="player.combat"
						:enemy="combat.enemy" :castAbility="castAbility" :key="ability.name" />
				</div>
			</template>
			<div class="loot-menu" v-if="lootMenu.isOpen">
				<div class="loot-menu__message">{{ lootMenu.message }}</div>
				<ItemContainer :container="lootMenu.container" :context="ContainerContext.Loot" :player="player" />
				<button v-if="combat.isInProgress" @click="takeAllLoot">Take All and Continue</button>
				<button v-else @click="takeAllLoot">Take All</button>
				<button v-if="combat.isInProgress" @click="endCombat">Continue</button>
				<button v-else @click="closeLootMenu">Close</button>
			</div>
			<Tutorial :player="player" />
			<TalentTree v-if="isWindowOpen(Window.TalentTree)" :player="player" @close="closeWindow(Window.TalentTree)" />
			<EquipmentUpgrade v-if="isWindowOpen(Window.EquipmentUpgrade) && upgradeConsumable" :player="player" :consumable="upgradeConsumable" @close="closeWindow(Window.EquipmentUpgrade)" />
			<Inventory v-if="isWindowOpen(Window.Inventory)" :player="player" @close="closeWindow(Window.Inventory)"
				:shopContainer="shopContainer" :enemy="combat.enemy || undefined" @useItem="useItem" />
			<Shop v-if="shopContainer" :player="player" :shopContainer="shopContainer" @close="closeShop" />
			<PlayerInfo v-if="isWindowOpen(Window.Character)" :player="player" @close="closeWindow(Window.Character)"
				:combat="combat" :applyAttributeAllocation="applyAttributeAllocation" />
			<QuestLog v-if="isWindowOpen(Window.Quest)" :player="player" @close="closeWindow(Window.Quest)" />
			<QuestShowcase v-if="questShowcaseId" :questId="questShowcaseId" :player="player" />
			<Settings v-if="isWindowOpen(Window.Settings)" @close="closeWindow(Window.Settings)" />
			<DevTools v-if="isWindowOpen(Window.DevTools)" @close="closeWindow(Window.DevTools)" :player="player" :enemies="ENEMIES" :screens="SCREENS"/>
			<Guide v-if="isWindowOpen(Window.Guide)" @close="closeWindow(Window.Guide)" />
			<SaveLoad v-if="isWindowOpen(Window.SaveLoad)" @close="closeWindow(Window.SaveLoad)" @load="loadGameData" :player="player" :currentScreen="currentScreen" :screenRandom="screenRandom" :screenEnemy="screenEnemy" />
			<FloatingTextList :texts="floatingText" />
			<ToolBar :windows="windows" @toggleWindow="toggleWindow" :disabledWindows="combat.isInProgress ? [Window.SaveLoad] : undefined"/>

			<!-- Interaction with Screen Objects -->
			<div class="dialogue__menu" v-if="dialogueMenu.length">
				<div v-for="(option, i) in dialogueMenu" class="dialogue__menu__item btn" :style="{ '--index': i }"
					@click="selectDialogueOption(option)">
					{{ option.type === DialogueType.Shop ? '💰 Shop' : option.type === DialogueType.QuestAccept ? `❗${option.quest?.title}` : option.type === DialogueType.QuestComplete ? `✔️ ${option.quest?.title}` : option.text }}
				</div>
				<div @click="dialogueMenu = []" class="dialogue__menu__item btn" :style="{ '--index': dialogueMenu.length }" >Return</div>
			</div>

			<Dialogue 
				v-if="script !== ''" 
				:onNextLine="scriptNextLine" 
			/>
		</div>
	</div>
</template>

<style lang="scss">
.game {
	//width: 1280px;
	//height: 720px;
	//outline: 1px solid yellow;
	image-rendering: pixelated;
	background-size: cover;
	position: relative;
	scale: 1;
}

.dialogue-menu {
	display: grid;
	position: absolute;
	gap: .5em;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

.ui {
	position: absolute;
	inset: 0;
	box-shadow: inset 0 0 24px 0px rgba(0, 0, 0, 0.5);
	overflow: hidden;
}

pre {
	text-shadow: 1px 1px 1px black;
	position: absolute;
	left: 50%;
}

.ability-list {
	position: absolute;
	bottom: 2em;
	left: 2em;
	display: flex;
	gap: .5em;
	width: 300px;
	flex-wrap: wrap;

	&.debug {
		bottom: 300px;
		opacity: 0;
		transition: opacity 0.3s ease;

		&:hover {
			opacity: 1;
		}
	}

	animation: slideRight .5s ease;
}

.loot-menu {
	position: absolute;
	display: grid;
	gap: .5em;
	padding: 1em;
	left: calc(50% - 160px);
	top: 4em;
	width: 320px;
	background-image: url("/ui/bg.jpg");
	border: var(--ui-border-width) solid var(--clr-ui-border);

	animation: scaleIn 1s ease;
	transform-origin: center;
}
</style>
