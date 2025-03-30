<script setup lang="ts">
import { ref } from 'vue';
import type { Player } from '../types/CombatEntity';
import { ContainerContext, createItem, Container, type Item, ItemRarity } from '../types/Item';
import ItemContainer from './ItemContainer.vue';
import ItemInline from './ItemInline.vue';

const emit = defineEmits<{
    (e: 'close'): void
}>();

const props = defineProps<{ player: Player, consumable: Item }>();

const selectedItem = ref<Item | null>(null);

const upgradedItem = (item: Item) => {
    if (props.consumable.id === 'enchantment') {
        return {
            ...item,
            rarity: item.rarity > props.consumable.rarity ? item.rarity : props.consumable.rarity,
            enchantmentStats: props.consumable.stats
        };
    }
    else if (props.consumable.id === 'chisel') {
        return {
            ...item,
            sockets: item.sockets ? [...item.sockets, { gem: null }] : [{ gem: null }]
        };
    }
    else if (props.consumable.id === 'gem' && item.sockets) {
        return {
            ...item,
            sockets: item.sockets.map((socket, i) => socket.gem === null && i === item.sockets?.findIndex(s => s.gem === null) ? { gem: props.consumable } : socket),
        };
    }
    return item;
}

const upgrade = () => {
    if (!selectedItem.value) return;


    if (selectedItem.value.uuid === props.player.combat.equipment.weapon.items[0]?.uuid) {
        props.player.combat.equipment.weapon.items = [upgradedItem(selectedItem.value)];
    }
    else {
        props.player.combat.equipment.armor.items = props.player.combat.equipment.armor.items.map(i => i.uuid === selectedItem.value?.uuid ? upgradedItem(i) : i);
    }

    props.player.inventory.remove(props.consumable);
    emit('close');
}

</script>

<template>
    <div class="equipment-upgrade window">
        <div class="window__header">
            <div class="window__name">Equipment Upgrade</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="equipment-upgrade__content window__content">
            <div class="equipment-upgrade__consumable" v-if="consumable.id === 'chisel'">
                Choose an item to add a socket to with a <ItemInline :item="consumable" />
            </div>
            <div class="equipment-upgrade__consumable" v-else-if="consumable.id === 'gem'">
                Choose an item with an empty socket to add a <ItemInline :item="consumable" /> to
            </div>
            <div class="equipment-upgrade__consumable" v-else>
                Choose an item to enchant with a <ItemInline :item="consumable" />
            </div>
            <div class="equipment-upgrade__item-list">
                <ItemContainer v-for="item in player.combat.equipment.armor.items.filter(i => consumable.id === 'gem' ? i.sockets?.some(s => s.gem === null) : true)" :container="({
                    ...player.combat.equipment.armor,
                    items: player.combat.equipment.armor.items.filter(i => i.uuid === item.uuid),
                    size: 1} as Container)" :player="player" :context="ContainerContext.Equipment" @click="selectedItem = item" />
                <ItemContainer v-if="consumable.id !== 'gem' || player.combat.equipment.weapon.items[0]?.sockets?.some(s => s.gem === null)" :container="player.combat.equipment.weapon" :player="player" :context="ContainerContext.EquipmentUpgrade" @click="selectedItem = player.combat.equipment.weapon.items[0]" />
            </div>
            <div class="equipment-upgrade__selected-item" v-if="selectedItem">
                <ItemContainer :container="Container.create(1, [selectedItem])" :player="player" :context="ContainerContext.EquipmentUpgrade" forceTooltip />
                <span>-></span>
                <ItemContainer :container="Container.create(1, [upgradedItem(selectedItem)])" :player="player" :context="ContainerContext.EquipmentUpgrade" forceTooltip />
            </div>
            <div class="button-list">
                <button @click="upgrade">Upgrade</button>
                <button @click="$emit('close')">Cancel</button>
            </div>
        </div>
    </div>

</template>

<style lang="scss">
.equipment-upgrade {
    top: 2em;
    bottom: 2em;
    width: 408px;
    left: calc(50% - 204px);

    .button-list {
        display: flex;
        gap: .5em;
        position: absolute;
        bottom: 1em;
        width: calc(100% - 2em);

        button {
            flex: 1;
        }
    }

    &__item-list {
        display: flex;
        gap: .5em;
    }

    &__selected-item {
        display: flex;
        justify-content: space-between;
        align-items: center;

        .item-container:nth-of-type(2) {
            
            .item__tooltip {
                left: unset !important;
                right: 0 !important;
                bottom: 0;
                translate: 1px 100%;
            }
        }
    }

    .item-container {
        display: flex;
        gap: .5em;
    }

    &__consumable {
        display: inline-block;
        text-align: center;
        line-height: 1.2;
    }
}
</style>