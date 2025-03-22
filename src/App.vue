<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import { ABILITIES, AbilityFlag, type Ability } from './types/Ability';
import { SCREEN_WIDTH, SCREEN_HEIGHT, PLAYER_WIDTH, SCREEN_SWITCH_THRESHOLD, PLAYER_SPEED, COMBAT_RANGE, ANIMATION_SPEED, INTERACTION_RANGE, FOOTSTEP_COOLDOWN } from './globals';
import { CombatEntity, critCheck, type Player } from './types/CombatEntity';
import EntityFrame from './components/EntityFrame.vue';
import AbilityButton from './components/AbilityButton.vue';
import { createSprite, SPRITES, type Sprite, type SpriteSet } from './types/Sprite';
import { getById, getXP, hasFlag, Window, playSound, SETTINGS } from './utils';
import { EffectFlag, EFFECTS } from './types/Effect';
import { getTalentById, TalentType } from './types/Talent';
import TalentTree from './components/TalentTree.vue';
import PlayerInfo from './components/PlayerInfo.vue';
import { Container, ContainerContext, createItem, generateLoot, GLOBAL_LOOT_TABLE, ITEMS, type Item, type LootTable } from './types/Item';
import Inventory from './components/Inventory.vue';
import Shop from './components/Shop.vue';
import ItemContainer from './components/ItemContainer.vue';
import { addFloatingText, floatingText } from './types/FloatingText';
import { QUESTS, type Quest } from './types/Quest';
import QuestLog from './components/QuestLog.vue';
import QuestShowcase from './components/QuestShowcase.vue';
import Settings from './components/Settings.vue';
let lastFootstepTime = 0;

const windows = ref<Window[]>([]);

const toggleWindow = (window: Window) => {
	if (windows.value.includes(window)) {
		closeWindow(window);
	} else {
		openWindow(window);
	}
}

const openWindow = (window: Window) => {
	// If opening Talents, close all other windows
	if (window === Window.TalentTree) {
		windows.value = [Window.TalentTree];
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

	// Close Talents window when opening any other window
	windows.value = windows.value.filter(w => w !== Window.TalentTree);

	// Add the new window if it's not already open
	if (!windows.value.includes(window)) {
		windows.value.push(window);
	}
}

const closeWindow = (window: Window) => {
	windows.value = windows.value.filter(w => w !== window);
}

const isWindowOpen = (window: Window) => windows.value.includes(window);

const questShowcaseId = ref<string | null>(null);

type Screen = {
	id: string
	name: string
	background: string
	left: string | null
	right: string | null
	objects?: ScreenObject[]
	enemies?: ScreenEnemy[]
}

type ScreenEnemy = {
	id: string 		// id of ENEMIES
	chance: number 	// 0.0 - 1.0 chance to spawn
	level: number 	// -1 - equals player level, 1+ - exact level
}

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

enum InteractionType {
	None,
	Entrance,
	Dialogue
}

enum DialogueType {
	Shop,
	Talk,
	QuestAccept,
	QuestComplete
}

type DialogueOption = {
	type: DialogueType

	// DialogueType.Shop
	shop?: Container

	// DialogueType.Talk
	text?: string

	// DialogueType.Talk, DialogueType.QuestAccept, DialogueType.QuestComplete
	script?: string
	isUnique?: boolean

	// DialogueType.QuestAccept, DialogueType.QuestComplete
	quest?: Quest
}

type ScreenObject = {
	uuid: string
	name: string
	x: number
	y: number
	sprite: Sprite
	width: number
	interaction: InteractionType
	dialogue?: DialogueOption[]
}

const setScreenObjectDialogue = (screenObject: ScreenObject, dialogue: DialogueOption[]): ScreenObject => {
	screenObject.interaction = InteractionType.Dialogue;
	screenObject.dialogue = dialogue;
	return screenObject;
}

const createScreenObject = (name: string, sprite: Sprite, width: number, x: number, y: number = 0): ScreenObject => {
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
			{ item: "bone", chance: .5, level: 1 },
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
			{ item: "bone", chance: .5, level: 1 },
		],
		combat: (level: number) => CombatEntity.create("spider", "Spider", level, {
			intelligence: 10,
			strength: 10 + (level - 1),
			agility: 10 + Math.floor(level / 2)
		}, "spider", { id: "attack_claw", volume: 1, variations: 3 })
	}
}

