<!-- Copyright 2026 OpenObserve Inc.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
-->

<script setup lang="ts">
import { computed } from "vue";
import { useStore } from "vuex";
import useIngestion from "@/composables/useIngestion";
import { b64EncodeStandard } from "@/utils/zincutils";
import { copyToClipboard } from "@/utils/clipboard";
import OBadge from "@/lib/core/Badge/OBadge.vue";
import OBanner from "@/lib/feedback/Banner/OBanner.vue";
import { parseCard } from "./parseCard";
import { renderCardMarkdown, type CardSubstitutions } from "./renderMarkdown";

const props = defineProps<{
  /** Raw `data-source-ui.md` content for this integration. */
  content: string;
  /** Optional documentation URL shown as a footer link. */
  docUrl?: string;
}>();

const store = useStore();
const { endpoint } = useIngestion();

const isDark = computed(() => store.state?.theme === "dark");

const subs = computed<CardSubstitutions>(() => {
  const email = store.state.userInfo?.email ?? "";
  const passcode = store.state.organizationData?.organizationPasscode ?? "";
  return {
    url: endpoint.value?.url ?? "",
    org: store.state.selectedOrganization?.identifier ?? "",
    token: b64EncodeStandard(`${email}:${passcode}`) ?? "",
  };
});

const parsed = computed(() => parseCard(props.content));
const metadata = computed(() => parsed.value.metadata);
const warnings = computed(() => parsed.value.warnings);

const renderedSections = computed(() =>
  parsed.value.sections.map((s) => ({
    title: s.title,
    ...renderCardMarkdown(s.body, subs.value),
  })),
);

// Copy buttons live inside v-html, so we delegate clicks from the container.
// The section index + code index resolve the runnable (substituted) command.
const onContainerClick = (e: MouseEvent) => {
  const target = e.target as HTMLElement;
  const btn = target.closest(".o2-copy-btn");
  if (!btn) return;
  const wrap = btn.closest("[data-section-idx]");
  if (!wrap) return;
  const si = Number(wrap.getAttribute("data-section-idx"));
  const ci = Number(btn.getAttribute("data-code-idx"));
  const code = renderedSections.value[si]?.codeBlocks[ci];
  if (code != null) {
    copyToClipboard(code, {
      successMessage: "Copied to clipboard!",
      errorMessage: "Error while copying content.",
    });
  }
};
</script>

<template>
  <div
    class="o2-card tw:min-w-0"
    :class="isDark ? 'o2-dark' : 'o2-light'"
    data-test="ai-integration-card"
  >
    <div class="o2-card-inner tw:min-w-0">
      <!-- Header chrome -->
      <header class="tw:mb-5">
        <div class="tw:flex tw:items-center tw:gap-2 tw:flex-wrap">
          <h2 class="tw:text-xl tw:font-semibold tw:m-0 tw:leading-tight">
            {{ metadata.displayName }}
          </h2>
          <OBadge v-if="metadata.category" variant="primary-soft" size="sm">
            {{ metadata.category }}
          </OBadge>
          <OBadge v-if="metadata.runtime" variant="default" size="sm">
            {{ metadata.runtime }}
          </OBadge>
        </div>
        <p
          v-if="metadata.tagline"
          class="tw:text-sm tw:opacity-60 tw:mt-1.5 tw:mb-0"
        >
          {{ metadata.tagline }}
        </p>
      </header>

      <!-- Callouts (e.g. codex "logs, not traces") -->
      <OBanner
        v-for="(w, i) in warnings"
        :key="`warn-${i}`"
        variant="warning"
        :content="w"
        class="tw:mb-5"
      />

      <!-- Sections (all open — install guides read top to bottom) -->
      <div class="tw:min-w-0" @click="onContainerClick">
        <section
          v-for="(section, i) in renderedSections"
          :key="section.title"
          class="o2-section tw:min-w-0"
        >
          <h3 class="o2-section-title">{{ section.title }}</h3>
          <div
            :data-section-idx="i"
            class="o2-card-md tw:prose tw:prose-sm tw:max-w-none tw:min-w-0"
            :class="{ 'tw:prose-invert': isDark }"
            v-html="section.html"
          ></div>
        </section>
      </div>

      <!-- Documentation link -->
      <div v-if="docUrl" class="tw:mt-6 tw:text-sm">
        <a
          :href="docUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="tw:text-blue-500 hover:tw:text-blue-600 tw:font-medium tw:inline-flex tw:items-center tw:gap-1"
        >
          View full documentation
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.o2-card {
  padding: 1.5rem 1.75rem;
}

