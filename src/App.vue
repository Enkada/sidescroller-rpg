<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import { ABILITIES, AbilityFlag, type Ability } from './types/Ability';
import { SCREEN_WIDTH, SCREEN_HEIGHT, PLAYER_WIDTH, SCREEN_SWITCH_THRESHOLD, PLAYER_SPEED, COMBAT_RANGE, ANIMATION_SPEED, INTERACTION_RANGE } from './globals';
import { CombatEntity, critCheck, type Player } from './types/CombatEntity';
import EntityFrame from './components/EntityFrame.vue';
import AbilityButton from './components/AbilityButton.vue';
import { createSprite, type Sprite, type SpriteSet } from './types/Sprite';
import { getById, getXP, hasFlag, Window } from './utils';
import { EffectFlag, EFFECTS } from './types/Effect';
import { getTalentById, TalentType } from './types/Talent';
import TalentTree from './components/TalentTree.vue';
import PlayerInfo from './components/PlayerInfo.vue';
import { Container, ContainerContext, createItem, generateLoot, GLOBAL_LOOT_TABLE, ITEMS, type Item, type LootTable } from './types/Item';
import Inventory from './components/Inventory.vue';
import Shop from './components/Shop.vue';
import ItemContainer from './components/ItemContainer.vue';
import { addFloatingText, floatingText } from './types/FloatingText';

const windows = ref<Window[]>([]);

const toggleWindow = (window: Window) => {
	if (windows.value.includes(window)) {
		closeWindow(window);
	} else {
		openWindow(window);
	}
}

const openWindow = (window: Window) => windows.value.push(window);

const closeWindow = (window: Window) => windows.value = windows.value.filter(w => w !== window);

const isWindowOpen = (window: Window) => windows.value.includes(window);

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
	Talk
}

type DialogueOption = {
	text: string
	type: DialogueType

	// DialogueType.Shop
	shop?: Container

	// DialogueType.Talk
	script?: string
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
		combat: (level: number) => CombatEntity.create("Fly", level, {
			intelligence: 10,
			strength: 10 + level,
			agility: 10 + Math.floor(level / 2)
		}, "fly")
	}
}

const shopContainer = ref<Container | undefined>(undefined);
const dialogueMenu = ref<DialogueOption[]>([]);
const nearestScreenObject = ref<ScreenObject | null>(null);

const SCREENS: Screen[] = [ // TODO: change to a Record
	{
		id: "initial_screen",
		name: "Initial Screen",
		background: "DistantLandBG (1).png",
		left: "left_screen",
		right: "right_screen",
		objects: [
			setScreenObjectDialogue(
				createScreenObject(
					"Some Guy",
					createSprite("./entity/halberd.png", 291, 267, 24), 320,
					800, 80
				),
				[
					{
						text: "Trade goods",
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
						script: "sample"
					}
				]
			)
		]
	},
	{
		id: "left_screen",
		name: "Left Screen",
		background: "DistantLandBG (36).png",
		left: null,
		right: "initial_screen",
		enemies: [createScreenEnemy("fly", 1)]
	},
	{
		id: "right_screen",
		name: "Right Screen",
		background: "DistantLandBG (41).png",
		left: "initial_screen",
		right: null,
		enemies: [createScreenEnemy("fly")]
	}
];

