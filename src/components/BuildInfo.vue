<script setup lang="ts">
import { FRAMES_PER_SECOND } from '../utils';
import { getLastVersionData } from '../utils';

const versionData = getLastVersionData();

const today = new Date();
const currentDate = today.toLocaleDateString('ru-RU', {
	day: '2-digit',
	month: '2-digit',
	year: 'numeric'
});

const isDateOutdated = import.meta.env.DEV && versionData.buildDate !== currentDate;

</script>

<template>
	<div class="build-info">Sidescroller RPG v{{ versionData.version }} | <a href="https://enkada.ru">@enkada</a> | 
		<span :class="{ 'outdated-date': isDateOutdated }">{{ versionData.buildDate }}</span> | {{ FRAMES_PER_SECOND }} FPS
	</div>
</template>

<style scoped lang="scss">
.build-info {
	position: absolute;
	top: 4px;
	right: 4px;
	font-size: 12px;
	text-shadow: 1px 1px 1px black;
	opacity: .5;

	a {
		color: inherit;
		text-decoration: none;

		&:hover {
			text-decoration: underline;
			text-underline-offset: 2px;
		}
	}
	
	.outdated-date {
		color: red;
		font-weight: bold;
		text-decoration: underline;
		text-underline-offset: 3px;
		font-size: 1.5em;
	}
}
</style>