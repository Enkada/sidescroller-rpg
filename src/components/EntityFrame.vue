<script setup lang="ts">
import { computed } from 'vue';
import { CombatEntity, type Player } from '../types/CombatEntity';
import { EFFECTS, EffectType, type Effect } from '../types/Effect';
import XPBar from './XPBar.vue';
import { getById } from '../utils';

const props = defineProps<{ entity: CombatEntity, isEnemy?: boolean, player?: Player, showXPBar?: boolean }>();

const player = props.player as Player;

const healthPercentage = computed(() => Math.max(0, props.entity.health / props.entity.maxHealth) * 100);
const manaPercentage = computed(() => Math.max(0, props.entity.mana / props.entity.maxMana) * 100);

const formatDescription = (effect: { id: string, duration: number, caster: CombatEntity }, target: CombatEntity) => {
	
	const effectData = getById(EFFECTS, effect.id);
	return effectData.description.replace(/%(.+?)%/g, (match: string, key: string) => {
		if (effectData.values && effectData.values[key]) {
			const value = effectData.values[key](effect.caster, target);
			return `<span class='value'>${key === 'critChance' ? (value * 100) + '%' : value}</span>`;
		}
		if (effectData.constants && effectData.constants[key]) {
			const value = effectData.constants[key];
			return `<span class='value'>${key === 'critChance' ? (value * 100) + '%' : value}</span>`;
		}
		return match;
	});
};
</script>

<template>
	<div class="entity-frame" :class="{ 'entity-frame--enemy': props.isEnemy }">
		<div :style="{ backgroundImage: `url('${entity.sprite.idle.image.src}')`, '--sprite-width': entity.sprite.idle.width + 'px', '--sprite-height': entity.sprite.idle.height + 'px' }" class="entity-frame__portrait">
		</div>
		<div class="entity-frame__right">
			<div class="entity-frame__name">{{ props.entity.name }} Lvl {{ props.entity.level }}</div>
			<div class="entity-frame__bar-list">
				<div class="entity-frame__health entity-frame__bar">
					<div :style="{ width: healthPercentage + '%' }" class="entity-frame__bar__inner"></div>
					<div class="entity-frame__bar__value">{{ Math.max(0, props.entity.health) }} / {{ props.entity.maxHealth }}</div>
					<div class="entity-frame__armor" v-if="props.entity.armor > 0">
						<div class="entity-frame__armor__icon">⛊</div>
						<div class="entity-frame__armor__value">{{ props.entity.armor }}</div>
						<div class="entity-frame__armor__trail"></div>
					</div>
				</div>
				<div class="entity-frame__mana entity-frame__bar">
					<div :style="{ width: manaPercentage + '%' }" class="entity-frame__bar__inner"></div>
					<div class="entity-frame__bar__value">{{ Math.max(0, props.entity.mana) }} / {{ props.entity.maxMana
					}}</div>
				</div>
			</div>
			<XPBar v-if="!props.isEnemy && props.showXPBar" :player="player" />
			<div class="effect-list" v-if="props.entity.effects.length">
				<div class="effect" :class="{
					'effect--buff': getById(EFFECTS, effect.id).type === EffectType.Buff,
					'effect--debuff': getById(EFFECTS, effect.id).type === EffectType.Debuff
				}" v-for="effect in props.entity.effects" :key="effect.id">
					<img :src="`./ability/${getById(EFFECTS, effect.id).icon}`">
					<div class="effect__duration">{{ effect.duration }}</div>
					<div class="effect__tooltip tooltip">
						<div class="effect__tooltip__header tooltip__header">
							<div class="effect__tooltip__name tooltip__name">{{ getById(EFFECTS, effect.id).name }}</div>
						</div>
						<div class="effect__tooltip__description" v-html="formatDescription(effect, props.entity)"></div>
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<style lang="scss" scoped>
.effect-list {
	display: flex;
	gap: 4px;
	margin: .25em;
	margin-left: 4em;
}

.xp-bar {
	width: 280px;
	margin-top: .25em;
	margin-left: 4em;
}

.effect {
	position: relative;
	width: 32px;
	height: 32px;
	cursor: pointer;
	--clr: gray;
	border: 1px solid var(--clr);

	&--buff {
		--clr: hsl(150, 100%, 42%);
	}

	&--debuff {
		--clr: hsl(0, 100%, 46%);
	}

	&:hover {

		&::after {
			content: '';
			position: absolute;
			inset: 0;
			box-shadow: inset 0 0 8px 4px rgb(159 139 0 / 50%);
		}

		.effect__tooltip {
			display: grid;
		}
	}

	&__tooltip {
		display: none;
		left: 0;
		bottom: 0;
		translate: -1px 100%;
	}

	&__duration {
		position: absolute;
		right: 0px;
		bottom: 0px;
		color: hsl(0, 0%, 100%);
		text-shadow:
			-1px -1px 2px #000,
			1px -1px 2px #000,
			-1px 1px 2px #000,
			1px 1px 2px #000;
	}

	img {
		width: 100%;
		height: 100%;
	}
}

