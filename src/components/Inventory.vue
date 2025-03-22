<script setup lang="ts">
import type { Player } from '../types/CombatEntity';
import { Container, ContainerContext } from '../types/Item';
import ItemContainer from './ItemContainer.vue';

const props = defineProps<{ player: Player, shopContainer?: Container }>();

</script>

<template>
    <div class="inventory window">
        <div class="window__header">
            <div class="window__name">Inventory {{ player.inventory.length }} / {{ player.inventory.size }}</div>
            <div class="window__close btn" @click="$emit('close')">Close</div>
        </div>
        <div class="inventory__content window__content">
            <ItemContainer :container="player.inventory" :context="ContainerContext.Inventory" :player="player" :shopContainer="shopContainer"/>
            <div class="inventory__gold gold">{{ player.gold }} 🪙</div>
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

    &__gold {
        text-align: right;
    }
}
</style>