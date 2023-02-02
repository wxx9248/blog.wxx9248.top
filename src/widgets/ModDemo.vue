<script setup lang="ts">
import { computed, ref } from "vue";
import type { Locale } from "@/i18n/locales";

const props = defineProps<{ lang: Locale }>();

const strings: Record<
  Locale,
  {
    dividend: string;
    divisionByZero: string;
    divisor: string;
    floored: string;
    notIntegers: string;
    truncated: string;
  }
> = {
  en: {
    dividend: "dividend a",
    divisionByZero: "the divisor can't be 0",
    divisor: "divisor b",
    floored: "floored (Python)",
    notIntegers: "enter two whole numbers",
    truncated: "truncated (C)"
  },
  ja: {
    dividend: "被除数 a",
    divisionByZero: "除数を 0 にすることはできません",
    divisor: "除数 b",
    floored: "床関数による剰余（Python）",
    notIntegers: "整数を二つ入力してください",
    truncated: "切り捨てによる剰余（C）"
  },
  zh: {
    dividend: "被除数 a",
    divisionByZero: "除数不能为 0",
    divisor: "除数 b",
    floored: "向下取整式取模（Python）",
    notIntegers: "请输入两个整数",
    truncated: "截断式取模（C）"
  }
};

// Starts on a positive example so the negative case is the reader's discovery
const initialDividend = 17;
const initialDivisor = 5;
const zero = 0;

const dividend = ref<number | string>(initialDividend);
const divisor = ref<number | string>(initialDivisor);
const text = computed(() => strings[props.lang]);

const outcome = computed(() => {
  const a = dividend.value;
  const b = divisor.value;
  if (!Number.isInteger(a) || !Number.isInteger(b)) {
    return { message: text.value.notIntegers };
  }
  if (b === zero) {
    return { message: text.value.divisionByZero };
  }
  const [x, y] = [Number(a), Number(b)];
  return {
    floored: x - y * Math.floor(x / y),
    truncated: x - y * Math.trunc(x / y)
  };
});
</script>

<template>
  <div class="mod-demo">
    <div class="inputs">
      <label>
        <span>{{ text.dividend }}</span>
        <input v-model.number="dividend" class="field" type="number" step="1" />
      </label>
      <label>
        <span>{{ text.divisor }}</span>
        <input v-model.number="divisor" class="field" type="number" step="1" />
      </label>
    </div>
    <p v-if="'message' in outcome" class="message">{{ outcome.message }}</p>
    <dl v-else class="results">
      <dt>{{ text.truncated }}</dt>
      <dd data-result="truncated">{{ outcome.truncated }}</dd>
      <dt>{{ text.floored }}</dt>
      <dd data-result="floored">{{ outcome.floored }}</dd>
    </dl>
  </div>
</template>

<style scoped src="./widget.css"></style>

<style scoped>
.inputs {
  display: grid;
  gap: var(--space-2);
}

@container (width >= 30rem) {
  .inputs {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
