<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import MarkdownIt from 'markdown-it';
import changelogData from '../changelog.json';
import guideMarkdown from '../guide.md?raw';

interface GuideSection {
    title: string;
    content: string;
}

const md = new MarkdownIt();

const guideSections = ref<GuideSection[]>([]);
const selectedSection = ref<GuideSection | null>(null);

const generateChangelogMarkdown = (changelogData: any): string => {
    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}.${month}.${year}`;
    };

    const entries = Object.values(changelogData).reverse(); // Reverse to show newest first
    return entries.map((entry: any) => {
        const changes = entry.changes.map((change: string) => `* ${change}`).join('\n');
        const formattedDate = formatDate(entry.date);
        return `## \`[${entry.version}]\` ${entry.title}\n \`${formattedDate}\`\n${changes}`;
    }).join('\n\n');
};

onMounted(async () => {
    // Use imported guide markdown
    const sectionsRaw = guideMarkdown.split(/^# /m).slice(1);

    guideSections.value = sectionsRaw.map(sectionText => {
        const lines = sectionText.trim().split('\n');
        const title = lines.shift()?.trim() || '';
        const content = lines.join('\n').trim();
        return { title, content };
    });

    // Use imported changelog data
    try {
        const changelogContent = generateChangelogMarkdown(changelogData);
        
        guideSections.value.push({
            title: 'Changelog',
            content: changelogContent
        });
    } catch (error) {
        console.error('Failed to process changelog:', error);
    }

    if (guideSections.value.length > 0) {
        selectedSection.value = guideSections.value[0];
    }
});

const selectSection = (section: GuideSection) => {
    selectedSection.value = section;
};

const renderedContent = computed(() => {
    if (!selectedSection.value) return '';
    return md.render(selectedSection.value.content);
});
</script>

<template>
    <div class="window guide">
        <div class="window__header">
            <div class="window__name">Guide Book</div>
            <div class="window__close btn" @click="$emit('close')">×</div>
        </div>
        <div class="window__content">
            <div class="guide__nav">
                <ul>
                    <li v-for="section in guideSections" :key="section.title" @click="selectSection(section)" :class="{ 'active': selectedSection === section }">
                        {{ section.title }}
                    </li>
                </ul>
            </div>
            <div class="guide__content-pane" v-if="selectedSection">
                <h2>{{ selectedSection.title }}</h2>
                <div v-html="renderedContent" class="markdown-content"></div>
            </div>
        </div>
    </div>
</template>

<style lang="scss">
.guide {
    inset: 2em;
    
    .window__content {
        display: flex;
        flex-direction: row;
        height: calc(100% - 2em - 8px);
    }

    .guide__nav {
        width: 200px;
        border-right: 4px solid var(--clr-ui-border);
        padding: 1em;
        overflow-y: auto;

        ul {
            list-style: none;
            padding: 0;
            margin: 0;
        }

        li {
            cursor: pointer;
            padding: 0.5em;

            &:hover, &.active {
                background-color: hsla(0, 0%, 100%, 0.1);
            }
        }
    }

    .guide__content-pane {
        padding: 1em;
        overflow-y: auto;
        flex: 1;

        h2:not(:first-child) {
            margin-top: 1em;
        }

        h2 {
            margin-bottom: .5em;
        }

        .markdown-content {
            line-height: 1.6;

            p {
                margin-bottom: 1em;
            }

            ul {
                padding-left: 1.5em;
                margin-bottom: 1em;
            }

            li {
                margin-bottom: 0.5em;
            }

            strong {
                font-weight: bold;
            }

            em {
                font-style: italic;
            }
        }
    }
}
</style>
