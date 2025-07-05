<script setup lang="ts">
import { ref, watch } from 'vue';
import { SETTINGS, toggleFullscreen } from '../utils';

const volume = ref(SETTINGS.value.volume);
const shadows = ref(SETTINGS.value.shadows);
const imageSmoothing = ref(SETTINGS.value.imageSmoothing);

watch([volume, shadows, imageSmoothing], ([newVolume, newShadows, newImageSmoothing]: [number, boolean, boolean]) => {
    SETTINGS.value = {
        volume: newVolume,
        shadows: newShadows,
        imageSmoothing: newImageSmoothing
    };
});
</script>

<template>
    <div class="window settings">
        <div class="window__header">
            <div class="window__name">Settings</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="window__content">
            <div class="setting">
                <label>Sound Volume</label>
                <input type="range" v-model="volume" min="0" max="1" step="0.05">
                <span>{{ Math.round(volume * 100) }}%</span>
            </div>
            <div class="setting">
                <label>Shadows</label>
                <input type="checkbox" v-model="shadows">
            </div>
            <div class="setting">
                <label>Image Smoothing</label>
                <input type="checkbox" v-model="imageSmoothing">
            </div>
            <button @click="toggleFullscreen">Toggle Fullscreen</button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.settings {
    top: 2em;
    min-width: 300px;
    justify-self: anchor-center;
}

.setting {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 1em;
    align-items: center;

    label {
        text-align: right;
    }

    input[type="range"] {
        width: 100%;
    }

    span {
        min-width: 3em;
        text-align: left;
    }
}
</style>
