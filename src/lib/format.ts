const koFormatter = (digits: number) =>
  new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

export const formatNumber = (n: number, digits = 3): string =>
  koFormatter(digits).format(n);

export const formatKgCO2e = (n: number, digits = 3): string =>
  `${formatNumber(n, digits)} kgCO2e`;

/** share: 0 ~ 1 비율을 "12.34%" 문자열로. */
export const formatShare = (share: number): string =>
  `${(share * 100).toFixed(2)}%`;

export const formatDateTime = (iso: string | Date): string => {
  const d = typeof iso === "string" ? new Date(iso) : iso;
  return d.toLocaleString("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  });
};
