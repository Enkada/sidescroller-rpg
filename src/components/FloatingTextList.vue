<script setup lang="ts">
import { type FloatingText } from '../types/FloatingText';

defineProps<{
	texts: FloatingText[];
}>();
</script>

<template>
	<div class="floating-text-list">
		<div v-for="text in texts" :class="`floating-text ${text.type}`"
			:style="{ left: `${text.x}px`, top: `${text.y}px` }">{{ text.text }}</div>
	</div>
</template>

<style lang="scss">
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

		&.mana {
			color: var(--clr-mana);
		}

		animation: floating-text 1s linear forwards,
		floating-text-wiggle 3s linear infinite;
	}
}
</style>