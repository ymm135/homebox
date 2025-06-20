<template>
  <div>
    <AppImportDialog v-model="modals.import" />
    <BaseContainer class="flex flex-col gap-4 mb-6">
      <BaseCard>
        <template #title>
          <BaseSectionHeader>
            <MdiFileChart class="mr-2" />
            <span> 报告 </span>
            <template #description> 为您的库存生成不同的报告。 </template>
          </BaseSectionHeader>
        </template>
        <div class="border-t px-6 pb-3 border-gray-300 divide-gray-300 divide-y">
          <DetailAction @action="navigateTo('/reports/label-generator')">
            <template #title>资产ID标签</template>
            为一系列资产ID生成可打印的PDF标签。这些标签不特定于您的库存，因此您可以提前打印标签并在收到物品时将其应用到您的库存中。
            <template #button>
              标签生成器
              <MdiArrowRight class="ml-2" />
            </template>
          </DetailAction>
          <DetailAction @action="getBillOfMaterials()">
            <template #title>物料清单</template>
            生成可导入到电子表格程序的TSV（制表符分隔值）文件。这是您库存的摘要，包含基本物品和价格信息。
            <template #button> 生成BOM </template>
          </DetailAction>
        </div>
      </BaseCard>
      <BaseCard>
        <template #title>
          <BaseSectionHeader>
            <MdiDatabase class="mr-2" />
            <span> 导入/导出 </span>
            <template #description>
              将您的库存导入和导出为CSV文件。这对于将库存迁移到新的Homebox实例很有用。
            </template>
          </BaseSectionHeader>
        </template>
        <div class="border-t px-6 pb-3 border-gray-300 divide-gray-300 divide-y">
          <DetailAction @action="modals.import = true">
            <template #title>导入库存</template>
            导入Homebox的标准CSV格式。这<b>不会</b>覆盖您库存中的任何现有物品。它只会添加新物品。
          </DetailAction>
          <DetailAction @action="getExportTSV()">
            <template #title>导出库存</template>
            导出Homebox的标准CSV格式。这将导出您库存中的所有物品。
          </DetailAction>
        </div>
      </BaseCard>
      <BaseCard>
        <template #title>
          <BaseSectionHeader>
            <MdiAlert class="mr-2" />
            <span> 库存操作 </span>
            <template #description>
              批量对您的库存应用操作。这些是不可逆的操作。<b>请小心。</b>
            </template>
          </BaseSectionHeader>
        </template>
        <div class="border-t px-6 pb-3 border-gray-300 divide-gray-300 divide-y">
          <DetailAction @action="ensureAssetIDs">
            <template #title>确保资产ID</template>
            确保您库存中的所有物品都有有效的asset_id字段。这是通过找到数据库中当前最高的asset_id字段，并将下一个值应用到每个未设置asset_id字段的物品来完成的。这是按照created_at字段的顺序进行的。
          </DetailAction>
          <DetailAction @action="ensureImportRefs">
            <template #title>确保导入引用</template>
            确保您库存中的所有物品都有有效的import_ref字段。这是通过为每个未设置import_ref字段的物品随机生成8个字符的字符串来完成的。
          </DetailAction>
          <DetailAction @action="resetItemDateTimes">
            <template #title> 重置物品日期时间</template>
            将库存中所有日期时间字段的时间值重置为日期的开始。这是为了修复在网站开发早期引入的一个错误，该错误导致时间值与时间一起存储，从而导致日期字段显示准确值时出现问题。
            <a class="link" href="https://github.com/hay-kot/homebox/issues/236" target="_blank">
              查看Github问题#236了解更多详情。
            </a>
          </DetailAction>
          <DetailAction @action="setPrimaryPhotos">
            <template #title> 设置主要照片 </template>
            在Homebox v0.10.0版本中，主要图像字段被添加到照片类型的附件中。如果尚未设置，此操作将把主要图像字段设置为数据库中附件数组中的第一张图像。<a class="link" href="https://github.com/hay-kot/homebox/pull/576">查看GitHub PR #576</a>
          </DetailAction>
        </div>
      </BaseCard>
    </BaseContainer>
  </div>
</template>

<script setup lang="ts">
  import MdiFileChart from "~icons/mdi/file-chart";
  import MdiArrowRight from "~icons/mdi/arrow-right";
  import MdiDatabase from "~icons/mdi/database";
  import MdiAlert from "~icons/mdi/alert";

  definePageMeta({
    middleware: ["auth"],
  });
  useHead({
    title: "Homebox | 工具",
  });

  const modals = ref({
    item: false,
    location: false,
    label: false,
    import: false,
  });

  const api = useUserApi();
  const confirm = useConfirm();
  const notify = useNotifier();

  function getBillOfMaterials() {
    const url = api.reports.billOfMaterialsURL();
    window.open(url, "_blank");
  }

  function getExportTSV() {
    const url = api.items.exportURL();
    window.open(url, "_blank");
  }

  async function ensureAssetIDs() {
    const { isCanceled } = await confirm.open(
      "您确定要确保所有资产都有ID吗？这可能需要一段时间且无法撤销。"
    );

    if (isCanceled) {
      return;
    }

    const result = await api.actions.ensureAssetIDs();

    if (result.error) {
      notify.error("确保资产ID失败。");
      return;
    }

    notify.success(`${result.data.completed} 个资产已更新。`);
  }

  async function ensureImportRefs() {
    const { isCanceled } = await confirm.open(
      "您确定要确保所有资产都有import_ref吗？这可能需要一段时间且无法撤销。"
    );

    if (isCanceled) {
      return;
    }

    const result = await api.actions.ensureImportRefs();

    if (result.error) {
      notify.error("确保导入引用失败。");
      return;
    }

    notify.success(`${result.data.completed} 个资产已更新。`);
  }

  async function resetItemDateTimes() {
    const { isCanceled } = await confirm.open(
      "您确定要重置所有日期和时间值吗？这可能需要一段时间且无法撤销。"
    );

    if (isCanceled) {
      return;
    }

    const result = await api.actions.resetItemDateTimes();

    if (result.error) {
      notify.error("重置日期和时间值失败。");
      return;
    }

    notify.success(`${result.data.completed} 个资产已更新。`);
  }

  async function setPrimaryPhotos() {
    const { isCanceled } = await confirm.open(
      "您确定要设置主要照片吗？这可能需要一段时间且无法撤销。"
    );

    if (isCanceled) {
      return;
    }

    const result = await api.actions.setPrimaryPhotos();

    if (result.error) {
      notify.error("设置主要照片失败。");
      return;
    }

    notify.success(`${result.data.completed} 个资产已更新。`);
  }
</script>

<style scoped></style>
