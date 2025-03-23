<script setup lang="ts">
import type { CombatEntity, Player } from '../types/CombatEntity';
import { Container, ContainerContext, type Item } from '../types/Item';
import ItemContainer from './ItemContainer.vue';

const props = defineProps<{ player: Player, shopContainer?: Container, enemy?: CombatEntity }>();

const emit = defineEmits<{
    (e: 'close'): void
    (e: 'useItem', item: Item): void
}>();

</script>

<template>
    <div class="inventory window">
        <div class="window__header">
            <div class="window__name">Inventory {{ player.inventory.length }} / {{ player.inventory.size }}</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="inventory__content window__content">
            <ItemContainer :container="player.inventory" :context="ContainerContext.Inventory" :player="player" :shopContainer="shopContainer" :enemy="enemy" @useItem="(item) => emit('useItem', item)"/>
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