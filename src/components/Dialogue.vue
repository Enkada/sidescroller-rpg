<script setup lang="ts">
import { script, scriptActor, scriptMessage, scriptMenu, type ScriptMenuItem, scriptIndex, getScriptLines } from '../types/Script';

defineProps<{
    onNextLine: () => void;
}>();

const selectMenuItem = (item: ScriptMenuItem) => {
	scriptMenu.value = [];
	scriptIndex.value = getScriptLines().findIndex(line => line.includes(`label ${item.label}`));
}
</script>

<template>
    <div v-if="script !== ''" class="dialogue">
        <div class="dialogue__panel" @click="onNextLine">
            <div class="dialogue__actor" :key="scriptActor">{{ scriptActor }}</div>
            <div class="dialogue__message" :key="scriptMessage">
                <div v-for="(char, i) in scriptMessage.split('')" :key="i" class="dialogue__message__char"
                    :style="{ '--index': i }">	
                    {{ char }}
                </div>
            </div>
        </div>
        <div class="dialogue__menu" v-if="scriptMenu.length">
            <div v-for="(item, i) in scriptMenu" :key="i" class="dialogue__menu__item btn" :style="{ '--index': i }"
                @click="selectMenuItem(item)">
                {{ item.title.replace(/\&apos\;/g, "'") }}
            </div>
        </div>
    </div>
</template>

<style lang="scss">
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
			text-align: center;
			padding: .5em;
			line-height: 1;
			cursor: pointer;

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
</style> 