.o2-card-inner {
  max-width: 980px;
}

.o2-section {
  padding: 1.25rem 0;
  border-top: 1px solid rgba(136, 136, 136, 0.18);

  &:first-of-type {
    border-top: none;
    padding-top: 0.25rem;
  }
}

.o2-section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  letter-spacing: 0.01em;
}

/* keep long content inside the card so the page never scrolls sideways */
.o2-card-md {
  min-width: 0;
  overflow-wrap: anywhere;
}

/* ---------- Code blocks (rendered into v-html) ---------- */
.o2-card-md :deep(.o2-code-block) {
  border-radius: 8px;
  overflow: hidden;
  margin: 0.75rem 0;
  border: 1px solid;
}

.o2-card-md :deep(.o2-code-toolbar) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.3rem 0.5rem 0.3rem 0.75rem;
  border-bottom: 1px solid;
}

.o2-card-md :deep(.o2-code-lang) {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.55;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}

.o2-card-md :deep(.o2-copy-btn) {
  font-size: 0.7rem;
  line-height: 1;
  padding: 0.28rem 0.6rem;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid;
  transition: background-color 0.15s ease;
}

.o2-card-md :deep(.o2-code-pre) {
  margin: 0 !important;
  padding: 0.85rem 1rem !important;
  overflow-x: auto;
  background: transparent !important;
  border-radius: 0 !important;
}

.o2-card-md :deep(.o2-code-pre code) {
  background: transparent !important;
  white-space: pre;
  font-size: 0.8125rem;
  line-height: 1.55;
  padding: 0 !important;
}

/* ---------- Inline code: drop prose backtick quotes, subtle chip ---------- */
.o2-card-md :deep(:not(pre) > code)::before,
.o2-card-md :deep(:not(pre) > code)::after {
  content: "" !important;
}

.o2-card-md :deep(:not(pre) > code) {
  background: rgba(136, 136, 136, 0.16);
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  font-weight: 400;
}

/* ---------- Tables: keep inside the card ---------- */
.o2-card-md :deep(table) {
  display: block;
  width: 100%;
  overflow-x: auto;
  font-size: 0.8125rem;
}

/* ===================== LIGHT THEME ===================== */
.o2-light {
  .o2-card-md :deep(.o2-code-block) {
    background: #f6f8fa;
    border-color: rgba(0, 0, 0, 0.1);
  }
  .o2-card-md :deep(.o2-code-toolbar) {
    background: rgba(0, 0, 0, 0.03);
    border-bottom-color: rgba(0, 0, 0, 0.08);
  }
  .o2-card-md :deep(.o2-copy-btn) {
    border-color: rgba(0, 0, 0, 0.14);
    background: rgba(255, 255, 255, 0.7);
    color: #24292e;
  }
  .o2-card-md :deep(.o2-copy-btn:hover) {
    background: #fff;
  }
  .o2-card-md :deep(.o2-code-pre code) {
    color: #24292e;
  }
  // github (light) token palette
  .o2-card-md :deep(.hljs-doctag),
  .o2-card-md :deep(.hljs-keyword),
  .o2-card-md :deep(.hljs-meta .hljs-keyword),
  .o2-card-md :deep(.hljs-template-tag),
  .o2-card-md :deep(.hljs-template-variable),
  .o2-card-md :deep(.hljs-type),
  .o2-card-md :deep(.hljs-variable.language_) {
    color: #d73a49;
  }
  .o2-card-md :deep(.hljs-title),
  .o2-card-md :deep(.hljs-title.class_),
  .o2-card-md :deep(.hljs-title.function_) {
    color: #6f42c1;
  }
  .o2-card-md :deep(.hljs-attr),
  .o2-card-md :deep(.hljs-attribute),
  .o2-card-md :deep(.hljs-literal),
  .o2-card-md :deep(.hljs-meta),
  .o2-card-md :deep(.hljs-number),
  .o2-card-md :deep(.hljs-operator),
  .o2-card-md :deep(.hljs-variable),
  .o2-card-md :deep(.hljs-selector-attr),
  .o2-card-md :deep(.hljs-selector-class),
  .o2-card-md :deep(.hljs-selector-id) {
    color: #005cc5;
  }
  .o2-card-md :deep(.hljs-regexp),
  .o2-card-md :deep(.hljs-string),
  .o2-card-md :deep(.hljs-meta .hljs-string) {
    color: #032f62;
  }
  .o2-card-md :deep(.hljs-built_in),
  .o2-card-md :deep(.hljs-symbol) {
    color: #e36209;
  }
  .o2-card-md :deep(.hljs-comment),
  .o2-card-md :deep(.hljs-code),
  .o2-card-md :deep(.hljs-formula) {
    color: #6a737d;
  }
  .o2-card-md :deep(.hljs-name),
  .o2-card-md :deep(.hljs-quote),
  .o2-card-md :deep(.hljs-selector-tag),
  .o2-card-md :deep(.hljs-selector-pseudo) {
    color: #22863a;
  }
  .o2-card-md :deep(.hljs-section) {
    color: #005cc5;
    font-weight: 600;
  }
}

