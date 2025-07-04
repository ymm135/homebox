<script setup lang="ts">
  import type { AnyDetail, Detail, Details } from "~~/components/global/DetailsSection/types";
  import { filterZeroValues } from "~~/components/global/DetailsSection/types";
  import type { ItemAttachment } from "~~/lib/api/types/data-contracts";
  import MdiClose from "~icons/mdi/close";
  import MdiPackageVariant from "~icons/mdi/package-variant";
  import MdiPlus from "~icons/mdi/plus";
  import MdiMinus from "~icons/mdi/minus";
  import MdiDownload from "~icons/mdi/download";

  definePageMeta({
    middleware: ["auth"],
  });

  const route = useRoute();
  const api = useUserApi();
  const toast = useNotifier();

  const itemId = computed<string>(() => route.params.id as string);
  const preferences = useViewPreferences();

  const hasNested = computed<boolean>(() => {
    return route.fullPath.split("/").at(-1) !== itemId.value;
  });

  const { data: item, refresh } = useAsyncData(itemId.value, async () => {
    const { data, error } = await api.items.get(itemId.value);
    if (error) {
      toast.error("加载物品失败");
      navigateTo("/home");
      return;
    }
    return data;
  });
  onMounted(() => {
    refresh();
  });

  const lastRoute = ref(route.fullPath);
  watchEffect(() => {
    if (lastRoute.value.endsWith("edit")) {
      refresh();
    }

    lastRoute.value = route.fullPath;
  });

  async function adjustQuantity(amount: number) {
    if (!item.value) {
      return;
    }

    const newQuantity = item.value.quantity + amount;
    if (newQuantity < 0) {
      toast.error("数量不能为负数");
      return;
    }

    const resp = await api.items.patch(item.value.id, {
      id: item.value.id,
      quantity: newQuantity,
    });

    if (resp.error) {
      toast.error("调整数量失败");
      return;
    }

    item.value.quantity = newQuantity;
  }

  type FilteredAttachments = {
    attachments: ItemAttachment[];
    warranty: ItemAttachment[];
    manuals: ItemAttachment[];
    receipts: ItemAttachment[];
  };

  type Photo = {
    src: string;
  };

  const photos = computed<Photo[]>(() => {
    return (
      item.value?.attachments.reduce((acc, cur) => {
        if (cur.type === "photo") {
          acc.push({
            // @ts-expect-error - it's impossible for this to be null at this point
            src: api.authURL(`/items/${item.value.id}/attachments/${cur.id}`),
          });
        }
        return acc;
      }, [] as Photo[]) || []
    );
  });

  const attachments = computed<FilteredAttachments>(() => {
    if (!item.value) {
      return {
        attachments: [],
        manuals: [],
        warranty: [],
        receipts: [],
      };
    }

    return item.value.attachments.reduce(
      (acc, attachment) => {
        if (attachment.type === "photo") {
          return acc;
        }
        if (attachment.type === "warranty") {
          acc.warranty.push(attachment);
        } else if (attachment.type === "manual") {
          acc.manuals.push(attachment);
        } else if (attachment.type === "receipt") {
          acc.receipts.push(attachment);
        } else {
          acc.attachments.push(attachment);
        }
        return acc;
      },
      {
        attachments: [] as ItemAttachment[],
        warranty: [] as ItemAttachment[],
        manuals: [] as ItemAttachment[],
        receipts: [] as ItemAttachment[],
      }
    );
  });

  const assetID = computed<Details>(() => {
    if (!item.value) {
      return [];
    }

    if (item.value?.assetId === "000-000") {
      return [];
    }

    return [
      {
        name: "资产编号",
        text: item.value?.assetId,
      },
    ];
  });

  const itemDetails = computed<Details>(() => {
    if (!item.value) {
      return [];
    }

    const ret: Details = [
      {
        name: "数量",
        text: item.value?.quantity,
        slot: "quantity",
      },
      {
        name: "序列号",
        text: item.value?.serialNumber,
        copyable: true,
      },
      {
        name: "型号",
        text: item.value?.modelNumber,
        copyable: true,
      },
      {
        name: "制造商",
        text: item.value?.manufacturer,
        copyable: true,
      },
      {
        name: "已投保",
        text: item.value?.insured ? "是" : "否",
      },
      {
        name: "备注",
        type: "markdown",
        text: item.value?.notes,
      },
      ...assetID.value,
      ...item.value.fields.map(field => {
        /**
         * Support Special URL Syntax
         */
        const url = maybeUrl(field.textValue);
        if (url.isUrl) {
          return {
            type: "link",
            name: field.name,
            text: url.text,
            href: url.url,
          } as AnyDetail;
        }

        return {
          name: field.name,
          text: field.textValue,
        };
      }),
    ];

    if (!preferences.value.showEmpty) {
      return filterZeroValues(ret);
    }

    return ret;
  });

  const showAttachments = computed(() => {
    if (preferences.value?.showEmpty) {
      return true;
    }

    return (
      attachments.value.attachments.length > 0 ||
      attachments.value.warranty.length > 0 ||
      attachments.value.manuals.length > 0 ||
      attachments.value.receipts.length > 0
    );
  });

  const attachmentDetails = computed(() => {
    const details: Detail[] = [];

    const push = (name: string) => {
      details.push({
        name,
        text: "",
        slot: name.toLowerCase(),
      });
    };

    if (attachments.value.attachments.length > 0) {
      push("附件");
    }

    if (attachments.value.warranty.length > 0) {
      push("保修");
    }

    if (attachments.value.manuals.length > 0) {
      push("手册");
    }

    if (attachments.value.receipts.length > 0) {
      push("收据");
    }

    return details;
  });

  const showWarranty = computed(() => {
    if (preferences.value.showEmpty) {
      return true;
    }
    return validDate(item.value?.warrantyExpires);
  });

  const warrantyDetails = computed(() => {
    const details: Details = [
      {
        name: "终身保修",
        text: item.value?.lifetimeWarranty ? "是" : "否",
      },
    ];

    if (item.value?.lifetimeWarranty) {
      details.push({
        name: "保修到期",
        text: "不适用",
      });
    } else {
      details.push({
        name: "Warranty Expires",
        text: item.value?.warrantyExpires || "",
        type: "date",
        date: true,
      });
    }

    details.push({
      name: "保修详情",
      type: "markdown",
      text: item.value?.warrantyDetails || "",
    });

    if (!preferences.value.showEmpty) {
      return filterZeroValues(details);
    }

    return details;
  });

  const showPurchase = computed(() => {
    if (preferences.value.showEmpty) {
      return true;
    }
    return item.value?.purchaseFrom || item.value?.purchasePrice !== "0";
  });

  const purchaseDetails = computed<Details>(() => {
    const v: Details = [
      {
        name: "购买来源",
        text: item.value?.purchaseFrom || "",
      },
      {
        name: "购买价格",
        text: item.value?.purchasePrice || "",
        type: "currency",
      },
      {
        name: "购买日期",
        text: item.value?.purchaseTime || "",
        type: "date",
        date: true,
      },
    ];

    if (!preferences.value.showEmpty) {
      return filterZeroValues(v);
    }

    return v;
  });

  const showSold = computed(() => {
    if (preferences.value.showEmpty) {
      return true;
    }
    return item.value?.soldTo || item.value?.soldPrice !== "0";
  });

  const soldDetails = computed<Details>(() => {
    const v: Details = [
      {
        name: "售给",
        text: item.value?.soldTo || "",
      },
      {
        name: "售价",
        text: item.value?.soldPrice || "",
        type: "currency",
      },
      {
        name: "售出日期",
        text: item.value?.soldTime || "",
        type: "date",
        date: true,
      },
    ];

    if (!preferences.value.showEmpty) {
      return filterZeroValues(v);
    }

    return v;
  });

  const refDialog = ref<HTMLDialogElement>();
  const dialoged = reactive({
    src: "",
  });

  function openDialog(img: Photo) {
    // @ts-ignore - I don't know why this is happening
    refDialog.value?.showModal();
    dialoged.src = img.src;
  }

  function closeDialog() {
    // @ts-ignore - I don't know why this is happening
    refDialog.value?.close();
  }

  const refDialogBody = ref<HTMLDivElement>();
  onClickOutside(refDialogBody, () => {
    closeDialog();
  });

  const currentPath = computed(() => {
    return route.path;
  });

  const tabs = computed(() => {
    return [
      {
        id: "details",
        name: "详情",
        to: `/item/${itemId.value}`,
      },
      {
        id: "log",
        name: "维护",
        to: `/item/${itemId.value}/maintenance`,
      },
      {
        id: "edit",
        name: "编辑",
        to: `/item/${itemId.value}/edit`,
      },
    ];
  });

  const fullpath = computedAsync(async () => {
    if (!item.value) {
      return [];
    }

    const resp = await api.items.fullpath(item.value.id);
    if (resp.error) {
      toast.error("加载物品失败");
      return [];
    }

    return resp.data;
  });

  const items = computedAsync(async () => {
    if (!item.value) {
      return [];
    }

    const resp = await api.items.getAll({
      parentIds: [item.value.id],
    });

    if (resp.error) {
      toast.error("加载物品失败");
      return [];
    }

    return resp.data.items;
  });
