<script setup lang="ts">
import { ref, computed } from 'vue';
import { CombatEntity, type Player } from '../types/CombatEntity';
import type { LootTable, Item } from '../types/Item';
import type { Screen, SaveData } from '../utils';
import { Container, createItem } from '../types/Item';
import { createSprite, SPRITES } from '../types/Sprite';

const props = defineProps<{
    player?: Player
    currentScreen?: Screen
    screenRandom?: number
    screenEnemy?: {
        combat: CombatEntity
        lootTable: LootTable
        position: "left" | "right"
    } | null
    isMainMenu?: boolean
}>();

const emit = defineEmits<{
    close: []
    load: [data: SaveData]
}>();

const saveSlots = ref<Array<SaveData | null>>(Array(16).fill(null));

// Load saves from localStorage on mount
const loadSavesFromStorage = () => {
    for (let i = 0; i < 16; i++) {
        const savedData = localStorage.getItem(`save_slot_${i}`);
        if (savedData) {
            try {
                saveSlots.value[i] = JSON.parse(savedData);
            } catch (e) {
                console.error(`Failed to load save slot ${i}:`, e);
            }
        }
    }
};

const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${day}.${month}.${year} ${hours}:${minutes}`;
};

const saveGame = (slotIndex: number) => {
    if (!props.player || !props.currentScreen || props.screenRandom === undefined) {
        console.error('Cannot save game: missing required data');
        return;
    }
    
    props.player.variables.last_save_time = new Date().toISOString();
    
    const saveData: SaveData = {
        player: props.player,
        currentScreen: props.currentScreen,
        screenRandom: props.screenRandom,
        screenEnemy: props.screenEnemy || null
    };
    
    saveSlots.value[slotIndex] = saveData;
    localStorage.setItem(`save_slot_${slotIndex}`, JSON.stringify(saveData));
};

const deleteSave = (slotIndex: number) => {
    const confirmed = confirm(`Are you sure you want to delete save slot ${slotIndex + 1}? This action cannot be undone.`);
    if (confirmed) {
        saveSlots.value[slotIndex] = null;
        localStorage.removeItem(`save_slot_${slotIndex}`);
    }
};

const reloadSprite = (spriteData: any) => {
    if (!spriteData || !spriteData.src) return spriteData;
    
    try {
        const newSprite = createSprite(
            spriteData.src,
            spriteData.width,
            spriteData.height,
            spriteData.frameCount,
            spriteData.animationSpeed
        );
        
        return {
            ...spriteData,
            image: newSprite.image
        };
    } catch (error) {
        console.warn('Failed to reload sprite:', spriteData.src, error);
        return spriteData;
    }
};

const reloadSpriteSet = (spriteSetData: any) => {
    if (!spriteSetData) return spriteSetData;
    
    return {
        idle: reloadSprite(spriteSetData.idle),
        attack: reloadSprite(spriteSetData.attack),
        hit: reloadSprite(spriteSetData.hit),
        death: reloadSprite(spriteSetData.death)
    };
};

const recreateContainer = (containerData: any): Container => {
    const container = Container.create(containerData.size);
    
    // Recreate items with proper structure
    container.items = containerData.items.map((itemData: any) => {
        const item = createItem(itemData.id, itemData.count || 1);
        // Preserve additional properties like uuid, enchantmentStats, etc.
        return {
            ...item,
            ...itemData
        };
    });
    
    return container;
};

const recreateCombatEntity = (entityData: any): CombatEntity => {
    try {
        const entity = CombatEntity.create(
            entityData.id,
            entityData.name,
            entityData.level,
            entityData.attributes,
            entityData.spriteId || 'player',
            entityData.attackSound
        );
        
        // Restore all properties
        Object.assign(entity, {
            ...entityData,
            // Recreate containers properly
            equipment: {
                weapon: recreateContainer(entityData.equipment.weapon),
                armor: recreateContainer(entityData.equipment.armor),
                ring: recreateContainer(entityData.equipment.ring),
                amulet: recreateContainer(entityData.equipment.amulet),
                relic: recreateContainer(entityData.equipment.relic)
            },
            // Reload sprite set
            sprite: reloadSpriteSet(entityData.sprite)
        });
        
        return entity;
    } catch (error) {
        console.error('Failed to recreate combat entity:', error);
        // Return a fallback entity if creation fails
        return CombatEntity.create(
            entityData.id || 'player',
            entityData.name || 'Unknown',
            entityData.level || 1,
            entityData.attributes || { intelligence: 0, strength: 0, agility: 0 },
            'player',
            entityData.attackSound || { id: 'attack', volume: 0.8, variations: 4 }
        );
    }
};

const loadGame = (slotIndex: number) => {
    const saveData = saveSlots.value[slotIndex];
    if (!saveData) return;
    
    try {
        // Recreate player with proper Container instances
        const loadedPlayer: Partial<Player> = {
            ...saveData.player,
            inventory: recreateContainer(saveData.player.inventory),
            combat: recreateCombatEntity(saveData.player.combat),
            sprite: {
                run: reloadSprite(saveData.player.sprite.run),
                idleUnarmed: reloadSprite(saveData.player.sprite.idleUnarmed)
            }
        };
        
        // Recreate screen enemy if exists
        let loadedScreenEnemy = null;
        if (saveData.screenEnemy) {
            loadedScreenEnemy = {
                ...saveData.screenEnemy,
                combat: recreateCombatEntity(saveData.screenEnemy.combat)
            };
        }
        
        // Reload screen object sprites if they exist
        const loadedCurrentScreen = { ...saveData.currentScreen };
        if (loadedCurrentScreen.objects) {
            loadedCurrentScreen.objects = loadedCurrentScreen.objects.map(obj => ({
                ...obj,
                sprite: reloadSprite(obj.sprite),
                container: obj.container ? recreateContainer(obj.container) : undefined
            }));
        }
        
        emit('load', {
            player: loadedPlayer as Player,
            currentScreen: loadedCurrentScreen,
            screenRandom: saveData.screenRandom,
            screenEnemy: loadedScreenEnemy
        });
    } catch (error) {
        console.error('Failed to load game:', error);
        alert('Failed to load save file. The save may be corrupted or from an incompatible version.');
    }
};

const exportSave = (slotIndex: number) => {
    const saveData = saveSlots.value[slotIndex];
    if (!saveData) return;
    
    const now = new Date();
    const timestamp = now.toISOString().replace(/[-:]/g, '').replace(/\..+/, '').replace('T', '');
    const filename = `save_${timestamp}.json`;
    
    const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const importSave = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const saveData = JSON.parse(e.target?.result as string);
                // Find first empty slot or ask user which slot to use
                const emptySlotIndex = saveSlots.value.findIndex(slot => slot === null);
                const slotIndex = emptySlotIndex !== -1 ? emptySlotIndex : 0;
                
                saveSlots.value[slotIndex] = saveData;
                localStorage.setItem(`save_slot_${slotIndex}`, JSON.stringify(saveData));
            } catch (error) {
                console.error('Failed to import save:', error);
                alert('Failed to import save file. Please check the file format.');
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
};

// Load saves when component mounts
loadSavesFromStorage();

</script>

<template>
    <div class="window save-load">
        <div class="window__header">
            <div class="window__name">Save and Load</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="window__content">
            <div class="save-controls">
                <button @click="importSave">Import</button>
            </div>
            
            <div class="slot-list">
                <div 
                    v-for="(save, index) in saveSlots" 
                    :key="index"
                    class="slot"
                    :style="save ? { backgroundImage: `url(/bg/${save.currentScreen.background})` } : {}"
                >
                    <!-- <div class="slot__number">{{ index + 1 }}</div> --> 
                    
                    <div v-if="save" class="slot__content">
                        <div class="slot__info">
                            <div class="slot__info__screen">{{ save.currentScreen.name }}</div>
                            <div class="slot__info__level">Level {{ save.player.combat.level }}</div>
                            <div class="slot__info__time">{{ save.player.variables.last_save_time ? formatTimestamp(save.player.variables.last_save_time) : 'Unknown' }}</div>
                        </div>

                        <div class="slot__btn-list">
                            <button class="btn-load" @click="loadGame(index)">📥</button>
                            <button class="btn-save" v-if="!props.isMainMenu" @click="saveGame(index)">💾</button>
                            <button class="btn-export" @click="exportSave(index)">📃</button>
                            <button class="btn-delete" @click="deleteSave(index)">❌</button>
                        </div>
                    </div>
                    
                    <div v-else class="slot__content slot__content--empty">
                        <div class="slot__info">Empty Slot</div>
                        <button class="btn btn-save" v-if="!props.isMainMenu" @click="saveGame(index)">💾</button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.save-load {
    inset: 2em;
    
    .window__content {
        display: flex;
        flex-direction: column;
        height: calc(100% - 2em - 1px);
    }
    
    .slot-list {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        grid-template-rows: repeat(4, 1fr);
        gap: 1em;
        flex: 1 1 auto;
        overflow-y: auto;

        .slot {
            background-size: cover;
            background-position: center;
            border: 2px solid var(--clr-ui-border);
            border-radius: 4px;
            box-shadow: 0 0 8px 2px rgba(0, 0, 0, 0.5);

            &__content {
                height: 100%;
                padding: .5em;                
                display: grid;
                grid-template-rows: auto max-content;
                background-color: hsl(0, 0%, 0%, 0.5);

                &--empty {
                    
                    .slot__info {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        color: hsl(0, 0%, 30%);
                    }
                }
            }

            &__info {
                display: grid;
                grid-template-columns: 1fr 1fr;
                grid-template-rows: auto auto;
                gap: 0.25em 0.5em;
                text-shadow: 1px 1px 2px black;

                &__screen {
                    grid-column: 1;
                    grid-row: 1;
                    font-weight: bold;
                    font-size: 1.2em;
                }

                &__level {
                    grid-column: 2;
                    grid-row: 1;
                    text-align: right;
                }

                &__time {
                    grid-column: 1 / span 2;
                    grid-row: 2;
                    font-size: 0.9em;
                    opacity: 0.7;
                }
            }

            &__btn-list {
                display: flex;
                justify-content: space-between;
                gap: 0.5em;

                & > button {
                    flex: 1;
                }
            }
        }
    }
}
</style>
