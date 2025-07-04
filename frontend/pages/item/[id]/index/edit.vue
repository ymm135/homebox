<script setup lang="ts">
  import type { ItemAttachment, ItemField, ItemOut, ItemUpdate } from "~~/lib/api/types/data-contracts";
  import { AttachmentTypes } from "~~/lib/api/types/non-generated";
  import { useLabelStore } from "~~/stores/labels";
  import { useLocationStore } from "~~/stores/locations";
  import { capitalize } from "~~/lib/strings";
  import Autocomplete from "~~/components/Form/Autocomplete.vue";
  import MdiDelete from "~icons/mdi/delete";
  import MdiPencil from "~icons/mdi/pencil";
  import MdiContentSaveOutline from "~icons/mdi/content-save-outline";

  definePageMeta({
    middleware: ["auth"],
  });

  const route = useRoute();
  const api = useUserApi();
  const toast = useNotifier();
  const preferences = useViewPreferences();

  const itemId = computed<string>(() => route.params.id as string);

  const locationStore = useLocationStore();
  const locations = computed(() => locationStore.allLocations);

  const labelStore = useLabelStore();
  const labels = computed(() => labelStore.labels);

  const {
    data: nullableItem,
    refresh,
    pending: requestPending,
  } = useAsyncData(async () => {
    const { data, error } = await api.items.get(itemId.value);
    if (error) {
      toast.error("加载物品失败");
      navigateTo("/home");
      return;
    }

    if (locations && data.location?.id) {
      // @ts-expect-error - we know the locations is valid
      const location = locations.value.find(l => l.id === data.location.id);
      if (location) {
        data.location = location;
      }
    }

    if (data.parent) {
      parent.value = data.parent;
    }

    return data;
  });

  const item = computed<ItemOut>(() => nullableItem.value as ItemOut);

  onMounted(() => {
    refresh();
  });

  async function saveItem() {
    if (!item.value.location?.id) {
      toast.error("保存物品失败：未选择位置");
      return;
    }

    const payload: ItemUpdate = {
      ...item.value,
      locationId: item.value.location?.id,
      labelIds: item.value.labels.map(l => l.id),
      parentId: parent.value ? parent.value.id : null,
      assetId: item.value.assetId,
    };

    const { error } = await api.items.update(itemId.value, payload);

    if (error) {
      toast.error("保存物品失败");
      return;
    }

    toast.success("物品已保存");
    navigateTo("/item/" + itemId.value);
  }
  type NoUndefinedField<T> = { [P in keyof T]-?: NoUndefinedField<NonNullable<T[P]>> };

  type StringKeys<T> = { [k in keyof T]: T[k] extends string ? k : never }[keyof T];
  type OnlyString<T> = { [k in StringKeys<T>]: string };

  type NumberKeys<T> = { [k in keyof T]: T[k] extends number ? k : never }[keyof T];
  type OnlyNumber<T> = { [k in NumberKeys<T>]: number };

  type TextFormField = {
    type: "text" | "textarea";
    label: string;
    // key of ItemOut where the value is a string
    ref: keyof OnlyString<NoUndefinedField<ItemOut>>;
  };

  type NumberFormField = {
    type: "number";
    label: string;
    ref: keyof OnlyNumber<NoUndefinedField<ItemOut>> | keyof OnlyString<NoUndefinedField<ItemOut>>;
  };

  // https://stackoverflow.com/questions/50851263/how-do-i-require-a-keyof-to-be-for-a-property-of-a-specific-type
  // I don't know why typescript can't just be normal
  type BooleanKeys<T> = { [k in keyof T]: T[k] extends boolean ? k : never }[keyof T];
  type OnlyBoolean<T> = { [k in BooleanKeys<T>]: boolean };

  interface BoolFormField {
    type: "checkbox";
    label: string;
    ref: keyof OnlyBoolean<NoUndefinedField<ItemOut>>;
  }

  type DateKeys<T> = { [k in keyof T]: T[k] extends Date | string ? k : never }[keyof T];
  type OnlyDate<T> = { [k in DateKeys<T>]: Date | string };

  type DateFormField = {
    type: "date";
    label: string;
    ref: keyof OnlyDate<NoUndefinedField<ItemOut>>;
  };

  type FormField = TextFormField | BoolFormField | DateFormField | NumberFormField;

  const mainFields: FormField[] = [
    {
      type: "text",
      label: "名称",
      ref: "name",
    },
    {
      type: "number",
      label: "数量",
      ref: "quantity",
    },
    {
      type: "textarea",
      label: "描述",
      ref: "description",
    },
    {
      type: "text",
      label: "序列号",
      ref: "serialNumber",
    },
    {
      type: "text",
      label: "型号",
      ref: "modelNumber",
    },
    {
      type: "text",
      label: "制造商",
      ref: "manufacturer",
    },
    {
      type: "textarea",
      label: "备注",
      ref: "notes",
    },
    {
      type: "checkbox",
      label: "已投保",
      ref: "insured",
    },
    {
      type: "checkbox",
      label: "已归档",
      ref: "archived",
    },
    {
      type: "text",
      label: "资产ID",
      ref: "assetId",
    },
  ];

  const purchaseFields: FormField[] = [
    {
      type: "text",
      label: "购买来源",
      ref: "purchaseFrom",
    },
    {
      type: "text",
      label: "购买价格",
      ref: "purchasePrice",
    },
    {
      type: "date",
      label: "购买日期",
      // @ts-expect-error - we know this is a date
      ref: "purchaseTime",
    },
  ];

  const warrantyFields: FormField[] = [
    {
      type: "checkbox",
      label: "终身保修",
      ref: "lifetimeWarranty",
    },
    {
      type: "date",
      label: "保修到期",
      // @ts-expect-error - we know this is a date
      ref: "warrantyExpires",
    },
    {
      type: "textarea",
      label: "保修备注",
      ref: "warrantyDetails",
    },
  ];

  const soldFields: FormField[] = [
    {
      type: "text",
      label: "售给",
      ref: "soldTo",
    },
    {
      type: "text",
      label: "售价",
      ref: "soldPrice",
    },
    {
      type: "date",
      label: "售出时间",
      // @ts-expect-error - we know this is a date
      ref: "soldTime",
    },
  ];

  // - Attachments
  const attDropZone = ref<HTMLDivElement>();
  const { isOverDropZone: attDropZoneActive } = useDropZone(attDropZone);

  const refAttachmentInput = ref<HTMLInputElement>();

  function clickUpload() {
    if (!refAttachmentInput.value) {
      return;
    }
    refAttachmentInput.value.click();
  }

  function uploadImage(e: Event) {
    const files = (e.target as HTMLInputElement).files;
    if (!files || !files.item(0)) {
      return;
    }

    const first = files.item(0);
    if (!first) {
      return;
    }

    uploadAttachment([first], null);
  }

  const dropPhoto = (files: File[] | null) => uploadAttachment(files, AttachmentTypes.Photo);
  const dropAttachment = (files: File[] | null) => uploadAttachment(files, AttachmentTypes.Attachment);
  const dropWarranty = (files: File[] | null) => uploadAttachment(files, AttachmentTypes.Warranty);
  const dropManual = (files: File[] | null) => uploadAttachment(files, AttachmentTypes.Manual);
  const dropReceipt = (files: File[] | null) => uploadAttachment(files, AttachmentTypes.Receipt);

  async function uploadAttachment(files: File[] | null, type: AttachmentTypes | null) {
    if (!files || files.length === 0) {
      return;
    }

    const { data, error } = await api.items.attachments.add(itemId.value, files[0], files[0].name, type);

    if (error) {
      toast.error("上传附件失败");
      return;
    }

    toast.success("附件已上传");

    item.value.attachments = data.attachments;
  }

  const confirm = useConfirm();

  async function deleteAttachment(attachmentId: string) {
    const confirmed = await confirm.open("您确定要删除此附件吗？");

    if (confirmed.isCanceled) {
      return;
    }

    const { error } = await api.items.attachments.delete(itemId.value, attachmentId);

    if (error) {
      toast.error("Failed to delete attachment");
      return;
    }

    toast.success("附件已删除");
    item.value.attachments = item.value.attachments.filter(a => a.id !== attachmentId);
  }

  const editState = reactive({
    modal: false,
    loading: false,

    // Values
    obj: {},
    id: "",
    title: "",
    type: "",
    primary: false,
  });

  const attachmentOpts = Object.entries(AttachmentTypes).map(([key, value]) => ({
    text: capitalize(key),
    value,
  }));

  function openAttachmentEditDialog(attachment: ItemAttachment) {
    editState.id = attachment.id;
    editState.title = attachment.document.title;
    editState.type = attachment.type;
    editState.primary = attachment.primary;
    editState.modal = true;

    editState.obj = attachmentOpts.find(o => o.value === attachment.type) || attachmentOpts[0];
  }

  async function updateAttachment() {
    editState.loading = true;
    const { error, data } = await api.items.attachments.update(itemId.value, editState.id, {
      title: editState.title,
      type: editState.type,
      primary: editState.primary,
    });

    if (error) {
      toast.error("更新附件失败");
      return;
    }

    item.value.attachments = data.attachments;

    editState.loading = false;
    editState.modal = false;

    editState.id = "";
    editState.title = "";
    editState.type = "";

    toast.success("附件已更新");
  }

  function addField() {
    item.value.fields.push({
      id: null,
      name: "字段名称",
      type: "text",
      textValue: "",
      numberValue: 0,
      booleanValue: false,
      timeValue: null,
    } as unknown as ItemField);
  }

  const { query, results } = useItemSearch(api, { immediate: false });
  const parent = ref();

  async function deleteItem() {
    const confirmed = await confirm.open("您确定要删除此物品吗？");

    if (!confirmed.data) {
      return;
    }

    const { error } = await api.items.delete(itemId.value);
    if (error) {
      toast.error("删除物品失败");
      return;
    }
    toast.success("物品已删除");
    navigateTo("/home");
  }

  async function keyboardSave(e: KeyboardEvent) {
    // Cmd + S
    if (e.metaKey && e.key === "s") {
      e.preventDefault();
      await saveItem();
    }

    // Ctrl + S
    if (e.ctrlKey && e.key === "s") {
      e.preventDefault();
      await saveItem();
    }
  }

  onMounted(() => {
    window.addEventListener("keydown", keyboardSave);
  });

  onUnmounted(() => {
    window.removeEventListener("keydown", keyboardSave);
  });
