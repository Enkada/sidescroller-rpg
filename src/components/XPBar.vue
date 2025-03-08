<script setup lang="ts">
import type { Player } from '../types/CombatEntity';
import { getXP } from '../utils';

const props = defineProps<{ player: Player }>()
</script>

<template>
    <div class="xp-bar">
        <div class="xp-bar__progress" :style="{ width: `${player.xp / getXP(player.combat.level) * 100}%` }">
        </div>
        <div class="xp-bar__value">{{ player.xp }} / {{ getXP(player.combat.level) }}</div>
    </div>
</template>

<style lang="scss" scoped> 
.xp-bar {
	background-color: var(--clr-xp-bg);
	box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
	width: inherit;
	padding: .25em;
	border-radius: 16px;
	overflow: hidden;
    position: relative;

    animation: opacityIn .5s ease;

	&__progress {
		position: absolute;
		left: 0;
		top: 0;
		background-color: var(--clr-xp);
		box-shadow: inset 0 0 4px rgba(0, 0, 0, 0.5);
		height: 100%;
		transition: width 0.5s ease;
	}

	&__value {
		text-align: center;
		font-size: 12px;
		opacity: .6;
	}
}
</style>