.entity-frame {
	position: absolute;
	display: flex;
	top: 2em;
	left: 2em;

	animation: slideRight 1s ease;


	&--enemy {
		right: 2em;
		left: auto;
		animation: slideLeft 1s ease;

		.effect__tooltip {
			right: 0;
			left: auto;
			translate: 1px 100%;
		}
	}

	&__armor {
		position: absolute;
		right: 0;
		top: 0;
		z-index: 1;
		display: grid;
		align-items: center;
		justify-items: center;
		width: 32px;
		height: 32px;
		translate: calc(50% + 3px) -2px;

		&__trail {
			background-image: linear-gradient(to left, hsl(0, 0%, 50%) 20%, transparent 100%);
			height: 100%;
			width: 96px;
			translate: -50% 2px;
			z-index: -1;
			opacity: .8;
		}

		&__value {
			color: white;
			font-size: 20px;
			--clr-shadow: hsl(0, 0%, 30%);
			text-shadow:
				-1px -1px 1px var(--clr-shadow),
				1px -1px 1px var(--clr-shadow),
				-1px 1px 1px var(--clr-shadow),
				1px 1px 1px var(--clr-shadow);
		}

		&__icon {
			font-size: 48px;
			color: hsl(0, 0%, 50%);		
			--clr-shadow: hsl(0, 0%, 30%);
			text-shadow: 
				1px 1px 0px var(--clr-shadow),
				-1px -1px 0px var(--clr-shadow),
				1px -1px 0px var(--clr-shadow),
				-1px 1px 0px var(--clr-shadow);	
		}

		& > * {
			position: absolute;
		}
	}

	&__portrait {
		--size: 128px;
		--sprite-width: 512px;
		--sprite-height: 512px;
		--zoom: 1.4;
		--border: 4px;
		width: calc(var(--size) + var(--border) * 2);
		height: calc(var(--size) + var(--border) * 2);
		border: var(--border) solid var(--clr-ui-border);
		border-radius: 50%;
		background-color: var(--clr-ui-border);

		margin-right: -4em;

		background-position:
			calc(var(--sprite-width) / 2 / var(--zoom) + var(--size) / 2 - var(--sprite-width) / var(--zoom) * 1 - 8px) 
			calc(var(--sprite-height) / 2 / var(--zoom) + var(--size) / 2 + clamp(-32px, var(--sprite-height) - 512px + 32px, 32px) );
		background-size: auto calc(var(--sprite-height) / var(--zoom));
		box-shadow: inset 0 0 16px 4px rgba(0 0 0 / 50%);
		z-index: 1;
	}

	&__name {
		font-size: 20px;
		text-shadow:
			1px 1px 1px #000;
		background-image: linear-gradient(to top, rgba(0, 0, 0, 0.35) 0%, transparent 100%);
		padding: .25em .5em .25em 3.25em;
		mask-image: linear-gradient(to right, black 0%, black 50%, transparent 100%);
	}

	&__bar-list {
		display: grid;
		gap: .25em;
		background-color: var(--clr-ui-border);
		padding: .25em;
		border-radius: 4px;

		padding-left: 4em;
	}

	&__bar {
		--clr-background: hsl(0, 0%, 20%);
		--clr-foreground: hsl(0, 0%, 60%);
		background-color: var(--clr-background);
		width: 280px;
		height: 32px;
		border-radius: 4px;
		box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
		position: relative;


		&__inner {
			height: 100%;
		    background-image: url("/ui/bar.png");
			background-color: var(--clr-foreground);
			background-blend-mode: multiply;
			background-size: 512px;
			animation: flowBackground 30s linear infinite;

			border-radius: 4px;
			box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
			transition: width 0.5s ease;
		}

		&__value {
			position: absolute;
			top: 50%;
			left: 50%;
			transform: translate(-50%, -50%);
			color: white;
			opacity: .8;
		}
	}

	&__health {
		--clr-background: var(--clr-health-bg);
		--clr-foreground: var(--clr-health);
	}

	&__mana {
		--clr-background: var(--clr-mana-bg);
		--clr-foreground: var(--clr-mana);
		
		.entity-frame__bar__inner {
			background-position-y: 256px;
		}
	}
}

@keyframes flowBackground {
	0% {
		background-position-x: 0px;
	}
	100% {
		background-position-x: 512px;
	}
}
</style>
