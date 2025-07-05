<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, computed } from 'vue';
import type { Player } from '../types/CombatEntity';

const props = defineProps<{
    player: Player
}>();

// Track which keys have been pressed
const touchedKeys = ref({
    a: false,
    d: false,
    e: false
});

// Check if tutorial should be visible based on player variable
const shouldShowTutorial = computed(() => !props.player.variables["tutorial:base_hotkey"]);

// Track if tutorial should be visible
const isVisible = ref(true);

const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (key === 'a' || key === 'd' || key === 'e') {
        touchedKeys.value[key] = true;
        
        // Check if all keys have been pressed
        if (touchedKeys.value.a && touchedKeys.value.d && touchedKeys.value.e) {            
            // Hide tutorial after a short delay
            setTimeout(() => {
                isVisible.value = false;
                props.player.variables["tutorial:base_hotkey"] = true;
            }, 1000);
        }
    }
};

onMounted(() => {
    window.addEventListener('keydown', onKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', onKeyDown);
});
</script>

<template>
    <div v-if="shouldShowTutorial" class="window tutorial" :class="{ 'hidden': !isVisible }">
        <div class="window__content">
            <div class="hotkey-list">
                <div class="hotkey">
                    <div class="hotkey__key" :class="{ 'touched': touchedKeys.a }">A</div>
                    <div class="hotkey__description">Move Left</div>
                </div>
                <div class="hotkey">
                    <div class="hotkey__key" :class="{ 'touched': touchedKeys.d }">D</div>
                    <div class="hotkey__description">Move Right</div>
                </div>
                <div class="hotkey">
                    <div class="hotkey__key" :class="{ 'touched': touchedKeys.e }">E</div>
                    <div class="hotkey__description">Interact</div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.tutorial {
    top: 2em;
    min-width: 300px;
    justify-self: anchor-center;
    transition: opacity 0.3s ease;

    &.hidden {
        opacity: 0 !important;
        pointer-events: none;
    }

    .hotkey-list {
        display: grid;
        gap: 1em;

        .hotkey {
            display: flex;
            align-items: center;
            gap: 1em;

            &__key {
                width: 40px;
                height: 40px;
                border: 2px solid var(--clr-ui-border);
                border-radius: 8px;
                display: flex;
                justify-content: center;
                align-items: center;
                font-size: 1.5em;
                transition: all 0.3s ease;

                &.touched {
                    background-color: var(--clr-ui-border);
                }
            }

            &__description {
                font-size: 1.2em;
            }
        }
    }

    &__progress {
        margin-top: 1em;
        text-align: center;
        font-size: 0.9em;
        color: var(--clr-ui-text-secondary, #888);

        &--complete {
            color: var(--clr-success, #4ade80);
            font-weight: bold;
        }
    }
}
</style>