const shopContainer = ref<Container | undefined>(undefined);
const dialogueMenu = ref<DialogueOption[]>([]);
const nearestScreenObject = ref<ScreenObject | null>(null);

const SCREENS: Screen[] = [ // TODO: change to a Record
	{
		id: "initial_screen",
		name: "Initial Screen",
		background: "Summer1.png",
		left: "left_screen",
		right: "right_screen",
		objects: [
		setScreenObjectDialogue(
				createScreenObject(
					"Girl",
					createSprite("./entity/girl.png", 512, 512, 40), 460,
					600, 40
				),
				[
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
			),
			setScreenObjectDialogue(
				createScreenObject(
					"Some Guy",
					createSprite("./entity/halberd.png", 291, 267, 24), 320,
					980, 80
				),
				[
					{
						type: DialogueType.Shop,
						shop: Container.create(8, [
							createItem("simple_axe"),
							createItem("simple_armor"),
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
			)
		]
	},
	{
		id: "left_screen",
		name: "Left Screen",
		background: "Summer6.png",
		left: null,
		right: "initial_screen",
		enemies: [createScreenEnemy("fly", 0.5), createScreenEnemy("spider", 1)]
	},
	{
		id: "right_screen",
		name: "Right Screen",
		background: "Summer5.png",
		left: "initial_screen",
		right: null,
		enemies: [createScreenEnemy("fly")]
	}
];

const player = ref<Player>({
	x: 200,
	xp: 0,
	gold: 10,
	variables: {},
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
		talent: 3
	},
	sprite: {
		run: createSprite("./entity/player/run.png", 512, 512, 16),
	},
	combat: CombatEntity.create(
		"player", 
		"Sara", 
		1, 
		{ intelligence: 10, strength: 10, agility: 10 }, 
		"player", 
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
	combatEntity.usedAbilities = [];

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

		if (effect.id === "regeneration") {
			const heal = getById(ABILITIES, "healing_touch").values?.heal(combatEntity);
			combatEntity.heal(heal);
		}
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

const postCombat = ref<{
	isOpen: boolean;
	xp: number;
	loot: Container;
}>({
	isOpen: false,
	xp: 0,
	loot: Container.create(4)
});

const processEndOfCombat = () => {
	const enemy = { ...combat.enemy } as CombatEntity;
	const xp = combat.enemy?.xp || 0;

	postCombat.value.isOpen = true;
	postCombat.value.xp = xp;

	const loot: Item[] = generateLoot([...screenEnemy.value?.lootTable || [], ...GLOBAL_LOOT_TABLE], player.value.combat.level);

	for (const item of loot) {
		postCombat.value.loot.add(item);
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

	postCombat.value.isOpen = false;
	postCombat.value.xp = 0;
	postCombat.value.loot.items = [];
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

const castAbility = (ability: Ability, caster: CombatEntity, target: CombatEntity) => {
	const processAbility = () => {
		switch (ability.id) {
			case "attack":
			case "heavy_attack":
			case "morbid_strike":
				target.health -= critCheck(ability.values?.damage(caster), caster);
				break;
			case "heal":
				const heal = ability.values?.heal(caster);
				caster.heal(heal);
				break;
			case "stun":
				target.applyEffect(getById(EFFECTS, ability.constants?.effect), ability.constants?.duration);
				break;
			case "healing_touch":
				caster.applyEffect(getById(EFFECTS, ability.constants?.effect), ability.constants?.duration);
				break;
		}

		caster.mana = Math.max(0, caster.mana - ability.cost);

		if (ability.cooldown) {
			caster.cooldowns[ability.id] = ability.cooldown + 1;
		}

		caster.usedAbilities.push(ability.id);

		const isTargetAlive = target.health > 0;

		// Death animation
		if (!isTargetAlive) {
			combat.sprite[targetType].id = "death";
			combat.sprite[targetType].start = performance.now();

			// End of combat
			setTimeout(() => {
				processEndOfCombat();
			}, ANIMATION_SPEED * target.sprite.death.frameCount);
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
		}, ANIMATION_SPEED * caster.sprite.attack.frameCount);

		// Animation for the target being hit
		setTimeout(() => {
			combat.sprite[targetType].id = "hit";
			combat.sprite[targetType].start = performance.now();

			const isTargetAlive = processAbility();

			playSound(caster.attackSound.id, caster.attackSound.volume, caster.attackSound.variations);

			if (!isTargetAlive) return;

			setTimeout(() => {
				combat.sprite[targetType].id = "idle";
				combat.sprite[targetType].start = performance.now();

				if (!preserveTurn) {
					setTimeout(() => {
						processEndOfTurn(casterType === "player" ? CombatTurn.Player : CombatTurn.Enemy);
					}, 300);
				}
			}, ANIMATION_SPEED * target.sprite.hit.frameCount);
		}, ANIMATION_SPEED * (caster.sprite.attack.frameCount - 8));
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
let animationFrameId: number | null = null;

const currentScreen = ref<Screen>(SCREENS[0]);
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
		case 'g':
			player.value.inventory.add(createItem(ITEMS.map(x => x.id)[Math.floor(Math.random() * ITEMS.map(x => x.id).length)]));
			break;
	}
};

// --- Drawing function ---
const drawEntitySprite = (
	sprite: Sprite,
	x: number,
	y: number,
	width: number,
	animationSpeed: number,
	flip: boolean = false,
	initialTick: number = 0,
	isFinite: boolean = false,
	isHighlighted: boolean = false
) => {
	const ctx = contextRef.value;
	const canvas = canvasRef.value;
	if (!ctx || !canvas) return;

	ctx.save();
	const tick = performance.now();
	const currentFrame =
		isFinite
			? Math.min(Math.floor((tick - initialTick) / animationSpeed), sprite.frameCount - 1)
			: Math.floor((tick - initialTick) / animationSpeed) % sprite.frameCount;
	const height = width * sprite.height / sprite.width;

	// Translate and flip if necessary
	ctx.translate(x, y);
	ctx.scale(flip ? -1 : 1, 1);
	ctx.translate(-x, -y);

	// Show shadow within bounds which is a darker version of the sprite
	if (SETTINGS.value.shadows) {
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
	currentScreen.value = screen;

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
		const allowMovement = !dialogueMenu.value.length && !script.value;

		// Update Player Position based on keys
		if (allowMovement) {
			if (keys.a) {
				player.value.x -= PLAYER_SPEED;
				player.value.flip = true;
			}
			if (keys.d) {
				player.value.x += PLAYER_SPEED;
				player.value.flip = false;
			}
		}

		// Interaction with Screen Objects
		if (
			nearestScreenObject.value &&
			nearestScreenObject.value.interaction === InteractionType.Dialogue &&
			keys.e &&
			allowMovement &&
			nearestScreenObject.value.dialogue
		) {
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

		// Screen Switching
		if (player.value.x < SCREEN_SWITCH_THRESHOLD) {
			if (currentScreen.value.left) {
				const nextScreen = SCREENS.find(screen => screen.id === currentScreen.value.left);
				if (nextScreen) {
					switchScreen(nextScreen, "left");
					player.value.x = SCREEN_WIDTH - SCREEN_SWITCH_THRESHOLD; // appear on right side
				}
			} else {
				player.value.x = SCREEN_SWITCH_THRESHOLD;
			}
		}
		if (player.value.x > SCREEN_WIDTH - SCREEN_SWITCH_THRESHOLD) {
			if (currentScreen.value.right) {
				const nextScreen = SCREENS.find(screen => screen.id === currentScreen.value.right);
				if (nextScreen) {
					switchScreen(nextScreen, "right");
					player.value.x = SCREEN_SWITCH_THRESHOLD; // appear on left side
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
			player.value.combat.usedAbilities = [];
			player.value.combat.cooldowns = {};

			playSound("combat_start", 1);

			applyAttributeAllocation();
			return;
		}

		// --- Draw Screen Entities ---
		currentScreen.value.objects?.forEach((entity: ScreenObject) => {
			drawEntitySprite(
				entity.sprite,
				entity.x,
				entity.y,
				entity.width,
				ANIMATION_SPEED,
				false,
				0,
				false,
				nearestScreenObject.value ? entity.uuid === nearestScreenObject.value.uuid : false
			);
		});
		if (screenEnemy.value) {
			drawEntitySprite(
				screenEnemy.value.combat.sprite.idle,
				screenEnemy.value.position === "left" ? 300 : SCREEN_WIDTH - 300,
				SPRITES[screenEnemy.value.combat.spriteId].y,
				PLAYER_WIDTH,
				ANIMATION_SPEED,
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

		const currentPlayerSprite = isMoving ? player.value.sprite.run : player.value.combat.sprite.idle;
		drawEntitySprite(
			currentPlayerSprite,
			player.value.x,
			SPRITES[player.value.combat.spriteId].y,
			PLAYER_WIDTH,
			ANIMATION_SPEED,
			player.value.flip
		);
	}

	const inCombat = () => {
		const drawPlayer = () => drawEntitySprite(
			player.value.combat.sprite[combat.sprite.player.id as keyof SpriteSet],
			SCREEN_WIDTH * 2 / 5,
			SPRITES[player.value.combat.spriteId].y,
			PLAYER_WIDTH,
			ANIMATION_SPEED,
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
				ANIMATION_SPEED,
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

onMounted(() => {
	contextRef.value = canvasRef.value?.getContext('2d') || null;
	canvasRef.value?.addEventListener('contextmenu', event => event.preventDefault());
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	gameLoop();
	startRegen();
	document.addEventListener('click', buttonClick);
});

onBeforeUnmount(() => {
	if (animationFrameId) cancelAnimationFrame(animationFrameId);
	canvasRef.value?.removeEventListener('contextmenu', event => event.preventDefault());
	window.removeEventListener('keydown', onKeyDown);
	window.removeEventListener('keyup', onKeyUp);
	stopRegen();
	document.removeEventListener('click', buttonClick);
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
		const distance = Math.abs(player.value.x - entity.x);
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
	if (!postCombat.value.loot) return;

	[...postCombat.value.loot.items].forEach((item) => {
		if (item.id === 'gold') {
			player.value.gold += item.count || 1;
			postCombat.value.loot.remove(item);
		}
		else {
			postCombat.value.loot.move(item, player.value.inventory);
		}
	});

	endCombat();
}

// Script Start
interface ScriptMenuItem {
	label: string;
	title: string;
}

const incrementVariable = (type: string, name: string) => {
	player.value.variables[`${type}:${name}`] = (player.value.variables[`${type}:${name}`] || 0) + 1;
}

const script = ref('');
const scriptIndex = ref(-1);
const scriptActor = ref('');
const scriptMessage = ref('');
const scriptMenu = ref<ScriptMenuItem[]>([]);

function parseArguments(str: string) {
	const regex = /[^\s"]+|"([^"]*)"/gi;
	const args = [];
	let match;

	do {
		match = regex.exec(str);
		if (match != null) {
			args.push(match[1] ? match[1] : match[0]);
		}
	} while (match !== null);

	return args;
}

const scriptNextLine = () => {
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

const handleMenuItemClick = (item: ScriptMenuItem) => {
	scriptMenu.value = [];
	scriptIndex.value = getScriptLines().findIndex(line => line.includes(`label ${item.label}`));
}

const getScriptLines = () => {
	function wrapSpreadedJSON(script: string) {
		const spreadedJSONRegex = /menu\s*\[\s*([\s\S]+?)\s*\]/g;
		return script.replace(spreadedJSONRegex, (_: string, json: string) => {
			const wrappedJSON = json.replace(/\n\s*/g, '');
			return `menu "[${wrappedJSON.replace(/'/g, '&apos;').replace(/\"/g, "'").replace(/\r/g, '')}]"`;
		});
	}

	return wrapSpreadedJSON(script.value)
		.replace(/\/\/.*/g, '')
		.replace(/\n\s*\n/g, '\n')
		.split('\n');
}

watch(scriptIndex, () => {
	console.log(scriptIndex.value);
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
	<div class="game" :style="{ backgroundImage: `url('/bg/${currentScreen.background}')` }">
		<canvas ref="canvasRef" class="canvas" :width="SCREEN_WIDTH" :height="SCREEN_HEIGHT"></canvas>
		<div class="ui">
			<div class="build-info">Sidescroller RPG v0 | @enkada | 16.03.2025</div>
			<EntityFrame :entity="player.combat" :player="player"
				:showXPBar="!combat.isInProgress || postCombat.isOpen" />
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
			<div class="post-combat" v-if="postCombat.isOpen">
				<div class="post-combat__message">You've defeated {{ combat.enemy && combat.enemy.name }} and received
					{{ postCombat.xp }} XP.</div>
				<ItemContainer :container="postCombat.loot" :context="ContainerContext.Loot" :player="player" />
				<button @click="takeAllLoot">Take All and Continue</button>
				<button @click="endCombat">Continue</button>
			</div>
			<TalentTree v-if="isWindowOpen(Window.TalentTree)" :player="player" @close="closeWindow(Window.TalentTree)" />
			<Inventory v-if="isWindowOpen(Window.Inventory)" :player="player" @close="closeWindow(Window.Inventory)"
				:shopContainer="shopContainer" />
			<Shop v-if="shopContainer" :player="player" :shopContainer="shopContainer" @close="closeShop" />
			<PlayerInfo v-if="isWindowOpen(Window.Character)" :player="player" @close="closeWindow(Window.Character)"
				:combat="combat" :applyAttributeAllocation="applyAttributeAllocation" />
			<QuestLog v-if="isWindowOpen(Window.Quest)" :player="player" @close="closeWindow(Window.Quest)" />
			<QuestShowcase v-if="questShowcaseId" :questId="questShowcaseId" :player="player" />
			<Settings v-if="isWindowOpen(Window.Settings)" @close="closeWindow(Window.Settings)" />
			<div class="floating-text-list">
				<div v-for="text in floatingText" :class="`floating-text ${text.type}`"
					:style="{ left: `${text.x}px`, top: `${text.y}px` }">{{ text.text }}</div>
			</div>
			<div class="tool-bar">
				<div class="tool-bar__button btn" :class="{ 'active': isWindowOpen(Window.Character) }"
					@click="toggleWindow(Window.Character)">⚔️</div>
				<div class="tool-bar__button btn" :class="{ 'active': isWindowOpen(Window.TalentTree) }"
					@click="toggleWindow(Window.TalentTree)">🌳</div>
				<div class="tool-bar__button btn" :class="{ 'active': isWindowOpen(Window.Inventory) }"
					@click="toggleWindow(Window.Inventory)">💼</div>
				<div class="tool-bar__button btn" :class="{ 'active': isWindowOpen(Window.Quest) }"
					@click="toggleWindow(Window.Quest)">📜</div>
				<div class="tool-bar__button btn" :class="{ 'active': isWindowOpen(Window.Settings) }"
					@click="toggleWindow(Window.Settings)">⚙️</div>
			</div>

			<div class="dialogue__menu" v-if="dialogueMenu.length">
				<button v-for="(option, i) in dialogueMenu" class="dialogue__menu__item" :style="{ '--index': i }"
					@click="selectDialogueOption(option)">
					{{ option.type === DialogueType.Shop ? '💰 Shop' : option.type === DialogueType.QuestAccept ? `❗${option.quest?.title}` : option.type === DialogueType.QuestComplete ? `✔️ ${option.quest?.title}` : option.text }}
				</button>
				<button @click="dialogueMenu = []" class="dialogue__menu__item" :style="{ '--index': dialogueMenu.length }" >Return</button>
			</div>

			<div v-if="script !== ''" class="dialogue">
				<div class="dialogue__panel" @click="scriptNextLine">
					<div class="dialogue__actor" :key="scriptActor">{{ scriptActor }}</div>
					<div class="dialogue__message" :key="scriptMessage">
						<div v-for="(char, i) in scriptMessage.split('')" :key="i" class="dialogue__message__char"
							:style="{ '--index': i }">
							{{ char }}
						</div>
					</div>
				</div>
				<div class="dialogue__menu" v-if="scriptMenu.length">
					<button v-for="(item, i) in scriptMenu" :key="i" class="dialogue__menu__item" :style="{ '--index': i }" @click="handleMenuItemClick(item)" >
						{{ item.title.replace(/\&apos\;/g, "'") }}
					</button>
				</div>
			</div>
			<!-- <pre> {{ JSON.stringify(player.variables, null, 2) }}</pre> -->
		</div>
	</div>
</template>

<style lang="scss">
.game {
	width: 1280px;
	height: 720px;
	//outline: 1px solid yellow;
	image-rendering: pixelated;
	background-size: cover;
	position: relative;
	scale: 1;
}

.dialogue {
	position: absolute;
	display: grid;
	place-items: center;
	inset: 0;
	pointer-events: none;
	
    animation: opacityIn 1s ease;

	&__panel {
		position: absolute;
		pointer-events: auto;
		cursor: pointer;
		bottom: 0;
		background-color: hsla(0, 0%, 0%, 0.7);
		backdrop-filter: blur(2px);
		padding: 1em;
		display: grid;
		place-items: center;
		width: 100%;
		height: 200px;
	}

	&__menu {
		position: absolute;
		pointer-events: auto;
		gap: .5em;
		display: grid;
		left: 50%;
		top: 50%;
		transform: translate(-50%, -50%);

		width: 600px;

		&__item {
			opacity: 0;
			animation: opacityIn .5s forwards;
			animation-delay: calc(.2s * var(--index));

			background-color: transparent;
			background-image: linear-gradient(to right, hsla(0, 0%, 0%, 0) 0%, hsla(0, 0%, 0%, 0.8) 25%, hsl(0, 0%, 0%, 0.8) 75%, hsla(0, 0%, 0%, 0) 100%);
			border: none;

			transition: letter-spacing .5s;

			&:hover {
				background-color: transparent;
				letter-spacing: 1px;
			}
		}
	}

	&__message {
		line-height: 1.25;
		display: inline;
		width: 50%;
		text-align: center;

		&__char {
			display: inline;
			animation: opacityIn .5s forwards;
			animation-delay: calc(30ms * var(--index));
			opacity: 0;
		}
	}

	&__actor {
		position: absolute;
		font-size: 22px;
		bottom: calc(200px - 2em);
		animation: opacityIn .3s ease;
		background-image: linear-gradient(to right, hsla(0, 0%, 0%, 0) 0%, hsla(0, 0%, 100%, 0.2) 25%, hsl(0, 0%, 100%, 0.2) 75%, hsla(0, 0%, 0%, 0) 100%);
		padding: .25em 2em;
		min-width: 200px;
		text-align: center;
	}
}

@keyframes floating-text {
	0% {
		transform: translateY(0);
		opacity: 1;
	}

	50% {
		opacity: 1;
	}

	100% {
		opacity: 0;
		transform: translateY(-100px);
	}
}

@keyframes floating-text-wiggle {
	0% {
		translate: calc(-50% + 0px) 0;
	}
	25% {
		translate: calc(-50% + -10px) 0;
	}
	50% {
		translate: calc(-50% + 0px) 0;
	}
	75% {
		translate: calc(-50% + 10px) 0;
	}
	100% {
		translate: calc(-50% + 0px) 0;
	}
}

.floating-text-list {
	position: absolute;
	inset: 0;
	pointer-events: none;

	.floating-text {
		position: absolute;
		z-index: 1000;
		//translate: -50% 0;
		font-size: 20px;
		text-shadow:
			-1px -1px 1px #000,
			1px -1px 1px #000,
			-1px 1px 1px #000,
			1px 1px 1px #000;

		&.crit-damage,
		&.debuff {
			color: red;
			font-size: 22px;
		}

		&.heal,
		&.buff {
			color: lime;
			font-size: 22px;
		}

		animation: floating-text 1s linear forwards, floating-text-wiggle 3s linear infinite;
	}
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

	.build-info {
		position: absolute;
		top: 4px;
		right: 4px;
		font-size: 12px;
		text-shadow: 1px 1px 1px black;
		opacity: .5;
	}
}

.tool-bar {
	position: absolute;
	right: calc(2rem + 1px);
	bottom: 0em;
	display: flex;
	gap: 1px;
	cursor: pointer;
	font-size: 1.25em;

	&__button {
		padding: .15em;
		text-shadow: 1px 1px 1px black;
		margin-right: -0px;

		&.active {
			outline: 1px solid gray;
			background-color: hsla(0, 0%, 0%, 0.5);
		}
	}
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

.post-combat {
	position: absolute;
	display: grid;
	gap: .5em;
	padding: 1em;
	left: calc(50% - 160px);
	top: 4em;
	width: 320px;
	background-color: hsla(0, 0%, 0%, 0.5);
	border: 1px solid gray;

	animation: scaleIn 1s ease;
	transform-origin: center;
}
</style>
