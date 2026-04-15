<script setup lang="ts">
import { computed } from 'vue'
import {
  NInput,
  NInputNumber,
  NSwitch,
  NSelect,
  NTooltip,
  NIcon,
} from 'naive-ui'
import { InformationCircleOutline } from '@vicons/ionicons5'

export interface ConfigFieldDefinition {
  key: string
  label?: string
  type: 'text' | 'number' | 'boolean' | 'select' | 'textarea'
  description?: string
  placeholder?: string
  default?: unknown
  options?: Array<{ label: string, value: string | number }>
  min?: number
  max?: number
  required?: boolean
}

const props = defineProps<{
  field: ConfigFieldDefinition
  value: unknown
  modified?: boolean
  disabled?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:value', value: unknown): void
}>()

const fieldLabel = computed(() => {
  return props.field.label || props.field.key
})

const selectOptions = computed(() => {
  return props.field.options || []
})

const hasDescription = computed(() => {
  return !!props.field.description
})

function handleTextChange(v: string) {
  emit('update:value', v || props.field.default || null)
}

function handleNumberChange(v: number | null) {
  emit('update:value', v)
}

function handleSwitchChange(v: boolean) {
  emit('update:value', v)
}

function handleSelectChange(v: string | number | null) {
  emit('update:value', v)
}

function handleTextareaChange(v: string) {
  emit('update:value', v || props.field.default || null)
}
</script>

<template>
  <div class="config-field" :class="{ 'config-field--modified': modified }">
    <div class="config-field-header">
      <label class="config-field-label">
        {{ fieldLabel }}
        <span v-if="field.required" class="config-field-required">*</span>
      </label>
      <div class="config-field-header-actions">
        <span v-if="modified" class="config-field-modified-badge">已修改</span>
        <NTooltip v-if="hasDescription" trigger="hover" placement="top">
          <template #trigger>
            <NIcon :component="InformationCircleOutline" :size="14" class="config-field-info" />
          </template>
          {{ field.description }}
        </NTooltip>
      </div>
    </div>

    <div class="config-field-control">
      <template v-if="field.type === 'text'">
        <NInput
          :value="(value as string) ?? ''"
          :placeholder="field.placeholder || String(field.default ?? '')"
          :disabled="disabled"
          @update:value="handleTextChange"
        />
      </template>

      <template v-else-if="field.type === 'number'">
        <NInputNumber
          :value="(value as number) ?? null"
          :placeholder="field.placeholder || String(field.default ?? '')"
          :min="field.min"
          :max="field.max"
          :disabled="disabled"
          clearable
          @update:value="handleNumberChange"
        />
      </template>

      <template v-else-if="field.type === 'boolean'">
        <NSwitch
          :value="(value as boolean) ?? false"
          :disabled="disabled"
          @update:value="handleSwitchChange"
        />
      </template>

      <template v-else-if="field.type === 'select'">
        <NSelect
          :value="(value as string | number) ?? null"
          :options="selectOptions"
          :disabled="disabled"
          clearable
          @update:value="handleSelectChange"
        />
      </template>

      <template v-else-if="field.type === 'textarea'">
        <NInput
          type="textarea"
          :value="(value as string) ?? ''"
          :placeholder="field.placeholder || String(field.default ?? '')"
          :disabled="disabled"
          :rows="3"
          @update:value="handleTextareaChange"
        />
      </template>
    </div>

    <p v-if="field.description" class="config-field-description">
      {{ field.description }}
    </p>
  </div>
</template>

<style scoped>
.config-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--bg-secondary);
  border: 1px solid transparent;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.config-field:hover {
  background: var(--bg-card);
}

.config-field--modified {
  border-color: var(--modified-color, #f59e0b);
  background: var(--modified-bg, rgba(245, 158, 11, 0.05));
  box-shadow: 0 0 0 1px var(--modified-color, #f59e0b);
}

.config-field-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.config-field-label {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
}

.config-field-required {
  color: var(--modified-color, #f59e0b);
  margin-left: 2px;
}

.config-field-header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.config-field-modified-badge {
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--modified-badge-bg, rgba(245, 158, 11, 0.15));
  color: var(--modified-badge-color, #f59e0b);
  font-weight: 500;
}

.config-field-info {
  color: var(--text-secondary);
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.config-field-info:hover {
  opacity: 1;
}

.config-field-control {
  width: 100%;
}

.config-field-description {
  font-size: 12px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.4;
}

[data-theme='dark'] .config-field--modified {
  border-color: #fbbf24;
  background: rgba(251, 191, 36, 0.1);
  box-shadow: 0 0 0 1px rgba(251, 191, 36, 0.5);
}

[data-theme='dark'] .config-field-modified-badge {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

[data-theme='dark'] .config-field-required {
  color: #fbbf24;
}

[data-theme='dark'] .config-field:hover {
  background: var(--bg-card);
}
</style>
