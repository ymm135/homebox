<script setup lang="ts">
  import { useTreeState } from "~~/components/Location/Tree/tree-state";
  import MdiCollapseAllOutline from "~icons/mdi/collapse-all-outline";

  definePageMeta({
    middleware: ["auth"],
  });

  useHead({
    title: "Homebox | 位置",
  });

  const api = useUserApi();

  const { data: tree } = useAsyncData(async () => {
    const { data, error } = await api.locations.getTree({
      withItems: true,
    });

    if (error) {
      return [];
    }

    return data;
  });

  const locationTreeId = "locationTree";

  const treeState = useTreeState(locationTreeId);

  const route = useRouter();

  onMounted(() => {
    // set tree state from query params
    const query = route.currentRoute.value.query;

    if (query && query[locationTreeId]) {
      console.debug("setting tree state from query params");
      const data = JSON.parse(query[locationTreeId] as string);

      for (const key in data) {
        treeState.value[key] = data[key];
      }
    }
  });

  watch(
    treeState,
    () => {
      // Push the current state to the URL
      route.replace({ query: { [locationTreeId]: JSON.stringify(treeState.value) } });
    },
    { deep: true }
  );

  function closeAll() {
    for (const key in treeState.value) {
      treeState.value[key] = false;
    }
  }
</script>

<template>
  <BaseContainer class="mb-16">
    <BaseSectionHeader> 位置 </BaseSectionHeader>
    <BaseCard>
      <div class="p-4">
        <div class="flex justify-end mb-2">
          <div class="btn-group">
            <button class="btn btn-sm tooltip tooltip-top" data-tip="折叠树" @click="closeAll">
              <MdiCollapseAllOutline />
            </button>
          </div>
        </div>
        <LocationTreeRoot v-if="tree" :locs="tree" :tree-id="locationTreeId" />
      </div>
    </BaseCard>
  </BaseContainer>
</template>
