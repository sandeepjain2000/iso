export function effectiveInScope(chain: boolean[]): boolean {
  return chain.every(Boolean);
}
