<script setup lang="ts">
  definePageMeta({
    middleware: ["auth"],
  });

  const route = useRoute();
  const api = useUserApi();
  const toast = useNotifier();

  const assetId = computed<string>(() => route.params.id as string);

  const { pending, data: items } = useLazyAsyncData(`asset/${assetId.value}`, async () => {
    const { data, error } = await api.assets.get(assetId.value);
    if (error) {
      toast.error("加载资产失败");
      navigateTo("/home");
      return;
    }
    switch (data.total) {
      case 0:
        toast.error("未找到资产");
        navigateTo("/home");
        break;
      case 1:
        navigateTo(`/item/${data.items[0].id}`, { replace: true, redirectCode: 302 });
        break;
      default:
        return data.items;
    }
  });
</script>

<template>
  <BaseContainer>
    <section v-if="!pending">
      <BaseSectionHeader class="mb-5"> 此资产ID关联多个物品</BaseSectionHeader>
      <div class="grid gap-2 grid-cols-1 sm:grid-cols-2">
        <ItemCard v-for="item in items" :key="item.id" :item="item" />
      </div>
    </section>
  </BaseContainer>
</template>
