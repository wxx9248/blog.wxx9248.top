<script setup lang="ts">
import { computed, ref } from "vue";
import type { Locale } from "@/i18n/locales";
import { convertBilibiliId } from "@/lib/bilibili/id";

const props = defineProps<{ lang: Locale }>();

const strings: Record<
  Locale,
  { input: string; invalid: string; result: string }
> = {
  en: {
    input: "AV or BV id",
    invalid: "not a valid AV or BV id",
    result: "result"
  },
  ja: {
    input: "AV/BV 番号",
    invalid: "有効な AV/BV 番号ではありません",
    result: "変換結果"
  },
  zh: {
    input: "AV/BV 号",
    invalid: "不是有效的 AV/BV 号",
    result: "查询结果"
  }
};

const id = ref("av170001");
const text = computed(() => strings[props.lang]);
const result = computed(() => convertBilibiliId(id.value));
</script>

<template>
  <div class="id-converter">
    <label>
      <span>{{ text.input }}</span>
      <input v-model="id" autocomplete="off" spellcheck="false" />
    </label>
    <p v-if="result === null" class="message">{{ text.invalid }}</p>
    <dl v-else class="results">
      <dt>{{ text.result }}</dt>
      <dd data-result="id">{{ result }}</dd>
    </dl>
  </div>
</template>

<style scoped>
.id-converter {
  font-family: var(--font-mono);
  font-size: var(--text-chrome);
}

label {
  display: grid;
  gap: var(--space-1);
}

input {
  min-height: var(--tap-min);
  padding: 0 var(--space-2);
  border: 1px solid var(--color-border-input);
  border-radius: var(--radius);
  background: var(--color-bg-page);
  color: var(--color-text-primary);
  font: inherit;
}

.results {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: var(--space-1) 2ch;
  margin: var(--space-3) 0 0;
}

dd {
  margin: 0;
  color: var(--color-text-highlight);
  font-weight: 700;
}

.message {
  margin: var(--space-3) 0 0;
  color: var(--color-text-muted);
}
</style>
