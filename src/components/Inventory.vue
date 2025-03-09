<script setup lang="ts">
import type { Player } from '../types/CombatEntity';
import { ContainerContext } from '../types/Item';
import { Window } from '../utils';
import ItemContainer from './ItemContainer.vue';

const props = defineProps<{ player: Player, toggleWindow: (window: Window) => void }>();

</script>

<template>
    <div class="inventory window">
        <div class="window__header">
            <div class="window__name">Inventory {{ player.inventory.length }} / {{ player.inventory.size }}</div>
            <div class="window__close" @click="toggleWindow(Window.Character)">Close</div>
        </div>
        <div class="inventory__content window__content">
            <ItemContainer :container="player.inventory" :context="ContainerContext.Inventory" :player="player"/>
        </div>
    </div>

</template>

<style lang="scss" scoped>
.inventory {
    bottom: 2em;
    right: 2em;
    width: fit-content;
    height: fit-content;

    &__content {
        // overflow-y: scroll;
        // overflow-x: visible;
        height: calc(100% - 2em - 1px);
    }

    
}
</style>