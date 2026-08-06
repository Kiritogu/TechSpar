// 全站统一页面容器类：内容区最大宽度 / 水平与垂直留白。
// 所有内部功能页共用，避免各页自定义 padding 漂移。
// 注意：History 原用 py-5 md:py-6，已归一化到 py-6 md:py-8 保持一致。
export const PAGE_CLASS =
  "flex-1 w-full max-w-[1600px] mx-auto px-4 py-6 md:px-7 md:py-8 xl:px-10 2xl:px-12";