</script>

<template>
  <div v-if="item" class="pb-8">
    <BaseModal v-model="editState.modal">
      <template #title> 编辑附件 </template>

      <FormTextField v-model="editState.title" label="附件标题" />
      <FormSelect
        v-model:value="editState.type"
        label="附件类型"
        value-key="value"
        name="text"
        :items="attachmentOpts"
      />
      <div v-if="editState.type == 'photo'" class="flex gap-2 mt-3">
        <input v-model="editState.primary" type="checkbox" class="checkbox" />
        <p class="text-sm">
          <span class="font-semibold">主要照片</span>
          此选项仅适用于照片。只能有一张主要照片。如果您选择此选项，当前的主要照片（如果有）将被取消选择。
        </p>
      </div>
      <div class="modal-action">
        <BaseButton :loading="editState.loading" @click="updateAttachment"> 更新 </BaseButton>
      </div>
    </BaseModal>

    <section class="relative">
      <div class="my-4 justify-end flex gap-2 items-center sticky z-10 top-1">
        <div class="mr-auto tooltip tooltip-right" data-tip="显示高级视图选项">
          <label class="label cursor-pointer mr-auto">
            <input v-model="preferences.editorAdvancedView" type="checkbox" class="toggle toggle-primary" />
            <span class="label-text ml-4"> 高级 </span>
          </label>
        </div>
        <BaseButton size="sm" @click="saveItem">
          <template #icon>
            <MdiContentSaveOutline />
          </template>
          保存
        </BaseButton>
        <BaseButton class="btn btn-sm btn-error" @click="deleteItem()">
          <MdiDelete class="mr-2" />
          删除
        </BaseButton>
      </div>
      <div v-if="!requestPending" class="space-y-6">
        <BaseCard class="overflow-visible">
          <template #title> 编辑详情 </template>
          <template #title-actions>
            <div class="flex flex-wrap justify-between items-center mt-2 gap-4"></div>
          </template>
          <div class="px-5 pt-2 border-t mb-6 grid md:grid-cols-2 gap-4">
            <LocationSelector v-model="item.location" />
            <FormMultiselect v-model="item.labels" label="标签" :items="labels ?? []" />
            <Autocomplete
              v-if="preferences.editorAdvancedView"
              v-model="parent"
              v-model:search="query"
              :items="results"
              item-text="name"
              label="父级物品"
              no-results-text="输入以搜索..."
            />
          </div>

          <div class="border-t border-gray-300 sm:p-0">
            <div v-for="field in mainFields" :key="field.ref" class="sm:divide-y sm:divide-gray-300 grid grid-cols-1">
              <div class="pt-2 px-4 pb-4 sm:px-6 border-b border-gray-300">
                <FormTextArea v-if="field.type === 'textarea'" v-model="item[field.ref]" :label="field.label" inline />
                <FormTextField
                  v-else-if="field.type === 'text'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormTextField
                  v-else-if="field.type === 'number'"
                  v-model.number="item[field.ref]"
                  type="number"
                  :label="field.label"
                  inline
                />
                <FormDatePicker
                  v-else-if="field.type === 'date'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormCheckbox
                  v-else-if="field.type === 'checkbox'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
              </div>
            </div>
          </div>
        </BaseCard>

        <BaseCard>
          <template #title> 自定义字段 </template>
          <div class="px-5 border-t divide-y divide-gray-300 space-y-4">
            <div
              v-for="(field, idx) in item.fields"
              :key="`field-${idx}`"
              class="grid grid-cols-2 md:grid-cols-4 gap-2"
            >
              <!-- <FormSelect v-model:value="field.type" label="Field Type" :items="fieldTypes" value-key="value" /> -->
              <FormTextField v-model="field.name" label="名称" />
              <div class="flex items-end col-span-3">
                <FormTextField v-model="field.textValue" label="值" />
                <div class="tooltip" data-tip="删除">
                  <button class="btn btn-sm btn-square mb-2 ml-2" @click="item.fields.splice(idx, 1)">
                    <MdiDelete />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="px-5 pb-4 mt-4 flex justify-end">
            <BaseButton size="sm" @click="addField"> 添加 </BaseButton>
          </div>
        </BaseCard>

        <div
          v-if="preferences.editorAdvancedView"
          ref="attDropZone"
          class="overflow-visible card bg-base-100 shadow-xl sm:rounded-lg"
        >
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium leading-6">附件</h3>
            <p class="text-xs">对附件的更改将立即保存</p>
          </div>
          <div class="border-t border-gray-300 p-4">
            <div v-if="attDropZoneActive" class="grid grid-cols-4 gap-4">
              <DropZone @drop="dropPhoto"> 照片 </DropZone>
              <DropZone @drop="dropWarranty"> 保修 </DropZone>
              <DropZone @drop="dropManual"> 手册 </DropZone>
              <DropZone @drop="dropAttachment"> 附件 </DropZone>
              <DropZone @drop="dropReceipt"> 收据 </DropZone>
            </div>
            <button
              v-else
              class="h-24 w-full border-2 border-primary border-dashed grid place-content-center"
              @click="clickUpload"
            >
              <input ref="refAttachmentInput" hidden type="file" @change="uploadImage" />
              <p>将文件拖放到此处或点击选择文件</p>
            </button>
          </div>

          <div class="border-t border-gray-300 p-4">
            <ul role="list" class="divide-y divide-gray-400 rounded-md border border-gray-400">
              <li
                v-for="attachment in item.attachments"
                :key="attachment.id"
                class="grid grid-cols-6 justify-between py-3 pl-3 pr-4 text-sm"
              >
                <p class="my-auto col-span-4">
                  {{ attachment.document.title }}
                </p>
                <p class="my-auto">
                  {{ capitalize(attachment.type) }}
                </p>
                <div class="flex gap-2 justify-end">
                  <div class="tooltip" data-tip="删除">
                    <button class="btn btn-sm btn-square" @click="deleteAttachment(attachment.id)">
                      <MdiDelete />
                    </button>
                  </div>
                  <div class="tooltip" data-tip="编辑">
                    <button class="btn btn-sm btn-square" @click="openAttachmentEditDialog(attachment)">
                      <MdiPencil />
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>
        </div>

        <div v-if="preferences.editorAdvancedView" class="overflow-visible card bg-base-100 shadow-xl sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium leading-6">购买详情</h3>
          </div>
          <div class="border-t border-gray-300 sm:p-0">
            <div
              v-for="field in purchaseFields"
              :key="field.ref"
              class="sm:divide-y sm:divide-gray-300 grid grid-cols-1"
            >
              <div class="pt-2 px-4 pb-4 sm:px-6 border-b border-gray-300">
                <FormTextArea v-if="field.type === 'textarea'" v-model="item[field.ref]" :label="field.label" inline />
                <FormTextField
                  v-else-if="field.type === 'text'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormTextField
                  v-else-if="field.type === 'number'"
                  v-model.number="item[field.ref]"
                  type="number"
                  :label="field.label"
                  inline
                />
                <FormDatePicker
                  v-else-if="field.type === 'date'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormCheckbox
                  v-else-if="field.type === 'checkbox'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="preferences.editorAdvancedView" class="overflow-visible card bg-base-100 shadow-xl sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium leading-6">保修详情</h3>
          </div>
          <div class="border-t border-gray-300 sm:p-0">
            <div
              v-for="field in warrantyFields"
              :key="field.ref"
              class="sm:divide-y sm:divide-gray-300 grid grid-cols-1"
            >
              <div class="pt-2 px-4 pb-4 sm:px-6 border-b border-gray-300">
                <FormTextArea v-if="field.type === 'textarea'" v-model="item[field.ref]" :label="field.label" inline />
                <FormTextField
                  v-else-if="field.type === 'text'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormTextField
                  v-else-if="field.type === 'number'"
                  v-model.number="item[field.ref]"
                  type="number"
                  :label="field.label"
                  inline
                />
                <FormDatePicker
                  v-else-if="field.type === 'date'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormCheckbox
                  v-else-if="field.type === 'checkbox'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
              </div>
            </div>
          </div>
        </div>

        <div v-if="preferences.editorAdvancedView" class="overflow-visible card bg-base-100 shadow-xl sm:rounded-lg">
          <div class="px-4 py-5 sm:px-6">
            <h3 class="text-lg font-medium leading-6">销售详情</h3>
          </div>
          <div class="border-t border-gray-300 sm:p-0">
            <div v-for="field in soldFields" :key="field.ref" class="sm:divide-y sm:divide-gray-300 grid grid-cols-1">
              <div class="pt-2 pb-4 px-4 sm:px-6 border-b border-gray-300">
                <FormTextArea v-if="field.type === 'textarea'" v-model="item[field.ref]" :label="field.label" inline />
                <FormTextField
                  v-else-if="field.type === 'text'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormTextField
                  v-else-if="field.type === 'number'"
                  v-model.number="item[field.ref]"
                  type="number"
                  :label="field.label"
                  inline
                />
                <FormDatePicker
                  v-else-if="field.type === 'date'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
                <FormCheckbox
                  v-else-if="field.type === 'checkbox'"
                  v-model="item[field.ref]"
                  :label="field.label"
                  inline
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>
