<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import { useData } from 'vitepress'
const { isDark } = useData()
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #sidebar-nav-after>
      <img src="/icons/logo-dark.svg" v-if="isDark" />
      <img src="/icons/logo-light.svg" v-else />
    </template>
  </Layout>
</template>
