<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import Footer from './footer.vue'
const { Layout } = DefaultTheme
</script>

<template>
  <Layout>
    <template #sidebar-nav-after>
      <img src="/icons/logo-light.svg" class="only-light" />
      <img src="/icons/logo-dark.svg" class="only-dark" />
    </template>
  </Layout>
</template>