/* ===================== DARK THEME ===================== */
.o2-dark {
  .o2-card-md :deep(.o2-code-block) {
    background: #0d1117;
    border-color: rgba(255, 255, 255, 0.08);
  }
  .o2-card-md :deep(.o2-code-toolbar) {
    background: rgba(255, 255, 255, 0.04);
    border-bottom-color: rgba(255, 255, 255, 0.08);
  }
  .o2-card-md :deep(.o2-copy-btn) {
    border-color: rgba(255, 255, 255, 0.16);
    background: rgba(255, 255, 255, 0.07);
    color: rgba(255, 255, 255, 0.82);
  }
  .o2-card-md :deep(.o2-copy-btn:hover) {
    background: rgba(255, 255, 255, 0.16);
    color: #fff;
  }
  .o2-card-md :deep(.o2-code-pre code) {
    color: #c9d1d9;
  }
  // github-dark token palette
  .o2-card-md :deep(.hljs-doctag),
  .o2-card-md :deep(.hljs-keyword),
  .o2-card-md :deep(.hljs-meta .hljs-keyword),
  .o2-card-md :deep(.hljs-template-tag),
  .o2-card-md :deep(.hljs-template-variable),
  .o2-card-md :deep(.hljs-type),
  .o2-card-md :deep(.hljs-variable.language_) {
    color: #ff7b72;
  }
  .o2-card-md :deep(.hljs-title),
  .o2-card-md :deep(.hljs-title.class_),
  .o2-card-md :deep(.hljs-title.function_) {
    color: #d2a8ff;
  }
  .o2-card-md :deep(.hljs-attr),
  .o2-card-md :deep(.hljs-attribute),
  .o2-card-md :deep(.hljs-literal),
  .o2-card-md :deep(.hljs-meta),
  .o2-card-md :deep(.hljs-number),
  .o2-card-md :deep(.hljs-operator),
  .o2-card-md :deep(.hljs-variable),
  .o2-card-md :deep(.hljs-selector-attr),
  .o2-card-md :deep(.hljs-selector-class),
  .o2-card-md :deep(.hljs-selector-id) {
    color: #79c0ff;
  }
  .o2-card-md :deep(.hljs-regexp),
  .o2-card-md :deep(.hljs-string),
  .o2-card-md :deep(.hljs-meta .hljs-string) {
    color: #a5d6ff;
  }
  .o2-card-md :deep(.hljs-built_in),
  .o2-card-md :deep(.hljs-symbol) {
    color: #ffa657;
  }
  .o2-card-md :deep(.hljs-comment),
  .o2-card-md :deep(.hljs-code),
  .o2-card-md :deep(.hljs-formula) {
    color: #8b949e;
  }
  .o2-card-md :deep(.hljs-name),
  .o2-card-md :deep(.hljs-quote),
  .o2-card-md :deep(.hljs-selector-tag),
  .o2-card-md :deep(.hljs-selector-pseudo) {
    color: #7ee787;
  }
  .o2-card-md :deep(.hljs-section) {
    color: #1f6feb;
    font-weight: 600;
  }
}
</style>
