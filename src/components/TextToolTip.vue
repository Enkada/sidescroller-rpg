<script setup lang="ts">

const props = defineProps<{ text: string }>();

</script>

<template>
    <span class="text-tooltip">{{ text }}
        <div class="tooltip">
            <slot></slot>
        </div>
    </span>
</template>

<style lang="scss" scoped>
.text-tooltip {
    text-decoration: underline dotted;
    text-underline-offset: 4px;
    text-decoration-color: gray;
    text-decoration-thickness: 2px;
    position: relative;

    &:hover .tooltip {        
        display: block;
    }
}

.tooltip {
    display: none;
    font-size: 1rem;
    right: 0;
    translate: 100% 0;
}
</style>