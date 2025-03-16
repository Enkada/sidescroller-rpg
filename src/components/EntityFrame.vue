<script setup lang="ts">
import { computed } from 'vue';
import { CombatEntity, type Player } from '../types/CombatEntity';
import { EFFECTS, EffectType } from '../types/Effect';
import XPBar from './XPBar.vue';
import { getById } from '../utils';

const props = defineProps<{ entity: CombatEntity, isEnemy?: boolean, player?: Player, showXPBar?: boolean }>();

const player = props.player as Player;

const healthPercentage = computed(() => Math.max(0, props.entity.health / props.entity.maxHealth) * 100);
const manaPercentage = computed(() => Math.max(0, props.entity.mana / props.entity.maxMana) * 100);
</script>

<template>
	<div class="entity-frame" :class="{ 'entity-frame--enemy': props.isEnemy }">
		<div :style="{ backgroundImage: `url('${entity.sprite.idle.image.src}')` }" class="entity-frame__portrait">
		</div>
		<div class="entity-frame__right">
			<div class="entity-frame__name">{{ props.entity.name }} Lvl {{ props.entity.level }}</div>
			<div class="entity-frame__bar-list">
				<div class="entity-frame__health entity-frame__bar">
					<div :style="{ width: healthPercentage + '%' }" class="entity-frame__bar__inner"></div>
					<div class="entity-frame__bar__value">{{ Math.max(0, props.entity.health) }} / {{
						props.entity.maxHealth
						}}</div>
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
						<div class="effect__tooltip__description">{{ getById(EFFECTS, effect.id).description }}</div>
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

	&--enemy {
		right: 2em;
		left: auto;

		.effect__tooltip {
			right: 0;
			left: auto;
			translate: 1px 100%;
		}
	}

	&__portrait {
		--size: 128px;
		--sprite-size: 512px;
		--zoom: 1.4;
		--border: 4px;
		width: calc(var(--size) + var(--border) * 2);
		height: calc(var(--size) + var(--border) * 2);
		border: var(--border) solid hsl(0deg 0% 30%);
		border-radius: 50%;
		background-color: hsl(0, 0%, 45%);

		margin-right: -4em;

		background-position:
			calc(var(--sprite-size) / 2 / var(--zoom) + var(--size) / 2 - var(--sprite-size) / var(--zoom) * 1 - 8px) 
			calc(var(--sprite-size) / 2 / var(--zoom) + var(--size) / 2 + 32px);
		background-size: auto calc(var(--sprite-size) / var(--zoom));
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
		background-color: hsl(0deg 0% 30%);
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
			background-color: var(--clr-foreground);
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
	}
}
</style>
