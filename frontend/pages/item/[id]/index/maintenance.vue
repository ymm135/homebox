<script setup lang="ts">
  import DatePicker from "~~/components/Form/DatePicker.vue";
  import type { StatsFormat } from "~~/components/global/StatCard/types";
  import type { ItemOut, MaintenanceEntry } from "~~/lib/api/types/data-contracts";
  import MdiPost from "~icons/mdi/post";
  import MdiPlus from "~icons/mdi/plus";
  import MdiCheck from "~icons/mdi/check";
  import MdiDelete from "~icons/mdi/delete";
  import MdiEdit from "~icons/mdi/edit";
  import MdiCalendar from "~icons/mdi/calendar";
  import MdiWrenchClock from "~icons/mdi/wrench-clock";

  const props = defineProps<{
    item: ItemOut;
  }>();

  const api = useUserApi();
  const toast = useNotifier();

  const scheduled = ref(true);

  watch(
    () => scheduled.value,
    () => {
      refreshLog();
    }
  );

  const { data: log, refresh: refreshLog } = useAsyncData(async () => {
    const { data } = await api.items.maintenance.getLog(props.item.id, {
      scheduled: scheduled.value,
      completed: !scheduled.value,
    });
    return data;
  });

  const count = computed(() => {
    if (!log.value) return 0;
    return log.value.entries.length;
  });
  const stats = computed(() => {
    if (!log.value) return [];

    return [
      {
        id: "count",
        title: "总条目数",
        value: count.value || 0,
        type: "number" as StatsFormat,
      },
      {
        id: "total",
        title: "总费用",
        value: log.value.costTotal || 0,
        type: "currency" as StatsFormat,
      },
      {
        id: "average",
        title: "月平均费用",
        value: log.value.costAverage || 0,
        type: "currency" as StatsFormat,
      },
    ];
  });

  const entry = reactive({
    id: null as string | null,
    modal: false,
    name: "",
    completedDate: null as Date | null,
    scheduledDate: null as Date | null,
    description: "",
    cost: "",
  });

  function newEntry() {
    entry.modal = true;
  }

  function resetEntry() {
    console.log("Resetting entry");
    entry.id = null;
    entry.name = "";
    entry.completedDate = null;
    entry.scheduledDate = null;
    entry.description = "";
    entry.cost = "";
  }

  watch(
    () => entry.modal,
    (v, pv) => {
      if (pv === true && v === false) {
        resetEntry();
      }
    }
  );

  // Calls either edit or create depending on entry.id being set
  async function dispatchFormSubmit() {
    if (entry.id) {
      await editEntry();
      return;
    }

    await createEntry();
  }

  async function createEntry() {
    const { error } = await api.items.maintenance.create(props.item.id, {
      name: entry.name,
      completedDate: entry.completedDate ?? "",
      scheduledDate: entry.scheduledDate ?? "",
      description: entry.description,
      cost: parseFloat(entry.cost) ? entry.cost : "0",
    });

    if (error) {
      toast.error("创建条目失败");
      return;
    }

    entry.modal = false;

    refreshLog();
    resetEntry();
  }

  const confirm = useConfirm();

  async function deleteEntry(id: string) {
    const result = await confirm.open("您确定要删除此条目吗？");
    if (result.isCanceled) {
      return;
    }

    const { error } = await api.items.maintenance.delete(props.item.id, id);

    if (error) {
      toast.error("删除条目失败");
      return;
    }
    refreshLog();
  }

  function openEditDialog(e: MaintenanceEntry) {
    entry.id = e.id;
    entry.name = e.name;
    entry.completedDate = new Date(e.completedDate);
    entry.scheduledDate = new Date(e.scheduledDate);
    entry.description = e.description;
    entry.cost = e.cost;
    entry.modal = true;
  }

  async function editEntry() {
    if (!entry.id) {
      return;
    }

    const { error } = await api.items.maintenance.update(props.item.id, entry.id, {
      name: entry.name,
      completedDate: entry.completedDate ?? "null",
      scheduledDate: entry.scheduledDate ?? "null",
      description: entry.description,
      cost: entry.cost,
    });

    if (error) {
      toast.error("更新条目失败");
      return;
    }

    entry.modal = false;
    refreshLog();
  }
</script>

<template>
  <div v-if="log">
    <BaseModal v-model="entry.modal">
      <template #title>
        {{ entry.id ? "编辑条目" : "新建条目" }}
      </template>
      <form @submit.prevent="dispatchFormSubmit">
        <FormTextField v-model="entry.name" autofocus label="条目名称" />
        <DatePicker v-model="entry.completedDate" label="完成日期" />
        <DatePicker v-model="entry.scheduledDate" label="计划日期" />
        <FormTextArea v-model="entry.description" label="备注" />
        <FormTextField v-model="entry.cost" autofocus label="费用" />
        <div class="py-2 flex justify-end">
          <BaseButton type="submit" class="ml-2 mt-2">
            <template #icon>
              <MdiPost />
            </template>
            {{ entry.id ? "更新" : "创建" }}
          </BaseButton>
        </div>
      </form>
    </BaseModal>

    <section class="space-y-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          v-for="stat in stats"
          :key="stat.id"
          class="stats block shadow-xl border-l-primary"
          :title="stat.title"
          :value="stat.value"
          :type="stat.type"
        />
      </div>
      <div class="flex">
        <div class="btn-group">
          <button class="btn btn-sm" :class="`${scheduled ? 'btn-active' : ''}`" @click="scheduled = true">
            计划中
          </button>
          <button class="btn btn-sm" :class="`${scheduled ? '' : 'btn-active'}`" @click="scheduled = false">
            已完成
          </button>
        </div>
        <BaseButton class="ml-auto" size="sm" @click="newEntry()">
          <template #icon>
            <MdiPlus />
          </template>
          新建
        </BaseButton>
      </div>
      <div class="container space-y-6">
        <BaseCard v-for="e in log.entries" :key="e.id">
          <BaseSectionHeader class="p-6 border-b border-b-gray-300">
            <span class="text-base-content">
              {{ e.name }}
            </span>
            <template #description>
              <div class="flex flex-wrap gap-2">
                <div v-if="validDate(e.completedDate)" class="badge p-3">
                  <MdiCheck class="mr-2" />
                  <DateTime :date="e.completedDate" format="human" datetime-type="date" />
                </div>
                <div v-else-if="validDate(e.scheduledDate)" class="badge p-3">
                  <MdiCalendar class="mr-2" />
                  <DateTime :date="e.scheduledDate" format="human" datetime-type="date" />
                </div>
                <div class="tooltip tooltip-primary" data-tip="费用">
                  <div class="badge badge-primary p-3">
                    <Currency :amount="e.cost" />
                  </div>
                </div>
              </div>
            </template>
          </BaseSectionHeader>
          <div class="p-6">
            <Markdown :source="e.description" />
          </div>
          <div class="flex justify-end p-4 gap-1">
            <BaseButton size="sm" @click="openEditDialog(e)">
              <template #icon>
                <MdiEdit />
              </template>
              编辑
            </BaseButton>
            <BaseButton size="sm" @click="deleteEntry(e.id)">
              <template #icon>
                <MdiDelete />
              </template>
              删除
            </BaseButton>
          </div>
        </BaseCard>
        <div class="hidden first:block">
          <button
            type="button"
            class="relative block w-full rounded-lg border-2 border-dashed border-base-content p-12 text-center"
            @click="newEntry()"
          >
            <MdiWrenchClock class="h-16 w-16 inline" />
            <span class="mt-2 block text-sm font-medium text-gray-900"> 创建您的第一个条目 </span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>
