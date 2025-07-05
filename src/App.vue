<script setup lang="ts">
import { ref } from 'vue';
import Game from './Game.vue';
import { SCREEN_WIDTH, SCREEN_HEIGHT } from './globals';
import SaveLoad from './components/SaveLoad.vue';
import { getLastVersionData, Window, type SaveData } from './utils';

const gameStarted = ref(false);
const windows = ref<Window[]>([]);
const loadData = ref<SaveData | null>(null);
const videoLoaded = ref(false);

if (import.meta.env.DEV) {
    //gameStarted.value = true;
}

const exitGame = () => {
    window.close();
}

const toggleWindow = (window: Window) => {
    if (windows.value.includes(window)) {
        closeWindow(window);
    } else {
        openWindow(window);
    }
}

const openWindow = (window: Window) => {
    if (!windows.value.includes(window)) {
        windows.value.push(window);
    }
}

const closeWindow = (window: Window) => {
    windows.value = windows.value.filter(w => w !== window);
}

const isWindowOpen = (window: Window) => windows.value.includes(window);

const handleLoadGame = (data: SaveData) => {
    loadData.value = data;
    gameStarted.value = true;
    closeWindow(Window.SaveLoad);
}

const onVideoLoaded = () => {
    videoLoaded.value = true;
}

</script>

<template>
<Game v-if="gameStarted" :load-data="loadData"/>
<div class="game start-menu" :class="{ 'loaded': videoLoaded }" v-else :style="{ width: `${SCREEN_WIDTH}px`, height: `${SCREEN_HEIGHT}px` }">
    <video class="background-video" autoplay muted loop @loadeddata="onVideoLoaded">
        <source src="/ui/menu.mp4" type="video/mp4">
    </video>
    <div class="menu-content">
        <div class="menu-content__title">Sidescroller RPG</div>
        <div class="menu-content__btn-list">
            <button @click="gameStarted = true">Start Game</button>
            <button @click="toggleWindow(Window.SaveLoad)">Load Game</button>
            <button @click="exitGame">Exit</button>
        </div>
        <div class="menu-content__footer">
            <div>v{{ getLastVersionData().version }}</div>
            <div>{{ getLastVersionData().buildDate }}</div>
            <a href="https://enkada.ru">@enkada</a>
        </div>
    </div>
    <div class="vignette"></div>
    <div class="fade-in"></div>
    
    <!-- SaveLoad Window -->
    <SaveLoad 
        v-if="isWindowOpen(Window.SaveLoad)"
        :is-main-menu="true"
        @close="closeWindow(Window.SaveLoad)"
        @load="handleLoadGame"
    />
</div>
</template>

<style lang="scss">
.start-menu {
    position: relative;
    overflow: hidden;
}

.vignette {
    position: absolute;
    inset: 0;
    pointer-events: none;
    box-shadow: inset 0 0 24px 12px rgba(0, 0, 0, 0.5);
}

.background-video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    object-fit: cover;
    z-index: -1;
}

.menu-content {
    position: absolute;
    right: 120px;
    text-align: center;
    height: 100%;
    display: grid;
    align-content: center;
    gap: 4em;
    width: 360px;

    &__footer {
        width: 100%;
        position: absolute;
        bottom: 1em;
        display: flex;
        justify-content: space-between;
        text-shadow: 1px 1px 1px black;
        padding-inline: 1em;

        a {
            color: inherit;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
                text-underline-offset: 2px;
            }
        }
    }

    &__title {
        font-size: 4.25em;
        line-height: .9;
        font-weight: bold;
        text-shadow: 2px 2px 0px black;
        filter: drop-shadow(0 0 8px rgba(0, 0, 0, 0.5))
    }

    button {
        font-size: 1.5em;
        opacity: 0;
    }

    &__btn-list {
        display: grid;
        gap: .5em;
    }
}



.loaded {
    
    .fade-in {
        animation: opacityOut 1s ease-in-out forwards 0s;
    }

    .menu-content__btn-list button {
        &:nth-child(1) {
            animation: slideLeft .8s ease-in-out forwards 0.2s, opacityIn .8s forwards 0.2s;
        }

        &:nth-child(2) {
            animation: slideLeft .8s ease-in-out forwards 0.4s, opacityIn .8s forwards 0.4s;
        }

        &:nth-child(3) {
            animation: slideLeft .8s ease-in-out forwards 0.6s, opacityIn .8s forwards 0.6s;
        }
    }
}

.fade-in {
    position: absolute;
    pointer-events: none;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: hsl(0, 0%, 0%);
}
</style>