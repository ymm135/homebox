<script setup lang="ts">
  import { route } from "../../lib/api/base";

  definePageMeta({
    middleware: ["auth"],
    layout: false,
  });
  useHead({
    title: "Homebox | 打印机",
  });

  const bordered = ref(false);

  const displayProperties = reactive({
    baseURL: window.location.origin,
    assetRange: 1,
    assetRangeMax: 91,
    gapY: 0.25,
    columns: 3,
    cardHeight: 1,
    cardWidth: 2.63,
    pageWidth: 8.5,
    pageHeight: 11,
    pageTopPadding: 0.52,
    pageBottomPadding: 0.42,
    pageLeftPadding: 0.25,
    pageRightPadding: 0.1,
  });

  type Input = {
    page: {
      height: number;
      width: number;
      pageTopPadding: number;
      pageBottomPadding: number;
      pageLeftPadding: number;
      pageRightPadding: number;
    };
    cardHeight: number;
    cardWidth: number;
  };

  type Output = {
    cols: number;
    rows: number;
    gapY: number;
    gapX: number;
    card: {
      width: number;
      height: number;
    };
    page: {
      width: number;
      height: number;
      pt: number;
      pb: number;
      pl: number;
      pr: number;
    };
  };

  const notifier = useNotifier();

  function calculateGridData(input: Input): Output {
    const { page, cardHeight, cardWidth } = input;

    const availablePageWidth = page.width - page.pageLeftPadding - page.pageRightPadding;
    const availablePageHeight = page.height - page.pageTopPadding - page.pageBottomPadding;

    if (availablePageWidth < cardWidth || availablePageHeight < cardHeight) {
      notifier.error("页面尺寸对于卡片尺寸来说太小了");
      return out.value;
    }

    const cols = Math.floor(availablePageWidth / cardWidth);
    const rows = Math.floor(availablePageHeight / cardHeight);
    const gapX = (availablePageWidth - cols * cardWidth) / (cols - 1);
    const gapY = (page.height - rows * cardHeight) / (rows - 1);

    return {
      cols,
      rows,
      gapX,
      gapY,
      card: {
        width: cardWidth,
        height: cardHeight,
      },
      page: {
        width: page.width,
        height: page.height,
        pt: page.pageTopPadding,
        pb: page.pageBottomPadding,
        pl: page.pageLeftPadding,
        pr: page.pageRightPadding,
      },
    };
  }

  interface InputDef {
    label: string;
    ref: keyof typeof displayProperties;
    type?: "number" | "text";
  }

  const propertyInputs = computed<InputDef[]>(() => {
    return [
      {
        label: "资产开始",
        ref: "assetRange",
      },
      {
        label: "资产结束",
        ref: "assetRangeMax",
      },
      {
        label: "标签高度",
        ref: "cardHeight",
      },
      {
        label: "标签宽度",
        ref: "cardWidth",
      },
      {
        label: "页面宽度",
        ref: "pageWidth",
      },
      {
        label: "页面高度",
        ref: "pageHeight",
      },
      {
        label: "页面顶部边距",
        ref: "pageTopPadding",
      },
      {
        label: "页面底部边距",
        ref: "pageBottomPadding",
      },
      {
        label: "页面左边距",
        ref: "pageLeftPadding",
      },
      {
        label: "页面右边距",
        ref: "pageRightPadding",
      },
      {
        label: "基础URL",
        ref: "baseURL",
        type: "text",
      },
    ];
  });

  type LabelData = {
    url: string;
    name: string;
    assetID: string;
    location: string;
  };

  function fmtAssetID(aid: number | string) {
    aid = aid.toString();

    let aidStr = aid.toString().padStart(6, "0");
    aidStr = aidStr.slice(0, 3) + "-" + aidStr.slice(3);
    return aidStr;
  }

  function getQRCodeUrl(assetID: string): string {
    let origin = displayProperties.baseURL.trim();

    // remove trailing slash
    if (origin.endsWith("/")) {
      origin = origin.slice(0, -1);
    }

    const data = `${origin}/a/${assetID}`;

    return route(`/qrcode`, { data: encodeURIComponent(data) });
  }

  function getItem(n: number): LabelData {
    // format n into - seperated string with leading zeros

    const assetID = fmtAssetID(n);

    return {
      url: getQRCodeUrl(assetID),
      assetID,
      name: "_______________",
      location: "_______________",
    };
  }

  const items = computed(() => {
    if (displayProperties.assetRange > displayProperties.assetRangeMax) {
      return [];
    }

    const diff = displayProperties.assetRangeMax - displayProperties.assetRange;

    if (diff > 999) {
      return [];
    }

    const items: LabelData[] = [];
    for (let i = displayProperties.assetRange; i < displayProperties.assetRangeMax; i++) {
      items.push(getItem(i));
    }
    return items;
  });

  type Row = {
    items: LabelData[];
  };

  type Page = {
    rows: Row[];
  };

  const pages = ref<Page[]>([]);

  const out = ref({
    cols: 0,
    rows: 0,
    gapY: 0,
    gapX: 0,
    card: {
      width: 0,
      height: 0,
    },
    page: {
      width: 0,
      height: 0,
      pt: 0,
      pb: 0,
      pl: 0,
      pr: 0,
    },
  });

  function calcPages() {
    // Set Out Dimensions
    out.value = calculateGridData({
      page: {
        height: displayProperties.pageHeight,
        width: displayProperties.pageWidth,
        pageTopPadding: displayProperties.pageTopPadding,
        pageBottomPadding: displayProperties.pageBottomPadding,
        pageLeftPadding: displayProperties.pageLeftPadding,
        pageRightPadding: displayProperties.pageRightPadding,
      },
      cardHeight: displayProperties.cardHeight,
      cardWidth: displayProperties.cardWidth,
    });

    const calc: Page[] = [];

    const perPage = out.value.rows * out.value.cols;

    const itemsCopy = [...items.value];

    while (itemsCopy.length > 0) {
      const page: Page = {
        rows: [],
      };

      for (let i = 0; i < perPage; i++) {
        const item = itemsCopy.shift();
        if (!item) {
          break;
        }

        if (i % out.value.cols === 0) {
          page.rows.push({
            items: [],
          });
        }

        page.rows[page.rows.length - 1].items.push(item);
      }

      calc.push(page);
    }

    pages.value = calc;
  }

  onMounted(() => {
    calcPages();
  });
