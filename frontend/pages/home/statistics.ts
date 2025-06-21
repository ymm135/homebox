import type { UserClient } from "~~/lib/api/user";

type StatCard = {
  label: string;
  value: number;
  type: "currency" | "number";
};

export function statCardData(api: UserClient) {
  const { data: statistics } = useAsyncData(async () => {
    const { data } = await api.stats.group();
    return data;
  });

  return computed(() => {
    return [
      {
        label: "总价值",
        value: statistics.value?.totalItemPrice || 0,
        type: "currency",
      },
      {
        label: "物品总数",
        value: statistics.value?.totalItems || 0,
        type: "number",
      },
      {
        label: "位置总数",
        value: statistics.value?.totalLocations || 0,
        type: "number",
      },
      {
        label: "标签总数",
        value: statistics.value?.totalLabels || 0,
        type: "number",
      },
    ] as StatCard[];
  });
}
