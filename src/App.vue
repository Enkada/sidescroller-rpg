<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, reactive } from 'vue';
import { ABILITIES, AbilityFlag, type Ability } from './types/Ability';
import { SCREEN_WIDTH, SCREEN_HEIGHT, PLAYER_WIDTH, SCREEN_SWITCH_THRESHOLD, PLAYER_SPEED, COMBAT_RANGE, ANIMATION_SPEED } from './globals';
import { CombatEntity, type Player, type Attributes } from './types/CombatEntity';
import EntityFrame from './components/EntityFrame.vue';
import AbilityButton from './components/AbilityButton.vue';
import { createSprite, type Sprite, type SpriteSet } from './types/Sprite';
import { getById, getXP, hasFlag, Window } from './utils';
import { EffectFlag, EFFECTS } from './types/Effect';
import { getTalentById, TALENT_TREE, TalentType, type Talent } from './types/Talent';
import TalentTree from './components/TalentTree.vue';
import PlayerInfo from './components/PlayerInfo.vue';
import { Container, createItem, ITEMS } from './types/Item';
import Inventory from './components/Inventory.vue';

const windows = ref<Window[]>([]);

const toggleWindow = (window: Window) => {
	if (windows.value.includes(window)) {
		windows.value = windows.value.filter(w => w !== window);
	} else {
		windows.value.push(window);
	}
}

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

type ScreenObject = {
	uuid: string
	name: string
	x: number
	y: number
	sprite: Sprite
	width: number
}

const createScreenObject = (name: string, sprite: Sprite, width: number, x: number, y: number = 0): ScreenObject => {
	return {
		uuid: crypto.randomUUID(),
		name,
		width,
		x,
		y,
		sprite
	}
}

const ENEMIES: Record<string, (level: number) => CombatEntity> = {
	fly: (level: number) => CombatEntity.create("Fly", level, {
		intelligence: 10,
		strength: 10 + level,
		agility: 10 + Math.floor(level / 2)
	}, "fly")
}

const SCREENS: Screen[] = [ // TODO: change to a Record
	{
		id: "initial_screen",
		name: "Initial Screen",
		background: "DistantLandBG (1).png",
		left: "left_screen",
		right: "right_screen",
		objects: [
			createScreenObject("Some Guy", createSprite("./entity/halberd.png", 291, 267, 24), 320, 800, 40)
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
	gold: 0,
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

type CurrentMax = {
	current: number;
	max: number;
};

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
		player.value.combat.mana = Math.min(player.value.combat.mana + 10, player.value.combat.maxMana);
	}
});

const showPostCombat = ref(false);

const processEndOfCombat = () => {
	showPostCombat.value = true;
	const enemy = { ...combat.enemy } as CombatEntity;
	const xp = combat.enemy?.xp || 0;
	setTimeout(() => {
		player.value.xp += xp;
	}, 1000);
}

const endCombat = () => {
	combat.isInProgress = false;
	combat.enemy = null;
	combat.turn = CombatTurn.Player;

	player.value.combat.effects = [];

	showPostCombat.value = false;
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
				target.health -= ability.values?.damage(caster);
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
	combat: CombatEntity,
	position: "left" | "right"
} | null>(null);

// --- Keyboard Input ---
const keys = {
	a: false,
	d: false,
};

const onKeyDown = (e: KeyboardEvent) => {
	if (e.key === 'a' || e.key === 'A') {
		keys.a = true;
	} else if (e.key === 'd' || e.key === 'D') {
		keys.d = true;
	}
};

const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    switch (key) {
        case 'a':
        case 'd':
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
	isFinite: boolean = false
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
				screenEnemy.value = {
					combat: ENEMIES[enemy.id](level),
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
	ctx.imageSmoothingEnabled = false;

	// Clear canvas
	ctx.clearRect(0, 0, SCREEN_WIDTH, SCREEN_HEIGHT);

	const outOfCombat = () => {
		// --- Update Player Position based on keys ---
		if (keys.a) {
			player.value.x -= PLAYER_SPEED;
			player.value.flip = true;
		}
		if (keys.d) {
			player.value.x += PLAYER_SPEED;
			player.value.flip = false;
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

			screenEnemy.value = null;
			return;
		}

		// --- Draw Screen Entities ---
		currentScreen.value.objects?.forEach((entity: ScreenObject) => {
			drawEntitySprite(
				entity.sprite,
				entity.x,
				entity.y,
				entity.width,
				ANIMATION_SPEED
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
		const currentPlayerSprite = (keys.a || keys.d) ? player.value.sprite.run : player.value.combat.sprite.idle;
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
</script>

<template>
	<div class="game" :style="{ backgroundImage: `url('/bg/${currentScreen.background}')` }">
		<canvas ref="canvasRef" class="canvas" :width="SCREEN_WIDTH" :height="SCREEN_HEIGHT"></canvas>
		<div class="ui">
			<div class="build-info">Sidescroller RPG v0 | @enkada | 01.03.2025</div>
			<EntityFrame :entity="player.combat" :player="player" :showXPBar="!combat.isInProgress || showPostCombat" />
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
			<div class="post-combat" v-if="showPostCombat">
				<div class="post-combat__message">You've defeated {{ combat.enemy && combat.enemy.name }} and received
					{{
						combat.enemy && combat.enemy.xp }} XP.</div>
				<button @click="endCombat">Continue</button>
			</div>			
			<TalentTree v-if="isWindowOpen(Window.TalentTree)" :player="player" :toggleWindow="toggleWindow"/>
			<Inventory v-if="isWindowOpen(Window.Inventory)" :player="player" :toggleWindow="toggleWindow"/>
			<PlayerInfo v-if="isWindowOpen(Window.Character)" :player="player" :toggleWindow="toggleWindow" :combat="combat" :applyAttributeAllocation="applyAttributeAllocation"/>
			<div class="tool-bar">
				<div class="tool-bar__button" :class="{ 'active': isWindowOpen(Window.Character)}" @click="toggleWindow(Window.Character)">⚔️</div>
				<div class="tool-bar__button" :class="{ 'active': isWindowOpen(Window.TalentTree)}" @click="toggleWindow(Window.TalentTree)">🌳</div>
				<div class="tool-bar__button" :class="{ 'active': isWindowOpen(Window.Inventory)}" @click="toggleWindow(Window.Inventory)">💼</div>
			</div>
			<!-- <pre> {{ JSON.stringify(player.combat.talents, null, 2) }}</pre> -->
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
		opacity: .5;
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
