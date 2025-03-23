<script setup lang="ts">
import { Window } from '../utils';

defineProps<{
	windows: Window[];
}>();

const emit = defineEmits<{
	(e: 'toggleWindow', window: Window): void;
}>();
</script>

<template>
	<div class="tool-bar">
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Character) }"
			@click="emit('toggleWindow', Window.Character)">
			<div class="tool-bar__icon">⚔️</div>
			<div class="tool-bar__hotkey">C</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.TalentTree) }"
			@click="emit('toggleWindow', Window.TalentTree)">
			<div class="tool-bar__icon">🌳</div>
			<div class="tool-bar__hotkey">N</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Inventory) }"
			@click="emit('toggleWindow', Window.Inventory)">
			<div class="tool-bar__icon">💼</div>
			<div class="tool-bar__hotkey">I</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Quest) }"
			@click="emit('toggleWindow', Window.Quest)">
			<div class="tool-bar__icon">📜</div>
			<div class="tool-bar__hotkey">L</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Settings) }"
			@click="emit('toggleWindow', Window.Settings)">
			<div class="tool-bar__icon">⚙️</div>
			<div class="tool-bar__hotkey">O</div>
		</div>
	</div>
</template>

<style lang="scss">
.tool-bar {
	position: absolute;
	right: calc(2rem + 1px);
	bottom: 0em;
	display: flex;
	gap: 1px;
	cursor: pointer;
	font-size: 1.25em;

	&__hotkey {
		font-size: 10px;
		position: absolute;
		bottom: 4px;
		right: 4px;
		text-shadow: 1px 1px 1px black;
	}

	&__button {
		padding: .15em;
		text-shadow: 1px 1px 1px black;
		margin-right: -0px;
		position: relative;

		&.active {
			outline: 1px solid gray;
			background-color: hsla(0, 0%, 0%, 0.5);
		}
	}
}
</style>