</script>

<template>
  <BaseContainer v-if="item" class="pb-8">
    <Title>{{ item.name }}</Title>
    <dialog ref="refDialog" class="z-[999] fixed bg-transparent">
      <div ref="refDialogBody" class="relative">
        <div class="absolute right-0 -mt-3 -mr-3 sm:-mt-4 sm:-mr-4 space-x-1">
          <a class="btn btn-sm sm:btn-md btn-primary btn-circle" :href="dialoged.src" download>
            <MdiDownload class="h-5 w-5" />
          </a>
          <button class="btn btn-sm sm:btn-md btn-primary btn-circle" @click="closeDialog()">
            <MdiClose class="h-5 w-5" />
          </button>
        </div>

        <img class="max-w-[80vw] max-h-[80vh]" :src="dialoged.src" />
      </div>
    </dialog>

    <section>
      <div class="bg-base-100 rounded p-3">
        <header class="mb-2">
          <div class="flex flex-wrap items-end gap-2">
            <div class="avatar placeholder mb-auto">
              <div class="bg-neutral-focus text-neutral-content rounded-full w-12">
                <MdiPackageVariant class="h-7 w-7" />
              </div>
            </div>
            <div>
              <div v-if="fullpath && fullpath.length > 0" class="text-sm breadcrumbs pt-0 pb-0">
                <ul class="text-base-content/70">
                  <li v-for="part in fullpath" :key="part.id">
                    <NuxtLink :to="`/${part.type}/${part.id}`"> {{ part.name }}</NuxtLink>
                  </li>
                </ul>
              </div>
              <h1 class="text-2xl pb-1">
                {{ item ? item.name : "" }}
              </h1>
              <div class="flex gap-1 flex-wrap text-xs">
                <div>
                  创建于
                  <DateTime :date="item?.createdAt" />
                </div>
                -
                <div>
                  更新于
                  <DateTime :date="item?.updatedAt" />
                </div>
              </div>
            </div>
          </div>
        </header>
        <div class="divider my-0 mb-1"></div>
        <div class="p-1 prose max-w-[100%]">
          <Markdown v-if="item && item.description" class="text-base" :source="item.description"> </Markdown>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between mb-6 mt-3">
        <div class="btn-group">
          <NuxtLink
            v-for="t in tabs"
            :key="t.id"
            :to="t.to"
            class="btn btn-sm"
            :class="`${t.to === currentPath ? 'btn-active' : ''}`"
          >
            {{ t.name }}
          </NuxtLink>
        </div>
      </div>
    </section>

    <section>
      <div class="space-y-6">
        <BaseCard v-if="!hasNested" collapsable>
          <template #title> 详情 </template>
          <template #title-actions>
            <div class="flex flex-wrap justify-between items-center mt-2 gap-4">
              <label class="label cursor-pointer">
                <input v-model="preferences.showEmpty" type="checkbox" class="toggle toggle-primary" />
                <span class="label-text ml-4"> 显示空值 </span>
              </label>
              <PageQRCode />
            </div>
          </template>
          <DetailsSection :details="itemDetails">
            <template #quantity="{ detail }">
              {{ detail.text }}
              <span
                class="opacity-0 group-hover:opacity-100 ml-4 my-0 duration-75 transition-opacity inline-flex gap-2"
              >
                <button class="btn btn-circle btn-xs" @click="adjustQuantity(-1)">
                  <MdiMinus class="h-3 w-3" />
                </button>
                <button class="btn btn-circle btn-xs" @click="adjustQuantity(1)">
                  <MdiPlus class="h-3 w-3" />
                </button>
              </span>
            </template>
          </DetailsSection>
        </BaseCard>

        <NuxtPage :item="item" :page-key="itemId" />
        <template v-if="!hasNested">
          <BaseCard v-if="photos && photos.length > 0">
            <template #title> 照片 </template>
            <div
              class="container border-t border-gray-300 p-4 flex flex-wrap gap-2 mx-auto max-h-[500px] overflow-y-scroll scroll-bg"
            >
              <button v-for="(img, i) in photos" :key="i" @click="openDialog(img)">
                <img class="rounded max-h-[200px]" :src="img.src" />
              </button>
            </div>
          </BaseCard>

          <BaseCard v-if="showAttachments" collapsable>
            <template #title> 附件 </template>
            <DetailsSection v-if="attachmentDetails.length > 0" :details="attachmentDetails">
              <template #manuals>
                <ItemAttachmentsList
                  v-if="attachments.manuals.length > 0"
                  :attachments="attachments.manuals"
                  :item-id="item.id"
                />
              </template>
              <template #attachments>
                <ItemAttachmentsList
                  v-if="attachments.attachments.length > 0"
                  :attachments="attachments.attachments"
                  :item-id="item.id"
                />
              </template>
              <template #warranty>
                <ItemAttachmentsList
                  v-if="attachments.warranty.length > 0"
                  :attachments="attachments.warranty"
                  :item-id="item.id"
                />
              </template>
              <template #receipts>
                <ItemAttachmentsList
                  v-if="attachments.receipts.length > 0"
                  :attachments="attachments.receipts"
                  :item-id="item.id"
                />
              </template>
            </DetailsSection>
            <div v-else>
              <p class="text-base-content/70 px-6 pb-4">未找到附件</p>
            </div>
          </BaseCard>

          <BaseCard v-if="showPurchase" collapsable>
            <template #title> 购买详情 </template>
            <DetailsSection :details="purchaseDetails" />
          </BaseCard>

          <BaseCard v-if="showWarranty" collapsable>
            <template #title> 保修详情 </template>
            <DetailsSection :details="warrantyDetails" />
          </BaseCard>

          <BaseCard v-if="showSold" collapsable>
            <template #title> 销售详情 </template>
            <DetailsSection :details="soldDetails" />
          </BaseCard>
        </template>
      </div>
    </section>

    <section v-if="items && items.length > 0" class="my-6">
      <ItemViewSelectable :items="items" />
    </section>
  </BaseContainer>
</template>

<style lang="css" scoped>
  /* Style dialog background */
  dialog::backdrop {
    background: rgba(0, 0, 0, 0.5);
  }

  .scroll-bg::-webkit-scrollbar {
    width: 0.5rem;
  }

  .scroll-bg::-webkit-scrollbar-thumb {
    border-radius: 0.25rem;
    @apply bg-base-300;
  }
</style>
