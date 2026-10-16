// 화면 조각이 같이 쓰는 작은 도구
export const $ = (id: string) => document.getElementById(id)!;

/** 피해 범위 글: 같으면 숫자 하나, 다르면 "최소~최대" */
export const range = ([lo, hi]: readonly [number, number]) => (lo === hi ? String(lo) : `${lo}~${hi}`);