</script>

<template>
  <div class="print:hidden">
    <AppToast />
    <div class="container max-w-4xl mx-auto p-4 pt-6 prose">
      <h1>Homebox 标签生成器</h1>
      <p>
        Homebox 标签生成器是一个帮助您为 Homebox 库存打印标签的工具。这些标签旨在提前打印，这样您就可以打印许多标签并准备好应用
      </p>
      <p>
        因此，这些标签通过在标签上打印 URL 二维码和资产ID信息来工作。如果您在 Homebox 设置中禁用了资产ID，您仍然可以使用此工具，但资产ID不会引用任何物品
      </p>
      <p>
        此功能处于早期开发阶段，可能会在未来版本中发生变化，如果您有反馈，请在 <a href="https://github.com/hay-kot/homebox/discussions/273">GitHub 讨论</a> 中提供
      </p>
      <h2>提示</h2>
      <ul>
        <li>
          这里的默认设置是为
          <a href="https://www.avery.com/templates/5260">Avery 5260 标签纸</a>设置的。如果您使用不同的标签纸，
          您需要调整设置以匹配您的标签纸。
        </li>
        <li>
          如果您要自定义标签纸，尺寸以英寸为单位。在构建 5260 标签纸时，我发现
          他们模板中使用的尺寸与在框内打印所需的尺寸不匹配。
          <b>请准备好进行一些试验和错误</b>
        </li>
        <li>
          打印时请确保：
          <ol>
            <li>将边距设置为 0 或无</li>
            <li>将缩放设置为 100%</li>
            <li>禁用双面打印</li>
            <li>在打印多页之前先打印测试页</li>
          </ol>
        </li>
      </ul>
      <div class="flex gap-2 flex-wrap">
        <NuxtLink href="/tools">工具</NuxtLink>
        <NuxtLink href="/home">首页</NuxtLink>
      </div>
    </div>
    <div class="divider max-w-4xl mx-auto"></div>
    <div class="container max-w-4xl mx-auto p-4">
      <div class="grid grid-cols-2 mx-auto gap-3">
        <div v-for="(prop, i) in propertyInputs" :key="i" class="form-control w-full max-w-xs">
          <label class="label">
            <span class="label-text">{{ prop.label }}</span>
          </label>
          <input
            v-model="displayProperties[prop.ref]"
            :type="prop.type ? prop.type : 'number'"
            step="0.01"
            placeholder="Type here"
            class="input input-bordered w-full max-w-xs"
          />
        </div>
      </div>
      <div class="max-w-xs">
        <div class="form-control">
          <label class="cursor-pointer label">
            <input v-model="bordered" type="checkbox" class="checkbox checkbox-secondary" />
            <span class="label-text">带边框标签</span>
          </label>
        </div>
      </div>

      <div>
        <p>二维码示例 {{ displayProperties.baseURL }}/a/{asset_id}</p>
        <BaseButton class="btn-block my-4" @click="calcPages"> 生成页面 </BaseButton>
      </div>
    </div>
  </div>
  <div class="flex flex-col items-center print-show">
    <section
      v-for="(page, pi) in pages"
      :key="pi"
      class="border-2 print:border-none"
      :style="{
        paddingTop: `${out.page.pt}in`,
        paddingBottom: `${out.page.pb}in`,
        paddingLeft: `${out.page.pl}in`,
        paddingRight: `${out.page.pr}in`,
        width: `${out.page.width}in`,
      }"
    >
      <div
        v-for="(row, ri) in page.rows"
        :key="ri"
        class="flex break-inside-avoid"
        :style="{
          columnGap: `${out.gapX}in`,
          rowGap: `${out.gapY}in`,
        }"
      >
        <div
          v-for="(item, idx) in row.items"
          :key="idx"
          class="flex border-2"
          :class="{
            'border-black': bordered,
            'border-transparent': !bordered,
          }"
          :style="{
            height: `${out.card.height}in`,
            width: `${out.card.width}in`,
          }"
        >
          <div class="flex items-center">
            <img
              :src="item.url"
              :style="{
                width: `${out.card.height * 0.9}in`,
                height: `${out.card.height * 0.9}in`,
              }"
            />
          </div>
          <div class="ml-2 flex flex-col justify-center">
            <div class="font-bold">{{ item.assetID }}</div>
            <div class="text-xs font-light italic">Homebox</div>
            <div>{{ item.name }}</div>
            <div>{{ item.location }}</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style lang="css">
  .letter-size {
    width: 8.5in;
    height: 11in;
    padding: 0.5in;
  }
</style>