const player = ref<Player>({
	x: 200,
	xp: 0,
	gold: 10,
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
	combat: CombatEntity.create("Sara", 1, { intelligence: 10, strength: 10, agility: 10 }, "player"),
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
	//console.log([...screenEnemy.value?.lootTable || [], ...GLOBAL_LOOT_TABLE]);

	for (const item of loot) {
		postCombat.value.loot.add(item);
	}

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
		case 'g':
			player.value.inventory.add(createItem(ITEMS.map(x => x.id)[Math.floor(Math.random() * ITEMS.map(x => x.id).length)]));
			break;
		case 't':
			runScript('sink');
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
	const tick = performance.now(); // Using performance.now for a smoother timing reference
	const currentFrame =
		isFinite
			? Math.min(Math.floor((tick - initialTick) / animationSpeed), sprite.frameCount - 1)
			: Math.floor((tick - initialTick) / animationSpeed) % sprite.frameCount;
	const height = width * sprite.height / sprite.width;

	// Translate and flip if necessary
	ctx.translate(x, y);
	ctx.scale(flip ? -1 : 1, 1);
	ctx.translate(-x, -y);

	if (isHighlighted) {
		ctx.filter = 'drop-shadow(0 0 8px white)';
	}

	if (keys.alt) {
		// draw frame
		ctx.strokeStyle = "red";
		ctx.strokeRect(x - width / 2, 720 - y - height + 20, width, height);
	}

	ctx.drawImage(
		sprite.image,
		sprite.width * currentFrame,
		0,
		sprite.width,
		sprite.height,
		x - width / 2,
		720 - y - height + 20,
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
	//ctx.imageSmoothingEnabled = false;

	// Clear canvas
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	const outOfCombat = () => {
		// --- Update Player Position based on keys ---
		if (!dialogueMenu.value.length) {
			if (keys.a) {
				player.value.x -= PLAYER_SPEED;
				player.value.flip = true;
			}
			if (keys.d) {
				player.value.x += PLAYER_SPEED;
				player.value.flip = false;
			}
		}

		if (nearestScreenObject.value && nearestScreenObject.value.interaction === InteractionType.Dialogue && keys.e && dialogueMenu.value.length === 0) {
			dialogueMenu.value = nearestScreenObject.value.dialogue || [];
		}

		// --- Screen Switching ---
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
				-105,
				PLAYER_WIDTH,
				ANIMATION_SPEED,
				screenEnemy.value.position === "right"
			);
		}

		// --- Draw Player --- 
		// Use the run sprite when moving, idle otherwise. The sprite remains flipped if previously set.
		const currentPlayerSprite = (keys.a || keys.d) && !dialogueMenu.value.length ? player.value.sprite.run : player.value.combat.sprite.idle;
		drawEntitySprite(
			currentPlayerSprite,
			player.value.x,
			-105,
			PLAYER_WIDTH,
			ANIMATION_SPEED,
			player.value.flip
		);
	}

	const inCombat = () => {
		const drawPlayer = () => drawEntitySprite(
			player.value.combat.sprite[combat.sprite.player.id as keyof SpriteSet],
			SCREEN_WIDTH * 2 / 5,
			-105,
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
				-105,
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

onMounted(() => {
	contextRef.value = canvasRef.value?.getContext('2d') || null;
	canvasRef.value?.addEventListener('contextmenu', event => event.preventDefault());
	window.addEventListener('keydown', onKeyDown);
	window.addEventListener('keyup', onKeyUp);
	gameLoop();
	startRegen();
});

onBeforeUnmount(() => {
	if (animationFrameId) cancelAnimationFrame(animationFrameId);
	canvasRef.value?.removeEventListener('contextmenu', event => event.preventDefault());
	window.removeEventListener('keydown', onKeyDown);
	window.removeEventListener('keyup', onKeyUp);
	stopRegen();
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
	dialogueMenu.value = [];
}

const closeShop = () => {
	shopContainer.value = undefined;
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
interface MenuItem {
	label: string;
	title: string;
}

const script = ref('');
const scriptIndex = ref(-1);
const scriptActor = ref('');
const scriptMessage = ref('');
const scriptMenu = ref<MenuItem[]>([]);

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

	console.log(line, args);

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
		scriptMenu.value = menuItems.filter((item: MenuItem & { condition: string }) =>
			!("condition" in item) || eval(`${item.condition}`) === true
		).map((item: MenuItem) => ({
			label: item.label,
			title: item.title
		}));
	}

	const say = (message: string) => {
		console.log('say', message);
		scriptMessage.value = message;
	}

	const name = (name: string) => {
		scriptActor.value = name;
	}

	const label = () => { }

	//const commands = [exit, _goto, menu, say, name, label];

	if (args.length > 0) {
		const command = args[0];
		console.log('eval', `${command}(\`${args.slice(1).join('\`, \`')}\`)`);
		eval(`${command}(\`${args.slice(1).join('\`, \`')}\`)`);
	}

	scriptIndex.value = nextIndex;
}

const handleMenuItemClick = (item: MenuItem) => {
	scriptMenu.value = [];
	scriptIndex.value = getScriptLines().findIndex(line => line.includes(`label ${item.label}`));
}

const getScriptLines = () => {
	function wrapSpreadedJSON(script: string) {
		const spreadedJSONRegex = /menu\s*\[\s*([\s\S]+?)\s*\]/g;
		return script.replace(spreadedJSONRegex, (_: string, json: string) => {
			const wrappedJSON = json.replace(/\n\s*/g, '');
			return `menu "[${wrappedJSON.replace("'", '&apos;').replace(/\"/g, "'").replace(/\r/g, '')}]"`;
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

	if (["eval", "label"].includes(parseArguments(getScriptLines()[scriptIndex.value])[0])) {
		scriptNextLine();
	}
});

const runScript = async (name: string) => {
	const response = await fetch(`/script/${name}`);

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
			<TalentTree v-if="isWindowOpen(Window.TalentTree)" :player="player" :toggleWindow="toggleWindow" />
			<Inventory v-if="isWindowOpen(Window.Inventory)" :player="player" :toggleWindow="toggleWindow"
				:shopContainer="shopContainer" />
			<Shop v-if="shopContainer" :player="player" :shopContainer="shopContainer" :closeShop="closeShop" />
			<PlayerInfo v-if="isWindowOpen(Window.Character)" :player="player" :toggleWindow="toggleWindow"
				:combat="combat" :applyAttributeAllocation="applyAttributeAllocation" />
			<div class="floating-text-list">
				<div v-for="text in floatingText" :class="`floating-text ${text.type}`"
					:style="{ left: `${text.x}px`, top: `${text.y}px` }">{{ text.text }}</div>
			</div>
			<div class="tool-bar">
				<div class="tool-bar__button" :class="{ 'active': isWindowOpen(Window.Character) }"
					@click="toggleWindow(Window.Character)">⚔️</div>
				<div class="tool-bar__button" :class="{ 'active': isWindowOpen(Window.TalentTree) }"
					@click="toggleWindow(Window.TalentTree)">🌳</div>
				<div class="tool-bar__button" :class="{ 'active': isWindowOpen(Window.Inventory) }"
					@click="toggleWindow(Window.Inventory)">💼</div>
			</div>
			<div class="dialogue-menu" v-if="dialogueMenu.length">
				<button class="dialogue-menu__option" v-for="option in dialogueMenu"
					@click="selectDialogueOption(option)">
					{{ option.text }}
				</button>
				<button class="dialogue-menu__option" @click="dialogueMenu = []">Return</button>
			</div>
			<!-- <pre> {{ JSON.stringify(floatingText, null, 2) }}</pre> -->
			<div v-if="script !== ''" class="dialogue" @click="scriptNextLine">
				<div class="dialogue__wrapper">
					<div class="dialogue__actor">{{ scriptActor }}</div>
					<div class="dialogue__message">
						<div class="dialogue__message__text" :key="scriptMessage">
							<div v-for="(char, i) in scriptMessage.split('')" :key="i" class="dialogue__message__char"
								:style="{ '--index': i }">
								{{ char }}
							</div>
						</div>
					</div>
				</div>
			</div>

			<div v-if="script !== '' && scriptMenu.length" class="menu">
				<div v-for="(item, i) in scriptMenu" :key="i" class="menu__item" :style="{ '--index': i }"
					@click="handleMenuItemClick(item)">
					{{ item.title }}
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss">
.game {
	width: 1280px;
	height: 720px;
	//outline: 1px solid yellow;
	background-size: cover;
	position: relative;
	scale: 1;
}

.dialogue {
    position: absolute;
    bottom: 0;
    animation: fadeIn 1s ease;

    background-image: linear-gradient(to top, var(--clr-background), hsla(0, 0%, 0%, 0));
    height: 20vh;
    width: 100vw;
    display: grid;
    justify-content: center;
    align-items: center;

    &__wrapper {      
        max-width: 800px;
    }

    &__actor {
        font-size: 1.25em;
        padding: .75em;

        &:empty {
            display: none;
        }
    }

    &__message {

        &__text {
            line-height: 1.25;
            display: inline;
        }
            
        &__char {
            display: inline;
            animation: fadeIn .5s forwards;
            animation-delay: calc(30ms * var(--index));
            opacity: 0;
        }

		@keyframes fadeIn {
			from {
				opacity: 0;
			}
			to {
				opacity: 1;
			}
		}
    }
}

.menu {
    position: absolute;
    top: calc(50% - 2em);
    left: 50%;
    transform: translate(-50%, -50%);

    display: grid;
    gap: .5em;
    width: min(600px, calc(100vw - 2em));

    &__item {
        background-image: linear-gradient(to right, hsla(0, 0%, 0%, 0) 0%, hsla(0, 0%, 0%, 0.8) 25%, hsl(0, 0%, 0%, 0.8) 75%, hsla(0, 0%, 0%, 0) 100%);
        cursor: pointer;
        text-align: center;
        padding: .5em;
        user-select: none;

        opacity: 0;
        animation: fadeIn .5s forwards;
        animation-delay: calc(.2s * var(--index));

        transition: letter-spacing .5s;

        &:hover {
            //background-color: grey;
            letter-spacing: 1px;
        }
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

.floating-text-list {
	position: absolute;
	inset: 0;
	pointer-events: none;

	.floating-text {
		position: absolute;
		z-index: 1000;
		translate: -50% 0;
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

		animation: floating-text 1s linear forwards;
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
