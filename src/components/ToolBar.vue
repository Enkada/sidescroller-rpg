<script setup lang="ts">
import { Window } from '../utils';

const { windows, disabledWindows } = defineProps<{
	windows: Window[];
	disabledWindows?: Window[];
}>();

const emit = defineEmits<{
	(e: 'toggleWindow', window: Window): void;
}>();

const handleClick = (window: Window) => {
	if (!disabledWindows?.includes(window)) {
		emit('toggleWindow', window);
	}
};
</script>

<template>
	<div class="tool-bar">
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Character), 'disabled': disabledWindows?.includes(Window.Character) }"
			@click="handleClick(Window.Character)">
			<div class="tool-bar__icon">⚔️</div>
			<div class="tool-bar__hotkey">C</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.TalentTree), 'disabled': disabledWindows?.includes(Window.TalentTree) }"
			@click="handleClick(Window.TalentTree)">
			<div class="tool-bar__icon">🌳</div>
			<div class="tool-bar__hotkey">N</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Inventory), 'disabled': disabledWindows?.includes(Window.Inventory) }"
			@click="handleClick(Window.Inventory)">
			<div class="tool-bar__icon">💼</div>
			<div class="tool-bar__hotkey">B</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Quest), 'disabled': disabledWindows?.includes(Window.Quest) }"
			@click="handleClick(Window.Quest)">
			<div class="tool-bar__icon">📜</div>
			<div class="tool-bar__hotkey">L</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Guide), 'disabled': disabledWindows?.includes(Window.Guide) }"
			@click="handleClick(Window.Guide)">
			<div class="tool-bar__icon">📖</div>
			<div class="tool-bar__hotkey">P</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.SaveLoad), 'disabled': disabledWindows?.includes(Window.SaveLoad) }"
			@click="handleClick(Window.SaveLoad)">
			<div class="tool-bar__icon">💾</div>
			<div class="tool-bar__hotkey">I</div>
		</div>
		<div class="tool-bar__button btn" :class="{ 'active': windows.includes(Window.Settings), 'disabled': disabledWindows?.includes(Window.Settings) }"
			@click="handleClick(Window.Settings)">
			<div class="tool-bar__icon">⚙️</div>
			<div class="tool-bar__hotkey">O</div>
		</div>
	</div>
</template>

<style lang="scss">
.tool-bar {
	position: absolute;
	right: calc(2rem + 4px);
	bottom: 0em;
	display: flex;
	gap: 4px;
	cursor: pointer;
	font-size: 1.25em;
	font-weight: bold;

	&__hotkey {
		font-size: 10px;
		position: absolute;
		bottom: 2px;
		right: 4px;
		text-shadow: 1px 1px 1px black,
			-1px -1px 1px black;
	}

	&__button {
		padding: 4px;
		text-shadow: 1px 1px 1px black;
		margin-right: -0px;
		position: relative;
		outline-color: var(--clr-ui-border);

		transition: background-color 0.2s ease, outline 0.2s ease;

		&.active {
			outline: 4px solid var(--clr-ui-border);
			background-color: hsla(0, 0%, 0%, 0.5);
		}

		&.disabled {
			opacity: 0.5;
			cursor: not-allowed;
		}
	}
}
</style>