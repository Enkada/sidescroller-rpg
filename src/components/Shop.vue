<script setup lang="ts">
import type { Player } from '../types/CombatEntity';
import { ContainerContext, type Container } from '../types/Item';
import ItemContainer from './ItemContainer.vue';

const props = defineProps<{ player: Player, shopContainer: Container }>();

</script>

<template>
    <div class="shop window">
        <div class="window__header">
            <div class="window__name">Shop </div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="shop__content window__content">
            <ItemContainer :container="shopContainer" :context="ContainerContext.Shop" :player="player"/>
        </div>
    </div>

</template>

<style lang="scss" scoped>
.shop {
    top: 2em;
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